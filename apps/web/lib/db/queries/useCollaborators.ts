"use client";

import { useLiveQuery } from "@electric-sql/pglite-react";

export interface CollaboratorRow {
  /** profiles.id */
  id: string;
  fullName: string | null;
  email: string;
  /** "owner" for the child's owner, else the child_collaborators role. */
  role: "owner" | "co_parent" | "clinician_view";
}

/**
 * The full care circle for a child: the owner plus every collaborator, each
 * resolved to a profile. Reactive — a new invite (a child_collaborators insert)
 * shows up here without a manual refresh.
 *
 * Pass the child id from useChild(); falls back to the first child when omitted
 * (single-device mode has exactly one).
 */
export function useCollaborators(childId?: string): CollaboratorRow[] {
  // The UNION is wrapped in a subquery so the ORDER BY can sort by an
  // expression (owner-first). Postgres forbids expression ORDER BY directly on
  // a set operation — it only allows output column names/positions there.
  const res = useLiveQuery<CollaboratorRow>(
    `
    SELECT * FROM (
      SELECT p.id AS "id", p.full_name AS "fullName", p.email AS "email", 'owner' AS "role"
      FROM children c
      JOIN profiles p ON p.id = c.owner_id
      WHERE ($1::uuid IS NULL OR c.id = $1)
      UNION ALL
      SELECT p.id AS "id", p.full_name AS "fullName", p.email AS "email", cc.role AS "role"
      FROM child_collaborators cc
      JOIN profiles p ON p.id = cc.collaborator_id
      JOIN children c ON c.id = cc.child_id
      WHERE ($1::uuid IS NULL OR cc.child_id = $1)
    ) circle
    ORDER BY "role" = 'owner' DESC, "fullName"
    `,
    [childId ?? null],
  );
  return res?.rows ?? [];
}
