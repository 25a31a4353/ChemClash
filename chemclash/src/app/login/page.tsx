"use client";

/**
 * ChemClash — Login / Sign Up page
 *
 * Route: /login
 *
 * Dual-mode form:
 *   "login"  — email + password → POST /auth/login
 *   "signup" — name + email + password + confirm → POST /auth/signup
 *
 * On success: redirects to /onboarding (new users) or / (returning users).
 * Already-authenticated users who land here are redirected to / immediately.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router         = useRouter();
  const account        = useAuthStore((s) => s.account);
  const initialized    = useAuthStore((s) => s.initialized);
  const loading        = useAuthStore((s) => s.loading);
  const loginFn        = useAuthStore((s) => s.login);
  const signupFn       = useAuthStore((s) => s.signup);

  const [mode,        setMode]        = useState<Mode>("login");
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // Already authenticated — go straight to Dashboard
  useEffect(() => {
    if (initialized && account) {
      router.replace("/");
    }
  }, [initialized, account, router]);

  // Don't render until auth check is done (avoids flash)
  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Already authenticated — blank while redirect fires
  if (account) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!name.trim()) { setError("Please enter your name."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirm) { setError("Passwords do not match."); return; }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await loginFn(email.trim().toLowerCase(), password);
        router.replace("/");
      } else {
        const acc = await signupFn(email.trim().toLowerCase(), password, name.trim());
        // New users go through onboarding
        if (!acc.onboarding_done) {
          router.replace("/onboarding");
        } else {
          router.replace("/");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      // Surface backend messages nicely
      if (msg.includes("409") || msg.includes("already exists")) {
        setError("An account with this email already exists. Try logging in.");
      } else if (msg.includes("401") || msg.includes("Invalid email or password")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(msg.replace(/^API \d+: /, ""));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isDisabled = submitting || loading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">⚗️</div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          <span className="text-emerald-600">CHEM</span>CLASH
        </h1>
        <p className="text-sm text-slate-500 mt-1">Master Organic Chemistry</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-sm">
        {/* Mode toggle */}
        <div className="flex mb-6 bg-slate-100 border border-slate-200 rounded-xl p-1">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === m
                  ? "bg-white shadow-sm text-emerald-700 border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display name (signup only) */}
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shanmukha"
                autoFocus={mode === "signup"}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                required
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={mode === "login"}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
              required
            />
          </div>

          {/* Confirm password (signup only) */}
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                required
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm tracking-wide mt-1"
          >
            {isDisabled
              ? (mode === "login" ? "Logging in…" : "Creating account…")
              : (mode === "login" ? "Log In →" : "Create Account →")}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
          {mode === "login"
            ? "No account yet? Switch to Sign Up above."
            : "Your data is stored securely. No spam, ever."}
        </p>
      </div>
    </div>
  );
}
