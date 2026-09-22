"use client";

/**
 * ChemClash — Practice Arena (Solo)
 *
 * A 5-question solo match using existing PYQ data and ELO infrastructure.
 * UI is structured so real matchmaking can be wired in later:
 *  - ArenaLobby  → match setup + "Find Match" CTA
 *  - ArenaMatch  → in-progress 5-question round
 *  - ArenaResult → final score, ELO delta, concepts missed
 *
 * ELO delta:  +12 correct / −6 wrong (per question)
 * Synced via the existing syncMatchResult → POST /user/{id}/update-match
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchAdaptivePYQ,
  submitAnswer,
  syncMatchResult,
  type AdaptivePYQResponse,
  type AnswerResult,
} from "@/lib/api";
import { useChemStore } from "@/store/useChemStore";

// ── Static fallback questions (used when backend is unreachable) ───────────

const FALLBACK_QUESTIONS: AdaptivePYQResponse[] = [
  {
    question: {
      id: "FB-001", exam: "JEE Mains", exam_year: 2023,
      question_text: "In an SN2 reaction, which substrate reacts fastest?",
      image_url: null,
      options: { A: "Neopentyl chloride", B: "Methyl chloride", C: "tert-Butyl chloride", D: "Isopropyl chloride" },
      correct_answer: "B", difficulty_level: "easy",
      concept_tags: ["SN2", "steric_hindrance"],
      socratic_hint: "Which substrate has the least steric crowding around the electrophilic carbon?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["SN2"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-002", exam: "JEE Mains", exam_year: 2022,
      question_text: "Which reagent converts an alkene to a Markovnikov alcohol?",
      image_url: null,
      options: { A: "BH₃/THF then H₂O₂/NaOH", B: "H₂SO₄/H₂O", C: "OsO₄", D: "mCPBA" },
      correct_answer: "B", difficulty_level: "easy",
      concept_tags: ["Markovnikov", "electrophilic_addition"],
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["Markovnikov"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-003", exam: "JEE Mains", exam_year: 2021,
      question_text: "E2 elimination requires the H and leaving group to be:",
      image_url: null,
      options: { A: "Syn-periplanar (0°)", B: "Gauche (60°)", C: "Anti-periplanar (180°)", D: "Eclipsed (120°)" },
      correct_answer: "C", difficulty_level: "medium",
      concept_tags: ["E2", "anti_periplanar"],
      socratic_hint: "Draw a Newman projection — which geometry allows simultaneous H removal and LG departure?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["E2"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-004", exam: "JEE Advanced", exam_year: 2022,
      question_text: "Which carbocation is most stable?",
      image_url: null,
      options: { A: "CH₃⁺", B: "CH₃CH₂⁺", C: "(CH₃)₂CH⁺", D: "(CH₃)₃C⁺" },
      correct_answer: "D", difficulty_level: "easy",
      concept_tags: ["carbocation", "stability"],
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["carbocation"], student_accuracy: 0, candidate_pool_size: 1 },
  },
  {
    question: {
      id: "FB-005", exam: "JEE Mains", exam_year: 2020,
      question_text: "SN1 reactions proceed with:",
      image_url: null,
      options: { A: "Complete inversion", B: "Complete retention", C: "Racemisation", D: "No stereochemical change" },
      correct_answer: "C", difficulty_level: "medium",
      concept_tags: ["SN1", "stereochemistry"],
      socratic_hint: "The carbocation intermediate is planar — from which face(s) can the nucleophile attack?",
    },
    meta: { selection_method: "demo_rule_based", matched_weakness_tags: ["SN1"], student_accuracy: 0, candidate_pool_size: 1 },
  },
];

let _fallbackIdx = 0;
function getFallbackQuestion(seen: string[]): AdaptivePYQResponse {
  const unseen = FALLBACK_QUESTIONS.filter((q) => !seen.includes(q.question.id));
  if (unseen.length > 0) return unseen[_fallbackIdx++ % unseen.length];
  _fallbackIdx = 0;
  return FALLBACK_QUESTIONS[0];
}

// ── Constants ──────────────────────────────────────────────────────────────

const MATCH_LENGTH   = 5;
const ELO_CORRECT    = 12;
const ELO_WRONG      = -6;
const QUESTION_SECS  = 30;   // countdown per question

// ── Types ──────────────────────────────────────────────────────────────────

interface RoundRecord {
  question:   AdaptivePYQResponse;
  chosen:     string;
  result:     AnswerResult;
  eloDelta:   number;
  timeTaken:  number;   // seconds
}

// ── Difficulty badge ───────────────────────────────────────────────────────

function DiffBadge({ d }: { d: string }) {
  const cls =
    d === "easy"   ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
    d === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
                     "bg-red-50 text-red-600 border-red-200";
  return (
    <span className={`text-[0.6rem] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      {d}
    </span>
  );
}

// ── Countdown ring ─────────────────────────────────────────────────────────

function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const progress = remaining / total;
  const dash = circ * progress;
  const color = remaining > 10 ? "#10b981" : remaining > 5 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={52} height={52} className="rotate-[-90deg]">
      <circle cx={26} cy={26} r={r} fill="none" stroke="#e2e8f0" strokeWidth={4} />
      <circle
        cx={26} cy={26} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s linear, stroke 0.3s" }}
      />
      <text
        x={26} y={26}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={13} fontWeight="900"
        fill={color}
        style={{ transform: "rotate(90deg)", transformOrigin: "26px 26px" }}
      >
        {remaining}
      </text>
    </svg>
  );
}

// ── Option button ──────────────────────────────────────────────────────────

function OptionBtn({
  letter, text, phase, chosen, correct, onChoose,
}: {
  letter: string; text: string;
  phase: "question" | "reveal";
  chosen: string | null; correct: string;
  onChoose: (a: string) => void;
}) {
  const isChosen  = chosen === letter;
  const isCorrect = correct === letter;
  const revealed  = phase === "reveal";

  let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ";
  if (!revealed) {
    cls += isChosen
      ? "border-violet-400 bg-violet-50 text-violet-800"
      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50";
  } else if (isCorrect) {
    cls += "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold";
  } else if (isChosen) {
    cls += "border-red-300 bg-red-50 text-red-700 line-through opacity-70";
  } else {
    cls += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
  }
  return (
    <button className={cls} disabled={revealed} onClick={() => onChoose(letter)}>
      <span className="font-bold mr-2">{letter}.</span>{text}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LOBBY
// ══════════════════════════════════════════════════════════════════════════

function ArenaLobby({
  eloRating,
  onStart,
  loading,
}: {
  eloRating: number;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-14 text-center">
      <div className="text-5xl mb-5">⚔️</div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">
        Practice <span className="text-amber-500">Arena</span>
      </h2>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed">
        Solo 5-question match against the PYQ bank.<br />
        Prove your organic chemistry skills and climb the ELO ladder.
      </p>

      {/* Match info card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 text-left space-y-3 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Mode</span>
          <span className="text-sm font-bold text-slate-700">Solo Practice</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Questions</span>
          <span className="text-sm font-bold text-slate-700">{MATCH_LENGTH}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Time / Q</span>
          <span className="text-sm font-bold text-slate-700">{QUESTION_SECS}s</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">ELO per correct</span>
          <span className="text-sm font-bold text-emerald-600">+{ELO_CORRECT}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">ELO per wrong</span>
          <span className="text-sm font-bold text-red-500">{ELO_WRONG}</span>
        </div>
        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your ELO</span>
          <span className="text-lg font-black text-emerald-600">{eloRating}</span>
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-black text-base py-4 rounded-2xl transition-colors shadow-sm tracking-wide"
      >
        {loading ? "Loading…" : "⚔️ Enter Arena"}
      </button>

      {/* Placeholder for future matchmaking */}
      <p className="mt-4 text-xs text-slate-400 italic">
        Ranked 1v1 matchmaking — coming soon
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MATCH
// ══════════════════════════════════════════════════════════════════════════

function ArenaMatch({
  userId,
  eloRating,
  onComplete,
}: {
  userId: string;
  eloRating: number;
  onComplete: (records: RoundRecord[], finalElo: number) => void;
}) {
  const [qPhase, setQPhase]       = useState<"question" | "reveal">("question");
  const [question, setQuestion]   = useState<AdaptivePYQResponse | null>(null);
  const [seenIds, setSeenIds]     = useState<string[]>([]);
  const [chosen, setChosen]       = useState<string | null>(null);
  const [result, setResult]       = useState<AnswerResult | null>(null);
  const [records, setRecords]     = useState<RoundRecord[]>([]);
  const [roundNum, setRoundNum]   = useState(1);
  const [timeLeft, setTimeLeft]   = useState(QUESTION_SECS);
  const [loadingQ, setLoadingQ]   = useState(true);
  const [runningElo, setRunningElo] = useState(eloRating);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime   = useRef<number>(0);  // set to Date.now() in loadQuestion

  // Load next question (with static fallback so arena always works)
  const loadQuestion = useCallback(async (seen: string[]) => {
    setLoadingQ(true);
    setChosen(null);
    setResult(null);
    setQPhase("question");
    setTimeLeft(QUESTION_SECS);
    try {
      const q = await fetchAdaptivePYQ(userId, seen);
      setQuestion(q);
      setSeenIds((s) => [...s, q.question.id]);
      startTime.current = Date.now();
    } catch {
      const q = getFallbackQuestion(seen);
      setQuestion(q);
      setSeenIds((s) => [...s, q.question.id]);
      startTime.current = Date.now();
    } finally {
      setLoadingQ(false);
    }
  }, [userId]);

  // processAnswer — declared BEFORE any useEffect that references it to satisfy
  // react-hooks/immutability (no forward references to async functions in effects).
  async function processAnswer(answer: string) {
    if (!question) return;
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    setQPhase("reveal");
    try {
      const res = await submitAnswer(userId, question.question.id, answer);
      const delta = res.was_correct ? ELO_CORRECT : ELO_WRONG;
      setResult(res);
      setRunningElo((e) => e + delta);

      const rec: RoundRecord = {
        question,
        chosen: answer,
        result: res,
        eloDelta: delta,
        timeTaken,
      };
      setRecords((prev) => {
        // Sync partial ELO to backend fire-and-forget
        const failedConcepts = res.was_correct
          ? {}
          : Object.fromEntries(question.question.concept_tags.map((t) => [t, 1]));
        syncMatchResult(userId, delta, failedConcepts);
        return [...prev, rec];
      });
    } catch {
      // Backend unreachable — grade locally against the stored correct_answer
      const localCorrect = answer === question.question.correct_answer;
      // Accumulate wrong-answer tags locally so offline weakness features work
      if (!localCorrect) {
        try {
          const prev = JSON.parse(localStorage.getItem("chemclash_local_weaknesses") ?? "{}") as Record<string, number>;
          for (const t of question.question.concept_tags) prev[t] = (prev[t] ?? 0) + 1;
          localStorage.setItem("chemclash_local_weaknesses", JSON.stringify(prev));
        } catch { /* non-fatal */ }
      }
      const delta = localCorrect ? ELO_CORRECT : ELO_WRONG;
      const res: AnswerResult = {
        was_correct: localCorrect,
        correct_answer: question.question.correct_answer,
        explanation_tags: question.question.concept_tags,
        profile_summary: { total_answered: 0, total_correct: 0, accuracy: 0, top_weaknesses: [] },
      };
      setResult(res);
      setRunningElo((e) => e + delta);
      setRecords((prev) => [...prev, { question, chosen: answer, result: res, eloDelta: delta, timeTaken }]);
    }
  }

  // Countdown timer
  useEffect(() => {
    if (loadingQ || qPhase === "reveal") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadingQ, qPhase, question]);

  // When the timer hits 0, auto-submit a wrong answer
  useEffect(() => {
    if (timeLeft === 0 && qPhase === "question" && question) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- processAnswer sets state; intentional timer-expiry effect
      processAnswer("X");
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuestion([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChoose(answer: string) {
    if (qPhase === "reveal" || !question) return;
    clearInterval(timerRef.current!);
    setChosen(answer);
    await processAnswer(answer);
  }

  // handleNext — called from "Next Question" button after reveal
  // Uses roundNum (always current) rather than stale records.length to decide
  // if the match is complete, avoiding the double-onComplete bug (C-3).
  function handleNext() {
    if (roundNum >= MATCH_LENGTH) {
      // Last round — pass current records + ELO up to the parent
      setRecords((prev) => {
        onComplete(prev, runningElo);
        return prev;
      });
      return;
    }
    setRoundNum((n) => n + 1);
    loadQuestion(seenIds);
  }

  const q = question?.question;
  const correctAns = result?.correct_answer ?? q?.correct_answer ?? "";
  const isLastQ = roundNum === MATCH_LENGTH;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      {/* Match header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Round {roundNum} / {MATCH_LENGTH}
          </span>
          {/* progress pills */}
          <div className="flex gap-1">
            {Array.from({ length: MATCH_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-1.5 rounded-full transition-colors ${
                  i < records.length
                    ? records[i].result.was_correct ? "bg-emerald-400" : "bg-red-400"
                    : i === roundNum - 1 ? "bg-amber-400" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-amber-600">
            ⚡ {runningElo} ELO
          </span>
          {!loadingQ && qPhase === "question" && (
            <CountdownRing remaining={timeLeft} total={QUESTION_SECS} />
          )}
        </div>
      </div>

      {/* Loading */}
      {loadingQ && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Fetching question…</p>
        </div>
      )}

      {/* Question card */}
      {!loadingQ && q && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Meta */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] font-bold tracking-widest text-slate-400 uppercase">
                {q.exam} · {q.exam_year}
              </span>
              <DiffBadge d={q.difficulty_level} />
            </div>
            <div className="flex flex-wrap gap-1">
              {q.concept_tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[0.6rem] bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5 font-semibold uppercase">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Question text */}
          <p className="text-base font-semibold text-slate-800 leading-relaxed mb-6">
            {q.question_text}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            {(["A", "B", "C", "D"] as const).map((letter) => (
              <OptionBtn
                key={letter}
                letter={letter}
                text={q.options[letter]}
                phase={qPhase}
                chosen={chosen}
                correct={correctAns}
                onChoose={handleChoose}
              />
            ))}
          </div>

          {/* Reveal feedback */}
          {qPhase === "reveal" && result && (
            <div className={`mt-5 rounded-xl border px-4 py-3 ${result.was_correct ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-sm font-bold mb-1 ${result.was_correct ? "text-emerald-700" : "text-red-700"}`}>
                {result.was_correct
                  ? `✅ Correct! +${ELO_CORRECT} ELO`
                  : chosen === "X"
                  ? `⏰ Time's up! ${ELO_WRONG} ELO`
                  : `❌ Wrong. ${ELO_WRONG} ELO`}
              </p>
              {!result.was_correct && (
                <p className="text-xs text-slate-600 mb-2">
                  Correct answer: <span className="font-bold text-emerald-700">{correctAns}</span>
                </p>
              )}
              <button
                onClick={handleNext}
                className="mt-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl px-5 py-2 transition-colors"
              >
                {isLastQ ? "See Results →" : "Next Question →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// RESULT
// ══════════════════════════════════════════════════════════════════════════

function ArenaResult({
  records,
  startElo,
  finalElo,
  onPlayAgain,
}: {
  records: RoundRecord[];
  startElo: number;
  finalElo: number;
  onPlayAgain: () => void;
}) {
  const correct   = records.filter((r) => r.result.was_correct).length;
  const accuracy  = Math.round((correct / records.length) * 100);
  const eloDelta  = finalElo - startElo;

  // Collect missed concepts (from wrong answers)
  const missedConcepts = Array.from(
    new Set(
      records
        .filter((r) => !r.result.was_correct)
        .flatMap((r) => r.result.explanation_tags)
    )
  ).slice(0, 6);

  const grade =
    accuracy >= 80 ? { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" } :
    accuracy >= 60 ? { label: "Good",      color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200"    } :
    accuracy >= 40 ? { label: "Fair",      color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200"   } :
                     { label: "Keep Practicing", color: "text-red-600", bg: "bg-red-50",   border: "border-red-200"     };

  return (
    <div className="max-w-md mx-auto px-4 py-10 pb-24">
      {/* Grade banner */}
      <div className={`rounded-2xl border ${grade.border} ${grade.bg} p-6 text-center mb-6`}>
        <p className="text-4xl mb-2">{accuracy >= 80 ? "🏆" : accuracy >= 60 ? "🥈" : accuracy >= 40 ? "📈" : "📖"}</p>
        <p className={`text-2xl font-black ${grade.color} mb-1`}>{grade.label}</p>
        <p className="text-sm text-slate-500">{correct}/{records.length} correct · {accuracy}% accuracy</p>
      </div>

      {/* Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Score</span>
          <span className="text-base font-black text-slate-800">{correct} / {records.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accuracy</span>
          <span className="text-base font-black text-slate-800">{accuracy}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">ELO Change</span>
          <span className={`text-base font-black ${eloDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {eloDelta >= 0 ? "+" : ""}{eloDelta}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">New ELO</span>
          <span className="text-xl font-black text-amber-500">{finalElo}</span>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Question Breakdown</p>
        <div className="space-y-2">
          {records.map((rec, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rec.result.was_correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                  {rec.result.was_correct ? "✓" : "✗"}
                </span>
                <span className="text-xs text-slate-600 truncate">{rec.question.question.question_text.slice(0, 55)}…</span>
              </div>
              <span className={`text-xs font-bold flex-shrink-0 ${rec.eloDelta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {rec.eloDelta > 0 ? "+" : ""}{rec.eloDelta}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Missed concepts */}
      {missedConcepts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">Concepts to Review</p>
          <div className="flex flex-wrap gap-1.5">
            {missedConcepts.map((c) => (
              <span key={c} className="text-[0.65rem] bg-white text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 font-semibold">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onPlayAgain}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-base py-4 rounded-2xl transition-colors"
        >
          ⚔️ Play Again
        </button>
        <Link
          href="/"
          className="w-full border border-slate-200 bg-white text-slate-600 font-bold text-sm py-3 rounded-2xl text-center no-underline hover:bg-slate-50 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        {missedConcepts.length > 0 && (
          <Link
            href="/video-recommendations"
            className="w-full border border-violet-200 bg-violet-50 text-violet-700 font-bold text-sm py-3 rounded-2xl text-center no-underline hover:bg-violet-100 transition-colors"
          >
            🎬 Review Videos for Missed Concepts
          </Link>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════

type PagePhase = "lobby" | "match" | "result";

export default function DuelPage() {
  const eloRating      = useChemStore((s) => s.eloRating);
  const userId         = useChemStore((s) => s.userId);
  const refreshProfile = useChemStore((s) => s.refreshProfile);

  const [pagePhase, setPagePhase]   = useState<PagePhase>("lobby");
  const [records, setRecords]       = useState<RoundRecord[]>([]);
  const [startElo, setStartElo]     = useState(eloRating);
  const [finalElo, setFinalElo]     = useState(eloRating);
  const [loadingStart, setLoadingStart] = useState(false);

  function handleEnterArena() {
    setLoadingStart(true);
    setStartElo(eloRating);
    setRecords([]);
    // Small delay for UX polish
    setTimeout(() => {
      setLoadingStart(false);
      setPagePhase("match");
    }, 600);
  }

  function handleMatchComplete(recs: RoundRecord[], finalE: number) {
    setRecords(recs);
    setFinalElo(finalE);
    // Update global ELO in store
    useChemStore.setState({ eloRating: finalE });
    // Refresh adaptive weakness profile so downstream recommendations
    // (Video Recommendations, Dashboard) reflect this match's wrong answers.
    refreshProfile();
    setPagePhase("result");
  }

  function handlePlayAgain() {
    setStartElo(finalElo);
    setRecords([]);
    setPagePhase("match");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-amber-600 text-xs font-semibold tracking-wide uppercase">
            Practice Arena
          </span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      {pagePhase === "lobby" && (
        <ArenaLobby
          eloRating={eloRating}
          onStart={handleEnterArena}
          loading={loadingStart}
        />
      )}

      {pagePhase === "match" && (
        <ArenaMatch
          userId={userId}
          eloRating={startElo}
          onComplete={handleMatchComplete}
        />
      )}

      {pagePhase === "result" && (
        <ArenaResult
          records={records}
          startElo={startElo}
          finalElo={finalElo}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
