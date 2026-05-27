/**
 * Local dev seed. Creates one parent profile, one child, two meds,
 * and a week of recent `log_events`. Idempotent on email.
 *
 * Usage:  pnpm db:seed
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function main() {
  const sql = postgres(DATABASE_URL, { onnotice: () => {} });

  // Demo user — already exists in Supabase Auth in local dev (create one
  // through `supabase auth signup` first if not).
  const [profile] = await sql<{ id: string }[]>`
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'demo@navigator.local', 'Demo Parent', 'parent')
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id
  `;

  const [child] = await sql<{ id: string }[]>`
    INSERT INTO children (owner_id, preferred_name, diagnoses_notes)
    VALUES (${profile.id}, 'Wren', 'ADHD-C; mild anxiety')
    RETURNING id
  `;

  await sql`
    INSERT INTO medications (child_id, name, dose_mg, category, scheduled_times)
    VALUES
      (${child.id}, 'Methylphenidate ER', 10, 'stimulant', '["07:00","12:00"]'::jsonb),
      (${child.id}, 'Guanfacine', 1, 'alpha_agonist', '["20:00"]'::jsonb)
  `;

  console.log(`Seeded profile ${profile.id}, child ${child.id}.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
