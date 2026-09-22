"use client";

/**
 * ChemClash — Interactive Product Tour
 *
 * Route: /tour
 *
 * Shown once to authenticated first-time users after onboarding.
 * After completion (or skip), tour_done is persisted via PUT /auth/me
 * and the user is sent to the Dashboard.
 *
 * Already-toured users (account.tour_done) are redirected to / immediately.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

interface TourStep {
  title: string;
  icon: string;
  body: string;
  route: string;
  routeLabel: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "📚 Curriculum",
    icon: "📚",
    body: "Work through concept slides in order. Each module teaches one key idea — Lewis Structures, Nucleophiles, SN2, and more. Complete modules to unlock Skill Tree nodes. +5 ELO per correct quiz answer.",
    route: "/curriculum",
    routeLabel: "Open Curriculum",
  },
  {
    title: "🎯 Adaptive PYQ",
    icon: "🎯",
    body: "AI matchmaker picks the JEE/NEET Previous Year Questions most relevant to your weak spots. Every wrong answer feeds the weakness engine — next questions adapt instantly.",
    route: "/adaptive-pyq",
    routeLabel: "Try Adaptive PYQ",
  },
  {
    title: "⚗️ React or Reject",
    icon: "⚗️",
    body: "Swipe right if two species will react, left if they won't. Train your chemical intuition under time pressure. Uses the full challenge bank of nucleophile–electrophile pairs.",
    route: "/react-or-reject",
    routeLabel: "Play React or Reject",
  },
  {
    title: "🧬 Mechanism Builder",
    icon: "🧬",
    body: "Draw curved electron arrows on an interactive canvas to build reaction mechanisms step by step. Switch to Pathway Lab mode for a guided 3-step pathway challenge (+10 ELO for perfect runs).",
    route: "/mechanism-builder",
    routeLabel: "Open Mechanism Builder",
  },
  {
    title: "🎬 Watch & Execute",
    icon: "🎬",
    body: "Watch a reaction animate in real time, pause at the key step, predict the mechanism, then see instant feedback. Covers SN2, SN1, E2, EAS, and more.",
    route: "/watch-execute",
    routeLabel: "Watch a Reaction",
  },
  {
    title: "📸 Snap-to-Solve",
    icon: "📸",
    body: "Upload a photo of any chemistry question or notebook page. Your AI mentor identifies your first questionable step and asks a Socratic guiding question — no answer given, learning enforced.",
    route: "/snap-to-solve",
    routeLabel: "Open Snap-to-Solve",
  },
  {
    title: "🌳 Skill Tree",
    icon: "🌳",
    body: "Visual mastery map — 17 concepts across 3 tiers (Basics → Intermediate → Advanced). Complete Curriculum modules to turn nodes from locked to mastered. Progress is permanently saved to your account.",
    route: "/skill-tree",
    routeLabel: "View Skill Tree",
  },
  {
    title: "⚡ Tutor Shorts",
    icon: "⚡",
    body: "One chemistry concept per card — tip, key fact, and a common exam mistake to avoid. Your weakest concepts always surface first. Practice CTA routes directly to Adaptive PYQ.",
    route: "/tutor-shorts",
    routeLabel: "Browse Tutor Shorts",
  },
  {
    title: "🎬 Video Recommendations",
    icon: "🎬",
    body: "Personalised YouTube search links curated to your exact weakness profile. No API key needed — works with any browser. Updates as your weakness profile evolves.",
    route: "/video-recommendations",
    routeLabel: "See Recommendations",
  },
  {
    title: "⚔️ Practice Arena",
    icon: "⚔️",
    body: "Solo 5-question match against the PYQ bank. 30-second timer per question. Every correct answer earns +12 ELO, every wrong answer costs −6. Missed concepts go straight into your weakness profile.",
    route: "/duel",
    routeLabel: "Enter Practice Arena",
  },
  {
    title: "🧬 Living Molecules",
    icon: "🧬",
    body: "Watch molecular entities come to life with personality dialogue — nucleophiles, electrophiles, and carbocations animate through SN1, SN2, E1, E2, and carbocation formation.",
    route: "/living-molecules",
    routeLabel: "See Living Molecules",
  },
  {
    title: "🪙 ChemCoins & Rewards",
    icon: "🪙",
    body: "Earn ChemCoins from the Daily Login mission (+1) and completing Daily Challenges (+10). Spend them in the Reward Shop to unlock focused practice packs, revision sessions, and video playlists.",
    route: "/rewards",
    routeLabel: "Open Reward Shop",
  },
  {
    title: "📦 Exchange & Resources",
    icon: "📦",
    body: "Browse chemistry books, notes, and revision sheets in the Exchange MVP. Discover personalised book and resource recommendations in Resources — both personalised to your weakness profile.",
    route: "/exchange",
    routeLabel: "Browse Exchange",
  },
];

export default function TourPage() {
  const router        = useRouter();
  const account       = useAuthStore((s) => s.account);
  const initialized   = useAuthStore((s) => s.initialized);
  const updateAccount = useAuthStore((s) => s.updateAccount);

  const [idx,     setIdx]     = useState(0);
  const [saving,  setSaving]  = useState(false);

  // Auth guard + already-toured redirect
  useEffect(() => {
    if (!initialized) return;
    if (!account) { router.replace("/login"); return; }
    if (account.tour_done)  { router.replace("/"); return; }
    // If they somehow skipped onboarding, redirect there first
    if (!account.onboarding_done) { router.replace("/onboarding"); return; }
  }, [initialized, account, router]);

  const step     = TOUR_STEPS[idx];
  const isFirst  = idx === 0;
  const isLast   = idx === TOUR_STEPS.length - 1;

  async function finish() {
    setSaving(true);
    try {
      await updateAccount({ tour_done: true });
    } catch { /* non-fatal */ }
    router.replace("/");
  }

  async function skip() {
    setSaving(true);
    try {
      await updateAccount({ tour_done: true });
    } catch { /* non-fatal */ }
    router.replace("/");
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!account || account.tour_done) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-7">

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx ? "w-5 h-2 bg-emerald-500" : i < idx ? "w-2 h-2 bg-emerald-300" : "w-2 h-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-widest text-center mb-4">
          Feature {idx + 1} of {TOUR_STEPS.length}
        </p>

        {/* Icon + title */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{step.icon}</div>
          <h3 className="text-xl font-black text-slate-900">{step.title}</h3>
        </div>

        {/* Body */}
        <p className="text-sm text-slate-600 leading-relaxed mb-6 text-center">{step.body}</p>

        {/* Route preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Try it out:</span>
          <Link
            href={step.route}
            className="text-xs font-bold text-violet-700 hover:text-violet-900 no-underline transition-colors"
          >
            {step.routeLabel} →
          </Link>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {!isFirst && (
            <button
              onClick={() => setIdx((i) => i - 1)}
              className="flex-1 border border-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={isLast ? finish : () => setIdx((i) => i + 1)}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {saving ? "…" : isLast ? "🚀 Go to Dashboard!" : "Next →"}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={skip}
          disabled={saving}
          className="mt-4 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
