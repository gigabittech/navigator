-- ============================================================
-- Navigator — initial schema
-- 0001_init.sql
-- ============================================================
-- Run order: this migration → 0002_rls_policies.sql
-- ============================================================

-- Required extensions ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- profiles -----------------------------------------------------------------
-- One row per Supabase auth user. RLS in 0002 restricts reads.
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- Many-to-many between profiles and children. The parent (owner_id on
-- children) is the canonical owner; collaborators are co-parents and
-- read-only clinician views.
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
-- This is the canonical write surface for the two highest-frequency
-- domains: medication logging and behavioral observations. UPDATE and
-- DELETE are blocked at the DB level — to "edit" a past event, INSERT
-- a `MedicationDoseCorrected` event referencing the original.
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
  ]))
);

CREATE INDEX IF NOT EXISTS log_events_child_occurred_idx ON log_events(child_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS log_events_child_seq_idx ON log_events(child_id, sequence_num);
CREATE INDEX IF NOT EXISTS log_events_type_idx ON log_events(event_type);

-- Append-only enforcement -- DB will silently swallow UPDATE/DELETE rather
-- than raising. The expectation is that application code never tries.
-- Both ON UPDATE and ON DELETE are wrapped in INSTEAD-NOTHING rules.
CREATE OR REPLACE RULE no_update_log_events AS
  ON UPDATE TO log_events DO INSTEAD NOTHING;

CREATE OR REPLACE RULE no_delete_log_events AS
  ON DELETE TO log_events DO INSTEAD NOTHING;

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

-- Trigger to keep `updated_at` honest --------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at      BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER children_updated_at      BEFORE UPDATE ON children      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER medications_updated_at   BEFORE UPDATE ON medications   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_updated_at  BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
