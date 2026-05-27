-- ============================================================
-- Navigator — Waitlist table
-- 0003_waitlist.sql
-- ============================================================
-- Stores email addresses submitted via the public waitlist form.
-- Accessed server-side only via the Supabase service role key.
-- Anon and authenticated users have no direct access.
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  source      TEXT,                    -- e.g. 'homepage', 'footer', 'waitlist-page'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_entries_email_unique UNIQUE (email)
);

-- Index for fast lookup by email (duplicate-check) and date ordering
CREATE INDEX IF NOT EXISTS waitlist_entries_email_idx      ON waitlist_entries (email);
CREATE INDEX IF NOT EXISTS waitlist_entries_created_at_idx ON waitlist_entries (created_at DESC);

-- RLS: enable but intentionally define NO policies.
-- No policy = no access for anon or authenticated roles.
-- Server-side inserts use the service role key, which bypasses RLS.
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
