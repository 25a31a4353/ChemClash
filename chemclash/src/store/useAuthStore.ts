/**
 * ChemClash — Auth Store (Zustand)
 *
 * Manages the authenticated account state.
 * The session lives in an HttpOnly cookie set by the backend.
 * This store only holds the decoded account metadata returned by GET /auth/me.
 *
 * On every app mount, `initAuth()` is called by WarmupPing to hydrate the store
 * from the active session (or clear it if the session has expired).
 */

import { create } from "zustand";
import {
  authGetMe,
  authLogin,
  authLogout,
  authSignup,
  authUpdateMe,
  authAdjustCoins,
  type ChemAccount,
} from "@/lib/api";
import { useChemStore } from "@/store/useChemStore";

interface AuthState {
  account: ChemAccount | null;
  loading: boolean;        // true while initAuth / login / signup is in-flight
  initialized: boolean;    // true after the first initAuth() completes

  // Actions
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<ChemAccount>;
  signup: (email: string, password: string, displayName: string) => Promise<ChemAccount>;
  logout: () => Promise<void>;
  updateAccount: (updates: Parameters<typeof authUpdateMe>[0]) => Promise<void>;
  earnCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number, rewardId: string) => Promise<void>;
  setAccount: (account: ChemAccount | null) => void;
}

function syncAccountToStorage(account: ChemAccount) {
  if (typeof window === "undefined") return;
  localStorage.setItem("chemclash_user_id", account.user_id);
  localStorage.setItem("chemclash_user_email", account.email);
  localStorage.setItem("chemclash_user_name", account.display_name);
  localStorage.setItem("chemclash_coins", String(account.chem_coins));
  if (account.onboarding_done) {
    localStorage.setItem("chemclash_onboarding_done", "1");
  }
  if (account.tour_done) {
    localStorage.setItem("chemclash_tour_done", "1");
  }
}

function clearAccountStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("chemclash_token");
  localStorage.removeItem("chemclash_user_id");
  localStorage.removeItem("chemclash_user_email");
  localStorage.removeItem("chemclash_user_name");
  localStorage.removeItem("chemclash_onboarding_done");
  localStorage.removeItem("chemclash_tour_done");
  localStorage.removeItem("chemclash_coins");
}

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  loading: false,
  initialized: false,

  // ── initAuth ────────────────────────────────────────────────────────────
  // Checks if a valid session cookie or token exists; hydrates account if so.
  // Called once on app mount; subsequent page navigations are instant.
  initAuth: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const account = await authGetMe();
      set({ account, loading: false, initialized: true });
      syncAccountToStorage(account);
      // Sync name + userId into the existing Zustand chemistry store
      useChemStore.setState({
        username: account.display_name,
        userId:   account.user_id,
        chemCoins: account.chem_coins,
      });
      Promise.all([
        useChemStore.getState().loadPlayerProfile(),
        useChemStore.getState().refreshProfile(),
      ]).catch(() => {});
    } catch {
      // 401 means no valid session — that's normal for unauthenticated users
      set({ account: null, loading: false, initialized: true });
    }
  },

  // ── login ────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { account } = await authLogin(email, password);
      set({ account, loading: false });
      syncAccountToStorage(account);
      useChemStore.setState({
        username: account.display_name,
        userId:   account.user_id,
        chemCoins: account.chem_coins,
      });
      Promise.all([
        useChemStore.getState().loadPlayerProfile(),
        useChemStore.getState().refreshProfile(),
      ]).catch(() => {});
      return account;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── signup ───────────────────────────────────────────────────────────────
  signup: async (email, password, displayName) => {
    set({ loading: true });
    try {
      const { account } = await authSignup(email, password, displayName);
      set({ account, loading: false });
      syncAccountToStorage(account);
      useChemStore.setState({
        username: account.display_name,
        userId:   account.user_id,
        chemCoins: account.chem_coins,
      });
      Promise.all([
        useChemStore.getState().loadPlayerProfile(),
        useChemStore.getState().refreshProfile(),
      ]).catch(() => {});
      return account;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  // ── logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    await authLogout();
    clearAccountStorage();
    set({ account: null });
    useChemStore.setState({
      username: "player",
      userId: "",
      profile: null,
      eloRating: 1200,
      dailyStreak: 0,
      chemCoins: 0,
    });
  },

  // ── updateAccount ────────────────────────────────────────────────────────
  updateAccount: async (updates) => {
    try {
      const account = await authUpdateMe(updates);
      set({ account });
      if (updates.display_name) {
        useChemStore.setState({ username: updates.display_name });
      }
    } catch (err) {
      console.error("updateAccount failed:", err);
      throw err;
    }
  },

  // ── earnCoins ────────────────────────────────────────────────────────────
  earnCoins: async (amount) => {
    try {
      const account = await authAdjustCoins(amount);
      set({ account });
      useChemStore.setState({ chemCoins: account.chem_coins });
      // Also sync to localStorage for offline fallback
      if (typeof window !== "undefined") {
        localStorage.setItem("chemclash_coins", String(account.chem_coins));
      }
    } catch {
      // Non-fatal: optimistic local update
      const current = get().account;
      if (current) {
        const next = current.chem_coins + amount;
        set({ account: { ...current, chem_coins: next } });
        useChemStore.setState({ chemCoins: next });
        if (typeof window !== "undefined") {
          localStorage.setItem("chemclash_coins", String(next));
        }
      }
    }
  },

  // ── spendCoins ───────────────────────────────────────────────────────────
  spendCoins: async (amount, rewardId) => {
    const current = get().account;
    if (!current) throw new Error("Not authenticated");
    if (current.chem_coins < amount) {
      throw new Error(`Insufficient ChemCoins (have ${current.chem_coins}, need ${amount})`);
    }
    if (current.owned_rewards.includes(rewardId)) {
      throw new Error("Reward already owned");
    }
    const account = await authAdjustCoins(-amount, rewardId);
    set({ account });
    useChemStore.setState({ chemCoins: account.chem_coins });
    if (typeof window !== "undefined") {
      localStorage.setItem("chemclash_coins", String(account.chem_coins));
    }
  },

  // ── setAccount ───────────────────────────────────────────────────────────
  setAccount: (account) => set({ account }),
}));
