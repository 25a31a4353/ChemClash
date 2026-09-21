"use client";

/**
 * ChemClash — Watch & Execute
 *
 * Flow per challenge:
 *  WATCHING  → animated reaction sequence plays (nucleophile approaches electrophile)
 *  PAUSED    → animation halts at the key step; student picks the outcome
 *  REVEALING → correct / wrong feedback + explanation
 *  COMPLETE  → full reaction shown; "Next Reaction" available
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Challenge } from "@/lib/api";
import { fetchChallenges } from "@/lib/api";

// ── Static fallback data (used if backend unreachable) ─────────────────────

const FALLBACK: Challenge[] = [
  {
    id: 1,
    nucleophile: "OH⁻",
    electrophile: "CH₃Br",
    shouldReact: true,
    hint: "Hydroxide attacks the carbon bearing the leaving group (SN2).",
    mechanism: "SN2",
    explanation:
      "Strong hydroxide nucleophile attacks the primary carbon of CH₃Br via backside attack. Br⁻ departs as the C–O bond forms simultaneously.",
    difficulty: "easy",
  },
  {
    id: 2,
    nucleophile: "H₂O",
    electrophile: "CH₄",
    shouldReact: false,
    hint: "Methane has no electrophilic carbon — no leaving group, no reaction.",
    mechanism: "",
    explanation:
      "CH₄ has no leaving group and no electrophilic carbon. Water is a weak nucleophile. No driving force for any substitution or elimination.",
    difficulty: "easy",
  },
  {
    id: 3,
    nucleophile: "NH₃",
    electrophile: "CH₃Cl",
    shouldReact: true,
    hint: "Ammonia acts as a nucleophile toward the electrophilic carbon (SN2).",
    mechanism: "SN2",
    explanation:
      "Ammonia's lone pair attacks the electrophilic carbon of CH₃Cl, displacing Cl⁻ in an SN2 step to form methylammonium chloride.",
    difficulty: "easy",
  },
  {
    id: 4,
    nucleophile: "Cl⁻",
    electrophile: "Benzene",
    shouldReact: false,
    hint: "Cl⁻ alone cannot react with benzene — a Lewis acid catalyst is required.",
    mechanism: "",
    explanation:
      "Benzene undergoes electrophilic aromatic substitution, not nucleophilic attack. Cl⁻ is a nucleophile; it cannot directly attack the electron-rich aromatic ring.",
    difficulty: "medium",
  },
  {
    id: 5,
    nucleophile: "CN⁻",
    electrophile: "(CH₃)₃C⁺",
    shouldReact: true,
    hint: "Cyanide attacks the carbocation readily (SN1 scenario).",
    mechanism: "SN1",
    explanation:
      "The stable tertiary carbocation is attacked by CN⁻ in the rate-determining product-forming step of an SN1 mechanism. No inversion — both faces are accessible.",
    difficulty: "medium",
  },
  {
    id: 6,
    nucleophile: "Br⁻",
    electrophile: "CH₃CH₂Cl",
    shouldReact: true,
    hint: "Bromide is an excellent SN2 nucleophile — polarisable and not too bulky.",
    mechanism: "SN2",
    explanation:
      "Br⁻ is a strong, polarisable nucleophile. It attacks the primary carbon of ethyl chloride via backside attack, displacing Cl⁻ in a classic SN2 reaction.",
    difficulty: "easy",
  },
  {
    id: 7,
    nucleophile: "OH⁻",
    electrophile: "(CH₃)₂CHBr",
    shouldReact: true,
    hint: "Secondary substrates — will SN2 or E2 dominate?",
    mechanism: "SN2/E2",
    explanation:
      "With a strong base/nucleophile like OH⁻ and a secondary substrate, both SN2 and E2 compete. Heating and a more hindered base favours E2; low temperature and polar aprotic solvent favours SN2.",
    difficulty: "hard",
  },
  {
    id: 8,
    nucleophile: "H₂O",
    electrophile: "CH₃CH₂Br",
    shouldReact: true,
    hint: "Water is a weak nucleophile — reaction is slow but possible under forcing conditions.",
    mechanism: "SN2",
    explanation:
      "Water can act as a weak nucleophile toward primary alkyl halides, giving an alcohol after deprotonation. The reaction is slow due to water's low nucleophilicity.",
    difficulty: "medium",
  },
];

// ── Build multiple-choice options from a challenge ─────────────────────────

interface Option {
  id: string;
  label: string;
  isCorrect: boolean;
}

function buildOptions(c: Challenge): Option[] {
  if (!c.shouldReact) {
    return [
      { id: "no_react", label: "No reaction occurs", isCorrect: true },
      {
        id: "sn2",
        label: `Reacts via SN2 → substitution product`,
        isCorrect: false,
      },
      {
        id: "e2",
        label: `Reacts via E2 → elimination product`,
        isCorrect: false,
      },
      {
        id: "radical",
        label: `Radical chain reaction`,
        isCorrect: false,
      },
    ];
  }
  const mech = c.mechanism || "substitution";
  return [
    {
      id: "correct",
      label: `Reacts via ${mech} → substitution/addition product`,
      isCorrect: true,
    },
    { id: "no_react", label: "No reaction occurs", isCorrect: false },
    {
      id: "wrong_mech",
      label: `Reacts via radical chain mechanism`,
      isCorrect: false,
    },
    {
      id: "reverse",
      label: `Electrophile attacks the nucleophile (reversed roles)`,
      isCorrect: false,
    },
  ];
}

// ── Difficulty badge ───────────────────────────────────────────────────────

function DiffBadge({ d }: { d: string }) {
  const cls =
    d === "easy"
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : d === "medium"
      ? "bg-amber-50 text-amber-600 border-amber-200"
      : "bg-red-50 text-red-600 border-red-200";
  return (
    <span
      className={`text-[0.6rem] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}
    >
      {d}
    </span>
  );
}

// ── Reaction animation ─────────────────────────────────────────────────────

type AnimPhase = "watching" | "paused" | "revealing" | "complete";

interface ReactionAnimProps {
  nucleophile: string;
  electrophile: string;
  animPhase: AnimPhase;
  wasCorrect: boolean | null;
}

function ReactionAnim({
  nucleophile,
  electrophile,
  animPhase,
  wasCorrect,
}: ReactionAnimProps) {
  // progress: 0 → 1  (watching = animates to 0.5, complete = 1)
  const traveling = animPhase === "watching";
  const arrived =
    animPhase === "complete" || (animPhase === "revealing" && wasCorrect === true);

  return (
    <div className="relative flex items-center justify-center h-28 select-none overflow-hidden rounded-xl bg-slate-900 border border-slate-700">
      {/* Electrophile — static right */}
      <div className="absolute right-10 flex flex-col items-center gap-1">
        <span className="text-2xl font-black text-blue-300">{electrophile}</span>
        <span className="text-[0.6rem] text-slate-500 uppercase tracking-widest">
          electrophile
        </span>
      </div>

      {/* Nucleophile — animates left → centre → (on complete) fuses */}
      <div
        className={`absolute flex flex-col items-center gap-1 transition-all ${
          traveling
            ? "left-10 animate-nuc-approach"
            : arrived
            ? "right-10 opacity-0 duration-500"
            : "left-10"
        }`}
        style={
          arrived
            ? {}
            : traveling
            ? {}
            : {}
        }
      >
        <span className="text-2xl font-black text-emerald-300">{nucleophile}</span>
        <span className="text-[0.6rem] text-slate-500 uppercase tracking-widest">
          nucleophile
        </span>
      </div>

      {/* Arrow — shown during watching */}
      {traveling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-500 text-xl animate-pulse">→</span>
        </div>
      )}

      {/* Paused indicator */}
      {animPhase === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-xl">
          <span className="text-white text-xs font-bold tracking-widest uppercase bg-amber-500 px-3 py-1 rounded-full">
            ⏸ Predict the outcome
          </span>
        </div>
      )}

      {/* Reaction outcome — complete */}
      {arrived && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-black text-violet-300">
            {electrophile} + {nucleophile}
          </span>
          <span className="text-[0.6rem] text-emerald-400 font-bold uppercase tracking-widest">
            ✓ Reaction complete
          </span>
        </div>
      )}

      {/* No-reaction outcome */}
      {animPhase === "complete" && wasCorrect !== null && !arrived && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl text-slate-400 font-bold">
            {nucleophile} &nbsp;✗&nbsp; {electrophile}
          </span>
          <span className="text-[0.6rem] text-red-400 font-bold uppercase tracking-widest">
            No reaction
          </span>
        </div>
      )}
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS: { id: AnimPhase; label: string }[] = [
  { id: "watching", label: "Watch" },
  { id: "paused", label: "Predict" },
  { id: "revealing", label: "Evaluate" },
  { id: "complete", label: "Complete" },
];

function StepBar({ current }: { current: AnimPhase }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold border-2 transition-colors ${
                i < idx
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : i === idx
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span
              className={`text-[0.6rem] mt-1 font-semibold uppercase tracking-wide ${
                i === idx ? "text-violet-600" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mt-[-1rem] transition-colors ${
                i < idx ? "bg-emerald-400" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function WatchExecutePage() {
  const [challenges, setChallenges] = useState<Challenge[]>(FALLBACK);
  const [index, setIndex] = useState(0);
  const [animPhase, setAnimPhase] = useState<AnimPhase>("watching");
  const [chosen, setChosen] = useState<string | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch challenges from backend; fall back silently to embedded data
  useEffect(() => {
    fetchChallenges()
      .then((data) => {
        if (data.length > 0) setChallenges(data);
      })
      .catch(() => {
        /* use fallback */
      });
  }, []);

  const challenge = challenges[index % challenges.length];
  const options = buildOptions(challenge);

  // Auto-advance from "watching" → "paused" after 2.5 s
  useEffect(() => {
    if (animPhase !== "watching") return;
    timerRef.current = setTimeout(() => setAnimPhase("paused"), 2500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [animPhase, index]);

  function handleSelect(optId: string) {
    if (animPhase !== "paused") return;
    const opt = options.find((o) => o.id === optId)!;
    setChosen(optId);
    setWasCorrect(opt.isCorrect);
    if (opt.isCorrect) setScore((s) => s + 1);
    setAnimPhase("revealing");
  }

  function handleContinue() {
    setAnimPhase("complete");
  }

  function handleNext() {
    setIndex((i) => i + 1);
    setAnimPhase("watching");
    setChosen(null);
    setWasCorrect(null);
  }

  const progress = Math.round(((index % challenges.length) / challenges.length) * 100);

  return (
    <>
      {/* Keyframe CSS injected into the page */}
      <style>{`
        @keyframes nucApproach {
          0%   { left: 2.5rem; }
          100% { left: calc(50% - 3rem); }
        }
        .animate-nuc-approach {
          animation: nucApproach 2.4s ease-in-out forwards;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-orange-600 text-xs font-semibold tracking-wide uppercase">
              Watch &amp; Execute
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              🏅{" "}
              <span className="font-bold text-emerald-600">{score}</span> correct
            </span>
            <span className="text-slate-300">·</span>
            <span>
              {(index % challenges.length) + 1}/{challenges.length}
            </span>
          </div>
        </div>

        <main className="max-w-xl mx-auto px-4 py-10 pb-24">
          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-[0.65rem] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step bar */}
          <StepBar current={animPhase} />

          {/* Challenge card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            {/* Meta */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-[0.65rem] font-bold tracking-widest text-slate-400 uppercase">
                Reaction #{challenge.id}
              </span>
              <DiffBadge d={challenge.difficulty} />
            </div>

            {/* Reactants label */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-center flex-1">
                <p className="text-[0.6rem] text-slate-400 uppercase tracking-widest mb-1">
                  Nucleophile
                </p>
                <p className="text-lg font-black text-emerald-700">
                  {challenge.nucleophile}
                </p>
              </div>
              <span className="text-slate-300 text-xl font-light px-2">+</span>
              <div className="text-center flex-1">
                <p className="text-[0.6rem] text-slate-400 uppercase tracking-widest mb-1">
                  Electrophile
                </p>
                <p className="text-lg font-black text-blue-700">
                  {challenge.electrophile}
                </p>
              </div>
            </div>

            {/* Reaction animation */}
            <ReactionAnim
              nucleophile={challenge.nucleophile}
              electrophile={challenge.electrophile}
              animPhase={animPhase}
              wasCorrect={wasCorrect}
            />

            {/* Hint strip */}
            {animPhase === "paused" && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-widest mb-0.5">
                  Hint
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {challenge.hint}
                </p>
              </div>
            )}

            {/* ── Options (paused phase) ── */}
            {animPhase === "paused" && (
              <div className="mt-5 flex flex-col gap-2.5">
                <p className="text-sm font-bold text-slate-700 mb-1">
                  What happens next?
                </p>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-orange-300 hover:bg-orange-50 transition-all duration-150"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Feedback (revealing phase) ── */}
            {animPhase === "revealing" && (
              <div
                className={`mt-5 rounded-xl border px-5 py-4 ${
                  wasCorrect
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p
                  className={`text-sm font-bold mb-2 ${
                    wasCorrect ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {wasCorrect ? "✅ Correct!" : "❌ Not quite"}
                </p>

                {/* Show chosen option text */}
                {chosen && (
                  <p className="text-xs text-slate-500 mb-2">
                    You chose:{" "}
                    <span className="font-semibold text-slate-700">
                      {options.find((o) => o.id === chosen)?.label}
                    </span>
                  </p>
                )}

                {/* Mechanism tag */}
                {challenge.shouldReact && challenge.mechanism && (
                  <p className="text-xs mb-2">
                    <span className="inline-block bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-bold text-[0.65rem] mr-1 uppercase">
                      {challenge.mechanism}
                    </span>
                    mechanism
                  </p>
                )}

                {/* Explanation */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {challenge.explanation}
                </p>

                <button
                  onClick={handleContinue}
                  className="mt-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-wide rounded-xl px-5 py-2.5 transition-colors"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* ── Completion (complete phase) ── */}
            {animPhase === "complete" && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
                <p className="text-sm font-bold text-slate-700 mb-1">
                  Reaction complete 🧪
                </p>
                <p className="text-xs text-slate-500 mb-1 leading-relaxed">
                  {challenge.explanation}
                </p>
                {challenge.shouldReact && challenge.mechanism && (
                  <p className="text-xs text-violet-600 font-bold mt-2 mb-3">
                    Mechanism: {challenge.mechanism}
                  </p>
                )}
                <button
                  onClick={handleNext}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold tracking-wide rounded-xl px-6 py-2.5 transition-colors"
                >
                  Next Reaction →
                </button>
              </div>
            )}
          </div>

          {/* Score footer */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Score:{" "}
            <span className="font-bold text-emerald-600">{score}</span> /{" "}
            {index % challenges.length + (animPhase === "complete" ? 1 : 0)} correct
          </p>
        </main>
      </div>
    </>
  );
}
