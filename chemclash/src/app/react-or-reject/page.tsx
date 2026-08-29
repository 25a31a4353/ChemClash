"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChemCard {
  id: number;
  nucleophile: string;
  electrophile: string;
  shouldReact: boolean;
  hint: string;
  mechanism?: string;
}

type Verdict = "react" | "reject" | null;

// ─── Card data ────────────────────────────────────────────────────────────────

const CARDS: ChemCard[] = [
  {
    id: 1,
    nucleophile: "OH⁻",
    electrophile: "CH₃Br",
    shouldReact: true,
    hint: "Hydroxide attacks the carbon bearing the leaving group (SN2).",
    mechanism: "SN2",
  },
  {
    id: 2,
    nucleophile: "H₂O",
    electrophile: "CH₄",
    shouldReact: false,
    hint: "Methane has no electrophilic carbon — no leaving group, no reaction.",
  },
  {
    id: 3,
    nucleophile: "NH₃",
    electrophile: "CH₃Cl",
    shouldReact: true,
    hint: "Ammonia acts as a nucleophile toward the electrophilic carbon (SN2).",
    mechanism: "SN2",
  },
  {
    id: 4,
    nucleophile: "Cl⁻",
    electrophile: "Benzene",
    shouldReact: false,
    hint: "Cl⁻ alone cannot react with benzene — a Lewis acid catalyst is required.",
  },
  {
    id: 5,
    nucleophile: "CN⁻",
    electrophile: "(CH₃)₃C⁺",
    shouldReact: true,
    hint: "Cyanide attacks the carbocation readily (SN1 scenario).",
    mechanism: "SN1",
  },
];

// ─── FeedbackOverlay ──────────────────────────────────────────────────────────

function FeedbackOverlay({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null;
  const isReact = verdict === "react";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        background: isReact ? "rgba(0,255,136,0.1)" : "rgba(248,113,113,0.1)",
        border: `2px solid ${isReact ? "#00ff88" : "#f87171"}`,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div style={{ textAlign: "center", fontFamily: "Courier New, monospace" }}>
        <div style={{ fontSize: "3rem", marginBottom: 8 }}>{isReact ? "⚡" : "💥"}</div>
        <div style={{
          fontSize: "1.6rem",
          fontWeight: 900,
          color: isReact ? "#00ff88" : "#f87171",
          letterSpacing: "0.1em",
          textShadow: `0 0 20px ${isReact ? "#00ff88" : "#f87171"}`,
        }}>
          {isReact ? "BOND FORMED!" : "NO REACTION"}
        </div>
      </div>
    </motion.div>
  );
}

// ─── SwipeCard ────────────────────────────────────────────────────────────────

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
        style={{
          position: "absolute",
          inset: 0,
          background: "#0d1520",
          border: "1px solid #1e2d3d",
          borderRadius: 18,
          transform: `scale(${0.96 - stackIndex * 0.03}) translateY(${stackIndex * 14}px)`,
          zIndex: -stackIndex,
        }}
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
      <motion.div style={{
        opacity: reactOpacity,
        position: "absolute", top: 22, left: 22,
        background: "rgba(0,255,136,0.12)",
        border: "2px solid #00ff88",
        borderRadius: 8, padding: "5px 14px",
        color: "#00ff88", fontWeight: 900,
        fontSize: "0.85rem", letterSpacing: "0.12em",
        fontFamily: "Courier New, monospace", zIndex: 6,
        rotate: "-12deg",
      }}>
        REACT ⚡
      </motion.div>

      {/* REJECT label */}
      <motion.div style={{
        opacity: rejectOpacity,
        position: "absolute", top: 22, right: 22,
        background: "rgba(248,113,113,0.12)",
        border: "2px solid #f87171",
        borderRadius: 8, padding: "5px 14px",
        color: "#f87171", fontWeight: 900,
        fontSize: "0.85rem", letterSpacing: "0.12em",
        fontFamily: "Courier New, monospace", zIndex: 6,
        rotate: "12deg",
      }}>
        REJECT 💥
      </motion.div>

      {/* Card body */}
      <div style={{
        height: "100%",
        background: "linear-gradient(160deg, #111820 0%, #0d1520 100%)",
        border: "1px solid #1e2d3d",
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 24px",
        fontFamily: "Courier New, monospace",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        userSelect: "none",
      }}>
        {/* Eyebrow */}
        <div style={{ fontSize: "0.6rem", color: "#334155", letterSpacing: "0.24em", marginBottom: 28 }}>
          // WILL THESE SPECIES REACT?
        </div>

        {/* Molecule pair */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          {/* Nucleophile */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "rgba(0,255,136,0.07)",
              border: "2px solid rgba(0,255,136,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: card.nucleophile.length > 4 ? "1.1rem" : "1.5rem",
              fontWeight: 900, color: "#00ff88",
              marginBottom: 8,
              boxShadow: "0 0 20px rgba(0,255,136,0.1)",
            }}>
              {card.nucleophile}
            </div>
            <div style={{ color: "#475569", fontSize: "0.58rem", letterSpacing: "0.14em" }}>NUCLEOPHILE</div>
          </div>

          {/* Plus */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: "1.4rem", color: "#1e2d3d", fontWeight: 300 }}>+</div>
          </div>

          {/* Electrophile */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "rgba(59,130,246,0.07)",
              border: "2px solid rgba(59,130,246,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: card.electrophile.length > 5 ? "0.9rem" : "1.3rem",
              fontWeight: 900, color: "#3b82f6",
              marginBottom: 8,
              boxShadow: "0 0 20px rgba(59,130,246,0.1)",
            }}>
              {card.electrophile}
            </div>
            <div style={{ color: "#475569", fontSize: "0.58rem", letterSpacing: "0.14em" }}>ELECTROPHILE</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, #1e2d3d, transparent)", marginBottom: 20 }} />

        {/* Instruction */}
        <p style={{ color: "#334155", fontSize: "0.7rem", textAlign: "center", margin: 0, letterSpacing: "0.04em" }}>
          Swipe <span style={{ color: "#00ff88" }}>right → REACT</span> · Swipe <span style={{ color: "#f87171" }}>left ← REJECT</span>
        </p>

        {/* Mechanism tag */}
        {card.mechanism && (
          <div style={{
            marginTop: 14,
            fontSize: "0.62rem",
            padding: "3px 10px",
            borderRadius: 999,
            background: "rgba(167,139,250,0.1)",
            color: "#a78bfa",
            border: "1px solid rgba(167,139,250,0.25)",
            letterSpacing: "0.1em",
          }}>
            {card.mechanism}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReactOrRejectPage() {
  const [cards, setCards] = useState<ChemCard[]>(CARDS);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [lastHint, setLastHint] = useState<string>("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const verdictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Zustand: live ELO shown in top bar, updated optimistically per answer
  const eloRating = useChemStore((s) => s.eloRating);

  const triggerVerdict = (direction: "left" | "right", card: ChemCard) => {
    const userSaysReact = direction === "right";
    const correct = userSaysReact === card.shouldReact;

    setVerdict(direction === "right" ? "react" : "reject");
    setLastHint(card.hint);
    setLastCorrect(correct);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    // Update global ELO optimistically
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

  // ── Keyboard shortcuts: ← = reject, → = react
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleButton("left");
      if (e.key === "ArrowRight") handleButton("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, verdict]);

  // ── Finished screen
  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100);
    const emoji = pct >= 80 ? "🏆" : pct >= 50 ? "⚗️" : "💀";
    const color = pct >= 80 ? "#00ff88" : pct >= 50 ? "#f59e0b" : "#f87171";
    return (
      <div style={{
        minHeight: "100vh",
        background: "#080c10",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Courier New, monospace",
        padding: 24,
        textAlign: "center",
      }}>
        {/* Result card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          style={{
            background: "#111820",
            border: `1px solid ${color}40`,
            borderRadius: 20,
            padding: "40px 48px",
            maxWidth: 380,
            width: "100%",
            boxShadow: `0 0 40px ${color}15`,
          }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>{emoji}</div>
          <h1 style={{ color: "#e2e8f0", fontSize: "1.6rem", margin: "0 0 8px", fontWeight: 900 }}>
            Round Complete
          </h1>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, color, margin: "16px 0 4px" }}>
            {score.correct}/{score.total}
          </div>
          <div style={{ color: "#475569", fontSize: "0.78rem", marginBottom: 28 }}>{pct}% accuracy</div>

          {/* Score bar */}
          <div style={{ height: 4, background: "#1e2d3d", borderRadius: 2, marginBottom: 28, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 2 }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setCards(CARDS); setScore({ correct: 0, total: 0 }); setFinished(false); setLastHint(""); setLastCorrect(null); }}
              style={{
                flex: 1,
                background: `${color}12`,
                border: `1px solid ${color}50`,
                color,
                padding: "11px 0",
                borderRadius: 10,
                fontFamily: "Courier New, monospace",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.1em",
                transition: "all 0.15s",
              }}
            >
              PLAY AGAIN
            </button>
            <Link href="/" style={{ flex: 1, textDecoration: "none" }}>
              <button style={{
                width: "100%",
                background: "transparent",
                border: "1px solid #1e2d3d",
                color: "#64748b",
                padding: "11px 0",
                borderRadius: 10,
                fontFamily: "Courier New, monospace",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.1em",
              }}>
                ← DASHBOARD
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPct = ((CARDS.length - cards.length) / CARDS.length) * 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c10",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "Courier New, monospace",
    }}>
      {/* Top bar */}
      <div style={{
        width: "100%",
        background: "rgba(8,12,16,0.95)",
        borderBottom: "1px solid #1e2d3d",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <span style={{ color: "#334155", fontSize: "0.65rem", letterSpacing: "0.16em" }}>// REACT OR REJECT</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#475569", fontSize: "0.65rem" }}>
            ⚡ <span style={{ color: "#00ff88", fontWeight: 700 }}>{eloRating}</span>
          </span>
          <span style={{
            fontSize: "0.72rem",
            color: "#00ff88",
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}>
            {score.correct}/{score.total}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px", width: "100%", maxWidth: 500 }}>

        {/* Title + progress */}
        <div style={{ width: "100%", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h1 style={{ color: "#e2e8f0", fontSize: "1.2rem", fontWeight: 900, margin: 0, letterSpacing: "0.04em" }}>
              ⚗️ React or <span style={{ color: "#f87171" }}>Reject</span>
            </h1>
            <span style={{ color: "#475569", fontSize: "0.68rem" }}>
              {cards.length} remaining
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: "#1e2d3d", borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
              style={{ height: "100%", background: "linear-gradient(90deg, #00ff88, #3b82f6)", borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Card stack */}
        <div style={{ position: "relative", width: "100%", height: 340, marginBottom: 20 }}>
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
            style={{
              width: "100%",
              background: lastCorrect ? "rgba(0,255,136,0.05)" : "rgba(248,113,113,0.05)",
              border: `1px solid ${lastCorrect ? "rgba(0,255,136,0.2)" : "rgba(248,113,113,0.2)"}`,
              borderRadius: 10,
              padding: "11px 16px",
              marginBottom: 18,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "0.85rem", marginTop: 1, flexShrink: 0 }}>{lastCorrect ? "✓" : "✗"}</span>
            <div>
              <div style={{ color: lastCorrect ? "#00ff88" : "#f87171", fontSize: "0.62rem", letterSpacing: "0.12em", marginBottom: 3 }}>
                {lastCorrect ? "CORRECT" : "INCORRECT"}
              </div>
              <p style={{ color: "#64748b", fontSize: "0.73rem", margin: 0, lineHeight: 1.6 }}>
                {lastHint}
              </p>
            </div>
          </motion.div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleButton("left")}
            disabled={verdict !== null || cards.length === 0}
            style={{
              flex: 1, padding: "14px 0", borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(248,113,113,0.07)",
              color: "#f87171",
              fontFamily: "Courier New, monospace",
              fontSize: "0.85rem", fontWeight: 800,
              letterSpacing: "0.12em",
              cursor: verdict !== null ? "not-allowed" : "pointer",
              opacity: verdict !== null ? 0.45 : 1,
              transition: "opacity 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            ← REJECT
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleButton("right")}
            disabled={verdict !== null || cards.length === 0}
            style={{
              flex: 1, padding: "14px 0", borderRadius: 12,
              border: "1px solid rgba(0,255,136,0.45)",
              background: "rgba(0,255,136,0.07)",
              color: "#00ff88",
              fontFamily: "Courier New, monospace",
              fontSize: "0.85rem", fontWeight: 800,
              letterSpacing: "0.12em",
              cursor: verdict !== null ? "not-allowed" : "pointer",
              opacity: verdict !== null ? 0.45 : 1,
              transition: "opacity 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            REACT →
          </motion.button>
        </div>

        {/* Keyboard hint */}
        <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
          {[
            { key: "←", label: "reject", color: "#f87171" },
            { key: "→", label: "react", color: "#00ff88" },
          ].map((k) => (
            <div key={k.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                background: "#111820", border: "1px solid #1e2d3d",
                borderRadius: 5, padding: "2px 8px",
                color: "#334155", fontSize: "0.72rem",
                fontFamily: "Courier New, monospace",
              }}>{k.key}</span>
              <span style={{ color: k.color, fontSize: "0.62rem" }}>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
