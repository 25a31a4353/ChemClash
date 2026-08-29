import TopNav from "@/components/TopNav";
import GameModeCard, { GameMode } from "@/components/GameModeCard";

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
  },
  {
    id: "reagents",
    title: "Reagents Explorer",
    level: "REFERENCE",
    description:
      "Browse every JEE-relevant reagent — formula, reaction conditions, substrates, products, and Socratic notes. Searchable and filterable by category.",
    icon: "🧪",
    href: "/reagents",
    accentColor: "#a78bfa",
    badge: "JEE READY",
  },
];

export default function Dashboard() {
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "Courier New, monospace" }}>
      <TopNav eloRating={1337} dailyStreak={7} username="CH3M_L0RD" />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <p
            style={{
              color: "#00ff88",
              fontSize: "0.75rem",
              letterSpacing: "0.25em",
              margin: "0 0 10px 0",
              opacity: 0.7,
            }}
          >
            // SELECT GAME MODE
          </p>
          <h1
            style={{
              color: "#ffffff",
              fontSize: "2.2rem",
              fontWeight: 800,
              margin: "0 0 12px 0",
              letterSpacing: "0.03em",
            }}
          >
            Welcome back,{" "}
            <span style={{ color: "#00ff88" }} className="glow">
              CH3M_L0RD
            </span>
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
            Your ELO is{" "}
            <span style={{ color: "#00ff88", fontWeight: 700 }}>1337</span>. You
            are in the top{" "}
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>12%</span> of
            players. Keep reacting.
          </p>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 48,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "REACTIONS ATTEMPTED", value: "248", color: "#00ff88" },
            { label: "ACCURACY", value: "73%", color: "#3b82f6" },
            { label: "BEST STREAK", value: "12 days", color: "#f59e0b" },
            { label: "RANK", value: "#84", color: "#a78bfa" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#111111",
                border: "1px solid #1f2937",
                borderRadius: 8,
                padding: "14px 20px",
                flex: "1 1 160px",
              }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  color: "#6b7280",
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{ fontSize: "1.4rem", fontWeight: 800, color: stat.color }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Game mode grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {GAME_MODES.map((mode) => (
            <GameModeCard key={mode.id} mode={mode} />
          ))}
        </div>

        {/* Footer hint */}
        <p
          style={{
            marginTop: 56,
            color: "#374151",
            fontSize: "0.75rem",
            textAlign: "center",
            letterSpacing: "0.1em",
          }}
        >
          // CHEMCLASH v0.1.0 — ORGANIC CHEMISTRY ARENA —{" "}
          <span style={{ color: "#4b5563" }}>ALL REACTIONS WILL BE JUDGED</span>
        </p>
      </main>
    </div>
  );
}
