"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

interface ChemCard {
  id: number;
  nucleophile: string;
  electrophile: string;
  shouldReact: boolean;
  hint: string;
  mechanism?: string;
}

type Verdict = "react" | "reject" | null;

const CARDS: ChemCard[] = [
  { id: 1, nucleophile: "OH⁻",       electrophile: "CH₃Br",       shouldReact: true,  hint: "Hydroxide attacks the carbon bearing the leaving group (SN2).", mechanism: "SN2" },
  { id: 2, nucleophile: "H₂O",       electrophile: "CH₄",         shouldReact: false, hint: "Methane has no electrophilic carbon — no leaving group, no reaction." },
  { id: 3, nucleophile: "NH₃",       electrophile: "CH₃Cl",       shouldReact: true,  hint: "Ammonia acts as a nucleophile toward the electrophilic carbon (SN2).", mechanism: "SN2" },
  { id: 4, nucleophile: "Cl⁻",       electrophile: "Benzene",     shouldReact: false, hint: "Cl⁻ alone cannot react with benzene — a Lewis acid catalyst is required." },
  { id: 5, nucleophile: "CN⁻",       electrophile: "(CH₃)₃C⁺",   shouldReact: true,  hint: "Cyanide attacks the carbocation readily (SN1 scenario).", mechanism: "SN1" },
];

function FeedbackOverlay({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null;
  const isReact = verdict === "react";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`absolute inset-0 flex items-center justify-center rounded-2xl z-10 pointer-events-none border-2 ${
        isReact ? "bg-emerald-50/80 border-emerald-400" : "bg-red-50/80 border-red-400"
      }`}
    >
      <div className="text-center">
        <div className="text-5xl mb-2">{isReact ? "✅" : "❌"}</div>
        <div className={`text-2xl font-black tracking-wide ${isReact ? "text-emerald-600" : "text-red-500"}`}>
          {isReact ? "BOND FORMED!" : "NO REACTION"}
        </div>
      </div>
    </motion.div>
  );
}

interface SwipeCardProps {
  card: ChemCard;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (direction: "left" | "right") => void;
}

function SwipeCard({ card, isTop, stackIndex, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-20, 20]);
  const opacity = useTransform(x, [-220, -80, 0, 80, 220], [0, 1, 1, 1, 0]);
  const reactOpacity = useTransform(x, [0, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe("right");
    else if (info.offset.x < -100) onSwipe("left");
    else animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
  };

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 bg-white border border-slate-200 rounded-2xl shadow-sm"
        style={{ transform: `scale(${0.96 - stackIndex * 0.03}) translateY(${stackIndex * 14}px)`, zIndex: -stackIndex }}
      />
    );
  }

  return (
    <motion.div
      style={{ x, rotate, opacity, position: "absolute", inset: 0, cursor: "grab", touchAction: "none", zIndex: 5 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* REACT label */}
      <motion.div style={{ opacity: reactOpacity, rotate: "-12deg" }}
        className="absolute top-5 left-5 bg-emerald-50 border-2 border-emerald-400 rounded-lg px-3 py-1 text-emerald-600 font-black text-sm tracking-wide z-10">
        REACT ✅
      </motion.div>

      {/* REJECT label */}
      <motion.div style={{ opacity: rejectOpacity, rotate: "12deg" }}
        className="absolute top-5 right-5 bg-red-50 border-2 border-red-400 rounded-lg px-3 py-1 text-red-500 font-black text-sm tracking-wide z-10">
        REJECT ❌
      </motion.div>

      {/* Card body */}
      <div className="h-full bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col items-center justify-center px-6 py-7 select-none">
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-7">
          Will these species react?
        </p>

        {/* Molecule pair */}
        <div className="flex items-center gap-5 mb-7">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-2xl font-black text-emerald-600 mb-2 shadow-sm">
              {card.nucleophile}
            </div>
            <div className="text-[0.6rem] font-semibold tracking-widest text-slate-400 uppercase">Nucleophile</div>
          </div>

          <div className="text-2xl text-slate-300 font-light">+</div>

          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-300 flex items-center justify-center text-2xl font-black text-blue-600 mb-2 shadow-sm">
              {card.electrophile}
            </div>
            <div className="text-[0.6rem] font-semibold tracking-widest text-slate-400 uppercase">Electrophile</div>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 mb-5" />

        <p className="text-sm text-slate-500 text-center leading-relaxed">
          Swipe <span className="text-emerald-600 font-bold">right → REACT</span> · Swipe <span className="text-red-500 font-bold">left ← REJECT</span>
        </p>

        {card.mechanism && (
          <span className="mt-3 text-[0.68rem] font-bold px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-600 tracking-wide">
            {card.mechanism}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function ReactOrRejectPage() {
  const [cards, setCards] = useState<ChemCard[]>(CARDS);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [lastHint, setLastHint] = useState<string>("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const verdictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eloRating = useChemStore((s) => s.eloRating);

  const triggerVerdict = (direction: "left" | "right", card: ChemCard) => {
    const userSaysReact = direction === "right";
    const correct = userSaysReact === card.shouldReact;
    setVerdict(direction === "right" ? "react" : "reject");
    setLastHint(card.hint);
    setLastCorrect(correct);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    useChemStore.setState((s) => ({ eloRating: s.eloRating + (correct ? 8 : -4) }));
    if (verdictTimer.current) clearTimeout(verdictTimer.current);
    verdictTimer.current = setTimeout(() => {
      setVerdict(null);
      setCards((prev) => {
        const next = prev.slice(1);
        if (next.length === 0) setFinished(true);
        return next;
      });
    }, 1000);
  };

  const handleButton = (direction: "left" | "right") => {
    if (cards.length === 0 || verdict !== null) return;
    triggerVerdict(direction, cards[0]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleButton("left");
      if (e.key === "ArrowRight") handleButton("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, verdict]);

  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100);
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "🙂" : "😕";
    const colorCls = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
    const borderCls = pct >= 80 ? "border-emerald-200" : pct >= 50 ? "border-amber-200" : "border-red-200";
    const barCls = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={`bg-white border ${borderCls} rounded-2xl p-10 max-w-sm w-full shadow-sm`}
        >
          <div className="text-5xl mb-4">{emoji}</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Round Complete</h1>
          <div className={`text-4xl font-black ${colorCls} my-4`}>{score.correct}/{score.total}</div>
          <p className="text-slate-500 text-sm mb-6">{pct}% accuracy</p>

          <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={`h-full ${barCls} rounded-full`}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setCards(CARDS); setScore({ correct: 0, total: 0 }); setFinished(false); setLastHint(""); setLastCorrect(null); }}
              className={`flex-1 border ${borderCls} ${colorCls} bg-white hover:bg-slate-50 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-colors`}
            >
              Play Again
            </button>
            <Link href="/" className="flex-1">
              <button className="w-full border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-colors">
                ← Dashboard
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPct = ((CARDS.length - cards.length) / CARDS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Top bar */}
      <div className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
          ← Dashboard
        </Link>
        <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">React or Reject</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
          </span>
          <span className="text-sm font-bold text-slate-700">{score.correct}/{score.total}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-7 w-full max-w-lg">

        {/* Title + progress */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black text-slate-900">
              ⚗️ React or <span className="text-red-500">Reject</span>
            </h1>
            <span className="text-sm text-slate-400 font-medium">{cards.length} remaining</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
            />
          </div>
        </div>

        {/* Card stack */}
        <div className="relative w-full h-80 mb-5">
          {cards[2] && <SwipeCard card={cards[2]} isTop={false} stackIndex={2} onSwipe={() => {}} />}
          {cards[1] && <SwipeCard card={cards[1]} isTop={false} stackIndex={1} onSwipe={() => {}} />}
          {cards[0] && (
            <SwipeCard
              key={cards[0].id}
              card={cards[0]}
              isTop={true}
              stackIndex={0}
              onSwipe={(dir) => triggerVerdict(dir, cards[0])}
            />
          )}
          <FeedbackOverlay verdict={verdict} />
        </div>

        {/* Hint box */}
        {lastHint && (
          <motion.div
            key={lastHint}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full rounded-xl border p-3.5 mb-5 flex gap-3 items-start ${
              lastCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            }`}
          >
            <span className="text-lg mt-0.5 flex-shrink-0">{lastCorrect ? "✅" : "❌"}</span>
            <div>
              <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${lastCorrect ? "text-emerald-600" : "text-red-500"}`}>
                {lastCorrect ? "Correct" : "Incorrect"}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed m-0">{lastHint}</p>
            </div>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => handleButton("left")}
            disabled={verdict !== null || cards.length === 0}
            className="flex-1 py-3.5 rounded-xl border-2 border-red-200 bg-red-50 text-red-500 text-sm font-bold tracking-wide hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            ← REJECT
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => handleButton("right")}
            disabled={verdict !== null || cards.length === 0}
            className="flex-1 py-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-600 text-sm font-bold tracking-wide hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            REACT →
          </motion.button>
        </div>

        {/* Keyboard hint */}
        <div className="flex gap-4 mt-4">
          {[{ key: "←", label: "reject", cls: "text-red-400" }, { key: "→", label: "react", cls: "text-emerald-500" }].map((k) => (
            <div key={k.key} className="flex items-center gap-1.5">
              <span className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-500 text-xs font-mono shadow-sm">{k.key}</span>
              <span className={`text-xs font-medium ${k.cls}`}>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
