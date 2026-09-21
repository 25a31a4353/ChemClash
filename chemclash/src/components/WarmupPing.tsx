"use client";

import { useEffect } from "react";
import { pingBackend } from "@/lib/api";

/**
 * Invisible component that fires a single fire-and-forget ping to /api/ping
 * the moment any page mounts. Wakes the Render free-tier server so it is
 * warm before the first real API call (PYQ fetch, profile load, etc.).
 * Renders nothing — zero visual impact.
 */
export default function WarmupPing() {
  useEffect(() => {
    pingBackend();
  }, []);
  return null;
}
