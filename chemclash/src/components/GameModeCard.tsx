"use client";

import { useState } from "react";
import Link from "next/link";

export interface GameMode {
  id: string;
  title: string;
  level: string;
  description: string;
  icon: string;
  href: string;
  /** Semantic colour name: "emerald" | "blue" | "violet" | "amber" */
  accentColor: string;
  badge?: string;
  locked?: boolean;
  progress?: number; // 0–100
  plays?: number;
}

interface GameModeCardProps {
  mode: GameMode;
  index?: number;
}

// Maps semantic accent name → Tailwind utility groups
const ACCENT_MAP: Record<
  string,
  {
    text: string;
    bg: string;
    border: string;
    hoverBorder: string;
    iconBg: string;
    levelPill: string;
    badgeBg: string;
    progressBar: string;
    bar: string; // left accent bar bg
  }
> = {
  emerald: {
    text:        "text-emerald-600",
    bg:          "bg-emerald-50",
    border:      "border-emerald-200",
    hoverBorder: "group-hover:border-emerald-400",
    iconBg:      "bg-emerald-50 border-emerald-200",
    levelPill:   "text-emerald-700 bg-emerald-50 border-emerald-200",
    badgeBg:     "text-emerald-700 bg-emerald-50 border-emerald-200",
    progressBar: "from-emerald-400 to-emerald-600",
    bar:         "from-emerald-500 to-transparent",
  },
  blue: {
    text:        "text-blue-600",
    bg:          "bg-blue-50",
    border:      "border-blue-200",
    hoverBorder: "group-hover:border-blue-400",
    iconBg:      "bg-blue-50 border-blue-200",
    levelPill:   "text-blue-700 bg-blue-50 border-blue-200",
    badgeBg:     "text-blue-700 bg-blue-50 border-blue-200",
    progressBar: "from-blue-400 to-blue-600",
    bar:         "from-blue-500 to-transparent",
  },
  violet: {
    text:        "text-violet-600",
    bg:          "bg-violet-50",
    border:      "border-violet-200",
    hoverBorder: "group-hover:border-violet-400",
    iconBg:      "bg-violet-50 border-violet-200",
    levelPill:   "text-violet-700 bg-violet-50 border-violet-200",
    badgeBg:     "text-violet-700 bg-violet-50 border-violet-200",
    progressBar: "from-violet-400 to-violet-600",
    bar:         "from-violet-500 to-transparent",
  },
  amber: {
    text:        "text-amber-600",
    bg:          "bg-amber-50",
    border:      "border-amber-200",
    hoverBorder: "group-hover:border-amber-400",
    iconBg:      "bg-amber-50 border-amber-200",
    levelPill:   "text-amber-700 bg-amber-50 border-amber-200",
    badgeBg:     "text-amber-700 bg-amber-50 border-amber-200",
    progressBar: "from-amber-400 to-amber-600",
    bar:         "from-amber-500 to-transparent",
  },
};

export default function GameModeCard({ mode, index = 0 }: GameModeCardProps) {
  const [hovered, setHovered] = useState(false);

  const accent = ACCENT_MAP[mode.accentColor] ?? ACCENT_MAP.blue;

  const cardContent = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white",
        "p-6 min-h-[230px] transition-all duration-200 animate-slide-up",
        hovered && !mode.locked
          ? `border-slate-300 shadow-md -translate-y-1`
          : "border-slate-200 shadow-sm translate-y-0",
        mode.locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent.bar} rounded-l-2xl transition-opacity duration-200`}
        style={{ opacity: hovered ? 1 : 0.35 }}
      />

      {/* Badge */}
      {mode.badge && (
        <span
          className={`absolute top-4 right-4 text-[0.65rem] font-bold tracking-wide px-2.5 py-0.5 rounded-full border ${
            mode.locked
              ? "text-slate-400 bg-slate-100 border-slate-200"
              : mode.badge === "COMING SOON"
              ? "text-amber-600 bg-amber-50 border-amber-200"
              : accent.badgeBg
          }`}
        >
          {mode.badge}
        </span>
      )}

      <div>
        {/* Icon + Level pill */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center text-2xl transition-transform duration-200 ${accent.iconBg} ${hovered ? "scale-110" : "scale-100"}`}
          >
            {mode.icon}
          </div>
          <span className={`text-[0.68rem] font-bold tracking-wider px-2.5 py-1 rounded border font-mono ${accent.levelPill}`}>
            {mode.level}
          </span>
        </div>

        {/* Title */}
        <h2
          className={`text-lg font-extrabold tracking-tight mb-2 transition-colors duration-150 ${
            hovered ? "text-slate-900" : "text-slate-800"
          }`}
        >
          {mode.title}
        </h2>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed">
          {mode.description}
        </p>
      </div>

      {/* Bottom row */}
      <div className="mt-5">
        {/* Progress bar */}
        {mode.progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase">
                Progress
              </span>
              <span className={`text-[0.65rem] font-bold ${accent.text}`}>
                {mode.progress}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${accent.progressBar} rounded-full transition-all duration-700`}
                style={{ width: `${mode.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-bold tracking-wide flex items-center gap-1.5 transition-opacity duration-200 ${accent.text} ${hovered ? "opacity-100" : "opacity-50"}`}
          >
            {mode.locked ? "LOCKED" : "ENTER"}
            {!mode.locked && (
              <span
                className="inline-block transition-transform duration-200"
                style={{ transform: hovered ? "translateX(4px)" : "translateX(0)" }}
              >
                →
              </span>
            )}
          </span>

          {mode.plays !== undefined && (
            <span className="text-xs text-slate-400 font-medium">
              {mode.plays.toLocaleString()} plays
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (mode.locked) return cardContent;

  return (
    <Link href={mode.href} className="no-underline">
      {cardContent}
    </Link>
  );
}
