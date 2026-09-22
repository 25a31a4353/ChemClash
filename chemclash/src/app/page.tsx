"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import GameModeCard, { GameMode } from "@/components/GameModeCard";
import CheatSheetDownloader from "@/components/CheatSheetDownloader";
import { useChemStore } from "@/store/useChemStore";
import { LS_ONBOARDING_DONE, LS_USER_NAME } from "@/app/onboarding/page";

// ── localStorage key for activity log ────────────────────────────────────
const LS_ACTIVITY_LOG = "chemclash_activity_log";

/** Record a visit timestamp (called on Dashboard mount). */
function recordActivity() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_ACTIVITY_LOG);
    const log: number[] = raw ? JSON.parse(raw) : [];
    const today = Math.floor(Date.now() / 86400000); // days since epoch
    if (!log.includes(today)) {
      log.push(today);
      // Keep only last 400 days
      const trimmed = log.sort((a, b) => a - b).slice(-400);
      localStorage.setItem(LS_ACTIVITY_LOG, JSON.stringify(trimmed));
    }
  } catch { /* ignore */ }
}

/** Read activity days and build a 53×7 grid. */
function buildRealYearGrid(): number[][] {
  const today = Math.floor(Date.now() / 86400000);
  const activeDays = new Set<number>();
  try {
    const raw = localStorage.getItem(LS_ACTIVITY_LOG);
    if (raw) (JSON.parse(raw) as number[]).forEach((d) => activeDays.add(d));
  } catch { /* ignore */ }

  // Find the Monday of the week 52 weeks ago
  const todayDate = new Date();
  const dayOfWeek = (todayDate.getDay() + 6) % 7; // 0=Mon
  const startEpochDay = today - dayOfWeek - 52 * 7;

  const weeks: number[][] = [];
  for (let w = 0; w < 53; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const epochDay = startEpochDay + w * 7 + d;
      week.push(activeDays.has(epochDay) ? 3 : 0);
    }
    weeks.push(week);
  }
  return weeks;
}

const GAME_MODES: GameMode[] = [
  {
    id: "living-molecules",
    title: "Living Molecules",
    level: "VISUALIZE",
    description:
      "Watch molecular entities come to life — nucleophiles, electrophiles, carbocations, and leaving groups animate through SN1, SN2, E1, and E2 with personality dialogue.",
    icon: "🧬",
    href: "/living-molecules",
    accentColor: "violet",
    badge: "NEW",
    plays: 0,
  },
  {
    id: "exchange",
    title: "ChemClash Exchange",
    level: "MVP",
    description:
      "Browse educational materials — books, notes, revision sheets, and reaction cheat sheets. Mark listings as Interested and explore the Exchange MVP.",
    icon: "📦",
    href: "/exchange",
    accentColor: "amber",
    badge: "NEW",
    plays: 0,
  },
  {
    id: "rewards",
    title: "Reward Shop",
    level: "CHEMCOINS",
    description:
      "Spend your ChemCoins to unlock bonus practice packs, revision sessions, and concept challenges. Earn coins from Daily Missions.",
    icon: "🪙",
    href: "/rewards",
    accentColor: "amber",
    badge: "SHOP",
    plays: 0,
  },
  {
    id: "tutor-shorts",
    title: "Tutor Shorts",
    level: "MICRO-LEARN",
    description:
      "One chemistry concept per card — tip, key fact, and a common exam mistake. Weak concepts surface first. Practice CTA routes to Adaptive PYQ.",
    icon: "⚡",
    href: "/tutor-shorts",
    accentColor: "violet",
    badge: "NEW",
    plays: 0,
  },
  {
    id: "video-recommendations",
    title: "Video Recommendations",
    level: "LEARN NEXT",
    description:
      "Personalised chemistry video picks based on your top weaknesses. YouTube search links curated to your exact concept gaps — no API key needed.",
    icon: "🎬",
    href: "/video-recommendations",
    accentColor: "violet",
    badge: "PERSONALISED",
    plays: 0,
  },
  {
    id: "snap-to-solve",
    title: "Snap-to-Solve",
    level: "AI TUTOR",
    description:
      "Upload a photo of any chemistry question or notebook reaction. The AI mentor identifies your first wrong step and asks a Socratic guiding question — no answer given.",
    icon: "📸",
    href: "/snap-to-solve",
    accentColor: "violet",
    badge: "NEW",
    plays: 0,
  },
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
    badge: "AI-POWERED",
    plays: 0,
  },
  {
    id: "1v1-duel",
    title: "Practice Arena",
    level: "RANKED",
    description:
      "Solo 5-question match against the PYQ bank. Earn ELO on every correct answer, track accuracy, and see which concepts you need to review. Ranked 1v1 coming soon.",
    icon: "⚔️",
    href: "/duel",
    accentColor: "amber",
    badge: "SOLO ARENA",
    plays: 0,
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
    id: "skill-tree",
    title: "Skill Tree",
    level: "MASTERY",
    description:
      "Track your organic chemistry mastery across all 17 concepts. Basics unlock first; intermediate and advanced nodes unlock as you complete earlier tiers.",
    icon: "🌳",
    href: "/skill-tree",
    accentColor: "emerald",
    badge: "TRACK PROGRESS",
    plays: 0,
  },
  {
    id: "watch-execute",
    title: "Watch & Execute",
    level: "LEVEL 1.5",
    description:
      "Watch a reaction animate in real time, pause at the critical step, predict the mechanism or outcome, then see instant feedback with a full explanation.",
    icon: "🎬",
    href: "/watch-execute",
    accentColor: "amber",
    badge: "NEW",
    plays: 0,
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
  {
    id: "resources",
    title: "Resource Library",
    level: "REFERENCE",
    description:
      "Personalised Organic Chemistry book and resource recommendations matched to your exact weakness profile — textbooks, notes, revision sheets, and practice packs.",
    icon: "📖",
    href: "/resources",
    accentColor: "emerald",
    badge: "PERSONALISED",
    plays: 0,
  },
];

// ── Yearly activity heatmap ────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Which week index each month label should appear at (approx 4.33 weeks/month) */
const MONTH_WEEK_STARTS = MONTHS.map((_, i) => Math.round(i * (52 / 12)));

/** Colour for each intensity level — ChemClash violet/emerald theme */
function heatColor(v: number): string {
  switch (v) {
    case 0: return "#f1f5f9"; // slate-100 — empty
    case 1: return "#c4b5fd"; // violet-300
    case 2: return "#7c3aed"; // violet-600
    case 3: return "#059669"; // emerald-600
    case 4: return "#047857"; // emerald-700 — peak
    default: return "#f1f5f9";
  }
}

// ── Daily Missions card ────────────────────────────────────────────────────

interface Mission {
  label: string;
  reward: string;
  claimed: boolean;
  onClaim: () => void;
}

function MissionRow({ label, reward, claimed, onClaim }: Mission) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-base leading-none ${claimed ? "opacity-40" : ""}`}>
          {claimed ? "✅" : "🎯"}
        </span>
        <span className={`text-sm font-medium truncate ${claimed ? "text-slate-400 line-through" : "text-slate-700"}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          +{reward} 🪙
        </span>
        {!claimed && (
          <button
            onClick={onClaim}
            className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors rounded-full px-3 py-1"
          >
            Claim
          </button>
        )}
        {claimed && (
          <span className="text-xs font-medium text-slate-400">Done</span>
        )}
      </div>
    </div>
  );
}

// ── Recommendation logic ───────────────────────────────────────────────────

interface Recommendation {
  concept: string;
  reason: string;
  label: string;
  href: string;
  // Full Tailwind class strings (must be static for JIT to include them)
  classes: {
    border: string;
    bg: string;
    titleText: string;
    btnBg: string;
    btnHover: string;
  };
}

/**
 * Map concept tags (as they appear in the backend weakness profile) to the
 * most appropriate in-app learning destination.
 * Mechanism-related tags → Mechanism Builder.
 * Everything else → Adaptive PYQ (practice) unless it's a pure theory concept
 * that maps to a Curriculum module.
 */
// Static Tailwind class bundles — must be complete strings for JIT
const BLUE_CLASSES = {
  border: "border-blue-100",
  bg: "bg-blue-50",
  titleText: "text-blue-700",
  btnBg: "bg-blue-600",
  btnHover: "hover:bg-blue-700",
};
const VIOLET_CLASSES = {
  border: "border-violet-100",
  bg: "bg-violet-50",
  titleText: "text-violet-700",
  btnBg: "bg-violet-600",
  btnHover: "hover:bg-violet-700",
};

interface RouteEntry { href: string; label: string; classes: typeof BLUE_CLASSES }

const MECHANISM_ENTRY: RouteEntry = {
  href: "/mechanism-builder",
  label: "Practice in Mechanism Builder",
  classes: BLUE_CLASSES,
};
const CURRICULUM_ENTRY: RouteEntry = {
  href: "/curriculum",
  label: "Review in Curriculum",
  classes: VIOLET_CLASSES,
};
const PYQ_ENTRY: RouteEntry = {
  href: "/adaptive-pyq",
  label: "Practice with Adaptive PYQ",
  classes: VIOLET_CLASSES,
};

const CONCEPT_ROUTE_MAP: Record<string, RouteEntry> = {
  // Mechanism concepts → Mechanism Builder
  "sn2":                MECHANISM_ENTRY,
  "sn1":                MECHANISM_ENTRY,
  "e2":                 MECHANISM_ENTRY,
  "e1":                 MECHANISM_ENTRY,
  "addition":           MECHANISM_ENTRY,
  "eas":                MECHANISM_ENTRY,
  "nas":                MECHANISM_ENTRY,
  "carbocation":        MECHANISM_ENTRY,
  "carbocation shifts": MECHANISM_ENTRY,
  "rearrangement":      MECHANISM_ENTRY,
  "nucleophilic":       MECHANISM_ENTRY,
  "electrophilic":      MECHANISM_ENTRY,
  // Theory concepts → Curriculum
  "aromaticity":        CURRICULUM_ENTRY,
  "stereochemistry":    CURRICULUM_ENTRY,
  "chirality":          CURRICULUM_ENTRY,
  "hybridisation":      CURRICULUM_ENTRY,
  "hybridization":      CURRICULUM_ENTRY,
  "resonance":          CURRICULUM_ENTRY,
  "inductive effect":   CURRICULUM_ENTRY,
  "acidity":            CURRICULUM_ENTRY,
  "basicity":           CURRICULUM_ENTRY,
};

const DEFAULT_REC: Recommendation = {
  concept: "Organic Chemistry Fundamentals",
  reason: "Start with the core concepts to build a strong foundation.",
  label: "Start Learning",
  href: "/curriculum",
  classes: VIOLET_CLASSES,
};

function getRecommendation(topWeaknesses: string[]): Recommendation {
  for (const tag of topWeaknesses) {
    const key = tag.toLowerCase().trim();
    const entry =
      CONCEPT_ROUTE_MAP[key] ??
      Object.entries(CONCEPT_ROUTE_MAP).find(
        ([k]) => key.includes(k) || k.includes(key)
      )?.[1];
    if (entry) {
      return {
        concept: tag,
        reason: `You've been losing ELO on ${tag} questions. Time to fix it.`,
        label: entry.label,
        href: entry.href,
        classes: entry.classes,
      };
    }
  }
  if (topWeaknesses.length > 0) {
    return {
      concept: topWeaknesses[0],
      reason: "Your weakest concept right now. Practice targeted PYQ questions.",
      label: PYQ_ENTRY.label,
      href: PYQ_ENTRY.href,
      classes: PYQ_ENTRY.classes,
    };
  }
  return DEFAULT_REC;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

// ── Tour steps ─────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  { title: "🎯 Adaptive PYQ",         body: "AI picks JEE questions matched to YOUR weak spots. Answer, get Socratic feedback, fix the gap." },
  { title: "📚 Curriculum",           body: "Work through concept slides in order. Complete a module to unlock the Skill Tree node." },
  { title: "🌳 Skill Tree",           body: "Visual mastery map — complete Curriculum modules to turn locked nodes green." },
  { title: "⚡ Tutor Shorts",         body: "One concept per card — tip, key fact, and a common mistake. Weak topics surface first." },
  { title: "🎬 Video Recommendations",body: "Personalised YouTube links based on your exact weakness profile." },
  { title: "⚔️ Practice Arena",       body: "5-question solo match with a countdown timer. Every correct answer earns ELO." },
  { title: "⚗️ React or Reject",      body: "Swipe right to REACT, left to REJECT. Train chemical intuition under time pressure." },
  { title: "🪙 Reward Shop",          body: "Earn ChemCoins from Daily Missions. Spend them to unlock practice packs and bonus sessions." },
];

const LS_TOUR_DONE = "chemclash_tour_done";

function TourOverlay({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const step = TOUR_STEPS[idx];
  const isLast = idx === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-7 text-center">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {TOUR_STEPS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all ${i === idx ? "w-5 h-2 bg-emerald-500" : i < idx ? "w-2 h-2 bg-emerald-300" : "w-2 h-2 bg-slate-200"}`} />
          ))}
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-3">{step.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-8">{step.body}</p>
        <div className="flex gap-3">
          {idx > 0 && (
            <button onClick={() => setIdx(i => i - 1)} className="flex-1 border border-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              ← Back
            </button>
          )}
          <button
            onClick={() => { if (isLast) { localStorage.setItem(LS_TOUR_DONE, "1"); onDone(); } else setIdx(i => i + 1); }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {isLast ? "🚀 Start Playing!" : "Next →"}
          </button>
        </div>
        <button onClick={() => { localStorage.setItem(LS_TOUR_DONE, "1"); onDone(); }} className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Skip tour
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router                 = useRouter();
  const eloRating              = useChemStore((s) => s.eloRating);
  const dailyStreak            = useChemStore((s) => s.dailyStreak);
  const username               = useChemStore((s) => s.username);
  const chemCoins              = useChemStore((s) => s.chemCoins);
  const dailyMissions          = useChemStore((s) => s.dailyMissions);
  const claimLoginReward       = useChemStore((s) => s.claimLoginReward);
  const claimDailyChallengeReward = useChemStore((s) => s.claimDailyChallengeReward);
  const profile                = useChemStore((s) => s.profile);
  const refreshProfile         = useChemStore((s) => s.refreshProfile);
  const loadPlayerProfile      = useChemStore((s) => s.loadPlayerProfile);

  const [showTour, setShowTour]     = useState(false);
  const [yearGrid, setYearGrid]     = useState<number[][]>([]);
  const [yearTotal, setYearTotal]   = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  // Redirect first-time visitors to onboarding; hydrate state from localStorage.
  useEffect(() => {
    if (localStorage.getItem(LS_ONBOARDING_DONE) !== "1") {
      router.replace("/onboarding");
      return;
    }
    // Hydrate username from localStorage on every mount
    const savedName = localStorage.getItem(LS_USER_NAME);
    if (savedName)  useChemStore.setState({ username: savedName });
    // Record today's activity and build the real heatmap
    recordActivity();
    const grid = buildRealYearGrid();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrating heatmap from localStorage
    setYearGrid(grid);
    setYearTotal(grid.flat().filter((v) => v > 0).length);
    setActiveDays(grid.flat().filter((v) => v > 0).length);
    // Show tour on first login (after onboarding)
    if (localStorage.getItem(LS_TOUR_DONE) !== "1") {
      setShowTour(true);
    }
  }, [router]);

  // Hydrate coins + attempt auto-claim login reward on mount (client-only).
  // loadPlayerProfile + refreshProfile run in parallel — saves one round-trip.
  useEffect(() => {
    claimLoginReward();
    Promise.all([loadPlayerProfile(), refreshProfile()]).catch(() => {});
  }, [claimLoginReward, loadPlayerProfile, refreshProfile]);

  const rec = getRecommendation(profile?.top_weaknesses ?? []);

  function handleLogout() {
    localStorage.removeItem(LS_ONBOARDING_DONE);
    localStorage.removeItem(LS_USER_NAME);
    localStorage.removeItem("chemclash_user_id");
    localStorage.removeItem(LS_TOUR_DONE);
    useChemStore.setState({ username: "player", userId: "", profile: null, eloRating: 1200, dailyStreak: 0 });
    router.replace("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {showTour && <TourOverlay onDone={() => setShowTour(false)} />}
      <TopNav eloRating={eloRating} dailyStreak={dailyStreak} username={username} onLogout={handleLogout} />

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
            <span className="text-emerald-600 font-bold">{eloRating}</span>
            {profile?.total_answered
              ? <> · <span className="text-blue-600 font-bold">{Math.round(profile.accuracy * 100)}%</span> accuracy · Keep reacting.</>
              : <> · Start practicing to build your profile.</>
            }
          </p>

          {/* Stats bar — 5 cols on sm+, 2 on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Reactions Attempted — live from weakness profile */}
            <div className="animate-slide-up delay-100 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm">
              <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                Reactions Attempted
              </div>
              <div className="text-2xl font-black text-emerald-600 leading-none">
                {profile?.total_answered ?? "—"}
              </div>
            </div>
            {/* Accuracy Rate — live from weakness profile */}
            <div className="animate-slide-up delay-200 bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm">
              <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                Accuracy Rate
              </div>
              <div className="text-2xl font-black text-blue-600 leading-none">
                {profile != null ? `${Math.round(profile.accuracy * 100)}%` : "—"}
              </div>
            </div>
            {/* Best Streak — live from store (hydrated by loadPlayerProfile) */}
            <div className="animate-slide-up delay-300 bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm">
              <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                Daily Streak
              </div>
              <div className="text-2xl font-black text-amber-600 leading-none">
                {dailyStreak > 0 ? `${dailyStreak}d` : "—"}
              </div>
            </div>
            {/* ELO Rating — live from store */}
            <div className="animate-slide-up delay-400 bg-white border border-slate-200 hover:border-violet-300 rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm">
              <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                ELO Rating
              </div>
              <div className="text-2xl font-black text-violet-600 leading-none">
                {eloRating}
              </div>
            </div>
            {/* ChemCoins tile — live from store */}
            <div className="animate-slide-up delay-500 bg-white border border-amber-200 hover:border-amber-300 rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-sm">
              <div className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                ChemCoins
              </div>
              <div className="text-2xl font-black text-amber-500 leading-none">
                🪙 {chemCoins}
              </div>
            </div>
          </div>
        </div>

        {/* ── Daily Missions card ── */}
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Daily Missions</span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              🪙 {chemCoins} ChemCoins
            </span>
          </div>
          <MissionRow
            label="Daily Login"
            reward="1"
            claimed={dailyMissions.loginClaimed}
            onClaim={claimLoginReward}
          />
          <MissionRow
            label="Complete Daily Challenge"
            reward="10"
            claimed={dailyMissions.challengeClaimed}
            onClaim={claimDailyChallengeReward}
          />
        </div>

        {/* ── Recommended for You ── */}
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Recommended for You</span>
          </div>
          <div className={`flex items-start justify-between gap-4 flex-wrap rounded-lg border px-4 py-3 ${rec.classes.border} ${rec.classes.bg}`}>
            <div className="min-w-0">
              <p className={`text-sm font-bold mb-0.5 ${rec.classes.titleText}`}>{rec.concept}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{rec.reason}</p>
            </div>
            <a
              href={rec.href}
              className={`shrink-0 inline-flex items-center text-xs font-semibold text-white transition-colors rounded-lg px-4 py-2 no-underline ${rec.classes.btnBg} ${rec.classes.btnHover}`}
            >
              {rec.label} →
            </a>
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

        {/* ── Yearly Activity Heatmap ── */}
        <div className="mt-12 bg-white border border-slate-200 rounded-xl p-6 animate-fade-in overflow-x-auto">

          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5 min-w-[560px]">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">{yearTotal}</span>
              <span className="text-xs text-slate-500 font-medium">active days in the past year</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-xs text-slate-500">
                Active days: <span className="font-bold text-slate-700">{activeDays}</span>
              </span>
              <span className="text-xs text-slate-500">
                Streak: <span className="font-bold text-emerald-600">{dailyStreak}d</span>
              </span>
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="min-w-[560px]">

            {/* Month labels */}
            <div className="flex mb-1.5 pl-6">
              {MONTHS.map((m, mi) => {
                const weekIdx = MONTH_WEEK_STARTS[mi];
                return (
                  <div
                    key={m}
                    className="text-[0.6rem] font-semibold text-slate-400 uppercase tracking-wide"
                    style={{ position: "relative", left: `calc(${weekIdx} * (10px + 2px))`, marginRight: 0, width: 0, whiteSpace: "nowrap" }}
                  >
                    {m}
                  </div>
                );
              })}
            </div>

            {/* Day-of-week labels + cell grid */}
            <div className="flex gap-0.5 items-start">
              {/* Day labels column */}
              <div className="flex flex-col gap-0.5 mr-1.5" style={{ paddingTop: 0 }}>
                {["Mon","","Wed","","Fri","","Sun"].map((d, i) => (
                  <div key={i} className="text-[0.55rem] text-slate-400 font-medium leading-none" style={{ height: 10, lineHeight: "10px" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              <div className="flex gap-0.5">
                {yearGrid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((val, di) => (
                      <div
                        key={di}
                        title={val > 0 ? "Active" : "No activity"}
                        className="rounded-sm transition-opacity hover:opacity-75"
                        style={{
                          width:  10,
                          height: 10,
                          backgroundColor: heatColor(val),
                          border: val === 0 ? "1px solid #e2e8f0" : "none",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
              <span className="text-[0.6rem] text-slate-400 font-medium">Less</span>
              {[0,1,2,3,4].map((v) => (
                <div
                  key={v}
                  className="rounded-sm"
                  style={{
                    width: 10, height: 10,
                    backgroundColor: heatColor(v),
                    border: v === 0 ? "1px solid #e2e8f0" : "none",
                  }}
                />
              ))}
              <span className="text-[0.6rem] text-slate-400 font-medium">More</span>
            </div>
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
