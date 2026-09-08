"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useChemStore } from "@/store/useChemStore";

interface LeaderboardEntry {
  rank: number; username: string; elo: number; accuracy: number;
  streak: number; badge: string; change: "up" | "down" | "same"; delta: number;
}

const GLOBAL_BOARD: LeaderboardEntry[] = [
  { rank: 1,  username: "PERI_CLEAVE",   elo: 2841, accuracy: 94, streak: 32, badge: "🥇", change: "same",  delta: 0 },
  { rank: 2,  username: "BENZENE_KING",  elo: 2720, accuracy: 91, streak: 18, badge: "🥈", change: "up",    delta: 1 },
  { rank: 3,  username: "SN2_SNIPER",    elo: 2655, accuracy: 89, streak: 14, badge: "🥉", change: "down",  delta: 1 },
  { rank: 4,  username: "ALKOXIDE_ACE",  elo: 2540, accuracy: 87, streak: 9,  badge: "⚗️", change: "up",    delta: 3 },
  { rank: 5,  username: "GRIGNARD_G",    elo: 2480, accuracy: 85, streak: 21, badge: "⚗️", change: "down",  delta: 2 },
  { rank: 6,  username: "FREE_RADICAL",  elo: 2399, accuracy: 82, streak: 5,  badge: "🔬", change: "up",    delta: 2 },
  { rank: 7,  username: "ENOLATE_E",     elo: 2310, accuracy: 80, streak: 11, badge: "🔬", change: "down",  delta: 1 },
  { rank: 8,  username: "WITTIG_WIZARD", elo: 2205, accuracy: 78, streak: 3,  badge: "🔬", change: "same",  delta: 0 },
  { rank: 9,  username: "RETROSYN_R",    elo: 2100, accuracy: 76, streak: 7,  badge: "📚", change: "up",    delta: 4 },
  { rank: 10, username: "HALIDE_H",      elo: 1990, accuracy: 73, streak: 2,  badge: "📚", change: "down",  delta: 3 },
];

const WEEKLY_BOARD: LeaderboardEntry[] = [
  { rank: 1,  username: "SN2_SNIPER",    elo: 480, accuracy: 91, streak: 14, badge: "🥇", change: "up",    delta: 2 },
  { rank: 2,  username: "GRIGNARD_G",    elo: 430, accuracy: 88, streak: 21, badge: "🥈", change: "same",  delta: 0 },
  { rank: 3,  username: "ENOLATE_E",     elo: 390, accuracy: 85, streak: 11, badge: "🥉", change: "up",    delta: 1 },
  { rank: 4,  username: "PERI_CLEAVE",   elo: 360, accuracy: 84, streak: 32, badge: "⚗️", change: "down",  delta: 3 },
  { rank: 5,  username: "CH3M_L0RD",     elo: 340, accuracy: 79, streak: 7,  badge: "⚗️", change: "up",    delta: 5 },
  { rank: 6,  username: "ALKOXIDE_ACE",  elo: 310, accuracy: 77, streak: 9,  badge: "🔬", change: "down",  delta: 1 },
  { rank: 7,  username: "WITTIG_WIZARD", elo: 280, accuracy: 75, streak: 3,  badge: "🔬", change: "same",  delta: 0 },
  { rank: 8,  username: "FREE_RADICAL",  elo: 250, accuracy: 72, streak: 5,  badge: "📚", change: "up",    delta: 2 },
  { rank: 9,  username: "RETROSYN_R",    elo: 220, accuracy: 70, streak: 7,  badge: "📚", change: "down",  delta: 2 },
  { rank: 10, username: "HALIDE_H",      elo: 190, accuracy: 67, streak: 2,  badge: "📚", change: "up",    delta: 1 },
];

const PODIUM_CLS = ["text-slate-500", "text-amber-500", "text-amber-700"];
const PODIUM_BORDER = ["border-slate-200", "border-amber-200", "border-amber-300"];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"global" | "weekly">("global");
  const eloRating = useChemStore((s) => s.eloRating);
  const username  = useChemStore((s) => s.username);

  const board = tab === "global" ? GLOBAL_BOARD : WEEKLY_BOARD;

  const myEntry: LeaderboardEntry = {
    rank: tab === "weekly" ? 5 : 84, username,
    elo: eloRating, accuracy: 73, streak: 7,
    badge: "⚗️", change: "up", delta: tab === "weekly" ? 5 : 2,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">← Dashboard</Link>
          <span className="text-slate-300">|</span>
          <span className="text-amber-600 text-xs font-semibold tracking-wide uppercase">Leaderboard</span>
        </div>
        <span className="text-sm text-slate-500">⚡ <span className="text-emerald-600 font-bold">{eloRating}</span></span>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-10 pb-20">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-2">Global Rankings</p>
          <h1 className="text-3xl font-black text-slate-900 mb-1">🏆 Leaderboard</h1>
          <p className="text-sm text-slate-500">Ranked by ELO · Updated live</p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-7 bg-slate-100 border border-slate-200 rounded-xl p-1 w-fit">
          {(["global", "weekly"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                tab === t ? "bg-white shadow-sm border border-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t === "global" ? "All Time" : "This Week"}
            </button>
          ))}
        </div>

        {/* Podium top 3 */}
        <div className="flex gap-3 justify-center mb-8 flex-wrap">
          {[board[1], board[0], board[2]].map((entry, i) => {
            const orderMap = [1, 0, 2];
            const isFirst = i === 1;
            return (
              <motion.div key={entry.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: isFirst ? -8 : 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white border ${PODIUM_BORDER[orderMap[i]]} rounded-2xl p-5 text-center flex-1 max-w-[180px] shadow-sm ${isFirst ? "shadow-md" : ""}`}>
                <div className={`text-${isFirst ? "3xl" : "2xl"} mb-2`}>{entry.badge}</div>
                <div className={`text-xs font-bold tracking-wide mb-1 ${PODIUM_CLS[orderMap[i]]}`}>#{entry.rank}</div>
                <div className="text-slate-800 text-sm font-extrabold mb-1">{entry.username}</div>
                <div className={`text-lg font-black ${PODIUM_CLS[orderMap[i]]}`}>{entry.elo.toLocaleString()}</div>
                <div className="text-slate-400 text-xs mt-0.5">ELO</div>
              </motion.div>
            );
          })}
        </div>

        {/* Full table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid px-5 py-2.5 border-b border-slate-200 gap-2 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-widest"
            style={{ gridTemplateColumns: "44px 1fr 80px 70px 60px 50px" }}>
            {["#", "Player", "ELO", "Acc%", "Streak", "Δ"].map((h) => <span key={h}>{h}</span>)}
          </div>

          {/* Rows */}
          {board.map((entry, idx) => {
            const isMe = entry.username === username || (tab === "weekly" && entry.rank === 5);
            return (
              <motion.div key={entry.username} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`grid px-5 py-3 gap-2 items-center border-b border-slate-100 last:border-0 transition-colors ${
                  isMe ? "bg-emerald-50 border-l-4 border-l-emerald-400" : "border-l-4 border-l-transparent hover:bg-slate-50"
                }`}
                style={{ gridTemplateColumns: "44px 1fr 80px 70px 60px 50px" }}>
                <span className={`text-sm font-bold ${entry.rank <= 3 ? ["text-amber-500","text-slate-500","text-amber-700"][entry.rank-1] : "text-slate-400"}`}>
                  {entry.rank <= 3 ? entry.badge : `#${entry.rank}`}
                </span>
                <div>
                  <span className={`text-sm font-bold ${isMe ? "text-emerald-700" : "text-slate-800"}`}>{entry.username}</span>
                  {isMe && <span className="ml-2 text-[0.6rem] font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">YOU</span>}
                </div>
                <span className="text-sm font-bold text-slate-800">{isMe ? eloRating.toLocaleString() : entry.elo.toLocaleString()}</span>
                <span className="text-sm text-slate-500">{entry.accuracy}%</span>
                <span className="text-sm text-amber-600 font-medium">🔥 {entry.streak}d</span>
                <span className={`text-sm font-bold ${entry.change === "up" ? "text-emerald-600" : entry.change === "down" ? "text-red-500" : "text-slate-300"}`}>
                  {entry.change === "up" ? `↑${entry.delta}` : entry.change === "down" ? `↓${entry.delta}` : "—"}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* My rank footer (global) */}
        {tab === "global" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-4 bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-400 rounded-2xl px-5 py-3 grid gap-2 items-center shadow-sm"
            style={{ gridTemplateColumns: "44px 1fr 80px 70px 60px 50px" }}>
            <span className="text-sm font-bold text-emerald-700">#84</span>
            <div>
              <span className="text-sm font-bold text-emerald-700">{username}</span>
              <span className="ml-2 text-[0.6rem] font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">YOU</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{eloRating.toLocaleString()}</span>
            <span className="text-sm text-slate-500">73%</span>
            <span className="text-sm text-amber-600 font-medium">🔥 7d</span>
            <span className="text-sm font-bold text-emerald-600">↑2</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
