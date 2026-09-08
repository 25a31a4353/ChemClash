"use client";

import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

const FEATURES = [
  {
    icon: "🎯",
    title: "Weakness-Targeted Questions",
    description:
      "Every question is chosen by analysing your performance history and surfacing the concept where you drop the most ELO.",
  },
  {
    icon: "🤖",
    title: "AI Matchmaker",
    description:
      "A language model ranks candidates from the verified PYQ bank — no hallucinations, no invented questions.",
  },
  {
    icon: "📊",
    title: "Weakness Radar",
    description:
      "A live sidebar tracks your error rate per concept tag (SN2, EAS, carbocation shifts…) so you can see exactly where to focus.",
  },
  {
    icon: "⚡",
    title: "Adaptive ELO",
    description:
      "Correct answers on hard concepts earn bonus ELO; wrong answers boost the weakness score so the matchmaker targets that gap harder.",
  },
];

export default function AdaptivePYQPage() {
  const eloRating = useChemStore((s) => s.eloRating);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-violet-600 text-xs font-semibold tracking-wide uppercase">Adaptive PYQ</span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-16 text-center">

        {/* Coming Soon badge */}
        <span className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
          🚧 Coming Soon
        </span>

        {/* Headline */}
        <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4">
          Adaptive PYQ <span className="text-violet-600">Matchmaker</span>
        </h1>

        <p className="text-base text-slate-600 leading-relaxed mb-3">
          We're wiring up the AI backend that personalises JEE Previous Year Questions
          to your exact weakness profile in real time.
        </p>
        <p className="text-sm text-slate-400 mb-12">
          No hallucinations — every question will come from the verified PYQ bank.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-12">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-extrabold text-slate-800 mb-1">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Build Progress</span>
            <span className="text-xs font-bold text-violet-600">70%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" style={{ width: "70%" }} />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Backend API ✓ &nbsp;·&nbsp; Question bank ✓ &nbsp;·&nbsp; AI matchmaker ✓ &nbsp;·&nbsp; Frontend integration 🔧
          </p>
        </div>

        {/* CTA */}
        <Link href="/" className="no-underline">
          <button className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3 rounded-xl text-sm tracking-wide transition-colors shadow-sm">
            ← Back to Dashboard
          </button>
        </Link>

      </main>
    </div>
  );
}
