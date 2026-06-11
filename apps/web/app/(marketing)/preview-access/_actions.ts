"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_COOKIE, isPreviewPassword, previewCookieValue } from "@/lib/auth/preview";

/**
 * Check the preview password and grant the pass cookie. Wrong password loops
 * back with a generic error; a valid one continues to where the visitor was
 * headed. Only same-site paths are honored (no open redirect).
 */
export async function unlock(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const fromRaw = String(formData.get("from") ?? "");
  const from = fromRaw.startsWith("/") && !fromRaw.startsWith("//") ? fromRaw : "/";

  if (!(await isPreviewPassword(password))) {
    const params = new URLSearchParams({ error: "1" });
    if (from !== "/") params.set("from", from);
    redirect(`/preview-access?${params.toString()}`);
  }

  cookies().set(PREVIEW_COOKIE, await previewCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // a month; rotating the password revokes early
  });

  redirect(from);
}
