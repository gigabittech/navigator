-- ============================================================
-- Navigator — append-only enforcement, fail loudly
-- 0004_append_only_triggers.sql
-- ============================================================
-- CLAUDE.md mandates that log_events is append-only and that any attempt to
-- UPDATE or DELETE must FAIL LOUDLY, not be silently swallowed. The original
-- 0001_init.sql used `DO INSTEAD NOTHING` rewrite rules, which discard the
-- write without raising — a correctness hazard: a buggy caller (or a future
-- sync path) could "edit" a log and never know the write was dropped.
--
-- This migration drops those silent rules and replaces them with BEFORE
-- triggers that RAISE EXCEPTION. The on-device mirror lives in
-- db/client-migrations/0001_local.sql.
-- ============================================================

-- Drop the silent INSTEAD-NOTHING rules from 0001_init.sql.
DROP RULE IF EXISTS no_update_log_events ON log_events;
DROP RULE IF EXISTS no_delete_log_events ON log_events;

-- Raise on any UPDATE or DELETE. log_events is append-only: to "edit" a past
-- event, INSERT a MedicationDoseCorrected event referencing the original.
CREATE OR REPLACE FUNCTION log_events_append_only() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'log_events is append-only: % is not allowed. Emit a *Corrected event instead.',
    TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_events_no_update ON log_events;
DROP TRIGGER IF EXISTS log_events_no_delete ON log_events;

CREATE TRIGGER log_events_no_update
  BEFORE UPDATE ON log_events
  FOR EACH ROW EXECUTE FUNCTION log_events_append_only();

CREATE TRIGGER log_events_no_delete
  BEFORE DELETE ON log_events
  FOR EACH ROW EXECUTE FUNCTION log_events_append_only();
