/**
 * Runtime feature detection. Navigator runs fully in local single-device mode
 * with no backend. When Supabase env is present, the auth / sync / AI layers
 * switch on. These helpers gate that without any code-path branching elsewhere.
 */

const PLACEHOLDERS = new Set(["", "eyJ...", "ci-placeholder", "sk-...", "sk-ant-..."]);

function real(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && !PLACEHOLDERS.has(value);
}

/** True when a usable Supabase URL + anon key are configured. */
export function isSupabaseConfigured(): boolean {
  return (
    real(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    real(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
