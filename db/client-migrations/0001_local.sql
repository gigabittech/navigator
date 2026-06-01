-- ============================================================
-- Navigator — local (on-device) schema for PGlite
-- 0001_local.sql
-- ============================================================
-- This is the CLIENT mirror of db/migrations/0001_init.sql, adapted to run
-- inside PGlite (WASM Postgres) in the browser. Differences from the server
-- migration:
--   • profiles.id is a self-contained UUID (no auth.users FK — there is no
--     Supabase auth schema on the device).
--   • No RLS. Row-level security is a server boundary; the local DB only ever
--     holds the current user's own rows (and, once sync lands, only rows the
--     server already authorized into the device's shape).
-- Everything else — tables, the append-only rules on log_events, indexes,
-- and the updated_at triggers — is identical so projections behave the same
-- on device and on the server.
-- ============================================================

-- profiles -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'parent'
              CHECK (role IN ('parent', 'co_parent', 'clinician_view')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- children -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  preferred_name    TEXT NOT NULL,
  date_of_birth     DATE,
  diagnoses_notes   TEXT,
  pinned_context    JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS children_owner_idx ON children(owner_id);

-- child_collaborators ------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'co_parent'
                  CHECK (role IN ('co_parent', 'clinician_view')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, collaborator_id)
);

CREATE INDEX IF NOT EXISTS child_collab_collab_idx ON child_collaborators(collaborator_id);

-- medications --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  dose_mg           NUMERIC(6,2) NOT NULL,
  category          TEXT,
  scheduled_times   JSONB NOT NULL DEFAULT '[]'::jsonb,
  active            BOOLEAN NOT NULL DEFAULT true,
  started_on        TIMESTAMPTZ,
  stopped_on        TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medications_child_idx ON medications(child_id);

-- log_events (APPEND-ONLY) ------------------------------------------------
CREATE TABLE IF NOT EXISTS log_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  logged_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id     TEXT,
  sequence_num  BIGINT,
  CONSTRAINT valid_event_type CHECK (event_type = ANY(ARRAY[
    'MedicationDoseScheduled',
    'MedicationDoseTaken',
    'MedicationDoseMissed',
    'MedicationDoseRefused',
    'MedicationDoseLate',
    'MedicationDoseVomited',
    'MedicationDoseCorrected',
    'MedicationStarted',
    'MedicationStopped',
    'MedicationDoseAdjusted',
    'BehaviorObserved',
    'MoodLogged',
    'EnergyLogged',
    'TriggerIdentified',
    'VoiceEntryTranscribed',
    'SchoolIncidentLogged',
    'TeacherNoteReceived',
    'IEPMeetingLogged',
    'WearOffWindowObserved',
    'SideEffectObserved',
    'SleepQualityLogged',
    'AppetiteLogged'
  ])),
  -- Per-child sequence_num must be unique: the counter is assigned via a
  -- max()+1 subquery at INSERT time, so a collision (e.g. two near-concurrent
  -- writes reading the same max) fails loudly and the writer retries rather
  -- than silently duplicating a sequence. Mirrors server migration 0005.
  -- NULLs are distinct under UNIQUE, so unpopulated rows don't collide.
  CONSTRAINT log_events_child_seq_unique UNIQUE (child_id, sequence_num)
);

CREATE INDEX IF NOT EXISTS log_events_child_occurred_idx ON log_events(child_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS log_events_child_seq_idx ON log_events(child_id, sequence_num);
CREATE INDEX IF NOT EXISTS log_events_type_idx ON log_events(event_type);

-- Append-only enforcement: UPDATE/DELETE FAIL LOUDLY (CLAUDE.md). Application
-- code never tries — to "edit" a past event, emit a *Corrected event. This
-- mirrors server migration 0004; the original silent DO-INSTEAD-NOTHING rules
-- discarded writes without raising, which hid bugs.
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

-- appointments ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  "with"        TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  prep_notes    TEXT,
  post_notes    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_child_idx ON appointments(child_id, scheduled_for);

-- reports -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  generated_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  range_start   DATE NOT NULL,
  range_end     DATE NOT NULL,
  body          JSONB NOT NULL,
  narrative     TEXT,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_child_generated_idx ON reports(child_id, generated_at DESC);

-- push_subscriptions -------------------------------------------------------
-- Mirrors the server table (db/migrations/0009). Local-first: the reminder
-- toggle reads/writes here; sync carries the rows to the server, which the
-- send_reminders function reads. No RLS on device (single user's own rows).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subs_child_idx ON push_subscriptions(child_id);

-- updated_at trigger -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS children_updated_at ON children;
DROP TRIGGER IF EXISTS medications_updated_at ON medications;
DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;

CREATE TRIGGER profiles_updated_at      BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER children_updated_at      BEFORE UPDATE ON children      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER medications_updated_at   BEFORE UPDATE ON medications   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_updated_at  BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
