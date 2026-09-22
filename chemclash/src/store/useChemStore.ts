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
  type AdaptivePYQResponse,
  type AnswerResult,
  type WeaknessProfile,
} from "@/lib/api";

// ── Static fallback PYQs (used when backend is unreachable) ──────────────

const _FALLBACK_PYQ: AdaptivePYQResponse[] = [
  {
    question: {
      id: "FB-001", exam: "JEE Mains", exam_year: 2023,
      question_text: "In an SN2 reaction, the rate depends on:",
      image_url: null,
      options: { A: "Only the substrate", B: "Only the nucleophile", C: "Both substrate and nucleophile", D: "Neither" },
      correct_answer: "C", difficulty_level: "easy",
      concept_tags: ["SN2", "kinetics"],
      socratic_hint: "SN2 is bimolecular — what does 'bi' imply about the rate law?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["SN2"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-002", exam: "JEE Mains", exam_year: 2022,
      question_text: "Which undergoes SN1 most readily?",
      image_url: null,
      options: { A: "CH₃Cl", B: "CH₃CH₂Cl", C: "(CH₃)₂CHCl", D: "(CH₃)₃CCl" },
      correct_answer: "D", difficulty_level: "easy",
      concept_tags: ["SN1", "carbocation"],
      socratic_hint: "SN1 needs a stable carbocation. Which substrate gives the most stable one?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["SN1"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-003", exam: "JEE Mains", exam_year: 2021,
      question_text: "Best solvent for SN2 reaction:",
      image_url: null,
      options: { A: "Water", B: "Ethanol", C: "DMSO", D: "Acetic acid" },
      correct_answer: "C", difficulty_level: "medium",
      concept_tags: ["SN2", "solvent"],
      socratic_hint: "Which solvent type avoids H-bonding to the nucleophile, leaving it reactive?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["SN2"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-004", exam: "JEE Mains", exam_year: 2020,
      question_text: "Markovnikov addition of HBr to propene gives:",
      image_url: null,
      options: { A: "1-bromopropane", B: "2-bromopropane", C: "Allyl bromide", D: "Propan-1-ol" },
      correct_answer: "B", difficulty_level: "easy",
      concept_tags: ["Markovnikov", "electrophilic_addition"],
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["Markovnikov"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-005", exam: "JEE Advanced", exam_year: 2022,
      question_text: "E2 elimination requires H and leaving group to be:",
      image_url: null,
      options: { A: "Syn-periplanar (0°)", B: "Gauche (60°)", C: "Anti-periplanar (180°)", D: "Any geometry" },
      correct_answer: "C", difficulty_level: "medium",
      concept_tags: ["E2", "anti_periplanar"],
      socratic_hint: "Which dihedral angle allows simultaneous H removal and LG departure?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["E2"], student_accuracy: 0, candidate_pool_size: 1 },
  },
];

let _fbIdx = 0;
function _getNextFallback(seenIds: string[]): AdaptivePYQResponse {
  const unseen = _FALLBACK_PYQ.filter((q) => !seenIds.includes(q.question.id));
  if (unseen.length > 0) return unseen[_fbIdx++ % unseen.length];
  _fbIdx = 0;
  return _FALLBACK_PYQ[0];
}

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

// ── Local weakness accumulator ────────────────────────────────────────────
// Persists wrong-answer concept tags to localStorage so weakness-driven
// features (Dashboard recommendation, Video Recommendations, Tutor Shorts)
// work offline even when the backend is unreachable.

const LS_KEY_LOCAL_WEAKNESSES = "chemclash_local_weaknesses";

function readLocalWeaknesses(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY_LOCAL_WEAKNESSES);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch { return {}; }
}

function addLocalWeaknesses(tags: string[]): void {
  if (typeof window === "undefined" || tags.length === 0) return;
  const map = readLocalWeaknesses();
  for (const t of tags) map[t] = (map[t] ?? 0) + 1;
  localStorage.setItem(LS_KEY_LOCAL_WEAKNESSES, JSON.stringify(map));
}

function localWeaknessProfile(userId: string): WeaknessProfile {
  const map = readLocalWeaknesses();
  const top = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
  return {
    user_id: userId,
    total_answered: 0,
    total_correct: 0,
    accuracy: 0,
    weakness_scores: map,
    strength_scores: {},
    top_weaknesses: top,
    history: [],
  };
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
    if (!userId || userId === "ssr-placeholder") return;
    try {
      const p = await fetchUserProfile(userId);
      set({
        eloRating: p.elo_rating ?? 1200,
        dailyStreak: p.streak_days ?? 0,
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
    try {
      const [q] = await Promise.all([
        demo ? fetchDemoPYQ() : fetchAdaptivePYQ(userId),
        get().loadPlayerProfile().catch(() => {}),
      ]);
      set({ current: q, phase: "answering", seenIds: [q.question.id] });
      get()._prefetchNext();
    } catch {
      // Backend unreachable — use first fallback question so the page never hangs
      const fallback = _FALLBACK_PYQ[0];
      set({ current: fallback, phase: "answering", seenIds: [fallback.question.id], error: null });
    }
  },

  // ── chooseAnswer (optimistic: phase changes instantly) ─────────────────
  chooseAnswer: async (answer) => {
    const { userId, current } = get();
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
      // Backend unreachable — grade locally so the session continues
      const localCorrect = answer === current.question.correct_answer;
      // Persist wrong-answer tags so offline weakness features still work
      if (!localCorrect) addLocalWeaknesses(current.question.concept_tags);
      set({
        lastResult: {
          was_correct: localCorrect,
          correct_answer: current.question.correct_answer,
          explanation_tags: current.question.concept_tags,
          profile_summary: { total_answered: 0, total_correct: 0, accuracy: 0, top_weaknesses: [] },
        },
        eloRating: get().eloRating + (localCorrect ? 10 : -5),
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
      // Queue empty — fetch now (rare)
      try {
        const q = await fetchAdaptivePYQ(userId, seenIds);
        set({ current: q, seenIds: [...seenIds, q.question.id], phase: "answering" });
        get()._prefetchNext();
      } catch {
        // Backend unreachable — pick from fallback pool
        const fb = _getNextFallback(seenIds);
        set({ current: fb, seenIds: [...seenIds, fb.question.id], phase: "answering", error: null });
      }
    }
  },

  // ── _prefetchNext (background, silent) ────────────────────────────────
  _prefetchNext: async () => {
    const { userId, seenIds, prefetchQueue } = get();
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
    if (!userId || userId === "ssr-placeholder") return;
    try {
      const p = await fetchProfile(userId);
      set({ profile: p, dailyStreak: get().dailyStreak });
    } catch {
      // Backend unreachable — fall back to locally accumulated weakness data
      // so Dashboard recommendations and Video Recs still personalise offline.
      const local = localWeaknessProfile(userId);
      if (local.top_weaknesses.length > 0) {
        set({ profile: local });
      }
    }
  },
}));
