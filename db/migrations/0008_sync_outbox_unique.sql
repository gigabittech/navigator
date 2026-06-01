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
