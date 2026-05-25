/**
 * Shared SELECT column lists. Columns are aliased to camelCase so query
 * results arrive in the shapes declared in ./types.ts (and line up with the
 * camelCase types from @navigator/schema used by projections + the report).
 */

export const EVENT_COLUMNS = `
  id,
  child_id      AS "childId",
  logged_by     AS "loggedBy",
  event_type    AS "eventType",
  payload,
  occurred_at   AS "occurredAt",
  recorded_at   AS "recordedAt",
  client_id     AS "clientId",
  sequence_num  AS "sequenceNum"
`;

export const MEDICATION_COLUMNS = `
  id,
  child_id        AS "childId",
  name,
  dose_mg         AS "doseMg",
  category,
  scheduled_times AS "scheduledTimes",
  active,
  started_on      AS "startedOn",
  stopped_on      AS "stoppedOn",
  notes
`;

export const CHILD_COLUMNS = `
  id,
  owner_id        AS "ownerId",
  preferred_name  AS "preferredName",
  date_of_birth   AS "dateOfBirth",
  diagnoses_notes AS "diagnosesNotes",
  pinned_context  AS "pinnedContext"
`;

export const APPOINTMENT_COLUMNS = `
  id,
  child_id      AS "childId",
  kind,
  "with",
  scheduled_for AS "scheduledFor",
  prep_notes    AS "prepNotes",
  post_notes    AS "postNotes"
`;
