"use client";

import { useMemo } from "react";
import { useLiveQuery } from "@electric-sql/pglite-react";

interface ProfileNameRow {
  id: string;
  fullName: string | null;
  isOwner: boolean;
}

export interface ProfileNames {
  /** Display name for a profile id (full name, else "Someone"). */
  nameOf: (id: string | null | undefined) => string;
  /** True when the id is the child's owner (the primary logger). */
  isOwner: (id: string | null | undefined) => boolean;
}

/**
 * Resolves logged_by profile ids to display names, and flags the owner. Used by
 * the timeline to attribute each row ("logged by Sam"). Reactive: a new
 * collaborator's name is available as soon as their profile lands locally.
 */
export function useProfileNames(): ProfileNames {
  const res = useLiveQuery<ProfileNameRow>(
    `
    SELECT p.id AS "id",
           p.full_name AS "fullName",
           EXISTS (SELECT 1 FROM children c WHERE c.owner_id = p.id) AS "isOwner"
    FROM profiles p
    `,
    [],
  );
  return useMemo(() => {
    const byId = new Map((res?.rows ?? []).map((r) => [r.id, r]));
    return {
      nameOf: (id) => (id ? byId.get(id)?.fullName ?? "Someone" : "Someone"),
      isOwner: (id) => (id ? byId.get(id)?.isOwner ?? false : false),
    };
  }, [res]);
}
