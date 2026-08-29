"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChemCard {
  id: number;
  nucleophile: string;
  electrophile: string;
  shouldReact: boolean;
  hint: string;
}

type Verdict = "react" | "reject" | null;

// ─── Placeholder data ─────────────────────────────────────────────────────────

const CARDS: ChemCard[] = [
  {
    id: 1,
    nucleophile: "OH⁻",
    electrophile: "CH₃Br",
    shouldReact: true,
    hint: "Hydroxide attacks the carbon bearing the leaving group (SN2).",
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
  },
];

// ─── Feedback Overlay ─────────────────────────────────────────────────────────

function FeedbackOverlay({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null;
  const isReact = verdict === "react";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.3 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        background: isReact
          ? "rgba(0, 255, 136, 0.12)"
          : "rgba(255, 68, 68, 0.12)",
        border: `2px solid ${isReact ? "#00ff88" : "#ff4444"}`,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: "Courier New, monospace",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>
          {isReact ? "✅" : "❌"}
        </div>
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: isReact ? "#00ff88" : "#ff4444",
            letterSpacing: "0.1em",
            textShadow: `0 0 12px ${isReact ? "#00ff88" : "#ff4444"}`,
          }}
        >
          {isReact ? "BOND FORMED!" : "NO REACTION"}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Swipe Card ───────────────────────────────────────────────────────────────

interface SwipeCardProps {
  card: ChemCard;
  isTop: boolean;
  onSwipe: (direction: "left" | "right") => void;
}

function SwipeCard({ card, isTop, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Tint overlays
  const reactOpacity = useTransform(x, [0, 120], [0, 1]);
  const rejectOpacity = useTransform(x, [-120, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe("right");
    else if (info.offset.x < -100) onSwipe("left");
    else animate(x, 0, { type: "spring", stiffness: 300 });
  };

  if (!isTop) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#161616",
          border: "1px solid #1f2937",
          borderRadius: 16,
          transform: "scale(0.95) translateY(12px)",
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
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {/* REACT hint (right) */}
      <motion.div
        style={{
          opacity: reactOpacity,
          position: "absolute",
          top: 20,
          left: 20,
          background: "rgba(0,255,136,0.15)",
          border: "2px solid #00ff88",
          borderRadius: 8,
          padding: "4px 14px",
          color: "#00ff88",
          fontWeight: 800,
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
          fontFamily: "Courier New, monospace",
          zIndex: 5,
          rotate: "-15deg",
        }}
      >
        REACT ⚡
      </motion.div>

      {/* REJECT hint (left) */}
      <motion.div
        style={{
          opacity: rejectOpacity,
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255,68,68,0.15)",
          border: "2px solid #ff4444",
          borderRadius: 8,
          padding: "4px 14px",
          color: "#ff4444",
          fontWeight: 800,
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
          fontFamily: "Courier New, monospace",
          zIndex: 5,
          rotate: "15deg",
        }}
      >
        REJECT 💥
      </motion.div>

      {/* Card body */}
      <div
        style={{
          height: "100%",
          background: "linear-gradient(135deg, #111111 0%, #181818 100%)",
          border: "1px solid #1f2937",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          fontFamily: "Courier New, monospace",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            color: "#6b7280",
            letterSpacing: "0.2em",
            marginBottom: 32,
          }}
        >
          WILL THESE SPECIES REACT?
        </div>

        {/* Molecule display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Nucleophile */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(0,255,136,0.08)",
                border: "2px solid rgba(0,255,136,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#00ff88",
                marginBottom: 8,
              }}
            >
              {card.nucleophile}
            </div>
            <div style={{ color: "#6b7280", fontSize: "0.65rem", letterSpacing: "0.12em" }}>
              NUCLEOPHILE
            </div>
          </div>

          {/* Plus */}
          <div style={{ fontSize: "1.5rem", color: "#374151", fontWeight: 300 }}>+</div>

          {/* Electrophile */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(59,130,246,0.08)",
                border: "2px solid rgba(59,130,246,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#3b82f6",
                marginBottom: 8,
              }}
            >
              {card.electrophile}
            </div>
            <div style={{ color: "#6b7280", fontSize: "0.65rem", letterSpacing: "0.12em" }}>
              ELECTROPHILE
            </div>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: 1,
            background: "#1f2937",
            marginBottom: 24,
          }}
        />

        <p style={{ color: "#4b5563", fontSize: "0.75rem", textAlign: "center", margin: 0 }}>
          Swipe <span style={{ color: "#00ff88" }}>right</span> to React ·{" "}
          Swipe <span style={{ color: "#ff4444" }}>left</span> to Reject
        </p>
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
  const [finished, setFinished] = useState(false);
  const verdictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerVerdict = (direction: "left" | "right", card: ChemCard) => {
    const userSaysReact = direction === "right";
    const correct = userSaysReact === card.shouldReact;

    setVerdict(direction === "right" ? "react" : "reject");
    setLastHint(card.hint);
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
    }));

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

  // ── Finished screen
  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0d0d0d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Courier New, monospace",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>
          {pct >= 80 ? "🏆" : pct >= 50 ? "⚗️" : "💀"}
        </div>
        <h1 style={{ color: "#ffffff", fontSize: "1.8rem", margin: "0 0 8px" }}>
          Round Complete
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 32px" }}>
          You scored{" "}
          <span style={{ color: "#00ff88", fontWeight: 700 }}>
            {score.correct}/{score.total}
          </span>{" "}
          ({pct}%)
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              setCards(CARDS);
              setScore({ correct: 0, total: 0 });
              setFinished(false);
              setLastHint("");
            }}
            style={{
              background: "rgba(0,255,136,0.1)",
              border: "1px solid #00ff88",
              color: "#00ff88",
              padding: "10px 24px",
              borderRadius: 8,
              fontFamily: "Courier New, monospace",
              fontSize: "0.85rem",
              cursor: "pointer",
              letterSpacing: "0.1em",
            }}
          >
            PLAY AGAIN
          </button>
          <Link href="/">
            <button
              style={{
                background: "#111",
                border: "1px solid #1f2937",
                color: "#6b7280",
                padding: "10px 24px",
                borderRadius: 8,
                fontFamily: "Courier New, monospace",
                fontSize: "0.85rem",
                cursor: "pointer",
                letterSpacing: "0.1em",
              }}
            >
              ← DASHBOARD
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Courier New, monospace",
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            href="/"
            style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none" }}
          >
            ← Dashboard
          </Link>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#00ff88",
              letterSpacing: "0.2em",
            }}
          >
            {score.correct}/{score.total} CORRECT
          </span>
        </div>
        <h1
          style={{
            color: "#ffffff",
            fontSize: "1.4rem",
            fontWeight: 800,
            margin: "8px 0 0",
            letterSpacing: "0.05em",
          }}
        >
          ⚗️ React or{" "}
          <span style={{ color: "#ff4444" }}>Reject</span>
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "4px 0 0" }}>
          {cards.length} card{cards.length !== 1 ? "s" : ""} remaining
        </p>
      </div>

      {/* Card stack */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          height: 340,
          marginBottom: 24,
        }}
      >
        {/* Render next card below */}
        {cards[1] && <SwipeCard card={cards[1]} isTop={false} onSwipe={() => {}} />}
        {/* Render top card */}
        {cards[0] && (
          <SwipeCard
            key={cards[0].id}
            card={cards[0]}
            isTop={true}
            onSwipe={(dir) => triggerVerdict(dir, cards[0])}
          />
        )}
        {/* Verdict overlay */}
        <FeedbackOverlay verdict={verdict} />
      </div>

      {/* Hint */}
      {lastHint && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: "100%",
            maxWidth: 480,
            background: "#111",
            border: "1px solid #1f2937",
            borderRadius: 8,
            padding: "10px 16px",
            color: "#6b7280",
            fontSize: "0.75rem",
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: "#00ff88" }}>// hint: </span>
          {lastHint}
        </motion.div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: 16,
          width: "100%",
          maxWidth: 480,
        }}
      >
        {/* Reject */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleButton("left")}
          disabled={verdict !== null || cards.length === 0}
          style={{
            flex: 1,
            padding: "14px 0",
            borderRadius: 10,
            border: "1px solid rgba(255,68,68,0.5)",
            background: "rgba(255,68,68,0.08)",
            color: "#ff4444",
            fontFamily: "Courier New, monospace",
            fontSize: "0.9rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: verdict !== null ? 0.5 : 1,
          }}
        >
          ← REJECT
        </motion.button>

        {/* React */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleButton("right")}
          disabled={verdict !== null || cards.length === 0}
          style={{
            flex: 1,
            padding: "14px 0",
            borderRadius: 10,
            border: "1px solid rgba(0,255,136,0.5)",
            background: "rgba(0,255,136,0.08)",
            color: "#00ff88",
            fontFamily: "Courier New, monospace",
            fontSize: "0.9rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: verdict !== null ? 0.5 : 1,
          }}
        >
          REACT →
        </motion.button>
      </div>
    </div>
  );
}
