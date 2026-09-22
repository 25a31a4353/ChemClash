"use client";

/**
 * ChemClash — Living Molecules MVP
 *
 * Interactive 2D visualization of organic chemistry interactions.
 * Uses CSS keyframe animations + Framer Motion (already a project dependency).
 * 2D only — no 3D geometry or claimed molecular accuracy.
 * All reactions drawn from existing project concept set:
 *   nucleophile · electrophile · carbocation · leaving group · SN1 · SN2 · E1 · E2
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

type ConceptId = "sn2" | "sn1" | "e2" | "e1" | "carbocation";

interface Entity {
  id: string;
  label: string;       // chemical symbol / formula
  role: string;        // "Nucleophile" | "Electrophile" | etc.
  color: string;       // Tailwind bg color (static string for JIT)
  borderColor: string; // Tailwind border color
  textColor: string;   // Tailwind text color
  dialogue: string;    // personality-style flavour text
  size: number;        // relative visual size (px, used in inline style)
}

interface ReactionConcept {
  id: ConceptId;
  label: string;
  subtitle: string;
  icon: string;
  entities: Entity[];
  steps: string[];          // ordered animation step labels
  explanation: string;      // chemistry explanation paragraph
  practiceHref: string;
  practiceLabel: string;
}

// ── Concept data ───────────────────────────────────────────────────────────
// All concepts match existing ChemClash tag set and PYQ bank.

const CONCEPTS: ReactionConcept[] = [
  // ── SN2 ──────────────────────────────────────────────────────────────────
  {
    id: "sn2",
    label: "SN2",
    subtitle: "Backside attack, one step",
    icon: "⚡",
    entities: [
      {
        id: "nuc",
        label: "OH⁻",
        role: "Nucleophile",
        color: "bg-emerald-100",
        borderColor: "border-emerald-400",
        textColor: "text-emerald-800",
        dialogue: "I'm loaded with electrons and ready to attack — get out of my way, Bromine!",
        size: 64,
      },
      {
        id: "elec",
        label: "CH₃Br",
        role: "Electrophile",
        color: "bg-blue-100",
        borderColor: "border-blue-400",
        textColor: "text-blue-800",
        dialogue: "My carbon is electron-poor. I can feel the nucleophile approaching from behind…",
        size: 72,
      },
      {
        id: "lg",
        label: "Br⁻",
        role: "Leaving Group",
        color: "bg-amber-100",
        borderColor: "border-amber-400",
        textColor: "text-amber-800",
        dialogue: "I was never loyal to this carbon. I'm stable as Br⁻ — see ya!",
        size: 60,
      },
    ],
    steps: [
      "Nucleophile (OH⁻) approaches from the back face",
      "C–O bond forms simultaneously with C–Br breaking",
      "Transition state: pentacoordinate carbon",
      "Br⁻ departs — inversion of configuration (Walden flip)",
      "Product: CH₃OH formed",
    ],
    explanation:
      "SN2 is a concerted bimolecular substitution. The nucleophile attacks the electrophilic carbon from 180° opposite the leaving group. Bond formation and breaking happen simultaneously — no intermediate. Rate depends on both nucleophile and substrate concentration. Inversion of stereochemistry (Walden inversion) always occurs at the attacked carbon.",
    practiceHref: "/mechanism-builder",
    practiceLabel: "Practice in Mechanism Builder",
  },

  // ── SN1 ──────────────────────────────────────────────────────────────────
  {
    id: "sn1",
    label: "SN1",
    subtitle: "Ionisation first, then attack",
    icon: "🔓",
    entities: [
      {
        id: "substrate",
        label: "(CH₃)₃CBr",
        role: "Tertiary Substrate",
        color: "bg-blue-100",
        borderColor: "border-blue-400",
        textColor: "text-blue-800",
        dialogue: "I'm bulky and tertiary — the nucleophile can't reach me directly. I'll ionise first.",
        size: 80,
      },
      {
        id: "carb",
        label: "⁺C(CH₃)₃",
        role: "Carbocation",
        color: "bg-red-100",
        borderColor: "border-red-400",
        textColor: "text-red-800",
        dialogue: "I'm planar and positively charged — attack me from either face, I don't discriminate!",
        size: 72,
      },
      {
        id: "lg",
        label: "Br⁻",
        role: "Leaving Group",
        color: "bg-amber-100",
        borderColor: "border-amber-400",
        textColor: "text-amber-800",
        dialogue: "Stabilised by solvent. I leave willingly — this tertiary carbon was getting crowded.",
        size: 60,
      },
      {
        id: "nuc",
        label: "H₂O",
        role: "Nucleophile",
        color: "bg-emerald-100",
        borderColor: "border-emerald-400",
        textColor: "text-emerald-800",
        dialogue: "I'm a weak nucleophile, but the carbocation is so reactive I barely need to try.",
        size: 56,
      },
    ],
    steps: [
      "Step 1 (slow): C–Br bond ionises — carbocation forms",
      "Carbocation stabilised by hyperconjugation (3° > 2° > 1°)",
      "Step 2 (fast): nucleophile attacks from either face",
      "Racemisation — both faces accessible on planar carbocation",
      "Product: tertiary alcohol formed",
    ],
    explanation:
      "SN1 proceeds in two steps. The rate-determining step is ionisation of the substrate to form a carbocation — rate depends only on substrate concentration (unimolecular). The carbocation intermediate is planar (sp²), so nucleophilic attack can occur from either face, giving a racemic mixture. Tertiary substrates and polar protic solvents favour SN1.",
    practiceHref: "/adaptive-pyq",
    practiceLabel: "Practice with Adaptive PYQ",
  },

  // ── E2 ───────────────────────────────────────────────────────────────────
  {
    id: "e2",
    label: "E2",
    subtitle: "Concerted elimination",
    icon: "🏹",
    entities: [
      {
        id: "base",
        label: "OH⁻",
        role: "Strong Base",
        color: "bg-violet-100",
        borderColor: "border-violet-400",
        textColor: "text-violet-800",
        dialogue: "I'm coming for the β-hydrogen — I'm a base, not a nucleophile this time!",
        size: 60,
      },
      {
        id: "substrate",
        label: "CH₃CH₂Br",
        role: "Substrate",
        color: "bg-blue-100",
        borderColor: "border-blue-400",
        textColor: "text-blue-800",
        dialogue: "The base is grabbing my β-H and Br⁻ is leaving — all at once!",
        size: 80,
      },
      {
        id: "alkene",
        label: "CH₂=CH₂",
        role: "Alkene Product",
        color: "bg-emerald-100",
        borderColor: "border-emerald-400",
        textColor: "text-emerald-800",
        dialogue: "I'm the product — a π bond formed from those electrons. Anti-periplanar geometry was key!",
        size: 72,
      },
    ],
    steps: [
      "Base (OH⁻) abstracts the anti-periplanar β-hydrogen",
      "C–H and C–Br bonds break simultaneously",
      "π bond forms between Cα and Cβ",
      "Br⁻ departs as leaving group",
      "Alkene product formed — anti-periplanar geometry required",
    ],
    explanation:
      "E2 is a concerted elimination. A strong base abstracts a β-hydrogen while the leaving group departs simultaneously — rate depends on both base and substrate (bimolecular). The β-H and leaving group must be anti-periplanar (180°) for orbital overlap. Zaitsev's rule: the more substituted alkene is the major product. Strong bulky bases favour E2 over SN2.",
    practiceHref: "/mechanism-builder",
    practiceLabel: "Practice in Mechanism Builder",
  },

  // ── E1 ───────────────────────────────────────────────────────────────────
  {
    id: "e1",
    label: "E1",
    subtitle: "Ionise, then lose a proton",
    icon: "💨",
    entities: [
      {
        id: "substrate",
        label: "(CH₃)₃CBr",
        role: "Tertiary Substrate",
        color: "bg-blue-100",
        borderColor: "border-blue-400",
        textColor: "text-blue-800",
        dialogue: "SN1 and I share Step 1 — I form a carbocation first too.",
        size: 80,
      },
      {
        id: "carb",
        label: "⁺C(CH₃)₃",
        role: "Carbocation",
        color: "bg-red-100",
        borderColor: "border-red-400",
        textColor: "text-red-800",
        dialogue: "I could be attacked by a nucleophile (SN1) OR lose a proton (E1) — competition!",
        size: 72,
      },
      {
        id: "base",
        label: "H₂O",
        role: "Weak Base",
        color: "bg-violet-100",
        borderColor: "border-violet-400",
        textColor: "text-violet-800",
        dialogue: "I'm only a weak base, but I can still abstract the β-H from the carbocation.",
        size: 56,
      },
      {
        id: "alkene",
        label: "CH₂=C(CH₃)₂",
        role: "Alkene Product",
        color: "bg-emerald-100",
        borderColor: "border-emerald-400",
        textColor: "text-emerald-800",
        dialogue: "I'm the Zaitsev product — the most substituted alkene wins!",
        size: 72,
      },
    ],
    steps: [
      "Step 1 (slow): carbocation forms (identical to SN1 rate step)",
      "Carbocation is the key intermediate",
      "Weak base abstracts β-H from carbocation",
      "π bond forms — E1 product",
      "Zaitsev alkene (more substituted) predominates",
    ],
    explanation:
      "E1 shares its rate-determining first step with SN1 — ionisation to a carbocation. The second step is β-proton loss by a base (often the solvent) to give an alkene. Rate depends only on substrate (unimolecular). E1 competes with SN1 at the carbocation stage. Higher temperature, weak base, and tertiary substrates favour E1. Zaitsev's rule applies: the more substituted alkene is the major product.",
    practiceHref: "/adaptive-pyq",
    practiceLabel: "Practice with Adaptive PYQ",
  },

  // ── Carbocation ───────────────────────────────────────────────────────────
  {
    id: "carbocation",
    label: "Carbocation",
    subtitle: "Stability & rearrangement",
    icon: "⚛️",
    entities: [
      {
        id: "primary",
        label: "CH₃CH₂⁺",
        role: "1° Carbocation (unstable)",
        color: "bg-red-100",
        borderColor: "border-red-400",
        textColor: "text-red-800",
        dialogue: "I'm primary — barely one alkyl group to stabilise me. I'm desperate for electrons!",
        size: 64,
      },
      {
        id: "secondary",
        label: "(CH₃)₂CH⁺",
        role: "2° Carbocation",
        color: "bg-amber-100",
        borderColor: "border-amber-400",
        textColor: "text-amber-800",
        dialogue: "Two alkyl groups — I'm moderately stable. Hyperconjugation helps a lot.",
        size: 72,
      },
      {
        id: "tertiary",
        label: "(CH₃)₃C⁺",
        role: "3° Carbocation (most stable)",
        color: "bg-emerald-100",
        borderColor: "border-emerald-400",
        textColor: "text-emerald-800",
        dialogue: "Three alkyl groups, maximum hyperconjugation — I'm the most stable carbocation here!",
        size: 80,
      },
    ],
    steps: [
      "1° carbocation: least stable, high energy, rarely isolated",
      "Hyperconjugation: adjacent C–H σ bonds donate electron density",
      "2° carbocation: more σ donors, lower energy",
      "3° carbocation: maximum hyperconjugation, most stable",
      "Rearrangement: 1,2-H or 1,2-CH₃ shift moves to more stable cation",
    ],
    explanation:
      "Carbocation stability increases: 3° > 2° > 1° > methyl. Each additional alkyl group donates electron density via hyperconjugation (C–H σ → empty p orbital overlap), lowering the energy of the cation. Allylic and benzylic carbocations are also stabilised by resonance. Rearrangements (1,2-hydride or methyl shifts) occur whenever a more stable carbocation can be reached — this is a classic JEE trap in SN1 and E1 questions.",
    practiceHref: "/mechanism-builder",
    practiceLabel: "Practice in Mechanism Builder",
  },
];

// ── Animation phases ────────────────────────────────────────────────────────

type Phase = "idle" | "intro" | "step" | "done";

// ── Entity bubble component ────────────────────────────────────────────────

function EntityBubble({
  entity,
  active,
  reacted,
  onClick,
}: {
  entity: Entity;
  active: boolean;
  reacted: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{
        opacity: 1,
        scale: reacted ? [1, 1.15, 0.95, 1] : active ? [1, 1.06, 1] : 1,
        rotate: reacted ? [0, -4, 4, -2, 0] : 0,
      }}
      transition={{
        scale: { duration: reacted ? 0.5 : 1.8, repeat: active && !reacted ? Infinity : 0, ease: "easeInOut" },
        rotate: { duration: 0.5 },
      }}
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center rounded-full border-2 cursor-pointer select-none
        transition-shadow duration-200 hover:shadow-lg
        ${entity.color} ${entity.borderColor}
        ${reacted ? "ring-4 ring-offset-2 ring-emerald-400" : ""}
      `}
      style={{ width: entity.size + 24, height: entity.size + 24 }}
    >
      <span className={`text-base font-black leading-none ${entity.textColor}`}>{entity.label}</span>
      <span className={`text-[0.5rem] font-semibold uppercase tracking-widest mt-0.5 opacity-70 ${entity.textColor}`}>
        {entity.role.split(" ")[0]}
      </span>

      {/* Pulse ring when active */}
      {active && !reacted && (
        <motion.div
          className={`absolute inset-0 rounded-full border-2 ${entity.borderColor}`}
          animate={{ scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Reaction flash */}
      {reacted && (
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-300"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.div>
  );
}

// ── Dialogue panel ────────────────────────────────────────────────────────

function DialoguePanel({ entity, visible }: { entity: Entity | null; visible: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {visible && entity && (
        <motion.div
          key={entity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={`rounded-2xl border-2 px-4 py-3 ${entity.color} ${entity.borderColor}`}
        >
          <p className={`text-[0.65rem] font-bold uppercase tracking-widest mb-1 ${entity.textColor}`}>
            {entity.role}
          </p>
          <p className="text-xs text-slate-700 leading-relaxed italic">&ldquo;{entity.dialogue}&rdquo;</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current ? "bg-emerald-500" : i === current ? "bg-blue-500" : "bg-slate-200"
          }`}
          animate={{ width: i === current ? 20 : 8, height: 8 }}
        />
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LivingMoleculesPage() {
  const [selectedId, setSelectedId]   = useState<ConceptId>("sn2");
  const [phase, setPhase]             = useState<Phase>("idle");
  const [stepIndex, setStepIndex]     = useState(0);
  const [reactedIds, setReactedIds]   = useState<Set<string>>(new Set());
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [autoPlay, setAutoPlay]       = useState(false);
  const timerRef                      = useState<ReturnType<typeof setTimeout> | null>(null);

  const concept = CONCEPTS.find((c) => c.id === selectedId)!;

  // Reset when concept changes — intentional setState resets on concept selection
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("idle");
    setStepIndex(0);
    setReactedIds(new Set());
    setActiveEntity(null);
    setAutoPlay(false);
    if (timerRef[0]) clearTimeout(timerRef[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Auto-advance steps
  const advance = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;
      if (next >= concept.steps.length) {
        setPhase("done");
        setReactedIds(new Set(concept.entities.map((e) => e.id)));
        return prev;
      }
      // Mark entities as reacting on certain steps
      if (next === 1) setReactedIds(new Set([concept.entities[0]?.id ?? ""]));
      if (next === Math.floor(concept.steps.length / 2))
        setReactedIds(new Set(concept.entities.slice(0, 2).map((e) => e.id)));
      return next;
    });
  }, [concept]);

  useEffect(() => {
    if (!autoPlay || phase === "done") return;
    const t = setTimeout(advance, 1400);
    timerRef[1](t);
    return () => clearTimeout(t);
  }, [autoPlay, stepIndex, phase, advance]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAnimation = () => {
    setPhase("step");
    setStepIndex(0);
    setReactedIds(new Set());
    setAutoPlay(true);
  };

  const replay = () => {
    setPhase("idle");
    setStepIndex(0);
    setReactedIds(new Set());
    setActiveEntity(null);
    setAutoPlay(false);
    setTimeout(() => startAnimation(), 80);
  };

  const isRunning = phase === "step";
  const isDone    = phase === "done";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
          ← Dashboard
        </Link>
        <span className="text-slate-300">|</span>
        <span className="text-blue-600 text-xs font-semibold tracking-wide uppercase">Living Molecules</span>
        <span className="text-[0.6rem] font-bold bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 uppercase tracking-widest">
          MVP
        </span>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-2">Interactive Visualization</p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            🧬 Living <span className="text-violet-600">Molecules</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Watch molecular entities come to life. Select a concept, start the animation, and read the chemistry explanations as each step plays out.
          </p>
        </div>

        {/* Concept selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                selectedId === c.id
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Concept subtitle */}
        <div className="mb-5 flex items-center gap-2">
          <span className="text-lg">{concept.icon}</span>
          <div>
            <p className="text-base font-black text-slate-800">{concept.label}</p>
            <p className="text-xs text-slate-500">{concept.subtitle}</p>
          </div>
        </div>

        {/* ── Animation area ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 shadow-sm min-h-[220px]">

          {/* Entity bubbles */}
          <div className="flex flex-wrap gap-4 items-center justify-center mb-6">
            {concept.entities.map((entity) => (
              <EntityBubble
                key={entity.id}
                entity={entity}
                active={isRunning}
                reacted={reactedIds.has(entity.id)}
                onClick={() => setActiveEntity(activeEntity?.id === entity.id ? null : entity)}
              />
            ))}

            {/* Animated arrow between first two entities when running */}
            {isRunning && concept.entities.length >= 2 && (
              <motion.div
                className="absolute pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <path d="M 0 10 L 28 10" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M 22 4 L 34 10 L 22 16 Z" fill="#7c3aed" />
                </svg>
              </motion.div>
            )}
          </div>

          {/* Step progress */}
          {(isRunning || isDone) && (
            <div className="mb-4">
              <StepDots total={concept.steps.length} current={stepIndex} />
            </div>
          )}

          {/* Current step label */}
          <AnimatePresence mode="wait">
            {(isRunning || isDone) && (
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDone ? "text-emerald-600" : "text-violet-600"}`}>
                  {isDone ? "Complete" : `Step ${stepIndex + 1} of ${concept.steps.length}`}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {isDone ? "Reaction complete! All entities have reacted." : concept.steps[stepIndex]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle prompt */}
          {phase === "idle" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-slate-400 font-medium"
            >
              Press <span className="text-violet-600 font-bold">Start Animation</span> to bring the molecules to life.
              <br />
              <span className="text-xs">Click any molecule to hear its dialogue.</span>
            </motion.p>
          )}
        </div>

        {/* Dialogue panel — shows on entity click */}
        <div className="mb-5 min-h-[72px]">
          <DialoguePanel entity={activeEntity} visible={activeEntity !== null} />
          {!activeEntity && (
            <p className="text-xs text-slate-400 text-center pt-3">
              Click any molecule bubble above to read its personality dialogue.
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {phase === "idle" && (
            <button
              onClick={startAnimation}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-3 rounded-xl transition-colors"
            >
              ▶ Start Animation
            </button>
          )}
          {(isRunning || isDone) && (
            <button
              onClick={replay}
              className="flex-1 bg-white border border-violet-300 text-violet-700 hover:border-violet-500 text-sm font-bold py-3 rounded-xl transition-colors"
            >
              🔄 Replay
            </button>
          )}
          {isRunning && !autoPlay && (
            <button
              onClick={advance}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl transition-colors"
            >
              → Next Step
            </button>
          )}
        </div>

        {/* ── Explanation panel ──────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
          <p className="text-[0.65rem] font-bold text-blue-600 uppercase tracking-widest mb-2">Chemistry Explanation</p>
          <p className="text-sm text-slate-700 leading-relaxed">{concept.explanation}</p>
        </div>

        {/* All entity dialogues reference */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mb-3">All Molecular Dialogues</p>
          <div className="flex flex-col gap-3">
            {concept.entities.map((entity) => (
              <div key={entity.id} className="flex items-start gap-3">
                <div
                  className={`shrink-0 flex items-center justify-center rounded-full border-2 font-black text-xs ${entity.color} ${entity.borderColor} ${entity.textColor}`}
                  style={{ width: 40, height: 40 }}
                >
                  {entity.label.length > 4 ? entity.label.slice(0, 3) : entity.label}
                </div>
                <div>
                  <p className={`text-[0.6rem] font-bold uppercase tracking-widest ${entity.textColor}`}>{entity.role}</p>
                  <p className="text-xs text-slate-600 italic leading-relaxed">&ldquo;{entity.dialogue}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Practice CTA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Ready to test this?</p>
            <p className="text-xs text-slate-400">Apply your understanding with hands-on practice.</p>
          </div>
          <Link
            href={concept.practiceHref}
            className="shrink-0 inline-flex items-center bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl no-underline transition-colors"
          >
            {concept.practiceLabel} →
          </Link>
        </div>

      </main>
    </div>
  );
}
