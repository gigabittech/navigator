-- ============================================================
-- Navigator — constrain write access by collaborator role
-- 0006_write_access_rls.sql
-- ============================================================
-- Background: 0002 gated every write behind has_child_access(), which is true
-- for ANY collaborator — including read-only `clinician_view`. That let a
-- clinician-view collaborator INSERT/UPDATE/DELETE medications, appointments,
-- and log_events. This migration introduces has_child_write_access(), which
-- EXCLUDES clinician_view, and repoints all write policies at it. Read (SELECT)
-- policies are unchanged: clinicians keep read-only access.
--
-- No tables are created here, so no ENABLE ROW LEVEL SECURITY is needed (RLS is
-- already on from 0002).
-- ============================================================

-- Write-access predicate ---------------------------------------------------
-- True when the caller is the child's owner, OR a collaborator whose role is
-- NOT clinician_view. SECURITY DEFINER + STABLE mirrors has_child_access().
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

-- medications --------------------------------------------------------------
DROP POLICY IF EXISTS medications_insert_accessible ON medications;
DROP POLICY IF EXISTS medications_update_accessible ON medications;

CREATE POLICY medications_insert_writable ON medications
  FOR INSERT WITH CHECK (has_child_write_access(child_id));

CREATE POLICY medications_update_writable ON medications
  FOR UPDATE USING (has_child_write_access(child_id))
            WITH CHECK (has_child_write_access(child_id));

-- log_events (append-only; INSERT is the only write) -----------------------
DROP POLICY IF EXISTS log_events_insert_accessible ON log_events;

CREATE POLICY log_events_insert_writable ON log_events
  FOR INSERT WITH CHECK (
    has_child_write_access(child_id) AND logged_by = auth.uid()
  );

-- appointments -------------------------------------------------------------
DROP POLICY IF EXISTS appointments_insert_accessible ON appointments;
DROP POLICY IF EXISTS appointments_update_accessible ON appointments;
DROP POLICY IF EXISTS appointments_delete_accessible ON appointments;

CREATE POLICY appointments_insert_writable ON appointments
  FOR INSERT WITH CHECK (has_child_write_access(child_id));

CREATE POLICY appointments_update_writable ON appointments
  FOR UPDATE USING (has_child_write_access(child_id))
            WITH CHECK (has_child_write_access(child_id));

CREATE POLICY appointments_delete_writable ON appointments
  FOR DELETE USING (has_child_write_access(child_id));
