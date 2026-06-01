/**
 * Co-parent SQL coverage. Runs the exact queries used by useCollaborators,
 * useProfileNames, and the invite/remove mutations against an in-memory PGlite,
 * so a regression in the (non-trivial) UNION / upsert SQL fails loudly here
 * rather than silently in the browser.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, "../../../../../../db/client-migrations/0001_local.sql");

// Mirrors useCollaborators.ts (kept in sync deliberately).
const CIRCLE_SQL = `
  SELECT * FROM (
    SELECT p.id AS "id", p.full_name AS "fullName", p.email AS "email", 'owner' AS "role"
    FROM children c JOIN profiles p ON p.id = c.owner_id
    WHERE ($1::uuid IS NULL OR c.id = $1)
    UNION ALL
    SELECT p.id, p.full_name, p.email, cc.role
    FROM child_collaborators cc
    JOIN profiles p ON p.id = cc.collaborator_id
    JOIN children c ON c.id = cc.child_id
    WHERE ($1::uuid IS NULL OR cc.child_id = $1)
  ) circle
  ORDER BY "role" = 'owner' DESC, "fullName"`;

interface Row {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
}

let db: PGlite;
let childId: string;
let ownerId: string;

beforeEach(async () => {
  db = await PGlite.create();
  await db.exec(readFileSync(MIGRATION_PATH, "utf8"));
  ownerId = (
    await db.query<{ id: string }>(
      `INSERT INTO profiles (id,email,full_name,role)
       VALUES (gen_random_uuid(),'owner@x.com','Demo Parent','parent') RETURNING id`,
    )
  ).rows[0]!.id;
  childId = (
    await db.query<{ id: string }>(
      `INSERT INTO children (owner_id,preferred_name) VALUES ($1,'Wren') RETURNING id`,
      [ownerId],
    )
  ).rows[0]!.id;
});

async function invite(email: string, role: string): Promise<number> {
  const collaboratorId = (
    await db.query<{ id: string }>(
      `INSERT INTO profiles (id,email,role) VALUES (gen_random_uuid(),$1,$2)
       ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING id`,
      [email, role],
    )
  ).rows[0]!.id;
  const res = await db.query(
    `INSERT INTO child_collaborators (child_id,collaborator_id,role) VALUES ($1,$2,$3)
     ON CONFLICT (child_id,collaborator_id) DO NOTHING`,
    [childId, collaboratorId, role],
  );
  return res.affectedRows ?? 0;
}

describe("co-parent care circle (useCollaborators)", () => {
  it("returns the owner alone when there are no collaborators", async () => {
    const rows = (await db.query<Row>(CIRCLE_SQL, [childId])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.role).toBe("owner");
  });

  it("lists the owner first, then collaborators by name", async () => {
    await invite("sam@x.com", "co_parent");
    await invite("dr@x.com", "clinician_view");
    const rows = (await db.query<Row>(CIRCLE_SQL, [childId])).rows;
    expect(rows).toHaveLength(3);
    expect(rows[0]!.role).toBe("owner"); // owner pinned first
    expect(rows.map((r) => r.role)).toContain("co_parent");
    expect(rows.map((r) => r.role)).toContain("clinician_view");
  });
});

describe("invite (inviteCollaborator)", () => {
  it("links a collaborator and is idempotent on re-invite", async () => {
    expect(await invite("sam@x.com", "co_parent")).toBe(1); // first add
    expect(await invite("sam@x.com", "co_parent")).toBe(0); // dedup, no error
  });
});

describe("remove (removeCollaborator)", () => {
  it("removes a collaborator without touching the owner", async () => {
    await invite("sam@x.com", "co_parent");
    const sam = (
      await db.query<{ id: string }>(`SELECT id FROM profiles WHERE email='sam@x.com'`)
    ).rows[0]!.id;
    await db.query(`DELETE FROM child_collaborators WHERE child_id=$1 AND collaborator_id=$2`, [
      childId,
      sam,
    ]);
    const rows = (await db.query<Row>(CIRCLE_SQL, [childId])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.role).toBe("owner");
  });
});

describe("profile name resolution (useProfileNames)", () => {
  it("flags the owner and resolves names", async () => {
    await invite("sam@x.com", "co_parent");
    const rows = (
      await db.query<{ id: string; fullName: string | null; isOwner: boolean }>(
        `SELECT p.id AS "id", p.full_name AS "fullName",
                EXISTS (SELECT 1 FROM children c WHERE c.owner_id = p.id) AS "isOwner"
         FROM profiles p`,
      )
    ).rows;
    const owner = rows.find((r) => r.id === ownerId)!;
    expect(owner.isOwner).toBe(true);
    expect(rows.some((r) => r.fullName === null && r.isOwner === false)).toBe(true); // invited, no name yet
  });
});
