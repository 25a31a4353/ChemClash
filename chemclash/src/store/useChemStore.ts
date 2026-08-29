/**
 * ChemClash — Zustand Global Store
 *
 * Manages:
 *   • Player profile (ELO, streak, accuracy)
 *   • Adaptive PYQ session (current question, seen ids, answer state)
 *   • Prefetch queue for instant round transitions
 */

import { create } from "zustand";
import {
  fetchAdaptivePYQ,
  fetchDemoPYQ,
  submitAnswer,
  fetchProfile,
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

interface ChemStore extends AdaptiveSession, PlayerState {
  // Actions
  startSession: (userId: string, demo?: boolean) => Promise<void>;
  chooseAnswer: (answer: string) => Promise<void>;
  nextQuestion: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  _prefetchNext: () => Promise<void>;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useChemStore = create<ChemStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  userId: "guest",
  phase: "loading",
  current: null,
  prefetchQueue: [],
  seenIds: [],
  lastResult: null,
  error: null,

  username: "CH3M_L0RD",
  eloRating: 1337,
  dailyStreak: 7,
  profile: null,

  // ── startSession ───────────────────────────────────────────────────────
  startSession: async (userId, demo = false) => {
    set({ userId, phase: "loading", seenIds: [], prefetchQueue: [], error: null });
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
      // ELO update: ±10 for correct/incorrect
      set((s) => ({
        lastResult: result,
        eloRating: s.eloRating + (result.was_correct ? 10 : -5),
      }));
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
