-- ============================================================
-- Navigator — children SELECT policy must see in-flight rows
-- 0012_children_select_inflight.sql
-- ============================================================
-- Postgres applies the SELECT policy to rows appended by
-- INSERT ... ON CONFLICT DO UPDATE (and to RETURNING). The 0002 policy was
-- USING (has_child_access(id)) — a SECURITY DEFINER subquery into children
-- ITSELF, which cannot see the row currently being inserted (command-id
-- visibility), so every upsert of a NEW child failed with 42501 even for its
-- owner. Verified live: plain INSERT passed, the same row via upsert was
-- rejected.
--
-- Fix: put the owner check directly in the policy expression — a direct
-- predicate evaluates against the candidate row itself, no table visibility
-- needed. Collaborator access keeps the subquery (collaborators never insert
-- children, so in-flight visibility never matters on that arm). Semantics are
-- unchanged: has_child_access() already returned true for owners — this is the
-- same predicate made upsert-safe (and cheaper for the owner fast-path).
--
-- No tables are created here, so no ENABLE ROW LEVEL SECURITY is needed
-- (RLS is already on from 0002).

DROP POLICY IF EXISTS children_select_accessible ON children;

CREATE POLICY children_select_accessible ON children
  FOR SELECT USING (
    owner_id = auth.uid() OR has_child_access(id)
  );
