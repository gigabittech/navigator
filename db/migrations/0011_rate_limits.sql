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
