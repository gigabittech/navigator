// Shared audit-log append helper for Edge Functions.
//
// Writes one append-only row to audit_log (migration 0010) via the service-role
// key. This is the HIPAA access trail: who did what to PHI, when. Detail must be
// NON-PII (counts, categories, action verbs) — never names, notes, or audio.
//
// Best-effort: a failure to write the audit row must not fail the user's
// action, but it is logged (without PII) so an outage is visible.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuditAction =
  | "report.generate"
  | "voice.transcribe"
  | "data.export"
  | "account.delete"
  | "collaborator.add"
  | "collaborator.remove";

export interface AuditEntry {
  actorId: string | null;
  childId?: string | null;
  action: AuditAction;
  detail?: Record<string, unknown>;
  source?: "edge_fn" | "app" | "scheduler";
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;

  const admin = createClient(url, key, { auth: { persistSession: false } });
  try {
    await admin.from("audit_log").insert({
      actor_id: entry.actorId,
      child_id: entry.childId ?? null,
      action: entry.action,
      detail: entry.detail ?? null,
      source: entry.source ?? "edge_fn",
    });
  } catch {
    // Non-fatal; surface the failure without any payload detail.
    console.error("audit_append_failed", entry.action);
  }
}
