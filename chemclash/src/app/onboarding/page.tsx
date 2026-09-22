"use client";

/**
 * ChemClash — Onboarding (post-signup, 3-step preference collection)
 *
 * Route: /onboarding
 *
 * Shown only to authenticated users who have not yet completed onboarding.
 * Returning users (account.onboarding_done === true) are redirected to /.
 * Unauthenticated visitors are redirected to /login.
 *
 * After completing all 3 steps the preferences are persisted to the account
 * via PUT /auth/me and the user is sent to the product tour (/tour).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import LogoSpinner from "@/components/LogoSpinner";

// ── Legacy LS keys (preserved for compatibility with old anonymous flow) ──────
export const LS_ONBOARDING_DONE  = "chemclash_onboarding_done";
export const LS_ONBOARDING_PREFS = "chemclash_onboarding_prefs";
export const LS_USER_EMAIL       = "chemclash_user_email";
export const LS_USER_NAME        = "chemclash_user_name";

export interface OnboardingPrefs {
  firstName: string;
  email: string;
  level: string;
  goals: string[];
}

// ── Reusable progress dots ────────────────────────────────────────────────

function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step
              ? "w-6 h-2.5 bg-emerald-500"
              : i + 1 < step
              ? "w-2.5 h-2.5 bg-emerald-300"
              : "w-2.5 h-2.5 bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

// ── Step 1 — What should we call you? ─────────────────────────────────────

function StepName({
  firstName, setFirstName,
  onContinue,
}: {
  firstName: string; setFirstName: (v: string) => void;
  onContinue: () => void;
}) {
  const [err, setErr] = useState("");

  function validate() {
    if (!firstName.trim()) { setErr("Please enter your name."); return; }
    setErr("");
    onContinue();
  }

  return (
    <div className="max-w-sm mx-auto px-6 pt-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">⚗️</div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
          Welcome to <span className="text-emerald-600">ChemClash</span>
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Your AI-powered Organic Chemistry arena. Let&apos;s personalize your experience.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
            What should we call you?
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && validate()}
            placeholder="e.g. Shanmukha"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
            autoFocus
          />
        </div>

        {err && <p className="text-xs text-red-500 font-medium">{err}</p>}

        <button
          onClick={validate}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-colors text-sm tracking-wide mt-2"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Step 2 — Journey / Level ──────────────────────────────────────────────

const LEVELS = [
  { id: "high_school",     icon: "🏫", label: "High School",       sub: "Starting Class 11–12 organic chemistry" },
  { id: "college",         icon: "🎓", label: "College",           sub: "Undergraduate organic chemistry" },
  { id: "graduate",        icon: "🔬", label: "Graduate",          sub: "Advanced study & research" },
  { id: "jee_competitive", icon: "📝", label: "JEE / Competitive", sub: "JEE Mains & Advanced preparation" },
  { id: "neet_medical",    icon: "🩺", label: "NEET / Medical",    sub: "NEET & medical entrance preparation" },
  { id: "other",           icon: "✨", label: "Other",             sub: "Self-study or another purpose" },
];

function StepLevel({
  selected, setSelected, onContinue,
}: { selected: string; setSelected: (v: string) => void; onContinue: () => void; }) {
  return (
    <div className="max-w-sm mx-auto px-6 pt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          Where are you on your<br />organic chemistry journey?
        </h2>
        <p className="text-sm text-slate-500">We&apos;ll tune your first questions to match.</p>
      </div>

      <div className="space-y-2.5 mb-8">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.id}
            onClick={() => setSelected(lvl.id)}
            className={`w-full flex items-center gap-4 border rounded-xl px-4 py-3.5 text-left transition-all ${
              selected === lvl.id
                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            <span className="text-xl">{lvl.icon}</span>
            <div>
              <p className="text-sm font-bold text-slate-800">{lvl.label}</p>
              <p className="text-xs text-slate-500">{lvl.sub}</p>
            </div>
            {selected === lvl.id && (
              <span className="ml-auto text-emerald-500 font-black">✓</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onContinue}
        disabled={!selected}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
      >
        Continue →
      </button>
    </div>
  );
}

// ── Step 3 — Goals ────────────────────────────────────────────────────────

const GOALS = [
  { id: "reactions_mechanisms", icon: "🔬", label: "Reactions & Mechanisms",     sub: "Arrow-pushing fluency & mechanism mastery" },
  { id: "named_reactions",      icon: "📖", label: "Named Reactions",            sub: "Grignard, Aldol, Wittig & more" },
  { id: "organic_pyqs",         icon: "📝", label: "Organic Chemistry PYQs",     sub: "JEE / NEET previous year questions" },
  { id: "concepts_visual",      icon: "🎬", label: "Concepts & Visual Learning", sub: "Animations, living molecules, diagrams" },
  { id: "exam_preparation",     icon: "🎯", label: "Exam Preparation",           sub: "Score optimisation, time management" },
  { id: "everything",           icon: "⚡", label: "Everything",                 sub: "Master all aspects of Organic Chemistry" },
];

function StepGoals({
  selected, toggle, onComplete, saving,
}: { selected: string[]; toggle: (id: string) => void; onComplete: () => void; saving: boolean; }) {
  return (
    <div className="max-w-sm mx-auto px-6 pt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-900 mb-2">What do you want to master?</h2>
        <p className="text-sm text-slate-500">Select everything that applies.</p>
      </div>

      <div className="space-y-2.5 mb-8">
        {GOALS.map((g) => {
          const on = selected.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={`w-full flex items-center gap-4 border rounded-xl px-4 py-3.5 text-left transition-all ${
                on
                  ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              <span className="text-xl">{g.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-800">{g.label}</p>
                <p className="text-xs text-slate-500">{g.sub}</p>
              </div>
              {on && <span className="ml-auto text-violet-500 font-black">✓</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={onComplete}
        disabled={saving}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
      >
        {saving ? "Saving…" : "🚀 Launch ChemClash"}
      </button>
    </div>
  );
}

// ── Main onboarding page ──────────────────────────────────────────────────

export default function OnboardingPage() {
  const router        = useRouter();
  const account       = useAuthStore((s) => s.account);
  const initialized   = useAuthStore((s) => s.initialized);
  const updateAccount = useAuthStore((s) => s.updateAccount);

  const [step,      setStep]      = useState(1);
  const [firstName, setFirstName] = useState("");
  const [level,     setLevel]     = useState("");
  const [goals,     setGoals]     = useState<string[]>([]);
  const [saving,    setSaving]    = useState(false);

  // Auth guard + already-onboarded redirect
  useEffect(() => {
    if (!initialized) return;
    if (!account) {
      router.replace("/login");
      return;
    }
    if (account.onboarding_done) {
      if (!account.tour_done) {
        router.replace("/tour");
      } else {
        router.replace("/");
      }
      return;
    }
    // Pre-fill name from account if available
    if (account.display_name && !firstName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrating form from server account on mount
      setFirstName(account.display_name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, account]);

  function toggleGoal(id: string) {
    if (id === "everything") {
      setGoals(goals.includes("everything") ? [] : ["everything"]);
      return;
    }
    const withoutAll = goals.filter((g) => g !== "everything");
    setGoals(withoutAll.includes(id) ? withoutAll.filter((g) => g !== id) : [...withoutAll, id]);
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await updateAccount({
        display_name:     firstName.trim() || account?.display_name || "Player",
        level,
        goals,
        onboarding_done:  true,
      });
      // Write legacy localStorage keys so existing pages still work
      localStorage.setItem(LS_ONBOARDING_DONE, "1");
      localStorage.setItem(LS_USER_NAME, firstName.trim() || account?.display_name || "Player");
      router.replace("/tour");
    } catch {
      setSaving(false);
    }
  }

  if (!initialized) {
    return <LogoSpinner label="Loading…" />;
  }

  if (!account) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 h-14 flex items-center justify-center shadow-sm">
        <span className="text-emerald-600 font-black text-lg tracking-wide">
          CHEM<span className="text-slate-800">CLASH</span>
        </span>
      </div>

      <div className="py-4">
        <Dots step={step} total={3} />
      </div>

      {step === 1 && (
        <StepName
          firstName={firstName}
          setFirstName={setFirstName}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepLevel
          selected={level}
          setSelected={setLevel}
          onContinue={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepGoals
          selected={goals}
          toggle={toggleGoal}
          onComplete={handleComplete}
          saving={saving}
        />
      )}
    </div>
  );
}
