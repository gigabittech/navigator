/**
 * Electric sync shape definitions.
 *
 * A "shape" tells Electric which rows of which tables to keep in sync with this
 * device. Every shape is scoped to the current child so a device only ever
 * receives rows the server already authorized into its window (defense-in-depth
 * alongside RLS).
 *
 * Reference: https://electric-sql.com/docs/guides/shapes
 */

export interface NavigatorShape {
  /** The child whose data this device is allowed to see. */
  childId: string;
}

/** One Electric shape: a table plus the row filter that scopes it to a child. */
export interface ShapeDef {
  /** Local table the shape syncs into. */
  table: string;
  /** SQL row filter (Electric `where`), scoping the shape to the child. */
  where: string;
  /** Primary key column(s) Electric uses to upsert rows locally. */
  primaryKey: string[];
}

/**
 * The set of shapes a device subscribes to for one child. Scoped reads only:
 * log_events, medications, children, appointments, reports, and the
 * collaborator list (so co-parents resolve to names on every device).
 *
 * Writes do NOT go through shapes — they are written locally and pushed to
 * Supabase out-of-band (see writeThrough in ./electric). Shapes are read-only.
 */
export function buildShapes({ childId }: NavigatorShape): ShapeDef[] {
  const byChild = `child_id = '${childId}'`;
  return [
    { table: "children", where: `id = '${childId}'`, primaryKey: ["id"] },
    { table: "medications", where: byChild, primaryKey: ["id"] },
    { table: "log_events", where: byChild, primaryKey: ["id"] },
    { table: "appointments", where: byChild, primaryKey: ["id"] },
    { table: "reports", where: byChild, primaryKey: ["id"] },
    { table: "child_collaborators", where: byChild, primaryKey: ["id"] },
  ];
}
