/**
 * ChemClash — API Client
 * Typed fetch wrappers for every backend endpoint.
 * Reads NEXT_PUBLIC_BACKEND_URL at build time (set in Vercel dashboard).
 * Falls back to http://localhost:8000 for local development — no config needed.
 */

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PYQOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface PYQQuestion {
  id: string;
  exam: string;
  exam_year: number;
  question_text: string;
  image_url: string | null;
  options: PYQOption;
  correct_answer: string;
  difficulty_level: "easy" | "medium" | "hard";
  concept_tags: string[];
  socratic_hint?: string;
}

export interface AdaptivePYQResponse {
  question: PYQQuestion;
  meta: {
    selection_method: "llm" | "rule_based" | "demo_rule_based";
    matched_weakness_tags: string[];
    student_accuracy: number;
    candidate_pool_size: number;
  };
}

export interface AnswerResult {
  was_correct: boolean;
  correct_answer: string;
  explanation_tags: string[];
  profile_summary: {
    total_answered: number;
    total_correct: number;
    accuracy: number;
    top_weaknesses: string[];
  };
}

export interface WeaknessProfile {
  user_id: string;
  total_answered: number;
  total_correct: number;
  accuracy: number;
  weakness_scores: Record<string, number>;
  strength_scores: Record<string, number>;
  top_weaknesses: string[];
  history: { pyq_id: string; correct: boolean; ts: number }[];
}

export interface MechanismVerdict {
  status: "pass" | "fail";
  hint: string;
  explanation: string;
  source: string;
  target: string;
  cached: boolean;
  latency_ms: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Adaptive PYQ endpoints ─────────────────────────────────────────────────

export async function fetchAdaptivePYQ(
  userId: string,
  excludeIds: string[] = []
): Promise<AdaptivePYQResponse> {
  const params = excludeIds.length
    ? `?exclude=${encodeURIComponent(excludeIds.join(","))}`
    : "";
  return apiFetch<AdaptivePYQResponse>(`/api/adaptive/pyq/${encodeURIComponent(userId)}${params}`);
}

export async function fetchDemoPYQ(): Promise<AdaptivePYQResponse> {
  return apiFetch<AdaptivePYQResponse>("/api/adaptive/pyq/demo");
}

export async function submitAnswer(
  userId: string,
  pyqId: string,
  chosenAnswer: string
): Promise<AnswerResult> {
  return apiFetch<AnswerResult>("/api/adaptive/answer", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, pyq_id: pyqId, chosen_answer: chosenAnswer }),
  });
}

export async function fetchProfile(userId: string): Promise<WeaknessProfile> {
  return apiFetch<WeaknessProfile>(`/api/adaptive/profile/${encodeURIComponent(userId)}`);
}

// ── User-profile endpoints ─────────────────────────────────────────────────

/** Shape returned by GET /user/{user_id} (main.py Section 14). */
export interface UserGameProfile {
  user_id: string;
  elo_rating: number;
  streak_days: number;
  last_played: string | null;
  concept_weaknesses: Record<string, number>;
}

/** Fetch (or auto-create) the game profile for a user. */
export async function fetchUserProfile(userId: string): Promise<UserGameProfile> {
  return apiFetch<UserGameProfile>(`/user/${encodeURIComponent(userId)}`);
}

/**
 * Fire-and-forget ELO sync to the backend.
 * Uses POST /user/{user_id}/update-match (main.py Section 14).
 * weakness_updates is optional; pass concept tags with weight 1 to record failures.
 */
export async function syncMatchResult(
  userId: string,
  eloDelta: number,
  weaknessUpdates: Record<string, number> = {}
): Promise<void> {
  try {
    await apiFetch(`/user/${encodeURIComponent(userId)}/update-match`, {
      method: "POST",
      body: JSON.stringify({ elo_change: eloDelta, weakness_updates: weaknessUpdates }),
    });
  } catch {
    // Non-fatal: local Zustand state is the source of truth during gameplay.
    // Backend sync failure should never interrupt the user experience.
  }
}

// ── Snap-to-Solve endpoints ───────────────────────────────────────────────

export type SnapPersona = "socratic" | "concept_coach" | "exam_coach" | "quick_revision";
export type SnapLanguage = "english" | "telugu" | "hindi";

export interface SnapResult {
  supported: true;
  identified: string;
  first_issue: string;
  principle: string;
  socratic_question: string;
}

export interface SnapUnsupported {
  supported: false;
  reason: string;
}

export type SnapResponse = SnapResult | SnapUnsupported;

/**
 * Send a base-64 encoded chemistry image to the backend for Socratic analysis.
 * The backend returns { supported: false } when vision is not configured.
 */
export async function snapAnalyze(
  imageB64: string,
  mediaType: string = "image/jpeg",
  persona: SnapPersona = "socratic",
  language: SnapLanguage = "english"
): Promise<SnapResponse> {
  return apiFetch<SnapResponse>("/api/snap-analyze", {
    method: "POST",
    body: JSON.stringify({
      image_b64: imageB64,
      media_type: mediaType,
      persona,
      language,
    }),
  });
}

// ── Mechanism endpoints ────────────────────────────────────────────────────

export async function evaluateMechanism(
  source: string,
  target: string
): Promise<MechanismVerdict> {
  return apiFetch<MechanismVerdict>("/api/evaluate-mechanism", {
    method: "POST",
    body: JSON.stringify({ source, target }),
  });
}

/** Subscribe to the streaming Socratic hint via Server-Sent Events. */
export function streamHint(
  source: string,
  target: string,
  onToken: (token: string) => void,
  onDone: () => void
): () => void {
  const url = `${BASE}/api/hint/stream?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    if (e.data === "[DONE]") {
      es.close();
      onDone();
      return;
    }
    try {
      const { token } = JSON.parse(e.data) as { token: string };
      onToken(token);
    } catch { /* ignore parse errors */ }
  };

  es.onerror = () => { es.close(); onDone(); };

  // Return unsubscribe fn
  return () => es.close();
}

// ── Challenge bank endpoints ───────────────────────────────────────────────

export interface Challenge {
  id: number;
  nucleophile: string;
  electrophile: string;
  shouldReact: boolean;
  hint: string;
  mechanism: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

/** Fetch all challenges from the backend challenge bank. */
export async function fetchChallenges(): Promise<Challenge[]> {
  return apiFetch<Challenge[]>("/api/challenges");
}

/** Pre-fetch a batch of challenges for client-side caching. */
export async function prefetchChallenges(
  startId: number,
  count = 3
): Promise<{ challenges: Challenge[]; total: number }> {
  return apiFetch(`/api/challenges/prefetch?start_id=${startId}&count=${count}`);
}

// ── Curriculum endpoints ───────────────────────────────────────────────────

/** Lightweight module summary returned by GET /api/curriculum/modules */
export interface CurriculumModuleSummary {
  module_id: string;
  title: string;
  difficulty: "basics" | "medium" | "advanced";
  difficulty_tier: number;
  game_tags: string[];
  slide_count: number;
}

export interface CurriculumSlide {
  slide: number;
  concept_term: string;
  short_definition: string;
  action_prompt: string;
}

/** Full module with tutorial_sequence returned by GET /api/curriculum/modules/{id} */
export interface CurriculumModule extends CurriculumModuleSummary {
  tutorial_sequence: CurriculumSlide[];
}

/** Fetch the lightweight module listing (no tutorial slides). */
export async function fetchCurriculumModules(
  difficulty?: string
): Promise<CurriculumModuleSummary[]> {
  const qs = difficulty && difficulty !== "all" ? `?difficulty=${encodeURIComponent(difficulty)}` : "";
  return apiFetch<CurriculumModuleSummary[]>(`/api/curriculum/modules${qs}`);
}

/** Fetch a single module with its full tutorial_sequence. */
export async function fetchCurriculumModule(
  moduleId: string
): Promise<CurriculumModule> {
  return apiFetch<CurriculumModule>(`/api/curriculum/modules/${encodeURIComponent(moduleId)}`);
}
