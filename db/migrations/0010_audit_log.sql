-- ============================================================
-- Navigator — HIPAA access/audit log (§164.312(b))
-- 0010_audit_log.sql
-- ============================================================
-- An append-only record of security-relevant actions on PHI: report
-- generation, data export, account deletion, and collaborator changes. This is
-- SEPARATE from log_events (which is the child's care record) — it is the
-- *access* trail, retained 7 years and never deletable by a user.
--
-- Access model (decided: service-role only): RLS is enabled with NO user
-- policies, so no anon/authenticated client can SELECT/INSERT/UPDATE/DELETE.
-- Only the service-role key (used by Edge Functions and admin tooling) bypasses
-- RLS to append rows and to read for compliance review. This is the simplest
-- correct posture — the audit trail cannot be read or tampered with from the app.
--
-- Append-only: UPDATE/DELETE raise, mirroring log_events. Even the service role
-- should never mutate the trail; the trigger makes that a hard guarantee.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The acting user (auth.uid at the time), when known. Nullable for
  -- system/scheduler actions.
  actor_id    UUID,
  -- The child whose PHI was touched, when applicable.
  child_id    UUID,
  -- Controlled action verb, e.g. 'report.generate', 'data.export',
  -- 'account.delete', 'collaborator.add', 'collaborator.remove'.
  action      TEXT NOT NULL,
  -- Optional structured, NON-PII detail (counts, categories — never names/notes).
  detail      JSONB,
  -- Source: 'edge_fn', 'app', 'scheduler'.
  source      TEXT NOT NULL DEFAULT 'edge_fn',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_child_idx ON audit_log(child_id, occurred_at DESC);

-- RLS on, with NO policies → only the service-role key can touch the table.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only: block UPDATE/DELETE even for the service role.
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
