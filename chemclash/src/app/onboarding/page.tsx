"use client";

/**
 * ChemClash — First-Visit Onboarding (3 steps)
 *
 * Step 1 — Your Identity  : first-name input
 * Step 2 — Your Level     : single-select learning level
 * Step 3 — Your Goals     : multi-select goals
 *
 * Completion is persisted to localStorage under "chemclash_onboarding_done".
 * Preferences are stored under "chemclash_onboarding_prefs".
 * After completion or skip, the user is routed to the Dashboard ("/").
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChemStore } from "@/store/useChemStore";

// ── localStorage keys ─────────────────────────────────────────────────────

export const LS_ONBOARDING_DONE  = "chemclash_onboarding_done";
export const LS_ONBOARDING_PREFS = "chemclash_onboarding_prefs";

export interface OnboardingPrefs {
  firstName: string;
  level: string;
  goals: string[];
}

// ── Step 2 — level options ────────────────────────────────────────────────

interface LevelOption {
  id: string;
  label: string;
  sub: string;
  icon: string;
}

const LEVELS: LevelOption[] = [
  { id: "high_school",  label: "High School",            sub: "Building the basics (Grades 9–12)",                       icon: "🎓" },
  { id: "college",      label: "College",                 sub: "Undergraduate (B.Tech / B.Sc. / B.Pharm etc.)",           icon: "🏛️" },
  { id: "graduate",     label: "Graduate",                sub: "Masters / PhD (Advanced learning)",                       icon: "🔬" },
  { id: "jee",          label: "JEE / Competitive Exams", sub: "JEE, BITSAT and other engineering entrances",             icon: "🎯" },
  { id: "neet",         label: "NEET / Medical",          sub: "Medical entrance preparation (NEET / AIIMS etc.)",        icon: "🩺" },
  { id: "other",        label: "Other",                   sub: "Self learner, hobbyist or professional",                  icon: "💬" },
];

// ── Step 3 — goal options ─────────────────────────────────────────────────

interface GoalOption {
  id: string;
  label: string;
  sub: string;
  icon: string;
}

const GOALS: GoalOption[] = [
  { id: "reactions",    label: "Reactions & Mechanisms",     sub: "Understand how and why reactions happen",                   icon: "⚗️" },
  { id: "named",        label: "Named Reactions",            sub: "Master important named reactions",                          icon: "🧪" },
  { id: "pyqs",         label: "Organic Chemistry PYQs",    sub: "Practice past year questions with detailed solutions",      icon: "📋" },
  { id: "visual",       label: "Concepts & Visual Learning", sub: "Build strong conceptual clarity with visual content",      icon: "💡" },
  { id: "exam",         label: "Exam Preparation",           sub: "Get ready for JEE, NEET and other competitive exams",      icon: "📝" },
  { id: "everything",   label: "Everything",                 sub: "A complete organic chemistry learning experience",          icon: "∞" },
];

// ── Progress stepper ──────────────────────────────────────────────────────

const STEP_LABELS = ["Your Identity", "Your Level", "Your Goals"];

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_LABELS.map((label, i) => {
        const idx      = i + 1;
        const done     = idx < step;
        const active   = idx === step;
        return (
          <div key={label} className="flex items-center gap-1">
            {/* circle */}
            <div className="flex flex-col items-center gap-1">
              <div className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                done   ? "bg-violet-600 border-violet-600 text-white"    :
                active ? "bg-violet-600 border-violet-600 text-white"    :
                         "bg-white border-slate-300 text-slate-400",
              ].join(" ")}>
                {done ? "✓" : idx}
              </div>
              <span className={[
                "text-[0.6rem] font-semibold whitespace-nowrap",
                active ? "text-violet-700 font-bold" : done ? "text-violet-500" : "text-slate-400",
              ].join(" ")}>
                {label}
              </span>
            </div>
            {/* connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div className={[
                "w-12 sm:w-20 h-0.5 mb-4 rounded-full transition-all",
                idx < step ? "bg-violet-500" : "bg-slate-200",
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ChemClash logo wordmark ────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2">
      {/* hex icon */}
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#7c3aed" opacity="0.15"/>
        <polygon points="16,5 25,10.5 25,21.5 16,27 7,21.5 7,10.5" fill="none" stroke="#7c3aed" strokeWidth="1.5"/>
        <text x="16" y="21" textAnchor="middle" fontSize="11" fontWeight="900" fill="#7c3aed" fontFamily="system-ui">C</text>
      </svg>
      <div>
        <div className="text-sm font-black tracking-tight leading-none">
          <span className="text-slate-900">Chem</span><span className="text-violet-600">Clash</span>
        </div>
        <div className="text-[0.5rem] tracking-widest text-slate-400 uppercase font-semibold leading-none mt-0.5">
          Learn · Practice · Master
        </div>
      </div>
    </div>
  );
}

// ── Decorative molecule SVG ────────────────────────────────────────────────

function MoleculeDeco({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden>
      {/* bonds */}
      <line x1="100" y1="60"  x2="140" y2="100" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
      <line x1="140" y1="100" x2="100" y2="140" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
      <line x1="100" y1="140" x2="60"  y2="100" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
      <line x1="60"  y1="100" x2="100" y2="60"  stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
      <line x1="100" y1="60"  x2="100" y2="20"  stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      <line x1="140" y1="100" x2="175" y2="85"  stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      <line x1="100" y1="140" x2="100" y2="178" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      <line x1="60"  y1="100" x2="25"  y2="115" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      {/* atoms */}
      <circle cx="100" cy="60"  r="14" fill="#7c3aed" opacity="0.85"/>
      <circle cx="140" cy="100" r="14" fill="#7c3aed" opacity="0.85"/>
      <circle cx="100" cy="140" r="14" fill="#7c3aed" opacity="0.85"/>
      <circle cx="60"  cy="100" r="14" fill="#7c3aed" opacity="0.85"/>
      <circle cx="100" cy="20"  r="9"  fill="#a78bfa" opacity="0.7"/>
      <circle cx="175" cy="85"  r="9"  fill="#a78bfa" opacity="0.7"/>
      <circle cx="100" cy="178" r="9"  fill="#a78bfa" opacity="0.7"/>
      <circle cx="25"  cy="115" r="9"  fill="#a78bfa" opacity="0.7"/>
      {/* labels */}
      <text x="100" y="64"  textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="monospace">C</text>
      <text x="140" y="104" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="monospace">C</text>
      <text x="100" y="144" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="monospace">C</text>
      <text x="60"  y="104" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="monospace">C</text>
    </svg>
  );
}

// ── Step 1 — Your Identity ────────────────────────────────────────────────

function Step1({
  firstName, setFirstName, onContinue, onSkip,
}: {
  firstName: string;
  setFirstName: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-screen">

      {/* ── Left panel ── */}
      <div className="flex-1 flex flex-col px-8 sm:px-14 py-10 max-w-2xl">
        <p className="text-[0.65rem] font-bold tracking-widest text-violet-600 uppercase mb-5">
          Let's get started
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
          What should we call you?
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-10">
          A small step for you, a smarter learning experience ahead.<br/>
          We'll use this to personalise your journey in ChemClash.
        </p>

        {/* Input */}
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2 block">
          First name
        </label>
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3z"/>
            </svg>
          </span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && firstName.trim() && onContinue()}
            placeholder="Enter your first name"
            autoFocus
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>

        <button
          onClick={onContinue}
          disabled={!firstName.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Continue →
        </button>

        {/* Quote */}
        <div className="mt-10 bg-violet-50 border border-violet-100 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-violet-400 text-xl leading-none mt-0.5">"</span>
          <div>
            <p className="text-sm font-medium text-slate-700">Same molecules. A smarter you.</p>
            <p className="text-xs text-slate-400 mt-1">— ChemClash</p>
          </div>
        </div>
      </div>

      {/* ── Right decorative panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-gradient-to-br from-violet-50 via-blue-50 to-white relative overflow-hidden px-12">
        <MoleculeDeco className="w-56 h-56 opacity-90" />
        <div className="absolute top-16 right-16 text-right">
          <p className="text-violet-400 font-black text-lg leading-tight italic">Small Steps</p>
          <p className="text-violet-600 font-black text-2xl leading-tight italic">Big Reactions</p>
        </div>
        <div className="absolute bottom-24 left-12 text-left">
          <p className="text-violet-500 font-black text-xl leading-tight italic">Learn</p>
          <p className="text-blue-500 font-black text-xl leading-tight italic">React</p>
          <p className="text-violet-600 font-black text-xl leading-tight italic">Grow</p>
        </div>
        {/* faint hexagon bg */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          {[...Array(6)].map((_, i) => (
            <svg key={i} className="absolute" style={{ top: `${10 + i * 14}%`, left: `${5 + i * 12}%`, width: 80, opacity: 0.6 }} viewBox="0 0 80 80">
              <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="#7c3aed" strokeWidth="1.5"/>
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Your Level ───────────────────────────────────────────────────

function Step2({
  selected, setSelected, onContinue, onSkip,
}: {
  selected: string;
  setSelected: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-screen">
      <div className="flex-1 flex flex-col px-8 sm:px-14 py-10 max-w-2xl">
        <p className="text-[0.65rem] font-bold tracking-widest text-violet-600 uppercase mb-5">
          Tell us about yourself
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
          Where are you on your<br className="hidden sm:block"/> organic chemistry journey?
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          This helps us tailor questions, resources and recommendations<br className="hidden sm:block"/> that match your current level.
        </p>

        {/* Level grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {LEVELS.map((lvl) => {
            const active = selected === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelected(lvl.id)}
                className={[
                  "text-left px-4 py-4 rounded-xl border-2 transition-all flex items-start gap-3",
                  active
                    ? "border-violet-500 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40",
                ].join(" ")}
              >
                <span className="text-xl leading-none mt-0.5 flex-shrink-0">{lvl.icon}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-bold leading-snug ${active ? "text-violet-800" : "text-slate-800"}`}>
                    {lvl.label}
                  </div>
                  <div className="text-[0.7rem] text-slate-500 leading-relaxed mt-0.5">{lvl.sub}</div>
                </div>
                {active && (
                  <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onContinue}
          disabled={!selected}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Continue →
        </button>
      </div>

      {/* ── Right decorative panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-gradient-to-br from-violet-50 via-blue-50 to-white relative overflow-hidden px-12">
        {/* flask deco */}
        <svg width="200" height="260" viewBox="0 0 200 260" fill="none" className="opacity-80">
          <rect x="85" y="10" width="30" height="70" rx="6" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2"/>
          <path d="M60 80 L20 220 Q18 240 40 240 L160 240 Q182 240 180 220 L140 80 Z" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2"/>
          <ellipse cx="100" cy="190" rx="45" ry="30" fill="#7c3aed" opacity="0.25"/>
          <circle cx="70"  cy="170" r="8" fill="#7c3aed" opacity="0.5"/>
          <circle cx="120" cy="180" r="6" fill="#a78bfa" opacity="0.6"/>
          <circle cx="90"  cy="200" r="5" fill="#7c3aed" opacity="0.4"/>
        </svg>
        <div className="absolute top-20 right-14 text-right">
          <p className="text-violet-400 font-black text-lg leading-tight italic">Different</p>
          <p className="text-violet-500 font-black text-lg leading-tight italic">Learners</p>
          <p className="text-violet-600 font-black text-xl leading-tight italic">Same Passion</p>
        </div>
        <div className="absolute bottom-20 right-16 text-right">
          <p className="text-blue-400 font-black text-base leading-tight italic">Good Chemistry</p>
          <p className="text-violet-500 font-black text-base leading-tight italic">Brighter Futures</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Your Goals ───────────────────────────────────────────────────

function Step3({
  selected, toggle, onComplete, onSkip,
}: {
  selected: string[];
  toggle: (id: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-screen">
      <div className="flex-1 flex flex-col px-8 sm:px-14 py-10 max-w-2xl">
        <p className="text-[0.65rem] font-bold tracking-widest text-violet-600 uppercase mb-5">
          Set your goals
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
          What do you want to master?
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          Choose one or more areas. We'll personalise your practice,<br className="hidden sm:block"/> content and recommendations based on your goals.
        </p>

        {/* Goal grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {GOALS.map((goal) => {
            const active = selected.includes(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => toggle(goal.id)}
                className={[
                  "text-left px-4 py-4 rounded-xl border-2 transition-all flex items-start gap-3",
                  active
                    ? "border-violet-500 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40",
                ].join(" ")}
              >
                <span className="text-xl leading-none mt-0.5 flex-shrink-0">{goal.icon}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-bold leading-snug ${active ? "text-violet-800" : "text-slate-800"}`}>
                    {goal.label}
                  </div>
                  <div className="text-[0.7rem] text-slate-500 leading-relaxed mt-0.5">{goal.sub}</div>
                </div>
                {active && (
                  <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onComplete}
          disabled={selected.length === 0}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Build My Learning Path →
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          ✦ Your experience will adapt as you learn, practice and improve.
        </p>
      </div>

      {/* ── Right decorative panel ── */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-gradient-to-br from-violet-50 via-blue-50 to-white relative overflow-hidden px-12">
        {/* Stacked books + molecule */}
        <div className="relative flex flex-col items-center gap-0">
          <MoleculeDeco className="w-40 h-40 mb-2 opacity-80" />
          <div className="flex flex-col gap-1">
            {["REACT", "PRACTICE", "MASTER"].map((w, i) => (
              <div key={w} className={[
                "px-8 py-2.5 rounded-lg text-white font-black text-sm tracking-widest shadow-sm",
                i === 0 ? "bg-violet-400" : i === 1 ? "bg-violet-500" : "bg-violet-700",
              ].join(" ")} style={{ width: 200 - i * 20, marginLeft: i * 10 }}>
                {w}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-16 right-14 text-right">
          <p className="text-violet-400 font-black text-lg leading-tight italic">More Chemistry</p>
          <p className="text-violet-500 font-black text-lg leading-tight italic">Brighter</p>
          <p className="text-violet-600 font-black text-xl leading-tight italic">Tomorrows</p>
        </div>
        <div className="absolute bottom-16 right-16 text-right">
          <p className="text-blue-400 font-black text-sm leading-tight italic">Knowledge Creates</p>
          <p className="text-violet-500 font-black text-sm leading-tight italic">New Possibilities</p>
        </div>
      </div>
    </div>
  );
}

// ── Main onboarding page ──────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [step,      setStep]      = useState(1);
  const [firstName, setFirstName] = useState("");
  const [level,     setLevel]     = useState("");
  const [goals,     setGoals]     = useState<string[]>([]);
  const [ready,     setReady]     = useState(false);  // avoid SSR flash

  // If already onboarded, redirect immediately
  useEffect(() => {
    if (localStorage.getItem(LS_ONBOARDING_DONE) === "1") {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  function toggleGoal(id: string) {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function persist(prefs: OnboardingPrefs) {
    localStorage.setItem(LS_ONBOARDING_DONE,  "1");
    localStorage.setItem(LS_ONBOARDING_PREFS, JSON.stringify(prefs));
    // Write the first name into the store so the Dashboard welcome is immediate
    if (prefs.firstName.trim()) {
      useChemStore.setState({ username: prefs.firstName.trim() });
    }
  }

  function handleComplete() {
    const prefs: OnboardingPrefs = { firstName, level, goals };
    persist(prefs);
    router.replace("/");
  }

  function handleSkip() {
    const prefs: OnboardingPrefs = { firstName, level, goals };
    persist(prefs);
    router.replace("/");
  }

  if (!ready) return null;  // prevent SSR/hydration flash

  return (
    <div className="min-h-screen bg-white">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 sm:px-10 h-14 flex items-center justify-between shadow-sm">
        <Logo />

        {/* Stepper — centred */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Stepper step={step} />
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          Skip setup →
        </button>
      </div>

      {/* ── Step content ── */}
      <div className="animate-fade-in">
        {step === 1 && (
          <Step1
            firstName={firstName}
            setFirstName={setFirstName}
            onContinue={() => { if (firstName.trim()) setStep(2); }}
            onSkip={handleSkip}
          />
        )}
        {step === 2 && (
          <Step2
            selected={level}
            setSelected={setLevel}
            onContinue={() => { if (level) setStep(3); }}
            onSkip={handleSkip}
          />
        )}
        {step === 3 && (
          <Step3
            selected={goals}
            toggle={toggleGoal}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )}
      </div>

    </div>
  );
}
