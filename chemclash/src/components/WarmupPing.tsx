"use client";

import { useEffect } from "react";
import { pingBackend } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Invisible component mounted in the root layout.
 * 1. Fires a keep-alive ping to wake the Render free-tier server.
 * 2. Calls initAuth() exactly once to hydrate the authenticated account
 *    from the session cookie (GET /auth/me).
 *    If no valid session exists, this is a silent no-op that sets
 *    account = null and initialized = true so pages can redirect.
 */
export default function WarmupPing() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    pingBackend();
    initAuth();
  }, [initAuth]);

  return null;
}
