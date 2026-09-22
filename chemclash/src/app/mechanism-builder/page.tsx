"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";
import { fetchChallenges, type Challenge } from "@/lib/api";

// ════════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ════════════════════════════════════════════════════════════════════════════

interface Vec2 { x: number; y: number; }

interface Atom {
  id: string; label: string; symbol: string;
  x: number; y: number; radius: number;
  color: string; electronColor: string; description: string;
}

const ATOMS: Atom[] = [
  { id: "carbon",  label: "Carbon",  symbol: "C",  x: 220, y: 240, radius: 48, color: "#f8fafc", electronColor: "#059669", description: "Electrophilic Carbon (δ+)" },
  { id: "bromine", label: "Bromine", symbol: "Br", x: 560, y: 240, radius: 52, color: "#fffbeb", electronColor: "#d97706", description: "Leaving Group (Br⁻)" },
];

function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

function curveControlPoint(from: Vec2, to: Vec2): Vec2 {
  const mx = (from.x + to.x) / 2; const my = (from.y + to.y) / 2;
  const dx = to.x - from.x; const dy = to.y - from.y;
  return { x: mx - dy * 0.3, y: my + dx * 0.3 };
}

function arrowheadPath(cp: Vec2, to: Vec2, size = 10): string {
  const angle = Math.atan2(to.y - cp.y, to.x - cp.x);
  return `M ${to.x} ${to.y} L ${to.x + size * Math.cos(angle + 2.8)} ${to.y + size * Math.sin(angle + 2.8)} L ${to.x + size * Math.cos(angle - 2.8)} ${to.y + size * Math.sin(angle - 2.8)} Z`;
}

const MECH_STEPS = [
  { id: 1, label: "Identify nucleophile" },
  { id: 2, label: "Draw electron arrow C→Br" },
  { id: 3, label: "Br⁻ departs as leaving group" },
  { id: 4, label: "Carbocation forms" },
];

// ════════════════════════════════════════════════════════════════════════════
// MECHANISM BUILDER (unchanged from original)
// ════════════════════════════════════════════════════════════════════════════

interface AtomNodeProps {
  atom: Atom; isDragSource: boolean; isTarget: boolean;
  onMouseDown: (atom: Atom, e: React.MouseEvent<SVGGElement>) => void;
}

function AtomNode({ atom, isDragSource, isTarget, onMouseDown }: AtomNodeProps) {
  return (
    <g onMouseDown={(e) => onMouseDown(atom, e)} style={{ cursor: "crosshair" }}>
      {isDragSource && <circle cx={atom.x} cy={atom.y} r={atom.radius + 20} fill="none" stroke={atom.electronColor} strokeWidth={1} opacity={0.4} strokeDasharray="4 4" />}
      <circle cx={atom.x} cy={atom.y} r={atom.radius + 10} fill="none"
        stroke={isDragSource ? atom.electronColor : isTarget ? "#2563eb" : "transparent"}
        strokeWidth={isDragSource ? 2 : 1.5} opacity={isDragSource ? 0.5 : isTarget ? 0.4 : 0}
        style={{ transition: "opacity 0.15s" }} />
      <circle cx={atom.x} cy={atom.y} r={atom.radius} fill={atom.color}
        stroke={isDragSource ? atom.electronColor : isTarget ? "#2563eb" : "#cbd5e1"}
        strokeWidth={isDragSource || isTarget ? 2 : 1.5} style={{ transition: "stroke 0.15s" }} />
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180; const r = atom.radius + 6;
        return <circle key={deg} cx={atom.x + r * Math.cos(rad)} cy={atom.y + r * Math.sin(rad)} r={2.5} fill={atom.electronColor} opacity={isDragSource ? 0.9 : 0.25} style={{ transition: "opacity 0.15s" }} />;
      })}
      <text x={atom.x} y={atom.y + 1} textAnchor="middle" dominantBaseline="middle" fill={atom.electronColor} fontSize={atom.radius * 0.65} fontWeight="900" fontFamily="ui-monospace, monospace" style={{ userSelect: "none", pointerEvents: "none" }}>{atom.symbol}</text>
      <text x={atom.x} y={atom.y + atom.radius + 22} textAnchor="middle" fill="#64748b" fontSize={10.5} fontFamily="ui-monospace, monospace" style={{ userSelect: "none", pointerEvents: "none" }}>{atom.description}</text>
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MechanismBuilder({ eloRating }: { eloRating: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragFrom, setDragFrom] = useState<Atom | null>(null);
  const [dragPos, setDragPos] = useState<Vec2 | null>(null);
  const [targetAtom, setTargetAtom] = useState<Atom | null>(null);
  const [connections, setConnections] = useState<{ from: Atom; to: Atom; id: number }[]>([]);
  const [flash, setFlash] = useState<{ msg: string; type: "success" | "info" } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const eloAwarded = useRef(false);

  const svgPoint = useCallback((e: MouseEvent | React.MouseEvent): Vec2 => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (780 / rect.width), y: (e.clientY - rect.top) * (480 / rect.height) };
  }, []);

  const handleMouseDown = (atom: Atom, e: React.MouseEvent<SVGGElement>) => { e.preventDefault(); setDragFrom(atom); setDragPos(svgPoint(e)); };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragFrom) return;
    const pos = svgPoint(e); setDragPos(pos);
    const hit = ATOMS.find(a => a.id !== dragFrom.id && dist(pos, { x: a.x, y: a.y }) < a.radius + 16);
    setTargetAtom(hit ?? null);
  }, [dragFrom, svgPoint]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragFrom) return;
    const pos = svgPoint(e);
    const hit = ATOMS.find(a => a.id !== dragFrom.id && dist(pos, { x: a.x, y: a.y }) < a.radius + 16);
    if (hit) {
      setConnections(prev => [...prev, { from: dragFrom, to: hit, id: Date.now() }]);
      setFlash({ msg: `${dragFrom.label} → ${hit.label}: electron arrow drawn`, type: "success" });
      setTimeout(() => setFlash(null), 3000);
      if (dragFrom.id === "carbon" && hit.id === "bromine") {
        setCompletedSteps(prev => Array.from(new Set([...prev, 1, 2])));
        setTimeout(() => setCompletedSteps(prev => Array.from(new Set([...prev, 3]))), 800);
        setTimeout(() => setCompletedSteps(prev => {
          const next = Array.from(new Set([...prev, 4]));
          if (next.length >= MECH_STEPS.length && !eloAwarded.current) { eloAwarded.current = true; useChemStore.setState((s) => ({ eloRating: s.eloRating + 15 })); }
          return next;
        }), 1600);
      }
    }
    setDragFrom(null); setDragPos(null); setTargetAtom(null);
  }, [dragFrom, svgPoint]);

  // Stable ref so the mouseup listener can remove itself without triggering
  // a circular dependency warning. Updated via useEffect so it never mutates during render.
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  useEffect(() => {
    mouseUpHandlerRef.current = (e: MouseEvent) => {
      handleMouseUp(e);
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseUpHandlerRef.current) window.removeEventListener("mouseup", mouseUpHandlerRef.current);
    };
  }); // no deps — update on every render to capture latest handleMouseUp / handleMouseMove

  const handleCanvasMouseDown = () => {
    window.addEventListener("mousemove", handleMouseMove);
    if (mouseUpHandlerRef.current) window.addEventListener("mouseup", mouseUpHandlerRef.current);
  };

  const lastConnection = connections.length > 0 ? connections[connections.length - 1] : null;
  const progress = Math.round((completedSteps.length / MECH_STEPS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 flex gap-5 items-start flex-wrap">
      <div className="flex-1 min-w-0" style={{ minWidth: 320 }}>
        <div className="mb-4">
          <h2 className="text-2xl font-black text-slate-900 mb-1">🧬 Mechanism <span className="text-blue-600">Builder</span></h2>
          <p className="text-sm text-slate-500 leading-relaxed">Click and drag from an atom to draw a curved electron arrow. <span className="text-emerald-600 font-semibold">C → Br</span> to attempt the mechanism.</p>
        </div>
        {flash && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm font-medium mb-3 flex items-center gap-2 ${flash.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            <span>{flash.type === "success" ? "✓" : "ℹ"}</span>{flash.msg}
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" onMouseDown={handleCanvasMouseDown}>
          <svg ref={svgRef} width="100%" viewBox="0 0 780 480" style={{ display: "block", userSelect: "none" }}>
            <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#e2e8f0" opacity="0.8" /></pattern></defs>
            <rect width="780" height="480" fill="url(#dots)" />
            <line x1="220" y1="240" x2="560" y2="240" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6 6" opacity="0.7" />
            <text x="390" y="212" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="ui-monospace, monospace">SN2 MECHANISM</text>
            {connections.map((conn) => {
              const cp = curveControlPoint({ x: conn.from.x, y: conn.from.y }, { x: conn.to.x, y: conn.to.y });
              const pathD = `M ${conn.from.x} ${conn.from.y} Q ${cp.x} ${cp.y} ${conn.to.x} ${conn.to.y}`;
              const head = arrowheadPath(cp, { x: conn.to.x, y: conn.to.y });
              const isLast = conn === lastConnection;
              return (
                <g key={conn.id} opacity={isLast ? 1 : 0.3}>
                  <path d={pathD} fill="none" stroke={isLast ? "#2563eb" : "#94a3b8"} strokeWidth={isLast ? 2.5 : 1.5} strokeDasharray={isLast ? "none" : "4 3"} />
                  <path d={head} fill={isLast ? "#2563eb" : "#94a3b8"} />
                </g>
              );
            })}
            {dragFrom && dragPos && (() => {
              const from = { x: dragFrom.x, y: dragFrom.y };
              const cp = curveControlPoint(from, dragPos);
              const head = arrowheadPath(cp, dragPos, 9);
              return (
                <g>
                  <path d={`M ${from.x} ${from.y} Q ${cp.x} ${cp.y} ${dragPos.x} ${dragPos.y}`} fill="none" stroke="#059669" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.9} />
                  <path d={head} fill="#059669" opacity={0.9} />
                  <circle cx={dragPos.x} cy={dragPos.y} r={5} fill="#059669" opacity={0.8} />
                  <circle cx={dragPos.x} cy={dragPos.y} r={12} fill="#059669" opacity={0.12} />
                </g>
              );
            })()}
            {ATOMS.map((atom) => <AtomNode key={atom.id} atom={atom} isDragSource={dragFrom?.id === atom.id} isTarget={targetAtom?.id === atom.id} onMouseDown={handleMouseDown} />)}
            <text x="390" y="456" textAnchor="middle" fill="#94a3b8" fontSize={9} fontFamily="ui-monospace, monospace">DRAG FROM ATOM TO DRAW ELECTRON ARROW</text>
          </svg>
        </div>
        <div className="flex gap-5 mt-3 flex-wrap">
          {[{ color: "#059669", label: "Live drag (electrons moving)" }, { color: "#2563eb", label: "Completed arrow" }, { color: "#cbd5e1", label: "Historical (dimmed)" }].map((item) => (
            <div key={item.label} className="flex items-center gap-2"><div className="w-5 h-0.5 rounded" style={{ background: item.color }} /><span className="text-xs text-slate-500">{item.label}</span></div>
          ))}
        </div>
      </div>

      <div className="w-60 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Mechanism Steps</span>
            <span className="text-blue-600 text-xs font-bold">{completedSteps.length}/{MECH_STEPS.length}</span>
          </div>
          {MECH_STEPS.map((step, idx) => {
            const done = completedSteps.includes(step.id);
            return (
              <div key={step.id} className={`px-4 py-3 flex items-center gap-3 transition-all duration-300 ${idx < MECH_STEPS.length - 1 ? "border-b border-slate-100" : ""} ${done ? "bg-emerald-50/60" : "bg-white"}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 border ${done ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>{done ? "✓" : step.id}</div>
                <span className={`text-sm transition-colors duration-300 leading-snug ${done ? "text-slate-800 font-medium" : "text-slate-500"}`}>{step.label}</span>
              </div>
            );
          })}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-blue-600 text-xs font-semibold tracking-wide uppercase mb-2">Tip</div>
          <p className="text-sm text-slate-600 leading-relaxed m-0">In an <span className="text-blue-600 font-semibold">SN2</span> mechanism the nucleophile attacks from the back side, causing inversion of configuration (<span className="text-slate-800 font-medium">Walden inversion</span>).</p>
        </div>
        {completedSteps.length === MECH_STEPS.length && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-emerald-700 text-sm font-bold tracking-wide">Mechanism Complete</div>
            <div className="text-slate-500 text-xs mt-1">+15 ELO awarded</div>
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Progress</span>
            <span className="text-blue-600 text-xs font-bold">{progress}%</span>
          </div>
          <div className="px-4 py-3">
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <button onClick={() => { setConnections([]); setCompletedSteps([]); eloAwarded.current = false; }} className="border border-slate-200 bg-white text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:text-slate-700 transition-all">
          Reset Canvas
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PATHWAY LAB
// ════════════════════════════════════════════════════════════════════════════

// Pathway state machine: each challenge becomes a 3-step pathway.
// Step 1 — pick the reagent type (nucleophile / electrophile / catalyst)
// Step 2 — pick the mechanism (SN1 / SN2 / E2 / "No reaction")
// Step 3 — confirm product (derived from challenge data)

type PathPhase = "start" | "step1" | "step2" | "step3" | "result";

interface PathOption { id: string; label: string; correct: boolean }

function buildStep1Options(c: Challenge): PathOption[] {
  // Student picks which species is the nucleophile
  const correctLabel = c.nucleophile;
  return shuffle([
    { id: "correct", label: correctLabel, correct: true },
    { id: "wrong1",  label: c.shouldReact ? c.electrophile : "H⁺",       correct: false },
    { id: "wrong2",  label: "AlCl₃ (Lewis acid)",                         correct: false },
    { id: "wrong3",  label: "H₂SO₄",                                      correct: false },
  ]);
}

function buildStep2Options(c: Challenge): PathOption[] {
  // Student picks the mechanism
  const mech = c.mechanism || "No reaction";
  const options: PathOption[] = [
    { id: "correct", label: mech,      correct: true },
    { id: "w1",      label: "SN2",     correct: mech === "SN2"  },
    { id: "w2",      label: "SN1",     correct: mech === "SN1"  },
    { id: "w3",      label: "E2",      correct: mech === "E2"   },
    { id: "w4",      label: "No reaction", correct: !c.shouldReact },
  ];
  // Deduplicate by label, keep first occurrence
  const seen = new Set<string>();
  const deduped: PathOption[] = [];
  for (const o of options) {
    if (!seen.has(o.label)) { seen.add(o.label); deduped.push(o); }
  }
  return shuffle(deduped.slice(0, 4));
}

function buildStep3Options(c: Challenge): PathOption[] {
  // Student confirms whether a reaction occurs and names the type
  if (!c.shouldReact) {
    return [
      { id: "correct",  label: "No reaction — reagents are incompatible", correct: true  },
      { id: "wrong1",   label: "Substitution product forms",               correct: false },
      { id: "wrong2",   label: "Elimination product forms",                correct: false },
      { id: "wrong3",   label: "Radical product forms",                    correct: false },
    ];
  }
  return shuffle([
    { id: "correct", label: `${c.mechanism} product — reaction proceeds`, correct: true  },
    { id: "wrong1",  label: "No reaction occurs",                          correct: false },
    { id: "wrong2",  label: "Radical chain product forms",                 correct: false },
    { id: "wrong3",  label: "Rearrangement to more stable cation",         correct: false },
  ]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const STEP_LABELS: Record<number, string> = { 1: "Identify Nucleophile", 2: "Choose Mechanism", 3: "Confirm Product" };

const FALLBACK_CHALLENGES: Challenge[] = [
  { id: 1, nucleophile: "OH⁻",  electrophile: "CH₃Br",       shouldReact: true,  hint: "Hydroxide attacks the carbon bearing the leaving group (SN2).", mechanism: "SN2",  explanation: "Strong hydroxide nucleophile attacks the primary carbon of CH₃Br via backside attack. Br⁻ departs as the C–O bond forms simultaneously.", difficulty: "easy" },
  { id: 2, nucleophile: "H₂O",  electrophile: "CH₄",          shouldReact: false, hint: "Methane has no electrophilic carbon — no leaving group, no reaction.", mechanism: "", explanation: "CH₄ has no leaving group and no electrophilic carbon. No driving force for any substitution or elimination.", difficulty: "easy" },
  { id: 3, nucleophile: "NH₃",  electrophile: "CH₃Cl",        shouldReact: true,  hint: "Ammonia acts as a nucleophile toward the electrophilic carbon (SN2).", mechanism: "SN2",  explanation: "Ammonia's lone pair attacks the electrophilic carbon of CH₃Cl, displacing Cl⁻ in an SN2 step.", difficulty: "easy" },
  { id: 4, nucleophile: "CN⁻",  electrophile: "(CH₃)₃C⁺",    shouldReact: true,  hint: "Cyanide attacks the carbocation readily (SN1 scenario).", mechanism: "SN1",  explanation: "The stable tertiary carbocation is attacked by CN⁻ in the rate-determining product-forming step of an SN1 mechanism.", difficulty: "medium" },
  { id: 5, nucleophile: "OH⁻",  electrophile: "(CH₃)₂CHBr",  shouldReact: true,  hint: "Secondary substrates — will SN2 or E2 dominate?", mechanism: "SN2/E2", explanation: "With OH⁻ and a secondary substrate, both SN2 and E2 compete. Temperature and solvent determine the ratio.", difficulty: "hard" },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PathwayLab({ eloRating }: { eloRating: number }) {
  const [challenges, setChallenges] = useState<Challenge[]>(FALLBACK_CHALLENGES);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<PathPhase>("start");
  const [step, setStep] = useState(1); // 1-3
  const [stepResults, setStepResults] = useState<boolean[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    fetchChallenges().then((d) => { if (d.length > 0) setChallenges(d); }).catch(() => {});
  }, []);

  const challenge = challenges[idx % challenges.length];

  const currentOptions: PathOption[] = (() => {
    if (step === 1) return buildStep1Options(challenge);
    if (step === 2) return buildStep2Options(challenge);
    return buildStep3Options(challenge);
  })();
  // Memoize options per (idx, step) to avoid re-shuffling on render.
  // Use key-based reset instead of ref mutation during render.
  const [stableOptions, setStableOptions] = useState<PathOption[]>(currentOptions);
  const [stableKey,     setStableKey]     = useState(`${idx}-${step}`);
  const newKey = `${idx}-${step}`;
  if (newKey !== stableKey) {
    setStableKey(newKey);
    setStableOptions(currentOptions);
  }

  function handleSelect(optId: string) {
    if (chosen !== null) return;
    const opt = stableOptions.find((o) => o.id === optId)!;
    setChosen(optId);
    setIsCorrect(opt.correct);
    if (opt.correct) {
      setShowTransition(true);
      setTimeout(() => setShowTransition(false), 900);
    }
  }

  function handleNext() {
    const correct = isCorrect ?? false;
    const newResults = [...stepResults, correct];
    setStepResults(newResults);
    if (step < 3) {
      setStep(step + 1);
      setChosen(null);
      setIsCorrect(null);
    } else {
      // All 3 steps done → show result
      const allCorrect = newResults.every(Boolean);
      if (allCorrect) {
        setScore((s) => s + 1);
        useChemStore.setState((s) => ({ eloRating: s.eloRating + 10 }));
      }
      setPhase("result");
    }
  }

  function handleNextReaction() {
    setIdx((i) => i + 1);
    setPhase("start");
    setStep(1);
    setStepResults([]);
    setChosen(null);
    setIsCorrect(null);
  }

  const pathProgress = ((step - 1) / 3) * 100;
  const isReacting = phase === "step1" || phase === "step2" || phase === "step3";
  const allStepsCorrect = stepResults.every(Boolean) && stepResults.length === 3;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 mb-1">
          🔬 Reaction <span className="text-orange-500">Pathway Lab</span>
        </h2>
        <p className="text-sm text-slate-500">Build a reaction pathway step-by-step using real challenge data.</p>
      </div>

      {/* Score + progress */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-emerald-500 font-black text-lg">{score}</span>
          <span className="text-xs text-slate-500 font-semibold">pathways solved</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-medium">
          Reaction {(idx % challenges.length) + 1} / {challenges.length}
        </div>
        <div className="flex-1 min-w-[120px]">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-400 rounded-full transition-all duration-500" style={{ width: `${pathProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Reaction card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Reactants header */}
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-[0.6rem] text-slate-400 uppercase tracking-widest mb-0.5">Nucleophile</p>
              <p className="text-lg font-black text-emerald-700">{challenge.nucleophile}</p>
            </div>
            <span className="text-slate-300 text-xl font-light">+</span>
            <div className="text-center">
              <p className="text-[0.6rem] text-slate-400 uppercase tracking-widest mb-0.5">Electrophile</p>
              <p className="text-lg font-black text-blue-700">{challenge.electrophile}</p>
            </div>
            {/* Reaction transition flash */}
            {showTransition && (
              <span className="ml-3 text-sm font-bold text-emerald-600 animate-pulse">→ ✓</span>
            )}
          </div>
          <span className={`text-[0.6rem] font-bold uppercase px-2 py-0.5 rounded-full border ${
            challenge.difficulty === "easy" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
            challenge.difficulty === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
            "bg-red-50 text-red-600 border-red-200"
          }`}>{challenge.difficulty}</span>
        </div>

        <div className="px-6 py-5">
          {/* START state */}
          {phase === "start" && (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">🔬</div>
              <p className="text-base font-bold text-slate-700 mb-2">Ready to build this pathway?</p>
              <p className="text-sm text-slate-500 mb-1 leading-relaxed">{challenge.hint}</p>
              <p className="text-xs text-slate-400 mb-6">You&apos;ll answer 3 questions: nucleophile → mechanism → product</p>
              <button onClick={() => setPhase("step1")} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
                Start Pathway →
              </button>
            </div>
          )}

          {/* STEP 1–3 */}
          {isReacting && (
            <div>
              {/* Step pill row */}
              <div className="flex items-center gap-2 mb-5">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      s < step ? "bg-emerald-100 text-emerald-700 border-emerald-300" :
                      s === step ? "bg-orange-100 text-orange-700 border-orange-300" :
                      "bg-slate-100 text-slate-400 border-slate-200"
                    }`}>
                      {s < step ? "✓" : s}. {STEP_LABELS[s]}
                    </div>
                    {s < 3 && <span className="text-slate-300 text-xs">→</span>}
                  </div>
                ))}
              </div>

              <p className="text-sm font-bold text-slate-700 mb-4">
                {step === 1 && `Which species acts as the nucleophile in this reaction?`}
                {step === 2 && `What is the most likely reaction mechanism?`}
                {step === 3 && `What is the outcome of this reaction?`}
              </p>

              {/* Options */}
              <div className="flex flex-col gap-2.5 mb-4">
                {stableOptions.map((opt) => {
                  const isChosen = chosen === opt.id;
                  let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ";
                  if (chosen === null) {
                    cls += "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50";
                  } else if (opt.correct) {
                    cls += "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold";
                  } else if (isChosen && !opt.correct) {
                    cls += "border-red-300 bg-red-50 text-red-700 line-through opacity-70";
                  } else {
                    cls += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                  }
                  return (
                    <button key={opt.id} className={cls} disabled={chosen !== null} onClick={() => handleSelect(opt.id)}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {chosen !== null && (
                <div className={`rounded-xl border px-4 py-3 mb-4 ${isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <p className={`text-sm font-bold mb-1 ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                    {isCorrect ? "✅ Correct!" : "❌ Not quite"}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step === 1 && `The nucleophile is ${challenge.nucleophile}. ${challenge.hint}`}
                    {step === 2 && (challenge.shouldReact
                      ? `This reaction proceeds via ${challenge.mechanism}. ${challenge.hint}`
                      : `No reaction occurs. ${challenge.hint}`)}
                    {step === 3 && challenge.explanation}
                  </p>
                  <button onClick={handleNext} className="mt-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-wide rounded-xl px-5 py-2 transition-colors">
                    {step < 3 ? "Next Step →" : "See Result →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">{allStepsCorrect ? "🏆" : "📖"}</div>
              <p className={`text-base font-black mb-2 ${allStepsCorrect ? "text-emerald-700" : "text-slate-700"}`}>
                {allStepsCorrect ? "Perfect Pathway! +10 ELO" : `${stepResults.filter(Boolean).length}/3 steps correct`}
              </p>

              {/* Step breakdown */}
              <div className="flex justify-center gap-2 mb-4">
                {stepResults.map((r, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${r ? "bg-emerald-100 border-emerald-400 text-emerald-700" : "bg-red-100 border-red-300 text-red-600"}`}>
                    {r ? "✓" : "✗"}
                  </div>
                ))}
              </div>

              {/* Mechanism tag */}
              {challenge.shouldReact && challenge.mechanism && (
                <p className="text-xs mb-2">
                  <span className="inline-block bg-violet-100 text-violet-700 rounded px-2 py-0.5 font-bold text-[0.65rem] uppercase">{challenge.mechanism}</span>
                </p>
              )}

              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-5">{challenge.explanation}</p>

              <button onClick={handleNextReaction} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
                Next Reaction →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — mode switcher
// ════════════════════════════════════════════════════════════════════════════

type Mode = "builder" | "pathway";

export default function MechanismBuilderPage() {
  const eloRating = useChemStore((s) => s.eloRating);
  const [mode, setMode] = useState<Mode>("builder");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">← Dashboard</Link>
          <span className="text-slate-300">|</span>
          {/* Mode switcher */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setMode("builder")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${mode === "builder" ? "bg-white shadow-sm text-blue-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              🧬 Mechanism Builder
            </button>
            <button
              onClick={() => setMode("pathway")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${mode === "pathway" ? "bg-white shadow-sm text-orange-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              🔬 Pathway Lab
            </button>
          </div>
        </div>
        <div className="text-sm text-slate-500">⚡ <span className="text-emerald-600 font-bold">{eloRating}</span></div>
      </div>

      {mode === "builder" ? <MechanismBuilder eloRating={eloRating} /> : <PathwayLab eloRating={eloRating} />}
    </div>
  );
}
