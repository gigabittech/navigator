/**
 * Electric sync shape definitions.
 *
 * A "shape" tells Electric which rows of which tables to keep in sync
 * with this device. We scope every shape to the current child(ren).
 *
 * Reference: https://electric-sql.com/docs/guides/shapes
 */

export interface NavigatorShape {
  /** The child whose data this device is allowed to see. */
  childId: string;
}

export function buildShapes(_: NavigatorShape) {
  // return [
  //   { table: "log_events",   where: `child_id = '${childId}'` },
  //   { table: "medications",  where: `child_id = '${childId}'` },
  //   { table: "children",     where: `id       = '${childId}'` },
  //   { table: "appointments", where: `child_id = '${childId}'` },
  //   { table: "reports",      where: `child_id = '${childId}'` },
  // ];
  return [];
}
