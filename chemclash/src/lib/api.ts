/**
 * ChemClash — API Client
 * Typed fetch wrappers for every backend endpoint.
 * All calls go to http://localhost:8000 in dev.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

/** Pre-fetch the next batch of challenges (fire-and-forget). */
export async function prefetchChallenges(
  startId: number,
  count = 3
): Promise<{ challenges: PYQQuestion[]; total: number }> {
  return apiFetch(`/api/challenges/prefetch?start_id=${startId}&count=${count}`);
}
