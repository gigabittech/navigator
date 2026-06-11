-- ============================================================
-- Navigator — RLS drift repair + missing migrations (idempotent)
-- Generated from db/migrations/0002, 0006, 0008, 0010, 0011.
--
-- The shared production project predates parts of the repo's migration
-- history; at least the children INSERT policy is missing server-side
-- (verified: authenticated INSERT with owner_id = auth.uid() → 42501).
-- This block reconciles EVERY policy to the repo's canonical state
-- (DROP IF EXISTS + CREATE, so it is safe to run repeatedly), then applies
-- the two missing tables (audit_log, rate_limits) and the sync outbox index.
-- ============================================================

CREATE OR REPLACE FUNCTION has_child_access(_child_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM children c
    WHERE c.id = _child_id AND c.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM child_collaborators cc
    WHERE cc.child_id = _child_id AND cc.collaborator_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_child_write_access(_child_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM children c
    WHERE c.id = _child_id AND c.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM child_collaborators cc
    WHERE cc.child_id = _child_id
      AND cc.collaborator_id = auth.uid()
      AND cc.role <> 'clinician_view'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE children            ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_self ON profiles;
CREATE POLICY profiles_select_self ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS children_select_accessible ON children;
CREATE POLICY children_select_accessible ON children
  FOR SELECT USING (has_child_access(id));

DROP POLICY IF EXISTS children_insert_self ON children;
CREATE POLICY children_insert_self ON children
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS children_update_owner ON children;
CREATE POLICY children_update_owner ON children
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS children_delete_owner ON children;
CREATE POLICY children_delete_owner ON children
  FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS child_collab_select_accessible ON child_collaborators;
CREATE POLICY child_collab_select_accessible ON child_collaborators
  FOR SELECT USING (
    collaborator_id = auth.uid() OR has_child_access(child_id)
  );

DROP POLICY IF EXISTS child_collab_insert_owner ON child_collaborators;
CREATE POLICY child_collab_insert_owner ON child_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS child_collab_delete_owner ON child_collaborators;
CREATE POLICY child_collab_delete_owner ON child_collaborators
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS medications_select_accessible ON medications;
CREATE POLICY medications_select_accessible ON medications
  FOR SELECT USING (has_child_access(child_id));

DROP POLICY IF EXISTS log_events_select_accessible ON log_events;
CREATE POLICY log_events_select_accessible ON log_events
  FOR SELECT USING (has_child_access(child_id));

DROP POLICY IF EXISTS appointments_select_accessible ON appointments;
CREATE POLICY appointments_select_accessible ON appointments
  FOR SELECT USING (has_child_access(child_id));

DROP POLICY IF EXISTS reports_select_accessible ON reports;
CREATE POLICY reports_select_accessible ON reports
  FOR SELECT USING (has_child_access(child_id));

DROP POLICY IF EXISTS reports_insert_accessible ON reports;
CREATE POLICY reports_insert_accessible ON reports
  FOR INSERT WITH CHECK (
    has_child_access(child_id) AND generated_by = auth.uid()
  );

DROP POLICY IF EXISTS medications_insert_writable ON medications;
CREATE POLICY medications_insert_writable ON medications
  FOR INSERT WITH CHECK (has_child_write_access(child_id));

DROP POLICY IF EXISTS medications_update_writable ON medications;
CREATE POLICY medications_update_writable ON medications
  FOR UPDATE USING (has_child_write_access(child_id))
            WITH CHECK (has_child_write_access(child_id));

DROP POLICY IF EXISTS log_events_insert_writable ON log_events;
CREATE POLICY log_events_insert_writable ON log_events
  FOR INSERT WITH CHECK (
    has_child_write_access(child_id) AND logged_by = auth.uid()
  );

DROP POLICY IF EXISTS appointments_insert_writable ON appointments;
CREATE POLICY appointments_insert_writable ON appointments
  FOR INSERT WITH CHECK (has_child_write_access(child_id));

DROP POLICY IF EXISTS appointments_update_writable ON appointments;
CREATE POLICY appointments_update_writable ON appointments
  FOR UPDATE USING (has_child_write_access(child_id))
            WITH CHECK (has_child_write_access(child_id));

DROP POLICY IF EXISTS appointments_delete_writable ON appointments;
CREATE POLICY appointments_delete_writable ON appointments
  FOR DELETE USING (has_child_write_access(child_id));

-- ============================================================
-- Navigator — write-through sync outbox dedup key
-- 0008_sync_outbox_unique.sql
-- ============================================================
-- Cross-device sync pushes locally-authored log_events to the server as an
-- idempotent, insert-only outbox (see apps/web/lib/sync/electric.ts). Each
-- event is uniquely identified by the AUTHORING DEVICE plus that device's
-- per-child monotonic counter: (client_id, sequence_num).
--
-- Supabase's upsert(onConflict: "client_id,sequence_num") requires a matching
-- unique constraint, so re-pushing the same event (after a flaky network, a
-- reload, or a retry) is a harmless no-op instead of a duplicate row.
--
-- This complements 0005's UNIQUE(child_id, sequence_num): that guards a child's
-- own monotonic stream; this guards device-level write idempotency for sync.
--
-- client_id was nullable for rows written before the column existed; Postgres
-- treats NULLs as distinct under UNIQUE, so legacy rows do not collide. New
-- writes always stamp client_id, so the sync path is always covered.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS log_events_client_seq_unique
  ON log_events (client_id, sequence_num)
  WHERE client_id IS NOT NULL;

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

-- ============================================================
-- Navigator — Edge Function rate limiting
-- 0011_rate_limits.sql
-- ============================================================
-- A per-(user, function) fixed-window counter the Edge Functions check before
-- doing expensive work (notably the Claude/Whisper calls — see the risk
-- register's "Claude API cost at scale"). Service-role only: written and read by
-- the functions via the service key; no client access.
--
-- Fixed-window: one row per (actor, function, window_start); the function
-- increments and rejects when count exceeds the limit. Old rows are pruned by
-- the purge_expired job.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  actor_id      UUID NOT NULL,
  fn            TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (actor_id, fn, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits(window_start);

-- Service-role only.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
