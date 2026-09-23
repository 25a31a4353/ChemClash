"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";
import { fetchChallenges, Challenge } from "@/lib/api";
import { MASTER_CHALLENGES, generateExtraChallenges, ReactChallenge } from "@/data/challenges";

type ChemCard = Challenge | ReactChallenge;

const ROUND_SIZE = 10;

function FeedbackOverlay({ verdict }: { verdict: "react" | "reject" | null }) {
  if (!verdict) return null;
  const isReact = verdict === "react";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`absolute inset-0 flex items-center justify-center rounded-2xl z-20 pointer-events-none border-2 ${
        isReact ? "bg-emerald-50/90 border-emerald-400" : "bg-red-50/90 border-red-400"
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
        style={{
          transform: `scale(${0.96 - stackIndex * 0.03}) translateY(${stackIndex * 14}px)`,
          zIndex: -stackIndex,
        }}
      />
    );
  }

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity,
        position: "absolute",
        inset: 0,
        cursor: "grab",
        touchAction: "none",
        zIndex: 10,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* REACT label */}
      <motion.div
        style={{ opacity: reactOpacity, rotate: "-12deg" }}
        className="absolute top-5 left-5 bg-emerald-50 border-2 border-emerald-400 rounded-lg px-3 py-1 text-emerald-600 font-black text-sm tracking-wide z-10"
      >
        REACT ✅
      </motion.div>

      {/* REJECT label */}
      <motion.div
        style={{ opacity: rejectOpacity, rotate: "12deg" }}
        className="absolute top-5 right-5 bg-red-50 border-2 border-red-400 rounded-lg px-3 py-1 text-red-500 font-black text-sm tracking-wide z-10"
      >
        REJECT ❌
      </motion.div>

      {/* Card body */}
      <div className="h-full bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col items-center justify-center px-6 py-7 select-none">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            Card #{card.id}
          </span>
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
            {card.difficulty || "medium"}
          </span>
        </div>

        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-5">
          Will these species react?
        </p>

        {/* Molecule pair */}
        <div className="flex items-center gap-4 mb-6">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-lg font-black text-emerald-700 mb-2 shadow-sm px-2 text-center break-words">
              {card.nucleophile}
            </div>
            <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
              Nucleophile / Reagent
            </div>
          </div>

          <div className="text-2xl text-slate-300 font-light">+</div>

          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-300 flex items-center justify-center text-lg font-black text-blue-700 mb-2 shadow-sm px-2 text-center break-words">
              {card.electrophile}
            </div>
            <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
              Electrophile / Substrate
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 mb-4" />

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Swipe <span className="text-emerald-600 font-bold">right → REACT</span> · Swipe{" "}
          <span className="text-red-500 font-bold">left ← REJECT</span>
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

type Verdict = "react" | "reject" | null;

export default function ReactOrRejectPage() {
  // Pool of all available challenges (master bank + dynamically added)
  const [challengePool, setChallengePool] = useState<ChemCard[]>(MASTER_CHALLENGES);
  // Set of consumed question IDs in the current session (GUARANTEES NO REPEATS)
  const [consumedIds, setConsumedIds] = useState<Set<string | number>>(new Set());
  // Active cards in current round
  const [cards, setCards] = useState<ChemCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<Verdict>(null);

  // Stats
  const [roundScore, setRoundScore] = useState({ correct: 0, total: 0 });
  const [sessionStats, setSessionStats] = useState({
    totalAnswered: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
    roundNumber: 1,
  });

  const [lastHint, setLastHint] = useState<string>("");
  const [lastExplanation, setLastExplanation] = useState<string>("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const verdictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eloRating = useChemStore((s) => s.eloRating);

  // Draw N unseen cards from the pool without any repetition in current session
  const drawCardsForRound = useCallback(
    (count = ROUND_SIZE, currentPool: ChemCard[], usedIds: Set<string | number>) => {
      // Find cards not yet consumed in this session
      let unseen = currentPool.filter((c) => !usedIds.has(c.id));

      let poolToUse = currentPool;
      // If unseen pool is running low, dynamically replenish with verified organic reactions
      if (unseen.length < count) {
        const needed = count - unseen.length + 10;
        const generated = generateExtraChallenges(needed, usedIds);
        poolToUse = [...currentPool, ...generated];
        setChallengePool(poolToUse);
        unseen = poolToUse.filter((c) => !usedIds.has(c.id));
      }

      // Shuffle unseen cards for random order
      const shuffled = [...unseen].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);

      // Register selected IDs as consumed immediately
      const nextUsed = new Set(usedIds);
      selected.forEach((c) => nextUsed.add(c.id));
      setConsumedIds(nextUsed);
      setCards(selected);
      setRoundScore({ correct: 0, total: 0 });
      setFinished(false);
      setLastHint("");
      setLastExplanation("");
      setLastCorrect(null);
    },
    []
  );

  // Initialize pool on mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoading(true);
      try {
        const fetched = await fetchChallenges();
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          // Merge with master challenges, deduplicating by ID
          const existingIds = new Set(fetched.map((f) => f.id));
          const extra = MASTER_CHALLENGES.filter((m) => !existingIds.has(m.id));
          const combined = [...fetched, ...extra];
          setChallengePool(combined);
          drawCardsForRound(ROUND_SIZE, combined, new Set());
          return;
        }
      } catch {
        // Fallback to built-in master bank
      }
      if (isMounted) {
        setChallengePool(MASTER_CHALLENGES);
        drawCardsForRound(ROUND_SIZE, MASTER_CHALLENGES, new Set());
      }
      setLoading(false);
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [drawCardsForRound]);

  // Handler for Next Round (keeps consumed IDs intact so no repeated cards appear)
  const handleNextRound = () => {
    setSessionStats((s) => ({
      ...s,
      roundNumber: s.roundNumber + 1,
    }));
    drawCardsForRound(ROUND_SIZE, challengePool, consumedIds);
  };

  // Handler for full Session Reset (clears history if user intentionally requests)
  const handleResetSession = () => {
    setConsumedIds(new Set());
    setSessionStats({
      totalAnswered: 0,
      totalCorrect: 0,
      currentStreak: 0,
      bestStreak: 0,
      roundNumber: 1,
    });
    drawCardsForRound(ROUND_SIZE, challengePool, new Set());
  };

  const triggerVerdict = (direction: "left" | "right", card: ChemCard) => {
    const userSaysReact = direction === "right";
    const correct = userSaysReact === card.shouldReact;

    setVerdict(direction === "right" ? "react" : "reject");
    setLastHint(card.hint);
    setLastExplanation(card.explanation);
    setLastCorrect(correct);

    // Update round and session scores
    setRoundScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setSessionStats((s) => {
      const nextStreak = correct ? s.currentStreak + 1 : 0;
      return {
        ...s,
        totalAnswered: s.totalAnswered + 1,
        totalCorrect: s.totalCorrect + (correct ? 1 : 0),
        currentStreak: nextStreak,
        bestStreak: Math.max(s.bestStreak, nextStreak),
      };
    });

    useChemStore.setState((s) => ({ eloRating: s.eloRating + (correct ? 8 : -4) }));

    if (verdictTimer.current) clearTimeout(verdictTimer.current);
    verdictTimer.current = setTimeout(() => {
      setVerdict(null);
      setCards((prev) => {
        const next = prev.slice(1);
        if (next.length === 0) setFinished(true);
        return next;
      });
    }, 900);
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

  // ── Round Complete Screen ──────────────────────────────────────────────────
  if (finished) {
    const roundPct = roundScore.total > 0 ? Math.round((roundScore.correct / roundScore.total) * 100) : 0;
    const sessionPct =
      sessionStats.totalAnswered > 0
        ? Math.round((sessionStats.totalCorrect / sessionStats.totalAnswered) * 100)
        : 0;

    const emoji = roundPct >= 80 ? "🎉" : roundPct >= 50 ? "🙂" : "😕";
    const colorCls = roundPct >= 80 ? "text-emerald-600" : roundPct >= 50 ? "text-amber-600" : "text-red-500";
    const borderCls = roundPct >= 80 ? "border-emerald-200" : roundPct >= 50 ? "border-amber-200" : "border-red-200";
    const barCls = roundPct >= 80 ? "bg-emerald-500" : roundPct >= 50 ? "bg-amber-500" : "bg-red-500";

    const remainingUnseen = Math.max(0, challengePool.length - consumedIds.size);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className={`bg-white border ${borderCls} rounded-2xl p-8 max-w-md w-full shadow-lg`}
        >
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">
            Round {sessionStats.roundNumber} Complete
          </h1>
          <p className="text-xs text-slate-400 font-medium mb-4">
            Zero repeated questions guarantee active
          </p>

          <div className={`text-4xl font-black ${colorCls} mb-1`}>
            {roundScore.correct}/{roundScore.total}
          </div>
          <p className="text-slate-500 text-sm mb-4">{roundPct}% round accuracy</p>

          <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${roundPct}%` }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className={`h-full ${barCls} rounded-full`}
            />
          </div>

          {/* Session Overview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              📊 Session Cumulative Stats
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Total Played:</span>{" "}
                <span className="font-bold text-slate-700">{sessionStats.totalAnswered} unique</span>
              </div>
              <div>
                <span className="text-slate-400">Session Accuracy:</span>{" "}
                <span className="font-bold text-emerald-600">{sessionPct}%</span>
              </div>
              <div>
                <span className="text-slate-400">Best Streak:</span>{" "}
                <span className="font-bold text-amber-600">🔥 {sessionStats.bestStreak}</span>
              </div>
              <div>
                <span className="text-slate-400">Pool Remaining:</span>{" "}
                <span className="font-bold text-indigo-600">{remainingUnseen} unseen</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleNextRound}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              🎮 Play Next Round (10 Brand-New Questions)
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleResetSession}
                className="flex-1 border border-slate-300 text-slate-600 hover:bg-slate-100 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                🔄 Reset Session History
              </button>
              <Link href="/" className="flex-1">
                <button className="w-full border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                  ← Dashboard
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && cards.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading reaction deck…</div>
      </div>
    );
  }

  const currentCardIndex = ROUND_SIZE - cards.length;
  const progressPct = (currentCardIndex / ROUND_SIZE) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Top bar */}
      <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <Link
          href="/"
          className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors"
        >
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
            React or Reject
          </span>
          <span className="text-[0.65rem] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
            Round {sessionStats.roundNumber}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
          </span>
          {sessionStats.currentStreak > 1 && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              🔥 {sessionStats.currentStreak}
            </span>
          )}
          <span className="text-sm font-bold text-slate-700">
            {roundScore.correct}/{roundScore.total}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-6 w-full max-w-lg">
        {/* Title + progress */}
        <div className="w-full mb-5">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              ⚗️ React or <span className="text-red-500">Reject</span>
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              Question {currentCardIndex + 1} of {ROUND_SIZE} ·{" "}
              <span className="text-emerald-600 font-semibold">{consumedIds.size} unique</span>
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
            />
          </div>
        </div>

        {/* Card stack */}
        <div className="relative w-full h-84 mb-5">
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

        {/* Scientific Feedback & Explanation */}
        {lastHint && (
          <motion.div
            key={lastHint}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full rounded-xl border p-4 mb-5 flex gap-3 items-start shadow-sm ${
              lastCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            }`}
          >
            <span className="text-xl mt-0.5 flex-shrink-0">{lastCorrect ? "✅" : "❌"}</span>
            <div className="space-y-1">
              <div
                className={`text-xs font-bold tracking-widest uppercase ${
                  lastCorrect ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {lastCorrect ? "Correct Reaction Prediction" : "Incorrect Prediction"}
              </div>
              <p className="text-xs font-semibold text-slate-700 m-0">{lastHint}</p>
              {lastExplanation && (
                <p className="text-xs text-slate-500 leading-relaxed m-0 border-t border-slate-200/60 pt-1">
                  💡 {lastExplanation}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleButton("left")}
            disabled={verdict !== null || cards.length === 0}
            className="flex-1 py-3.5 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 text-sm font-bold tracking-wide hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            ← REJECT ❌
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleButton("right")}
            disabled={verdict !== null || cards.length === 0}
            className="flex-1 py-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold tracking-wide hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            REACT ✅ →
          </motion.button>
        </div>

        {/* Keyboard hint & session counter */}
        <div className="flex items-center justify-between w-full mt-4 px-1 text-slate-400">
          <div className="flex gap-3">
            {[
              { key: "←", label: "reject", cls: "text-red-400" },
              { key: "→", label: "react", cls: "text-emerald-500" },
            ].map((k) => (
              <div key={k.key} className="flex items-center gap-1.5">
                <span className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-500 text-xs font-mono shadow-sm">
                  {k.key}
                </span>
                <span className={`text-xs font-medium ${k.cls}`}>{k.label}</span>
              </div>
            ))}
          </div>
          <span className="text-[0.7rem] text-slate-400">
            Session: {sessionStats.totalAnswered} answered
          </span>
        </div>
      </div>
    </div>
  );
}
