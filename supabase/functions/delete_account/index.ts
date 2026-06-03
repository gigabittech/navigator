// Supabase Edge Function — account deletion (HIPAA right to delete).
//
// Browser-invoked by the signed-in user. Deletes all of the user's PHI from the
// server — children (cascades medications, appointments, log_events, reports,
// collaborators, push subscriptions via FK ON DELETE CASCADE) and the profile —
// then removes the auth user. The audit_log is intentionally PRESERVED (7-year
// retention) and a final 'account.delete' entry is appended.
//
// Local data is cleared separately on the device (settings calls resetLocalData
// after this succeeds).
//
// Deploy:   supabase functions deploy delete_account
// (verify_jwt = true; the gateway authenticates, and we re-resolve the user.)

import { handlePreflight, isOriginAllowed, json } from "../_shared/cors.ts";
import { getAuthedUser } from "../_shared/auth.ts";
import { appendAudit } from "../_shared/audit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handlePreflight(req);
  if (!isOriginAllowed(req)) return json(req, { error: "Request not allowed." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(req, { error: "Not configured." }, 501);

  try {
    const user = await getAuthedUser(req);
    if (!user) return json(req, { error: "Not signed in." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Audit FIRST, while we still have the actor id, so the deletion is recorded
    // even if a later step fails. (audit_log is never cascaded.)
    await appendAudit({ actorId: user.id, action: "account.delete", source: "edge_fn" });

    // Delete the user's children → cascades all child-scoped PHI via FKs.
    const { error: childErr } = await admin
      .from("children")
      .delete()
      .eq("owner_id", user.id);
    if (childErr) return json(req, { error: "Couldn't delete your data. Try again." }, 500);

    // Remove the profile row, then the auth user.
    await admin.from("profiles").delete().eq("id", user.id);
    await admin.auth.admin.deleteUser(user.id);

    return json(req, { ok: true });
  } catch {
    return json(req, { error: "Something went wrong deleting your account." }, 500);
  }
});
