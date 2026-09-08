"use client";

import Link from "next/link";
import { useState } from "react";
import { useChemStore } from "@/store/useChemStore";

interface TopNavProps {
  eloRating?: number;
  dailyStreak?: number;
  username?: string;
}

export default function TopNav({
  eloRating: eloProp = 1337,
  dailyStreak: streakProp = 7,
  username: usernameProp = "CH3M_L0RD",
}: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Live values from global store (props are fallback defaults)
  const storeElo      = useChemStore((s) => s.eloRating);
  const storeStreak   = useChemStore((s) => s.dailyStreak);
  const storeUsername = useChemStore((s) => s.username);

  const eloRating   = storeElo      ?? eloProp;
  const dailyStreak = storeStreak   ?? streakProp;
  const username    = storeUsername ?? usernameProp;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 opacity-80" />

      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="no-underline flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-base">
            ⚗
          </div>
          <span className="text-emerald-600 font-black text-lg tracking-wide leading-none">
            CHEM<span className="text-slate-800">CLASH</span>
          </span>
          <span className="text-[0.6rem] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono">
            v0.1
          </span>
        </Link>

        {/* ── Center nav links ── */}
        <div className="hidden md:flex gap-1 items-center">
          {[
            { href: "/react-or-reject",   label: "React or Reject",  hoverCls: "hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200" },
            { href: "/mechanism-builder", label: "Mechanism Builder", hoverCls: "hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200" },
            { href: "/adaptive-pyq",      label: "Adaptive PYQ",     hoverCls: "hover:text-violet-600 hover:bg-violet-50 hover:border-violet-200" },
            { href: "/curriculum",        label: "Curriculum",        hoverCls: "hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200" },
            { href: "/reagents",          label: "Reagents",          hoverCls: "hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200" },
            { href: "/leaderboard",       label: "Leaderboard",       hoverCls: "hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-slate-500 text-sm font-medium px-3 py-1.5 rounded-lg border border-transparent transition-all duration-150 no-underline ${link.hoverCls}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Right stats + user ── */}
        <div className="flex items-center gap-2">

          {/* Streak pill */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="text-base leading-none">🔥</span>
            <div className="leading-none">
              <div className="text-[0.55rem] font-semibold tracking-widest text-amber-500 uppercase mb-0.5">Streak</div>
              <div className="text-amber-600 text-sm font-black">{dailyStreak}d</div>
            </div>
          </div>

          {/* ELO pill */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <span className="text-base leading-none">⚡</span>
            <div className="leading-none">
              <div className="text-[0.55rem] font-semibold tracking-widest text-emerald-500 uppercase mb-0.5">ELO</div>
              <div className="text-emerald-700 text-sm font-black">{eloRating}</div>
            </div>
          </div>

          {/* User avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer transition-all duration-150 hover:bg-slate-100 hover:border-slate-300"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-black text-white">
                {username[0]}
              </div>
              <span className="text-slate-700 text-sm font-semibold tracking-wide">
                {username}
              </span>
              <span
                className="text-slate-400 text-xs ml-0.5 inline-block transition-transform duration-200"
                style={{ transform: menuOpen ? "rotate(180deg)" : "none" }}
              >
                ▾
              </span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                className="animate-slide-down absolute right-0 top-[calc(100%+8px)] bg-white border border-slate-200 rounded-xl min-w-[180px] overflow-hidden shadow-lg z-50"
              >
                {[
                  { label: "Profile",     icon: "👤", href: undefined },
                  { label: "Leaderboard", icon: "🏆", href: "/leaderboard" },
                  { label: "Settings",    icon: "⚙️", href: undefined },
                  { label: "Sign Out",    icon: "→",  href: undefined, danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setMenuOpen(false); if (item.href) window.location.href = item.href; }}
                    className={[
                      "w-full bg-transparent border-none px-4 py-2.5 flex items-center gap-2.5 cursor-pointer text-sm font-medium tracking-wide transition-all duration-100 text-left",
                      item.danger
                        ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                      item.label === "Sign Out" ? "border-t border-slate-100" : "",
                    ].join(" ")}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
