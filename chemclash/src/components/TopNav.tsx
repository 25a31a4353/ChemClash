"use client";

interface TopNavProps {
  eloRating?: number;
  dailyStreak?: number;
  username?: string;
}

export default function TopNav({
  eloRating = 1337,
  dailyStreak = 7,
  username = "CH3M_L0RD",
}: TopNavProps) {
  return (
    <nav
      style={{
        background: "#111111",
        borderBottom: "1px solid #1f2937",
        boxShadow: "0 0 20px rgba(0,255,136,0.08)",
      }}
      className="w-full px-6 py-3 flex items-center justify-between"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span
          className="text-2xl font-bold tracking-widest glow"
          style={{ color: "#00ff88", fontFamily: "Courier New, monospace" }}
        >
          ⚗ CHEM<span style={{ color: "#ffffff" }}>CLASH</span>
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: "rgba(0,255,136,0.1)",
            color: "#00ff88",
            border: "1px solid rgba(0,255,136,0.3)",
          }}
        >
          v0.1.0
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6">
        {/* Daily Streak */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "1.1rem" }}>🔥</span>
          <div style={{ fontFamily: "Courier New, monospace" }}>
            <div style={{ color: "#6b7280", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
              DAILY STREAK
            </div>
            <div
              style={{ color: "#f59e0b", fontSize: "1rem", fontWeight: 700, lineHeight: 1 }}
            >
              {dailyStreak} days
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: "#1f2937" }} />

        {/* ELO Rating */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "1.1rem" }}>⚡</span>
          <div style={{ fontFamily: "Courier New, monospace" }}>
            <div style={{ color: "#6b7280", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
              ELO RATING
            </div>
            <div
              className="glow"
              style={{ color: "#00ff88", fontSize: "1rem", fontWeight: 700, lineHeight: 1 }}
            >
              {eloRating}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: "#1f2937" }} />

        {/* User */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.2)",
            cursor: "pointer",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#00ff88", color: "#0d0d0d" }}
          >
            {username[0]}
          </div>
          <span
            style={{
              color: "#e5e7eb",
              fontSize: "0.8rem",
              fontFamily: "Courier New, monospace",
            }}
          >
            {username}
          </span>
        </div>
      </div>
    </nav>
  );
}
