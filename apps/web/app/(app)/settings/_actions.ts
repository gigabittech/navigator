"use server";

import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createServerSupabase } from "@/lib/auth/supabase-server";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Server side of the care circle. The browser keeps its instant local writes,
 * but real sharing — the co-parent seeing the child on THEIR device — needs
 * rows on the server under the collaborator's REAL user id:
 *
 *   1. verify the caller owns the child (owner-only, mirroring RLS),
 *   2. resolve or create the invitee's account (admin generateLink creates the
 *      user; the handle_new_user trigger creates their profile row),
 *   3. upsert child_collaborators server-side, and
 *   4. email them an invite through Resend.
 *
 * After that, has_child_access() is true for the invitee: when they sign in
 * anywhere, the sync pull delivers the child, medications, and log history.
 * Removal must also happen here — a local-only delete would be resurrected by
 * the next pull.
 */

export interface ServerInviteResult {
  ok: boolean;
  message: string;
  /** The invitee's real user id — the browser mirrors it locally. */
  collaboratorId?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function requireOwner(childId: string) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "You're signed out. Sign in and try again." };
  }

  const admin = adminClient();
  if (!admin) return { ok: false as const, error: "Sharing isn't available in local mode." };

  const { data: child } = await admin
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!child) {
    return { ok: false as const, error: "Only the child's owner can change sharing." };
  }

  return { ok: true as const, user, admin };
}

export async function inviteCollaboratorServer(input: {
  childId: string;
  email: string;
  role: "co_parent" | "clinician_view";
}): Promise<ServerInviteResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (!UUID_RE.test(input.childId)) return { ok: false, message: "Couldn't add them. Try again." };
  if (input.role !== "co_parent" && input.role !== "clinician_view") {
    return { ok: false, message: "Couldn't add them. Try again." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sharing isn't available in local mode." };
  }

  const ctx = await requireOwner(input.childId);
  if (!ctx.ok) return { ok: false, message: ctx.error };
  const { user, admin } = ctx;

  if (email === user.email?.toLowerCase()) {
    return { ok: false, message: "That's your own email — you already have access." };
  }

  // Resolve the invitee to a real account, creating one if needed.
  let collaboratorId: string | undefined;
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    collaboratorId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data?.user?.id) {
      return { ok: false, message: "Couldn't add them. Check the email and try again." };
    }
    collaboratorId = data.user.id;
  }

  const { error: linkError } = await admin
    .from("child_collaborators")
    .upsert(
      { child_id: input.childId, collaborator_id: collaboratorId, role: input.role },
      { onConflict: "child_id,collaborator_id", ignoreDuplicates: true },
    );
  if (linkError) {
    return { ok: false, message: "Couldn't add them. Try again in a moment." };
  }

  // Invite email — best-effort; access is already granted either way. The
  // message names the inviter (account identity) but never the child.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const host = headers().get("x-forwarded-host") ?? headers().get("host");
      const base = host ? `https://${host}` : "https://navigator.novasapienlabs.com";
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:
          process.env.WAITLIST_FROM ??
          process.env.RESEND_FROM ??
          "Navigator <onboarding@resend.dev>",
        to: email,
        subject: "You've been invited to a shared care record on Navigator",
        text: [
          `${user.email ?? "A parent"} invited you to share their child's care record on Navigator.`,
          input.role === "clinician_view"
            ? "You'll have read-only access to the log and reports."
            : "You'll be able to log doses and observations alongside them.",
          "",
          `Sign in with this email address to see it: ${base}/sign-in`,
          "",
          "If you weren't expecting this, you can ignore this email.",
        ].join("\n"),
      });
    } catch {
      // Non-fatal: the share exists; they can sign in with this email anytime.
    }
  }

  return {
    ok: true,
    collaboratorId,
    message: "Invite sent. When they sign in with this email, the shared record is waiting.",
  };
}

export async function removeCollaboratorServer(input: {
  childId: string;
  collaboratorId: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!UUID_RE.test(input.childId) || !UUID_RE.test(input.collaboratorId)) {
    return { ok: false, message: "Couldn't remove them. Try again." };
  }
  if (!isSupabaseConfigured()) return { ok: true, message: "Removed." };

  const ctx = await requireOwner(input.childId);
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const { error } = await ctx.admin
    .from("child_collaborators")
    .delete()
    .eq("child_id", input.childId)
    .eq("collaborator_id", input.collaboratorId);
  if (error) return { ok: false, message: "Couldn't remove them. Try again in a moment." };
  return { ok: true, message: "Removed. They no longer have access." };
}
