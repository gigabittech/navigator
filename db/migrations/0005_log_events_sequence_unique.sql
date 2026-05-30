-- ============================================================
-- Navigator — per-child sequence uniqueness on log_events
-- 0005_log_events_sequence_unique.sql
-- ============================================================
-- sequence_num is a per-child monotonic counter assigned at INSERT time via
-- `(SELECT max(sequence_num) + 1 ... WHERE child_id = $1)`. Without a
-- uniqueness guarantee, two concurrent inserts for the same child can read
-- the same max and both claim the same sequence_num — a silent collision that
-- breaks ordering and de-duplication across the (deferred) sync path.
--
-- This adds a UNIQUE(child_id, sequence_num) constraint so a collision fails
-- loudly (the writer retries) instead of corrupting the stream. The mirror on
-- device lives in db/client-migrations/0001_local.sql.
--
-- NULL sequence_num is still permitted (rows written before this column was
-- populated); Postgres treats NULLs as distinct under UNIQUE, so those rows
-- do not collide.
-- ============================================================

ALTER TABLE log_events
  ADD CONSTRAINT log_events_child_seq_unique UNIQUE (child_id, sequence_num);
