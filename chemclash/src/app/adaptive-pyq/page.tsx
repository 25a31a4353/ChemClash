"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useChemStore } from "@/store/useChemStore";
import type { PYQQuestion } from "@/lib/api";

const DIFF_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  easy:   { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  medium: { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200"   },
  hard:   { bg: "bg-red-50",      text: "text-red-600",     border: "border-red-200"     },
};

const OptionButton = memo(function OptionButton({
  letter, text, selected, correct, revealed, disabled, onClick,
}: {
  letter: string; text: string; selected: boolean; correct: boolean;
  revealed: boolean; disabled: boolean; onClick: () => void;
}) {
  let cls = "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50";
  if (revealed) {
    if (correct) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
    else if (selected) cls = "border-red-300 bg-red-50 text-red-700";
    else cls = "border-slate-200 bg-white text-slate-400 opacity-50";
  } else if (selected) {
    cls = "border-blue-400 bg-blue-50 text-slate-800";
  }

  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full border rounded-xl px-4 py-3 flex items-start gap-3 text-left transition-all duration-150 ${cls} ${disabled && !revealed ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-all ${
        revealed
          ? correct ? "bg-emerald-100 border-emerald-300 text-emerald-700"
            : selected ? "bg-red-100 border-red-300 text-red-600"
            : "bg-slate-100 border-slate-200 text-slate-400"
          : selected
            ? "bg-blue-100 border-blue-300 text-blue-700"
            : "bg-slate-50 border-slate-200 text-slate-500"
      }`}>
        {revealed && correct ? "✓" : revealed && selected ? "✗" : letter}
      </span>
      <span className="text-sm leading-relaxed">{text}</span>
    </button>
  );
});

const QuestionCard = memo(function QuestionCard({
  question, selectedAnswer, revealed, onSelect,
}: {
  question: PYQQuestion; selectedAnswer: string | null; revealed: boolean; onSelect: (a: string) => void;
}) {
  const diff = DIFF_STYLE[question.difficulty_level] ?? DIFF_STYLE.medium;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 tracking-wide">
            {question.exam}
          </span>
          <span className="text-slate-400 text-sm">{question.exam_year}</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${diff.bg} ${diff.text} ${diff.border}`}>
          {question.difficulty_level.toUpperCase()}
        </span>
      </div>

      {/* Question */}
      <div className="px-5 py-5">
        <p className="text-base text-slate-800 leading-relaxed font-medium m-0">{question.question_text}</p>
      </div>

      {/* Options */}
      <div className="px-5 pb-5 flex flex-col gap-2">
        {(["A", "B", "C", "D"] as const).map((letter) => (
          <OptionButton key={letter} letter={letter} text={question.options[letter]}
            selected={selectedAnswer === letter} correct={revealed && question.correct_answer === letter}
            revealed={revealed} disabled={revealed} onClick={() => onSelect(letter)} />
        ))}
      </div>

      {/* Hint */}
      {revealed && question.socratic_hint && (
        <div className="px-5 py-4 bg-blue-50 border-t border-blue-200 flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-blue-700 text-xs font-bold tracking-wide uppercase mb-1">Socratic Hint & Logic</div>
            <div className="text-sm text-slate-700 leading-relaxed">{question.socratic_hint}</div>
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="px-5 py-3 border-t border-slate-100 flex gap-2 flex-wrap items-center">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tags:</span>
        {question.concept_tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
            {tag.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </motion.div>
  );
});

function ResultOverlay({ isCorrect, explanation, onNext }: { isCorrect: boolean; explanation: string[]; onNext: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border p-4 flex items-center justify-between flex-wrap gap-3 mt-4 ${
        isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
      }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isCorrect ? "✅" : "❌"}</span>
        <div>
          <div className={`text-sm font-bold mb-0.5 ${isCorrect ? "text-emerald-700" : "text-red-600"}`}>
            {isCorrect ? "Correct! +10 ELO" : "Incorrect — −5 ELO"}
          </div>
          <div className="text-xs text-slate-500">
            Concepts: {explanation.slice(0, 3).map(t => t.replace(/_/g, " ")).join(" · ")}
          </div>
        </div>
      </div>
      <button onClick={onNext}
        className={`px-5 py-2 rounded-lg border text-sm font-bold tracking-wide transition-all ${
          isCorrect ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
        }`}>
        Next →
      </button>
    </motion.div>
  );
}

function WeaknessSidebar({ weaknesses }: { weaknesses: [string, number][] }) {
  if (!weaknesses.length) return null;
  const max = Math.max(...weaknesses.map(([, v]) => v), 1);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 w-56 flex-shrink-0 shadow-sm">
      <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">Weakness Radar</div>
      {weaknesses.slice(0, 8).map(([tag, score]) => (
        <div key={tag} className="mb-2.5">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-600">{tag.replace(/_/g, " ")}</span>
            <span className="text-xs font-bold text-red-500">{score}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(score / max) * 100}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-gradient-to-r from-red-400 to-amber-400 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdaptivePYQPage() {
  const { phase, current, lastResult, error, eloRating, profile, startSession, chooseAnswer, nextQuestion, refreshProfile, prefetchQueue } = useChemStore();
  const [selected, setSelected] = useState<string | null>(null);
  const USER_ID = "player_001";

  useEffect(() => { startSession(USER_ID); refreshProfile(); }, []);
  useEffect(() => { if (phase === "answering") setSelected(null); }, [current?.question.id, phase]);

  const handleSelect = useCallback((answer: string) => {
    if (phase !== "answering" || selected) return;
    setSelected(answer);
    chooseAnswer(answer);
  }, [phase, selected, chooseAnswer]);

  const handleNext = useCallback(() => { nextQuestion(); }, [nextQuestion]);

  const weaknessEntries: [string, number][] = profile
    ? Object.entries(profile.weakness_scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];

  const accuracy = profile?.accuracy ?? 0;
  const accColorCls = accuracy >= 0.7 ? "text-emerald-600" : accuracy >= 0.4 ? "text-amber-600" : "text-red-500";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">← Dashboard</Link>
          <span className="text-slate-300">|</span>
          <span className="text-violet-600 text-xs font-semibold tracking-wide uppercase">Adaptive PYQ</span>
        </div>
        <div className="flex items-center gap-3">
          {prefetchQueue.length > 0 && (
            <span className="text-xs text-slate-400">{prefetchQueue.length} queued</span>
          )}
          {profile && (
            <div className={`text-sm font-bold px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 ${accColorCls}`}>
              {Math.round(accuracy * 100)}% acc
            </div>
          )}
          <div className="text-sm text-slate-500">⚡ <span className="text-emerald-600 font-bold">{eloRating}</span></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-7 flex gap-5 items-start flex-wrap">
        {/* Main area */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-1">Adaptive PYQ Matchmaker</p>
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              Previous Year Questions — <span className="text-violet-600">Personalised</span>
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Questions matched to your weakest concepts. No AI hallucinations — every question is from the verified PYQ bank.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm text-red-600">
              <span>⚠</span>
              Backend unreachable — make sure <code className="bg-red-100 px-1 rounded text-red-700">python start.py</code> is running.
              <button onClick={() => startSession(USER_ID)}
                className="ml-auto border border-red-300 text-red-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                Retry
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {phase === "loading" && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Matching question to your weaknesses…
                </div>
                {[80, 95, 60, 75].map((w, i) => (
                  <div key={i} className="shimmer rounded-lg mb-3" style={{ height: i === 0 ? 48 : 16, width: `${w}%` }} />
                ))}
              </motion.div>
            )}

            {(phase === "answering" || phase === "revealing") && current && (
              <motion.div key={current.question.id}>
                {current.meta && (
                  <div className="mb-3 flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-medium text-slate-400 uppercase">Selected by</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      current.meta.selection_method === "llm"
                        ? "bg-violet-50 border-violet-200 text-violet-700"
                        : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      {current.meta.selection_method === "llm" ? "AI Matchmaker" : "Rule Engine"}
                    </span>
                    {current.meta.matched_weakness_tags.length > 0 && (
                      <span className="text-xs text-red-500 font-medium">
                        weak: {current.meta.matched_weakness_tags.slice(0, 2).map(t => t.replace(/_/g, " ")).join(", ")}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">
                      pool: {current.meta.candidate_pool_size} questions
                    </span>
                  </div>
                )}

                <QuestionCard question={current.question} selectedAnswer={selected}
                  revealed={phase === "revealing"} onSelect={handleSelect} />

                <AnimatePresence>
                  {phase === "revealing" && lastResult && (
                    <ResultOverlay isCorrect={lastResult.was_correct}
                      explanation={lastResult.explanation_tags} onNext={handleNext} />
                  )}
                  {phase === "revealing" && !lastResult && (
                    <div className="mt-3 px-4 py-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                      <div className="shimmer w-4 h-4 rounded-full" />
                      <span className="text-sm text-slate-500">Evaluating…</span>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats strip */}
          {profile && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl px-5 py-4 flex gap-6 flex-wrap shadow-sm">
              {[
                { label: "Answered",    value: profile.total_answered, cls: "text-violet-600" },
                { label: "Correct",     value: profile.total_correct,  cls: "text-emerald-600" },
                { label: "Accuracy",    value: `${Math.round(accuracy * 100)}%`, cls: accColorCls },
                { label: "Weaknesses",  value: Object.keys(profile.weakness_scores).filter(k => profile.weakness_scores[k] > 0).length, cls: "text-red-500" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className={`text-2xl font-black leading-none ${s.cls}`}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4" style={{ width: 224, flexShrink: 0 }}>
          <WeaknessSidebar weaknesses={weaknessEntries} />

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="text-violet-600 text-xs font-semibold tracking-wide uppercase mb-2">How It Works</div>
            <p className="text-sm text-slate-600 leading-relaxed m-0">
              Every wrong answer boosts your weakness score. The AI matchmaker fetches the{" "}
              <span className="text-slate-800 font-semibold">most relevant PYQ</span> from the verified bank — it never invents questions.
            </p>
          </div>

          <button onClick={() => { startSession(USER_ID); refreshProfile(); }}
            className="border border-slate-200 bg-white text-slate-500 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:text-violet-600 hover:border-violet-200 transition-all tracking-wide">
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}
