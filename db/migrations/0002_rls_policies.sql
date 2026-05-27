-- ============================================================
-- Navigator — RLS policies
-- 0002_rls_policies.sql
-- ============================================================
-- Rule of thumb: a user can see a row if and only if they are the
-- owner of the associated child OR a collaborator on it. The
-- `has_child_access(child_id)` helper centralizes this check.
-- ============================================================

-- Enable RLS on every table ------------------------------------------------
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE children            ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports             ENABLE ROW LEVEL SECURITY;

-- Access predicate ---------------------------------------------------------
CREATE OR REPLACE FUNCTION has_child_access(_child_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM children c
    WHERE c.id = _child_id AND c.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM child_collaborators cc
    WHERE cc.child_id = _child_id AND cc.collaborator_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles -----------------------------------------------------------------
CREATE POLICY profiles_select_self ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- children -----------------------------------------------------------------
CREATE POLICY children_select_accessible ON children
  FOR SELECT USING (has_child_access(id));

CREATE POLICY children_insert_self ON children
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY children_update_owner ON children
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY children_delete_owner ON children
  FOR DELETE USING (owner_id = auth.uid());

-- child_collaborators ------------------------------------------------------
CREATE POLICY child_collab_select_accessible ON child_collaborators
  FOR SELECT USING (
    collaborator_id = auth.uid() OR has_child_access(child_id)
  );

CREATE POLICY child_collab_insert_owner ON child_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.owner_id = auth.uid())
  );

CREATE POLICY child_collab_delete_owner ON child_collaborators
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.owner_id = auth.uid())
  );

-- medications --------------------------------------------------------------
CREATE POLICY medications_select_accessible ON medications
  FOR SELECT USING (has_child_access(child_id));

CREATE POLICY medications_insert_accessible ON medications
  FOR INSERT WITH CHECK (has_child_access(child_id));

CREATE POLICY medications_update_accessible ON medications
  FOR UPDATE USING (has_child_access(child_id)) WITH CHECK (has_child_access(child_id));

-- log_events (no UPDATE/DELETE — rules already block them) -----------------
CREATE POLICY log_events_select_accessible ON log_events
  FOR SELECT USING (has_child_access(child_id));

CREATE POLICY log_events_insert_accessible ON log_events
  FOR INSERT WITH CHECK (
    has_child_access(child_id) AND logged_by = auth.uid()
  );

-- appointments -------------------------------------------------------------
CREATE POLICY appointments_select_accessible ON appointments
  FOR SELECT USING (has_child_access(child_id));

CREATE POLICY appointments_insert_accessible ON appointments
  FOR INSERT WITH CHECK (has_child_access(child_id));

CREATE POLICY appointments_update_accessible ON appointments
  FOR UPDATE USING (has_child_access(child_id)) WITH CHECK (has_child_access(child_id));

CREATE POLICY appointments_delete_accessible ON appointments
  FOR DELETE USING (has_child_access(child_id));

-- reports ------------------------------------------------------------------
CREATE POLICY reports_select_accessible ON reports
  FOR SELECT USING (has_child_access(child_id));

CREATE POLICY reports_insert_accessible ON reports
  FOR INSERT WITH CHECK (
    has_child_access(child_id) AND generated_by = auth.uid()
  );
