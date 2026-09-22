"use client";

import { useEffect } from "react";
import { pingBackend } from "@/lib/api";
import { useChemStore } from "@/store/useChemStore";

/**
 * Invisible component that:
 * 1. Fires a single fire-and-forget ping to /api/ping to wake the Render free-tier server.
 * 2. Hydrates ChemCoins + daily-mission state + username from localStorage once on mount.
 *    This ensures every page (not just Dashboard) shows the correct coin balance and username.
 * Renders nothing — zero visual impact.
 */
export default function WarmupPing() {
  useEffect(() => {
    pingBackend();

    // Hydrate Zustand store from localStorage.
    // SSR initialises chemCoins to 0 and username to "player" — fix on first client render.
    const storedCoins  = parseInt(localStorage.getItem("chemclash_coins") ?? "0", 10);
    const storedName   = localStorage.getItem("chemclash_user_name");
    const storedUserId = localStorage.getItem("chemclash_user_id");
    const today        = new Date().toISOString().slice(0, 10);

    useChemStore.setState({
      chemCoins: isNaN(storedCoins) ? 0 : storedCoins,
      dailyMissions: {
        loginClaimed:     localStorage.getItem("chemclash_login_date") === today,
        challengeClaimed: localStorage.getItem("chemclash_challenge_date") === today,
      },
      ...(storedName   ? { username: storedName }   : {}),
      ...(storedUserId ? { userId:   storedUserId } : {}),
    });
  }, []);
  return null;
}
