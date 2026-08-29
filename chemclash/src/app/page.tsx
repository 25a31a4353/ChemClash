"use client";

import TopNav from "@/components/TopNav";
import GameModeCard, { GameMode } from "@/components/GameModeCard";
import { useChemStore } from "@/store/useChemStore";

const GAME_MODES: GameMode[] = [
  {
    id: "react-or-reject",
    title: "React or Reject",
    level: "LEVEL 1",
    description:
      "Swipe right if the nucleophile and electrophile will react, swipe left if they won't. Train your chemical intuition under time pressure.",
    icon: "⚗️",
    href: "/react-or-reject",
    accentColor: "#00ff88",
    badge: "BEGINNER",
    progress: 68,
    plays: 1240,
  },
  {
    id: "mechanism-builder",
    title: "Mechanism Builder",
    level: "LEVEL 2",
    description:
      "Draw curved electron arrows on an interactive canvas to construct reaction mechanisms step by step. Precision earns bonus ELO.",
    icon: "🧬",
    href: "/mechanism-builder",
    accentColor: "#3b82f6",
    progress: 34,
    plays: 580,
  },
  {
    id: "adaptive-pyq",
    title: "Adaptive PYQ",
    level: "SMART",
    description:
      "AI matchmaker serves you the most relevant JEE Previous Year Questions based on your exact weakness profile. No hallucinations — verified questions only.",
    icon: "🎯",
    href: "/adaptive-pyq",
    accentColor: "#a78bfa",
    badge: "NEW",
    plays: 420,
  },
  {
    id: "1v1-duel",
    title: "1v1 Duel",
    level: "RANKED",
    description:
      "Challenge another chemist to a live duel. Answer mechanism questions faster and more accurately to climb the leaderboard.",
    icon: "⚔️",
    href: "/duel",
    accentColor: "#f59e0b",
    badge: "COMING SOON",
    locked: true,
  },
  {
    id: "reagents",
    title: "Reagents Explorer",
    level: "REFERENCE",
    description:
      "Browse every JEE-relevant reagent — formula, reaction conditions, substrates, products, and Socratic notes. Searchable and filterable by category.",
    icon: "🧪",
    href: "/reagents",
    accentColor: "#f59e0b",
    badge: "JEE READY",
    plays: 3100,
  },
  {
    id: "curriculum",
    title: "Curriculum",
    level: "LEVEL 0",
    description:
      "Work through concept modules in order. Each slide teaches a core idea and tests your understanding with a quick question. +5 ELO per correct answer.",
    icon: "📚",
    href: "/curriculum",
    accentColor: "#3b82f6",
    badge: "START HERE",
    plays: 560,
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    level: "RANKED",
    description:
      "See where you stand globally. Track your ELO progress, weekly gains, and compare accuracy + streak with top players.",
    icon: "🏆",
    href: "/leaderboard",
    accentColor: "#f59e0b",
    badge: "LIVE",
    plays: 890,
  },
];

const STATS = [
  { label: "REACTIONS ATTEMPTED", value: "248", color: "#00ff88", icon: "⚗" },
  { label: "ACCURACY RATE",        value: "73%", color: "#3b82f6", icon: "🎯" },
  { label: "BEST STREAK",          value: "12d",  color: "#f59e0b", icon: "🔥" },
  { label: "GLOBAL RANK",          value: "#84",  color: "#a78bfa", icon: "🏆" },
];

export default function Dashboard() {
  const eloRating  = useChemStore((s) => s.eloRating);
  const dailyStreak = useChemStore((s) => s.dailyStreak);
  const username   = useChemStore((s) => s.username);

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "Courier New, monospace" }}>
      <TopNav eloRating={eloRating} dailyStreak={dailyStreak} username={username} />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ── Hero section ── */}
        <div style={{ marginBottom: 52 }} className="animate-fade-in">

          {/* Eyebrow */}
          <p style={{ color: "#00ff88", fontSize: "0.7rem", letterSpacing: "0.3em", margin: "0 0 12px 0", opacity: 0.7 }}>
            // SELECT GAME MODE
          </p>

          {/* Headline */}
          <h1
            style={{
              color: "#ffffff",
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 900,
              margin: "0 0 10px 0",
              letterSpacing: "0.02em",
              lineHeight: 1.2,
            }}
          >
            Welcome back,{" "}
            <span className="glow" style={{ color: "#00ff88" }}>
              {username}
            </span>
          </h1>

          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "0 0 36px 0", lineHeight: 1.6 }}>
            Your ELO is{" "}
            <span style={{ color: "#00ff88", fontWeight: 700 }}>{eloRating}</span> · Top{" "}
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>12%</span> globally · Keep reacting.
          </p>

          {/* Stats bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`animate-slide-up delay-${(i + 1) * 100}`}
                style={{
                  background: "#111820",
                  border: "1px solid #1e2d3d",
                  borderRadius: 10,
                  padding: "14px 18px",
                  position: "relative",
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = stat.color + "50";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2d3d";
                }}
              >
                {/* Background glow blob */}
                <div style={{
                  position: "absolute", top: -20, right: -20, width: 70, height: 70,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${stat.color}18 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
                <div style={{ fontSize: "0.58rem", color: "#334155", letterSpacing: "0.14em", marginBottom: 6 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section divider ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <span style={{ color: "#334155", fontSize: "0.65rem", letterSpacing: "0.2em", whiteSpace: "nowrap" }}>
            // GAME MODES
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #1e2d3d, transparent)" }} />
        </div>

        {/* ── Game mode grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {GAME_MODES.map((mode, i) => (
            <GameModeCard key={mode.id} mode={mode} index={i} />
          ))}
        </div>

        {/* ── Activity strip ── */}
        <div
          style={{
            marginTop: 52,
            background: "#111820",
            border: "1px solid #1e2d3d",
            borderRadius: 12,
            padding: "20px 24px",
          }}
          className="animate-fade-in"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <span style={{ color: "#334155", fontSize: "0.65rem", letterSpacing: "0.18em" }}>// WEEKLY ACTIVITY</span>
            <span style={{ color: "#64748b", fontSize: "0.65rem" }}>last 7 days</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 48 }}>
            {[40, 70, 55, 90, 65, 80, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${h}%`,
                    background: h === 100
                      ? "linear-gradient(180deg, #00ff88, #00cc6a)"
                      : `rgba(0,255,136,${0.15 + h / 300})`,
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.6s ease",
                    minHeight: 4,
                    border: h === 100 ? "none" : "1px solid rgba(0,255,136,0.15)",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} style={{ color: "#334155", fontSize: "0.58rem", flex: 1, textAlign: "center" }}>{d}</span>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <p
          style={{
            marginTop: 52,
            color: "#1e2d3d",
            fontSize: "0.68rem",
            textAlign: "center",
            letterSpacing: "0.14em",
          }}
        >
          CHEMCLASH v0.1.0 · ORGANIC CHEMISTRY ARENA ·{" "}
          <span style={{ color: "#263245" }}>ALL REACTIONS WILL BE JUDGED</span>
        </p>
      </main>
    </div>
  );
}
