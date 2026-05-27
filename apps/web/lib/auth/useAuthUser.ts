"use client";

/**
 * Reactive hook that returns the currently authenticated Supabase user,
 * or null in local-only mode or when no session exists.
 */

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/auth/supabase";
import { isSupabaseConfigured } from "@/lib/config";

export interface AuthUser {
  id: string;
  email: string | null;
}

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createBrowserClient();

    // Populate from the current session immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null });
      }
    });

    // Keep in sync with sign-in / sign-out events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
