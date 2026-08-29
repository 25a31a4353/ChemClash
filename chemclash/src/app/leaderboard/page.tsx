"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useChemStore } from "@/store/useChemStore";

// ─── Mock leaderboard data ─────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  username: string;
  elo: number;
  accuracy: number;
  streak: number;
  badge: string;
  change: "up" | "down" | "same";
  delta: number;
}

const GLOBAL_BOARD: LeaderboardEntry[] = [
  { rank: 1,  username: "PERI_CLEAVE",   elo: 2841, accuracy: 94, streak: 32, badge: "🥇", change: "same",  delta: 0  },
  { rank: 2,  username: "BENZENE_KING",  elo: 2720, accuracy: 91, streak: 18, badge: "🥈", change: "up",    delta: 1  },
  { rank: 3,  username: "SN2_SNIPER",    elo: 2655, accuracy: 89, streak: 14, badge: "🥉", change: "down",  delta: 1  },
  { rank: 4,  username: "ALKOXIDE_ACE",  elo: 2540, accuracy: 87, streak: 9,  badge: "⚡",  change: "up",    delta: 3  },
  { rank: 5,  username: "GRIGNARD_G",    elo: 2480, accuracy: 85, streak: 21, badge: "⚡",  change: "down",  delta: 2  },
  { rank: 6,  username: "FREE_RADICAL",  elo: 2399, accuracy: 82, streak: 5,  badge: "⚗️",  change: "up",    delta: 2  },
  { rank: 7,  username: "ENOLATE_E",     elo: 2310, accuracy: 80, streak: 11, badge: "⚗️",  change: "down",  delta: 1  },
  { rank: 8,  username: "WITTIG_WIZARD", elo: 2205, accuracy: 78, streak: 3,  badge: "⚗️",  change: "same",  delta: 0  },
  { rank: 9,  username: "RETROSYN_R",    elo: 2100, accuracy: 76, streak: 7,  badge: "🧪",  change: "up",    delta: 4  },
  { rank: 10, username: "HALIDE_H",      elo: 1990, accuracy: 73, streak: 2,  badge: "🧪",  change: "down",  delta: 3  },
];

const WEEKLY_BOARD: LeaderboardEntry[] = [
  { rank: 1,  username: "SN2_SNIPER",    elo: 480, accuracy: 91, streak: 14, badge: "🥇", change: "up",    delta: 2 },
  { rank: 2,  username: "GRIGNARD_G",    elo: 430, accuracy: 88, streak: 21, badge: "🥈", change: "same",  delta: 0 },
  { rank: 3,  username: "ENOLATE_E",     elo: 390, accuracy: 85, streak: 11, badge: "🥉", change: "up",    delta: 1 },
  { rank: 4,  username: "PERI_CLEAVE",   elo: 360, accuracy: 84, streak: 32, badge: "⚡",  change: "down",  delta: 3 },
  { rank: 5,  username: "CH3M_L0RD",     elo: 340, accuracy: 79, streak: 7,  badge: "⚡",  change: "up",    delta: 5 },
  { rank: 6,  username: "ALKOXIDE_ACE",  elo: 310, accuracy: 77, streak: 9,  badge: "⚗️",  change: "down",  delta: 1 },
  { rank: 7,  username: "WITTIG_WIZARD", elo: 280, accuracy: 75, streak: 3,  badge: "⚗️",  change: "same",  delta: 0 },
  { rank: 8,  username: "FREE_RADICAL",  elo: 250, accuracy: 72, streak: 5,  badge: "🧪",  change: "up",    delta: 2 },
  { rank: 9,  username: "RETROSYN_R",    elo: 220, accuracy: 70, streak: 7,  badge: "🧪",  change: "down",  delta: 2 },
  { rank: 10, username: "HALIDE_H",      elo: 190, accuracy: 67, streak: 2,  badge: "🧪",  change: "up",    delta: 1 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"global" | "weekly">("global");
  const eloRating = useChemStore((s) => s.eloRating);
  const username = useChemStore((s) => s.username);

  const board = tab === "global" ? GLOBAL_BOARD : WEEKLY_BOARD;

  // Inject the live player row if they appear in the weekly board
  const myEntry: LeaderboardEntry = {
    rank: tab === "weekly" ? 5 : 84,
    username,
    elo: tab === "weekly" ? eloRating : eloRating,
    accuracy: 73,
    streak: 7,
    badge: "⚡",
    change: "up",
    delta: tab === "weekly" ? 5 : 2,
  };

  const podiumColors = ["#f59e0b", "#94a3b8", "#cd7c32"];

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "Courier New, monospace" }}>

      {/* Top bar */}
      <div style={{
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>
            ← Dashboard
          </Link>
          <span style={{ color: "#1e2d3d" }}>|</span>
          <span style={{ color: "#f59e0b", fontSize: "0.72rem", letterSpacing: "0.12em" }}>// LEADERBOARD</span>
        </div>
        <span style={{ color: "#475569", fontSize: "0.65rem" }}>
          ⚡ <span style={{ color: "#00ff88", fontWeight: 700 }}>{eloRating}</span>
        </span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{ color: "#f59e0b", fontSize: "0.65rem", letterSpacing: "0.28em", margin: "0 0 8px" }}>
            // GLOBAL RANKINGS
          </p>
          <h1 style={{ color: "#e2e8f0", fontSize: "1.8rem", fontWeight: 900, margin: "0 0 6px", letterSpacing: "0.02em" }}>
            🏆 Leaderboard
          </h1>
          <p style={{ color: "#475569", fontSize: "0.8rem", margin: 0 }}>
            Ranked by ELO · Updated live
          </p>
        </motion.div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {(["global", "weekly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "#111820" : "transparent",
                border: tab === t ? "1px solid #1e2d3d" : "1px solid transparent",
                color: tab === t ? "#e2e8f0" : "#475569",
                padding: "6px 20px",
                borderRadius: 7,
                fontFamily: "Courier New, monospace",
                fontSize: "0.72rem",
                fontWeight: tab === t ? 700 : 400,
                cursor: "pointer",
                letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}
            >
              {t === "global" ? "ALL TIME" : "THIS WEEK"}
            </button>
          ))}
        </div>

        {/* Podium top 3 */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
          {[board[1], board[0], board[2]].map((entry, i) => {
            const orderMap = [1, 0, 2]; // visual: 2nd, 1st, 3rd
            const isFirst = i === 1;
            const color = podiumColors[orderMap[i]];
            return (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: isFirst ? -8 : 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: "#111820",
                  border: `1px solid ${color}40`,
                  borderRadius: 14,
                  padding: "20px 24px",
                  textAlign: "center",
                  minWidth: 150,
                  flex: 1,
                  maxWidth: 200,
                  boxShadow: isFirst ? `0 0 32px ${color}18` : "none",
                }}
              >
                <div style={{ fontSize: isFirst ? "2rem" : "1.5rem", marginBottom: 6 }}>{entry.badge}</div>
                <div style={{ color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>
                  #{entry.rank}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
                  {entry.username}
                </div>
                <div style={{ color, fontSize: "1.1rem", fontWeight: 900 }}>
                  {entry.elo.toLocaleString()}
                </div>
                <div style={{ color: "#475569", fontSize: "0.6rem", marginTop: 2 }}>ELO</div>
              </motion.div>
            );
          })}
        </div>

        {/* Full table */}
        <div style={{ background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 14, overflow: "hidden" }}>

          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 90px 80px 70px 60px",
            padding: "10px 20px",
            borderBottom: "1px solid #1e2d3d",
            gap: 8,
          }}>
            {["#", "PLAYER", "ELO", "ACC%", "STREAK", "±"].map((h) => (
              <span key={h} style={{ color: "#334155", fontSize: "0.6rem", letterSpacing: "0.14em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {board.map((entry, idx) => {
            const isMe = entry.username === username || (tab === "weekly" && entry.rank === 5);
            return (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 90px 80px 70px 60px",
                  padding: "12px 20px",
                  borderBottom: "1px solid #0f1822",
                  gap: 8,
                  alignItems: "center",
                  background: isMe ? "rgba(0,255,136,0.04)" : "transparent",
                  borderLeft: isMe ? "3px solid #00ff88" : "3px solid transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Rank */}
                <span style={{
                  color: entry.rank <= 3 ? podiumColors[entry.rank - 1] : "#475569",
                  fontWeight: entry.rank <= 3 ? 900 : 400,
                  fontSize: "0.8rem",
                }}>
                  {entry.rank <= 3 ? entry.badge : `#${entry.rank}`}
                </span>

                {/* Username */}
                <div>
                  <span style={{ color: isMe ? "#00ff88" : "#e2e8f0", fontSize: "0.82rem", fontWeight: isMe ? 800 : 500 }}>
                    {entry.username}
                  </span>
                  {isMe && (
                    <span style={{ marginLeft: 8, fontSize: "0.58rem", color: "#00ff88", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.1em" }}>
                      YOU
                    </span>
                  )}
                </div>

                {/* ELO */}
                <span style={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 700 }}>
                  {isMe ? eloRating.toLocaleString() : entry.elo.toLocaleString()}
                </span>

                {/* Accuracy */}
                <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{entry.accuracy}%</span>

                {/* Streak */}
                <span style={{ color: "#f59e0b", fontSize: "0.78rem" }}>🔥 {entry.streak}d</span>

                {/* Delta */}
                <span style={{
                  color: entry.change === "up" ? "#00ff88" : entry.change === "down" ? "#f87171" : "#334155",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}>
                  {entry.change === "up" ? `▲${entry.delta}` : entry.change === "down" ? `▼${entry.delta}` : "—"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* My rank footer (when not in top 10) */}
        {tab === "global" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: 16,
              background: "rgba(0,255,136,0.04)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 12,
              padding: "14px 20px",
              display: "grid",
              gridTemplateColumns: "44px 1fr 90px 80px 70px 60px",
              gap: 8,
              alignItems: "center",
              borderLeft: "3px solid #00ff88",
            }}
          >
            <span style={{ color: "#00ff88", fontSize: "0.78rem", fontWeight: 700 }}>#84</span>
            <div>
              <span style={{ color: "#00ff88", fontSize: "0.82rem", fontWeight: 800 }}>{username}</span>
              <span style={{ marginLeft: 8, fontSize: "0.58rem", color: "#00ff88", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.1em" }}>
                YOU
              </span>
            </div>
            <span style={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 700 }}>{eloRating.toLocaleString()}</span>
            <span style={{ color: "#64748b", fontSize: "0.78rem" }}>73%</span>
            <span style={{ color: "#f59e0b", fontSize: "0.78rem" }}>🔥 7d</span>
            <span style={{ color: "#00ff88", fontSize: "0.72rem", fontWeight: 700 }}>▲2</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
