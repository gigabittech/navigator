/** Format a Postgres NUMERIC dose ("10.00") as a clean number ("10"). */
export function formatDose(mg: string | number): string {
  const n = typeof mg === "number" ? mg : Number(mg);
  if (!Number.isFinite(n)) return String(mg);
  return n.toString();
}
