-- ============================================================
-- Navigator — care-circle members can see each other's profiles
-- 0013_profiles_care_circle.sql
-- ============================================================
-- 0002's profiles_select_self made every profile invisible to everyone else.
-- Correct for strangers — but it breaks the share pull: a co-parent's device
-- receives the child row whose owner_id references the OWNER's profile, which
-- RLS hides, so the local FK insert fails and the shared child never lands
-- (verified live in the two-account invite test).
--
-- Replacement: you can read the profile of anyone who shares a child with
-- you — the owner of any child you can access, and any collaborator on any
-- child you can access. That is the entire care circle and nothing more;
-- minimum-necessary holds (email + display name of people you already share
-- a child's PHI with). Self stays included.
--
-- No tables are created here, so no ENABLE ROW LEVEL SECURITY is needed.

DROP POLICY IF EXISTS profiles_select_self ON profiles;
DROP POLICY IF EXISTS profiles_select_care_circle ON profiles;

CREATE POLICY profiles_select_care_circle ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM children c
      WHERE c.owner_id = profiles.id AND has_child_access(c.id)
    )
    OR EXISTS (
      SELECT 1 FROM child_collaborators cc
      WHERE cc.collaborator_id = profiles.id AND has_child_access(cc.child_id)
    )
  );
