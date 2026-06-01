# db/

Database lives in Supabase Postgres. This folder has:

```
db/
├── migrations/        SQL migrations, run in lexical order
│   ├── 0001_init.sql       schema (tables, indexes, append-only rules)
│   ├── 0002_rls_policies.sql   RLS — required for app tables
│   └── 0003_waitlist.sql       server-only public waitlist table
├── drizzle.config.ts  Drizzle Kit config (schema lives in packages/schema)
├── migrate.ts         migration runner (postgres-js)
└── seed.ts            dev seed
```

## Workflow

```bash
# Boot a local Postgres + Auth + Storage via Supabase CLI:
pnpm db:start

# Apply migrations:
pnpm db:migrate

# Drop in a sample child + meds:
pnpm db:seed

# Inspect schema interactively:
pnpm db:studio
```

## When you change the schema

1. Edit the Drizzle table definitions in `packages/schema/src/<table>.ts`.
2. Run `pnpm db:generate` from repo root — Drizzle Kit writes a new
   `NNNN_*.sql` file into `db/migrations/`.
3. **Read the SQL.** If you created a new table, add its RLS policies to
   the same file. Drizzle does not infer RLS.
4. Run `pnpm db:migrate` locally.
5. Commit the schema diff + migration together.

## RLS rule

Every table has `ENABLE ROW LEVEL SECURITY` and an explicit policy. The
access predicate is `has_child_access(child_id)` (defined in `0002_*.sql`).
Use it instead of writing per-table joins.
