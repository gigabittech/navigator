"use client";

import type { PGliteInterface } from "@electric-sql/pglite";

export type CollaboratorRole = "co_parent" | "clinician_view";

export interface InviteResult {
  ok: boolean;
  /** Voice-compliant message for the UI. */
  message: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Add a collaborator to the active child by email.
 *
 * Local-first: this writes a profile + child_collaborators row to the on-device
 * database so the care circle updates immediately. Cross-device delivery — the
 * co-parent receiving access on *their* device — arrives with sync (Phase 2);
 * until then this shares within this device. The message says so honestly.
 */
export async function inviteCollaborator(
  db: PGliteInterface,
  childId: string,
  email: string,
  role: CollaboratorRole,
  /**
   * The invitee's REAL server user id, when the server invite ran first.
   * Aligning ids means this local row and the synced row are the same person;
   * without it (local mode) a self-contained random id is used.
   */
  knownCollaboratorId?: string,
): Promise<InviteResult> {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  // Upsert the invited profile by email (no name yet — they set it on join).
  const profileRes = await db.query<{ id: string }>(
    `INSERT INTO profiles (id, email, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [knownCollaboratorId ?? crypto.randomUUID(), trimmed, role],
  );
  const collaboratorId = profileRes.rows[0]!.id;

  // Link them to the child. Unique (child_id, collaborator_id) makes re-invites
  // a no-op rather than an error.
  const linkRes = await db.query(
    `INSERT INTO child_collaborators (child_id, collaborator_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (child_id, collaborator_id) DO NOTHING`,
    [childId, collaboratorId, role],
  );

  if (linkRes.affectedRows === 0) {
    return { ok: true, message: "They already share this child." };
  }

  const who = role === "clinician_view" ? "a clinician" : "a co-parent";
  return {
    ok: true,
    message: `Added ${who}. They'll get access on their own device once sync is on.`,
  };
}

/** Remove a collaborator from the active child. The owner can't be removed. */
export async function removeCollaborator(
  db: PGliteInterface,
  childId: string,
  collaboratorId: string,
): Promise<void> {
  await db.query(
    `DELETE FROM child_collaborators WHERE child_id = $1 AND collaborator_id = $2`,
    [childId, collaboratorId],
  );
}
