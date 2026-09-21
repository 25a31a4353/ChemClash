"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";
import type { PYQQuestion } from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Pick the first 1–2 concept tags to surface as the missed principle. */
function missedPrinciple(tags: string[]): string {
  if (tags.length === 0) return "a key chemistry concept";
  if (tags.length === 1) return tags[0];
  return `${tags[0]} / ${tags[1]}`;
}

/** Generate a brief consequence question that targets the student's wrong choice. */
function consequenceQuestion(chosen: string, question: PYQQuestion): string {
  const chosenText = question.options[chosen as keyof typeof question.options] ?? chosen;
  // Trim the option text to keep the message compact
  const short = chosenText.length > 60 ? chosenText.slice(0, 57) + "…" : chosenText;
  return `If "${short}" were true, what would happen to the reaction rate / product distribution?`;
}

// ── Option button ──────────────────────────────────────────────────────────

interface OptionProps {
  letter: string;
  text: string;
  phase: "answering" | "revealing";
  chosen: string | null;
  correct: string;
  onChoose: (a: string) => void;
}

function OptionButton({ letter, text, phase, chosen, correct, onChoose }: OptionProps) {
  const isChosen  = chosen === letter;
  const isCorrect = correct === letter;
  const revealed  = phase === "revealing";

  let cls =
    "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ";

  if (!revealed) {
    cls += isChosen
      ? "border-violet-400 bg-violet-50 text-violet-800"
      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50";
  } else if (isCorrect) {
    cls += "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold";
  } else if (isChosen && !isCorrect) {
    cls += "border-red-300 bg-red-50 text-red-700 line-through opacity-70";
  } else {
    cls += "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
  }

  return (
    <button
      className={cls}
      disabled={revealed}
      onClick={() => onChoose(letter)}
    >
      <span className="font-bold mr-2">{letter}.</span>
      {text}
    </button>
  );
}

// ── Diagnosis panel (wrong-answer Socratic) ────────────────────────────────

interface DiagnosisProps {
  chosen: string;
  question: PYQQuestion;
  onTryAgain: () => void;
}

function DiagnosisPanel({ chosen, question, onTryAgain }: DiagnosisProps) {
  const chosenText =
    question.options[chosen as keyof typeof question.options] ?? chosen;
  const principle = missedPrinciple(question.concept_tags);
  const followUp  = consequenceQuestion(chosen, question);

  return (
    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-left space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">🧠</span>
        <span className="text-xs font-bold tracking-widest text-red-600 uppercase">
          Socratic Diagnosis
        </span>
      </div>

      {/* 1. What they picked */}
      <div>
        <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-1">
          You selected
        </p>
        <p className="text-sm font-semibold text-red-700">
          {chosen}. {chosenText}
        </p>
      </div>

      {/* 2. Missed principle */}
      <div>
        <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-1">
          Likely missed concept
        </p>
        <p className="text-sm font-medium text-slate-700">
          <span className="inline-block bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-bold text-xs mr-1">
            {principle}
          </span>
          — review this concept to close the gap.
        </p>
      </div>

      {/* 3. Socratic hint (if available from question data) */}
      {question.socratic_hint && (
        <div>
          <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-1">
            Next clue
          </p>
          <p className="text-sm italic text-slate-600 leading-relaxed">
            "{question.socratic_hint}"
          </p>
        </div>
      )}

      {/* 4. Consequence question */}
      <div>
        <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-1">
          Think about it
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">{followUp}</p>
      </div>

      {/* 5. Try Again */}
      <button
        onClick={onTryAgain}
        className="mt-1 w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-wide rounded-xl py-2.5 transition-colors"
      >
        Try Again →
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdaptivePYQPage() {
  const eloRating    = useChemStore((s) => s.eloRating);
  const phase        = useChemStore((s) => s.phase);
  const current      = useChemStore((s) => s.current);
  const lastResult   = useChemStore((s) => s.lastResult);
  const error        = useChemStore((s) => s.error);
  const startSession = useChemStore((s) => s.startSession);
  const chooseAnswer = useChemStore((s) => s.chooseAnswer);
  const nextQuestion = useChemStore((s) => s.nextQuestion);

  // Track which option the student chose locally so we can show it in the
  // diagnosis panel without waiting for the async result to resolve.
  // The store's lastResult.was_correct is the authoritative truth.
  // We use a local ref pattern via useState; reset on each new question.
  const [chosenAnswer, setChosenAnswer] = useState<string | null>(null);

  // Start an adaptive session for the guest user on mount
  useEffect(() => {
    startSession("guest");
  }, [startSession]);

  // Reset local chosen state when a new question arrives
  useEffect(() => {
    if (phase === "answering") setChosenAnswer(null);
  }, [phase, current?.question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChoose(answer: string) {
    if (phase !== "answering") return;
    setChosenAnswer(answer);
    chooseAnswer(answer);
  }

  function handleTryAgain() {
    // Reset to answering phase for the same question
    setChosenAnswer(null);
    useChemStore.setState({ phase: "answering", lastResult: null });
  }

  const q = current?.question ?? null;
  const isRevealing = phase === "revealing";
  const wasCorrect  = lastResult?.was_correct ?? null;
  const correctAns  = lastResult?.correct_answer ?? q?.correct_answer ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-violet-600 text-xs font-semibold tracking-wide uppercase">Adaptive PYQ</span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-10 pb-20">

        {/* ── Loading state ── */}
        {(phase === "loading" || (!q && !error)) && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading your question…</p>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-red-600 mb-3">Could not load question</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => startSession("guest")}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Question card ── */}
        {q && (phase === "answering" || phase === "revealing") && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

            {/* Meta */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-bold tracking-widest text-slate-400 uppercase">
                  {q.exam} · {q.exam_year}
                </span>
                <span className={`text-[0.65rem] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  q.difficulty_level === "easy"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : q.difficulty_level === "medium"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}>
                  {q.difficulty_level}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {q.concept_tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[0.6rem] bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-2 py-0.5 font-semibold uppercase">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Question text */}
            <p className="text-base font-semibold text-slate-800 leading-relaxed mb-6">
              {q.question_text}
            </p>

            {/* Options */}
            <div className="flex flex-col gap-2.5 mb-2">
              {(["A", "B", "C", "D"] as const).map((letter) => (
                <OptionButton
                  key={letter}
                  letter={letter}
                  text={q.options[letter]}
                  phase={isRevealing ? "revealing" : "answering"}
                  chosen={chosenAnswer}
                  correct={correctAns}
                  onChoose={handleChoose}
                />
              ))}
            </div>

            {/* ── Correct banner ── */}
            {isRevealing && wasCorrect === true && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left animate-fade-in">
                <p className="text-sm font-bold text-emerald-700 mb-1">✅ Correct! +10 ELO</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Concepts reinforced:{" "}
                  <span className="font-semibold text-slate-700">
                    {q.concept_tags.slice(0, 3).join(", ")}
                  </span>
                </p>
                <button
                  onClick={nextQuestion}
                  className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide rounded-xl px-5 py-2 transition-colors"
                >
                  Next Question →
                </button>
              </div>
            )}

            {/* ── Wrong-answer Socratic diagnosis ── */}
            {isRevealing && wasCorrect === false && chosenAnswer && (
              <DiagnosisPanel
                chosen={chosenAnswer}
                question={q}
                onTryAgain={handleTryAgain}
              />
            )}

            {/* Waiting for result (optimistic: phase is revealing but result not yet set) */}
            {isRevealing && wasCorrect === null && (
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs">
                <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                Checking…
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

