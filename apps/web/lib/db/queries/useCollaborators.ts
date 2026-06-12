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
 *
 * Two constraints shape the SQL:
 *  - PGlite's live extension substitutes parameters POSITIONALLY: each `$n`
 *    placeholder must appear exactly once, with one argument per placeholder.
 *    Reusing `$1` four times threw `too few arguments for format()` at runtime
 *    (raw db.query tolerates reuse, so unit tests never caught it).
 *  - Postgres forbids expression ORDER BY directly on a UNION, so the
 *    owner-first ordering happens in JS instead of SQL.
 */
export function useCollaborators(childId?: string): CollaboratorRow[] {
  const id = childId ?? null;
  const res = useLiveQuery<CollaboratorRow>(
    `
    SELECT p.id AS "id", p.full_name AS "fullName", p.email AS "email", 'owner' AS "role"
    FROM children c
    JOIN profiles p ON p.id = c.owner_id
    WHERE ($1::uuid IS NULL OR c.id = $2)
    UNION ALL
    SELECT p.id AS "id", p.full_name AS "fullName", p.email AS "email", cc.role AS "role"
    FROM child_collaborators cc
    JOIN profiles p ON p.id = cc.collaborator_id
    JOIN children c ON c.id = cc.child_id
    WHERE ($3::uuid IS NULL OR cc.child_id = $4)
    `,
    [id, id, id, id],
  );
  const rows = res?.rows ?? [];
  return [...rows].sort((a, b) => {
    if (a.role === "owner" !== (b.role === "owner")) return a.role === "owner" ? -1 : 1;
    return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
  });
}
