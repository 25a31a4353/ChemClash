"use client";

import TopNav from "@/components/TopNav";
import GameModeCard, { GameMode } from "@/components/GameModeCard";
import CheatSheetDownloader from "@/components/CheatSheetDownloader";
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
    accentColor: "emerald",
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
    accentColor: "blue",
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
    accentColor: "violet",
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
    accentColor: "amber",
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
    accentColor: "amber",
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
    accentColor: "blue",
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
    accentColor: "amber",
    badge: "LIVE",
    plays: 890,
  },
];

const STATS = [
  { label: "REACTIONS ATTEMPTED", value: "248",  colorClass: "text-emerald-600", borderClass: "hover:border-emerald-300", icon: "⚗" },
  { label: "ACCURACY RATE",       value: "73%",  colorClass: "text-blue-600",    borderClass: "hover:border-blue-300",    icon: "🎯" },
  { label: "BEST STREAK",         value: "12d",  colorClass: "text-amber-600",   borderClass: "hover:border-amber-300",   icon: "🔥" },
  { label: "GLOBAL RANK",         value: "#84",  colorClass: "text-violet-600",  borderClass: "hover:border-violet-300",  icon: "🏆" },
];

const ACTIVITY = [40, 70, 55, 90, 65, 80, 100];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Dashboard() {
  const eloRating   = useChemStore((s) => s.eloRating);
  const dailyStreak = useChemStore((s) => s.dailyStreak);
  const username    = useChemStore((s) => s.username);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav eloRating={eloRating} dailyStreak={dailyStreak} username={username} />

      <main className="max-w-6xl mx-auto px-6 py-12 pb-20">

        {/* ── Hero section ── */}
        <div className="mb-12 animate-fade-in">

          {/* Eyebrow */}
          <p className="text-xs font-semibold tracking-widest text-emerald-600 mb-3 uppercase">
            Select Game Mode
          </p>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            Welcome back,{" "}
            <span className="text-emerald-600">{username}</span>
          </h1>

          <p className="text-base text-slate-600 leading-relaxed mb-8">
            Your ELO is{" "}
            <span className="text-emerald-600 font-bold">{eloRating}</span> · Top{" "}
            <span className="text-amber-600 font-bold">12%</span> globally · Keep reacting.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`animate-slide-up delay-${(i + 1) * 100} bg-white border border-slate-200 ${stat.borderClass} rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm`}
              >
                <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                  {stat.label}
                </div>
                <div className={`text-2xl font-black ${stat.colorClass} leading-none`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section divider ── */}
        <div className="flex items-center gap-3 mb-7">
          <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase whitespace-nowrap">
            Game Modes
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        {/* ── Game mode grid ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))" }}>
          {GAME_MODES.map((mode, i) => (
            <GameModeCard key={mode.id} mode={mode} index={i} />
          ))}
        </div>

        {/* ── Activity strip ── */}
        <div className="mt-12 bg-white border border-slate-200 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Weekly Activity</span>
            <span className="text-xs text-slate-400 font-medium">last 7 days</span>
          </div>
          <div className="flex gap-1.5 items-end h-12">
            {ACTIVITY.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{
                    height: `${h}%`,
                    minHeight: 4,
                    background:
                      h === 100
                        ? "linear-gradient(180deg, #059669, #047857)"
                        : `rgba(5,150,105,${0.2 + h / 250})`,
                    border: h === 100 ? "none" : "1px solid rgba(5,150,105,0.2)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {DAYS.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[0.65rem] font-medium text-slate-400">
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* ── Custom Cheat Sheet Downloader ── */}
        <div className="mt-10 animate-fade-in">
          <CheatSheetDownloader />
        </div>

        {/* ── Footer ── */}
        <p className="mt-12 text-xs text-center tracking-widest text-slate-300 font-medium uppercase">
          ChemClash v0.1.0 · Organic Chemistry Arena ·{" "}
          <span className="text-slate-400">All reactions will be judged</span>
        </p>
      </main>
    </div>
  );
}
