/**
 * ChemClash — Zustand Global Store
 *
 * Manages:
 *   • Player profile (ELO, streak, accuracy)
 *   • Adaptive PYQ session (current question, seen ids, answer state)
 *   • Prefetch queue for instant round transitions
 *   • ChemCoins + Daily Missions (localStorage-persisted)
 */

import { create } from "zustand";
import {
  fetchAdaptivePYQ,
  fetchDemoPYQ,
  submitAnswer,
  fetchProfile,
  fetchUserProfile,
  syncMatchResult,
  type PYQQuestion,
  type AdaptivePYQResponse,
  type AnswerResult,
  type WeaknessProfile,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type QuestionPhase =
  | "loading"     // fetching from backend
  | "answering"   // student is reading & choosing
  | "revealing"   // showing correct/incorrect overlay
  | "next";       // transitioning to next question

interface AdaptiveSession {
  userId: string;
  phase: QuestionPhase;
  current: AdaptivePYQResponse | null;
  prefetchQueue: AdaptivePYQResponse[];   // pre-fetched next questions
  seenIds: string[];
  lastResult: AnswerResult | null;
  error: string | null;
}

interface PlayerState {
  username: string;
  eloRating: number;
  dailyStreak: number;
  profile: WeaknessProfile | null;
}

// ── Anonymous persistent user ID ─────────────────────────────────────────
// Generated once per browser, stored in localStorage, reused on every reload.
// Gives every visitor their own profile without requiring authentication.

const LS_KEY_USER_ID = "chemclash_user_id";

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr-placeholder";
  let id = localStorage.getItem(LS_KEY_USER_ID);
  if (!id) {
    // crypto.randomUUID is available in all modern browsers and Node 16+
    id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(LS_KEY_USER_ID, id);
  }
  return id;
}

// ── ChemCoins / Daily Missions ────────────────────────────────────────────

/** Keys stored in localStorage to track which daily rewards have been claimed. */
const LS_KEY_LOGIN    = "chemclash_login_date";
const LS_KEY_CHALLENGE = "chemclash_challenge_date";
const LS_KEY_COINS    = "chemclash_coins";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function readCoins(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LS_KEY_COINS) ?? "0", 10);
}

function saveCoins(n: number): void {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY_COINS, String(n));
}

interface DailyMissions {
  loginClaimed: boolean;
  challengeClaimed: boolean;
}

interface ChemStore extends AdaptiveSession, PlayerState {
  // ChemCoins
  chemCoins: number;
  dailyMissions: DailyMissions;

  // Actions
  startSession: (userId?: string, demo?: boolean) => Promise<void>;
  chooseAnswer: (answer: string) => Promise<void>;
  nextQuestion: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loadPlayerProfile: () => Promise<void>;
  _prefetchNext: () => Promise<void>;
  claimLoginReward: () => void;
  claimDailyChallengeReward: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useChemStore = create<ChemStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  // getAnonId() is SSR-safe: returns "ssr-placeholder" on the server,
  // then is immediately overwritten on the client in startSession/loadPlayerProfile.
  userId: getAnonId(),
  phase: "loading",
  current: null,
  prefetchQueue: [],
  seenIds: [],
  lastResult: null,
  error: null,

  // Player profile: defaults are placeholders; loadPlayerProfile() hydrates
  // these from the backend as soon as a userId is known.
  username: "player",
  eloRating: 1200,
  dailyStreak: 0,
  profile: null,

  // ChemCoins — read from localStorage on first render; 0 on SSR
  chemCoins: 0,
  dailyMissions: {
    loginClaimed: false,
    challengeClaimed: false,
  },

  // ── claimLoginReward ───────────────────────────────────────────────────
  claimLoginReward: () => {
    if (typeof window === "undefined") return;
    const today = todayStr();
    if (localStorage.getItem(LS_KEY_LOGIN) === today) return; // already claimed today
    localStorage.setItem(LS_KEY_LOGIN, today);
    const next = readCoins() + 1;
    saveCoins(next);
    set((s) => ({
      chemCoins: next,
      dailyMissions: { ...s.dailyMissions, loginClaimed: true },
    }));
  },

  // ── claimDailyChallengeReward ──────────────────────────────────────────
  claimDailyChallengeReward: () => {
    if (typeof window === "undefined") return;
    const today = todayStr();
    if (localStorage.getItem(LS_KEY_CHALLENGE) === today) return; // already claimed today
    localStorage.setItem(LS_KEY_CHALLENGE, today);
    const next = readCoins() + 10;
    saveCoins(next);
    set((s) => ({
      chemCoins: next,
      dailyMissions: { ...s.dailyMissions, challengeClaimed: true },
    }));
  },

  // ── loadPlayerProfile ──────────────────────────────────────────────────
  loadPlayerProfile: async () => {
    const { userId } = get();
    try {
      const p = await fetchUserProfile(userId);
      set({
        eloRating: p.elo_rating,
        dailyStreak: p.streak_days,
        username: userId,
      });
    } catch {
      // Non-fatal: keep existing defaults if backend is unreachable
    }
  },

  // ── startSession ───────────────────────────────────────────────────────
  startSession: async (userId = getAnonId(), demo = false) => {
    // Hydrate ChemCoins + mission state from localStorage on session start
    if (typeof window !== "undefined") {
      const today = todayStr();
      set({
        chemCoins: readCoins(),
        dailyMissions: {
          loginClaimed: localStorage.getItem(LS_KEY_LOGIN) === today,
          challengeClaimed: localStorage.getItem(LS_KEY_CHALLENGE) === today,
        },
      });
    }
    set({ userId, phase: "loading", seenIds: [], prefetchQueue: [], error: null });
    // Hydrate ELO/streak from backend immediately when a session starts
    try { await get().loadPlayerProfile(); } catch { /* non-fatal */ }
    try {
      const q = demo
        ? await fetchDemoPYQ()
        : await fetchAdaptivePYQ(userId);
      set({ current: q, phase: "answering", seenIds: [q.question.id] });
      // Kick off background prefetch immediately
      get()._prefetchNext();
    } catch (e) {
      set({ error: String(e), phase: "answering" });
    }
  },

  // ── chooseAnswer (optimistic: phase changes instantly) ─────────────────
  chooseAnswer: async (answer) => {
    const { userId, current, seenIds } = get();
    if (!current || get().phase !== "answering") return;

    // Optimistic: show revealing overlay immediately — no network wait
    set({ phase: "revealing", lastResult: null });

    try {
      const result = await submitAnswer(userId, current.question.id, answer);
      const eloDelta = result.was_correct ? 10 : -5;
      // ELO update: ±10 for correct/incorrect
      set((s) => ({
        lastResult: result,
        eloRating: s.eloRating + eloDelta,
      }));
      // Persist to backend (fire-and-forget, non-blocking)
      const failedConcepts = result.was_correct
        ? {}
        : Object.fromEntries(current.question.concept_tags.map((t) => [t, 1]));
      syncMatchResult(userId, eloDelta, failedConcepts);
    } catch {
      // Even on network error, keep the reveal so UI never freezes
      set({
        lastResult: {
          was_correct: false,
          correct_answer: current.question.correct_answer,
          explanation_tags: current.question.concept_tags,
          profile_summary: {
            total_answered: 0,
            total_correct: 0,
            accuracy: 0,
            top_weaknesses: [],
          },
        },
      });
    }
  },

  // ── nextQuestion (instant if prefetch queue has data) ──────────────────
  nextQuestion: async () => {
    const { userId, seenIds, prefetchQueue } = get();
    set({ phase: "loading", lastResult: null, error: null });

    if (prefetchQueue.length > 0) {
      // INSTANT — consume from prefetch queue
      const [next, ...rest] = prefetchQueue;
      set({
        current: next,
        prefetchQueue: rest,
        seenIds: [...seenIds, next.question.id],
        phase: "answering",
      });
      // Replenish queue in background
      get()._prefetchNext();
    } else {
      // Queue empty — fetch now (rare, only on first session start)
      try {
        const q = await fetchAdaptivePYQ(userId, seenIds);
        set({
          current: q,
          seenIds: [...seenIds, q.question.id],
          phase: "answering",
        });
        get()._prefetchNext();
      } catch (e) {
        set({ error: String(e), phase: "answering" });
      }
    }
  },

  // ── _prefetchNext (background, silent) ────────────────────────────────
  _prefetchNext: async () => {
    const { userId, seenIds, prefetchQueue, current } = get();
    // Don't over-fill the queue
    if (prefetchQueue.length >= 2) return;

    try {
      const allSeen = [
        ...seenIds,
        ...prefetchQueue.map((q) => q.question.id),
      ];
      const q = await fetchAdaptivePYQ(userId, allSeen);
      set((s) => ({ prefetchQueue: [...s.prefetchQueue, q] }));
    } catch {
      /* silent — prefetch is best-effort */
    }
  },

  // ── refreshProfile ─────────────────────────────────────────────────────
  refreshProfile: async () => {
    const { userId } = get();
    try {
      const p = await fetchProfile(userId);
      set({ profile: p, dailyStreak: get().dailyStreak });
    } catch { /* ignore */ }
  },
}));
