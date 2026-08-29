"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useChemStore } from "@/store/useChemStore";
import type { PYQQuestion } from "@/lib/api";

// ── Difficulty badge ────────────────────────────────────────────────────────
const DIFF_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  easy:   { bg: "rgba(0,255,136,0.08)",   color: "#00ff88", border: "rgba(0,255,136,0.3)" },
  medium: { bg: "rgba(245,158,11,0.08)",  color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  hard:   { bg: "rgba(248,113,113,0.08)", color: "#f87171", border: "rgba(248,113,113,0.3)" },
};

// ── Memoised option button — only re-renders when its own state changes ─────
const OptionButton = memo(function OptionButton({
  letter,
  text,
  selected,
  correct,
  revealed,
  disabled,
  onClick,
}: {
  letter: string;
  text: string;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  let border = "#1e2d3d";
  let bg = "transparent";
  let color = "#94a3b8";

  if (revealed) {
    if (correct) { border = "#00ff88"; bg = "rgba(0,255,136,0.1)"; color = "#00ff88"; }
    else if (selected) { border = "#f87171"; bg = "rgba(248,113,113,0.1)"; color = "#f87171"; }
  } else if (selected) {
    border = "#3b82f6"; bg = "rgba(59,130,246,0.1)"; color = "#e2e8f0";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "13px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        textAlign: "left",
        fontFamily: "Courier New, monospace",
        transition: "all 0.18s ease",
        opacity: revealed && !correct && !selected ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !revealed) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !revealed && !selected) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2d3d";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: revealed
          ? correct ? "rgba(0,255,136,0.2)" : selected ? "rgba(248,113,113,0.2)" : "#0d1520"
          : selected ? "rgba(59,130,246,0.2)" : "#0d1520",
        border: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: 800, color,
        transition: "all 0.18s",
      }}>
        {revealed && correct ? "✓" : revealed && selected ? "✗" : letter}
      </span>
      <span style={{ color, fontSize: "0.82rem", lineHeight: 1.55, transition: "color 0.18s" }}>
        {text}
      </span>
    </button>
  );
});

// ── Memoised question card ──────────────────────────────────────────────────
const QuestionCard = memo(function QuestionCard({
  question,
  selectedAnswer,
  revealed,
  onSelect,
}: {
  question: PYQQuestion;
  selectedAnswer: string | null;
  revealed: boolean;
  onSelect: (a: string) => void;
}) {
  const diff = DIFF_STYLE[question.difficulty_level] ?? DIFF_STYLE.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{
        background: "#111820",
        border: "1px solid #1e2d3d",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header band */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid #1e2d3d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: "0.6rem", padding: "3px 9px", borderRadius: 999,
            background: "rgba(167,139,250,0.1)", color: "#a78bfa",
            border: "1px solid rgba(167,139,250,0.25)", letterSpacing: "0.1em",
          }}>
            {question.exam}
          </span>
          <span style={{ color: "#334155", fontSize: "0.65rem" }}>{question.exam_year}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: "0.6rem", padding: "3px 9px", borderRadius: 999,
            background: diff.bg, color: diff.color,
            border: `1px solid ${diff.border}`, letterSpacing: "0.1em", fontWeight: 700,
          }}>
            {question.difficulty_level.toUpperCase()}
          </span>
          <span style={{ color: "#263245", fontSize: "0.6rem" }}>{question.id}</span>
        </div>
      </div>

      {/* Question text */}
      <div style={{ padding: "20px 20px 16px" }}>
        <p style={{
          color: "#e2e8f0", fontSize: "0.9rem", lineHeight: 1.7,
          margin: 0, fontFamily: "Courier New, monospace",
        }}>
          {question.question_text}
        </p>
      </div>

      {/* Options */}
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {(["A", "B", "C", "D"] as const).map((letter) => (
          <OptionButton
            key={letter}
            letter={letter}
            text={question.options[letter]}
            selected={selectedAnswer === letter}
            correct={revealed && question.correct_answer === letter}
            revealed={revealed}
            disabled={revealed}
            onClick={() => onSelect(letter)}
          />
        ))}
      </div>

      {/* Concept tags */}
      <div style={{
        padding: "12px 20px",
        borderTop: "1px solid #0d1520",
        display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ color: "#263245", fontSize: "0.6rem", letterSpacing: "0.1em" }}>TAGS:</span>
        {question.concept_tags.map((tag) => (
          <span key={tag} style={{
            fontSize: "0.58rem", padding: "2px 7px", borderRadius: 4,
            background: "#0d1520", color: "#475569",
            border: "1px solid #1e2d3d", letterSpacing: "0.06em",
          }}>
            {tag.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </motion.div>
  );
});

// ── Result overlay ──────────────────────────────────────────────────────────
function ResultOverlay({
  isCorrect,
  explanation,
  onNext,
}: {
  isCorrect: boolean;
  explanation: string[];
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: isCorrect ? "rgba(0,255,136,0.07)" : "rgba(248,113,113,0.07)",
        border: `1px solid ${isCorrect ? "rgba(0,255,136,0.3)" : "rgba(248,113,113,0.3)"}`,
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.5rem" }}>{isCorrect ? "⚡" : "💥"}</span>
        <div>
          <div style={{
            color: isCorrect ? "#00ff88" : "#f87171",
            fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 2,
          }}>
            {isCorrect ? "CORRECT! +10 ELO" : "INCORRECT — −5 ELO"}
          </div>
          <div style={{ color: "#475569", fontSize: "0.68rem" }}>
            Concepts: {explanation.slice(0, 3).map(t => t.replace(/_/g, " ")).join(" · ")}
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        style={{
          background: isCorrect ? "rgba(0,255,136,0.12)" : "rgba(59,130,246,0.12)",
          border: `1px solid ${isCorrect ? "rgba(0,255,136,0.4)" : "rgba(59,130,246,0.4)"}`,
          color: isCorrect ? "#00ff88" : "#3b82f6",
          padding: "8px 20px", borderRadius: 8,
          fontFamily: "Courier New, monospace", fontSize: "0.72rem",
          fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        NEXT →
      </button>
    </motion.div>
  );
}

// ── Weakness bars sidebar ───────────────────────────────────────────────────
function WeaknessSidebar({ weaknesses }: { weaknesses: [string, number][] }) {
  if (!weaknesses.length) return null;
  const max = Math.max(...weaknesses.map(([, v]) => v), 1);
  return (
    <div style={{
      background: "#111820", border: "1px solid #1e2d3d",
      borderRadius: 12, padding: "16px", width: 220, flexShrink: 0,
    }}>
      <div style={{ color: "#334155", fontSize: "0.6rem", letterSpacing: "0.14em", marginBottom: 12 }}>
        // WEAKNESS RADAR
      </div>
      {weaknesses.slice(0, 8).map(([tag, score]) => (
        <div key={tag} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#475569", fontSize: "0.65rem" }}>{tag.replace(/_/g, " ")}</span>
            <span style={{ color: "#f87171", fontSize: "0.62rem", fontWeight: 700 }}>{score}</span>
          </div>
          <div style={{ height: 3, background: "#0d1520", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(score / max) * 100}%` }}
              transition={{ duration: 0.6 }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, #f87171, #f59e0b)`,
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AdaptivePYQPage() {
  const {
    phase, current, lastResult, error, eloRating, profile,
    startSession, chooseAnswer, nextQuestion, refreshProfile,
    prefetchQueue,
  } = useChemStore();

  const [selected, setSelected] = useState<string | null>(null);
  const USER_ID = "player_001";

  // Start session on mount
  useEffect(() => {
    startSession(USER_ID);
    refreshProfile();
  }, []);

  // Reset selection when question changes
  useEffect(() => {
    if (phase === "answering") setSelected(null);
  }, [current?.question.id, phase]);

  const handleSelect = useCallback(
    (answer: string) => {
      if (phase !== "answering" || selected) return;
      setSelected(answer);
      chooseAnswer(answer);
    },
    [phase, selected, chooseAnswer]
  );

  const handleNext = useCallback(() => {
    nextQuestion();
  }, [nextQuestion]);

  // ── Weakness data for sidebar
  const weaknessEntries: [string, number][] = profile
    ? Object.entries(profile.weakness_scores)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  // ── Accuracy colour
  const accuracy = profile?.accuracy ?? 0;
  const accColor = accuracy >= 0.7 ? "#00ff88" : accuracy >= 0.4 ? "#f59e0b" : "#f87171";

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "Courier New, monospace" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "rgba(8,12,16,0.95)",
        borderBottom: "1px solid #1e2d3d",
        padding: "0 24px",
        height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>
            ← Dashboard
          </Link>
          <span style={{ color: "#1e2d3d" }}>|</span>
          <span style={{ color: "#a78bfa", fontSize: "0.7rem", letterSpacing: "0.14em" }}>// ADAPTIVE PYQ</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Prefetch indicator */}
          {prefetchQueue.length > 0 && (
            <span style={{ color: "#334155", fontSize: "0.6rem" }}>
              {prefetchQueue.length} queued
            </span>
          )}
          {/* Accuracy */}
          {profile && (
            <div style={{
              background: `${accColor}0d`, border: `1px solid ${accColor}30`,
              borderRadius: 8, padding: "4px 12px",
              display: "flex", gap: 6, alignItems: "center",
            }}>
              <span style={{ color: "#334155", fontSize: "0.6rem" }}>ACC</span>
              <span style={{ color: accColor, fontSize: "0.82rem", fontWeight: 800 }}>
                {Math.round(accuracy * 100)}%
              </span>
            </div>
          )}
          {/* ELO */}
          <div style={{
            background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 8, padding: "4px 12px",
            display: "flex", gap: 6, alignItems: "center",
          }}>
            <span style={{ color: "#334155", fontSize: "0.6rem" }}>ELO</span>
            <span className="glow" style={{ color: "#00ff88", fontSize: "0.82rem", fontWeight: 800 }}>
              {eloRating}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "28px 20px",
        display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap",
      }}>

        {/* ── Main question area ── */}
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>

          {/* Section header */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: "#a78bfa", fontSize: "0.68rem", letterSpacing: "0.24em", margin: "0 0 6px" }}>
              // ADAPTIVE PYQ MATCHMAKER
            </p>
            <h1 style={{ color: "#e2e8f0", fontSize: "1.3rem", fontWeight: 900, margin: 0 }}>
              Previous Year Questions —{" "}
              <span style={{ color: "#a78bfa" }}>Personalised</span>
            </h1>
            <p style={{ color: "#475569", fontSize: "0.75rem", margin: "6px 0 0", lineHeight: 1.5 }}>
              Questions are matched to your weakest concepts. No AI hallucinations — every question is from the verified PYQ bank.
            </p>
          </div>

          {/* ── Error state ── */}
          {error && (
            <div style={{
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 10, padding: "14px 18px", marginBottom: 16,
              color: "#f87171", fontSize: "0.78rem",
            }}>
              ⚠ Backend unreachable — make sure <code style={{ color: "#fca5a5" }}>python start.py</code> is running.
              <button
                onClick={() => startSession(USER_ID)}
                style={{
                  marginLeft: 12, background: "transparent",
                  border: "1px solid #f87171", color: "#f87171",
                  padding: "3px 10px", borderRadius: 6,
                  fontFamily: "Courier New, monospace", fontSize: "0.65rem", cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          <AnimatePresence mode="wait">
            {phase === "loading" && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  background: "#111820", border: "1px solid #1e2d3d",
                  borderRadius: 16, padding: "28px 24px",
                }}
              >
                <div style={{ color: "#334155", fontSize: "0.68rem", marginBottom: 16, letterSpacing: "0.12em" }}>
                  // MATCHING QUESTION TO YOUR WEAKNESSES…
                </div>
                {[80, 95, 60, 75].map((w, i) => (
                  <div
                    key={i}
                    className="shimmer"
                    style={{
                      height: i === 0 ? 48 : 16,
                      borderRadius: 8,
                      marginBottom: 12,
                      width: `${w}%`,
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* ── Live question ── */}
            {(phase === "answering" || phase === "revealing") && current && (
              <motion.div key={current.question.id}>
                {/* Meta strip */}
                {current.meta && (
                  <div style={{
                    marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
                  }}>
                    <span style={{ color: "#334155", fontSize: "0.6rem" }}>SELECTED BY</span>
                    <span style={{
                      fontSize: "0.6rem", padding: "2px 8px", borderRadius: 999,
                      background: current.meta.selection_method === "llm"
                        ? "rgba(167,139,250,0.12)" : "rgba(59,130,246,0.12)",
                      color: current.meta.selection_method === "llm" ? "#a78bfa" : "#3b82f6",
                      border: `1px solid ${current.meta.selection_method === "llm" ? "rgba(167,139,250,0.3)" : "rgba(59,130,246,0.3)"}`,
                      letterSpacing: "0.08em",
                    }}>
                      {current.meta.selection_method === "llm" ? "AI MATCHMAKER" : "RULE ENGINE"}
                    </span>
                    {current.meta.matched_weakness_tags.length > 0 && (
                      <>
                        <span style={{ color: "#263245", fontSize: "0.6rem" }}>·</span>
                        <span style={{ color: "#f87171", fontSize: "0.6rem" }}>
                          weak: {current.meta.matched_weakness_tags.slice(0, 2).map(t => t.replace(/_/g, " ")).join(", ")}
                        </span>
                      </>
                    )}
                    <span style={{ color: "#263245", fontSize: "0.6rem", marginLeft: "auto" }}>
                      pool: {current.meta.candidate_pool_size} questions
                    </span>
                  </div>
                )}

                <QuestionCard
                  question={current.question}
                  selectedAnswer={selected}
                  revealed={phase === "revealing"}
                  onSelect={handleSelect}
                />

                {/* Result overlay */}
                <AnimatePresence>
                  {phase === "revealing" && lastResult && (
                    <ResultOverlay
                      isCorrect={lastResult.was_correct}
                      explanation={lastResult.explanation_tags}
                      onNext={handleNext}
                    />
                  )}
                  {phase === "revealing" && !lastResult && (
                    <div style={{
                      marginTop: 14, padding: "12px 16px",
                      background: "#111820", border: "1px solid #1e2d3d",
                      borderRadius: 10, display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div className="shimmer" style={{ width: 16, height: 16, borderRadius: "50%" }} />
                      <span style={{ color: "#475569", fontSize: "0.72rem" }}>Evaluating…</span>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Stats strip ── */}
          {profile && (
            <div style={{
              marginTop: 24,
              background: "#111820", border: "1px solid #1e2d3d",
              borderRadius: 12, padding: "14px 18px",
              display: "flex", gap: 20, flexWrap: "wrap",
            }}>
              {[
                { label: "ANSWERED", value: profile.total_answered, color: "#a78bfa" },
                { label: "CORRECT",  value: profile.total_correct,  color: "#00ff88" },
                { label: "ACCURACY", value: `${Math.round(accuracy * 100)}%`, color: accColor },
                { label: "WEAKNESSES", value: Object.keys(profile.weakness_scores).filter(k => profile.weakness_scores[k] > 0).length, color: "#f87171" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ color: "#334155", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: "1.2rem", fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar: weakness radar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 220, flexShrink: 0 }}>
          <WeaknessSidebar weaknesses={weaknessEntries} />

          {/* Tip box */}
          <div style={{
            background: "rgba(167,139,250,0.05)",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ color: "#a78bfa", fontSize: "0.6rem", letterSpacing: "0.14em", marginBottom: 8 }}>// HOW IT WORKS</div>
            <p style={{ color: "#475569", fontSize: "0.68rem", margin: 0, lineHeight: 1.65 }}>
              Every wrong answer boosts your weakness score for that concept. The AI matchmaker fetches the{" "}
              <span style={{ color: "#e2e8f0" }}>most relevant PYQ</span> from the verified bank — it never invents questions.
            </p>
          </div>

          {/* Reset button */}
          <button
            onClick={() => { startSession(USER_ID); refreshProfile(); }}
            style={{
              background: "transparent",
              border: "1px solid #1e2d3d",
              color: "#475569", padding: "8px 0",
              borderRadius: 8, fontFamily: "Courier New, monospace",
              fontSize: "0.68rem", cursor: "pointer", letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#a78bfa";
              (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2d3d";
              (e.currentTarget as HTMLButtonElement).style.color = "#475569";
            }}
          >
            NEW SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
