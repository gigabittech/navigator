/**
 * Private-preview gate primitives, shared by middleware (edge runtime) and the
 * unlock Server Action (node runtime) — Web Crypto only, no node:crypto.
 *
 * The whole site sits behind one shared password until launch. Entering it
 * sets a cookie whose value is a digest derived from the password, so rotating
 * PREVIEW_PASSWORD invalidates every existing pass. Unset PREVIEW_PASSWORD to
 * remove the gate entirely (launch day is deleting one env var).
 *
 * This is a curtain, not a vault: it keeps the unannounced product out of
 * casual view. Real security remains where it always was — Supabase Auth and
 * RLS behind the gate.
 */

export const PREVIEW_COOKIE = "navigator_preview";

/** Versioned salt: bump to force every issued pass to re-enter the password. */
const SALT = "navigator-preview-v1";

export function isPreviewGateEnabled(): boolean {
  return Boolean(process.env.PREVIEW_PASSWORD?.trim());
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value a holder of the current password is granted. */
export function previewCookieValue(): Promise<string> {
  return sha256Hex(`${process.env.PREVIEW_PASSWORD ?? ""}:${SALT}`);
}

/**
 * Constant-time check of a submitted password. Compares digests so length
 * differences leak nothing.
 */
export async function isPreviewPassword(submitted: string): Promise<boolean> {
  const expected = process.env.PREVIEW_PASSWORD?.trim();
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256Hex(submitted), sha256Hex(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
