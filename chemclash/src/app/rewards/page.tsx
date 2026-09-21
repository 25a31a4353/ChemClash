"use client";

/**
 * ChemClash — ChemCoins Reward Shop
 *
 * Educational rewards only — no real money, no marketplace.
 * Purchased reward IDs are persisted to localStorage.
 * Coin balance is read from and written back to the existing
 * Zustand store (chemCoins) + localStorage key "chemclash_coins".
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ── localStorage helpers (mirrors the store's own helpers) ─────────────────

const LS_COINS    = "chemclash_coins";
const LS_PURCHASED = "chemclash_purchased_rewards";

function readCoins(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LS_COINS) ?? "0", 10);
}

function saveCoins(n: number) {
  if (typeof window !== "undefined") localStorage.setItem(LS_COINS, String(n));
}

function loadPurchased(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_PURCHASED);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function savePurchased(ids: Set<string>) {
  if (typeof window !== "undefined")
    localStorage.setItem(LS_PURCHASED, JSON.stringify(Array.from(ids)));
}

// ── Reward catalog ─────────────────────────────────────────────────────────

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;             // ChemCoins
  icon: string;
  category: string;
  href: string | null;      // existing page to open; null if no direct route
  openLabel: string;        // CTA label after purchase
}

const REWARDS: Reward[] = [
  {
    id: "sn2_practice_pack",
    name: "SN2 Practice Pack",
    description: "Unlocks a focused run of SN2 mechanism questions in the Adaptive PYQ targeting backside attack, inversion, and solvent effects.",
    cost: 5,
    icon: "⚗️",
    category: "Practice",
    href: "/adaptive-pyq",
    openLabel: "Open Adaptive PYQ",
  },
  {
    id: "eas_challenge",
    name: "EAS Concept Challenge",
    description: "Bonus Tutor Shorts session filtered to Electrophilic Aromatic Substitution — directing effects, arenium ions, and halogen anomaly.",
    cost: 5,
    icon: "🔬",
    category: "Micro-Learn",
    href: "/tutor-shorts",
    openLabel: "Open Tutor Shorts",
  },
  {
    id: "stereochemistry_revision",
    name: "Stereochemistry Revision Pack",
    description: "Curated Tutor Shorts on chirality, R/S configuration, enantiomers, and diastereomers — the most calculation-heavy JEE topic.",
    cost: 8,
    icon: "🧬",
    category: "Revision",
    href: "/tutor-shorts",
    openLabel: "Open Tutor Shorts",
  },
  {
    id: "carbocation_mastery",
    name: "Carbocation Mastery Pack",
    description: "Unlocks a targeted Adaptive PYQ run on carbocation stability, hyperconjugation, and 1,2-shifts — essential for SN1, E1, and Markovnikov reactions.",
    cost: 8,
    icon: "⚡",
    category: "Practice",
    href: "/adaptive-pyq",
    openLabel: "Open Adaptive PYQ",
  },
  {
    id: "mechanism_builder_bonus",
    name: "Mechanism Builder Bonus Session",
    description: "Activates a full Reaction Pathway Lab session with extra hints enabled — work through 5 reaction pathways at your own pace.",
    cost: 10,
    icon: "🧪",
    category: "Practice",
    href: "/mechanism-builder",
    openLabel: "Open Mechanism Builder",
  },
  {
    id: "video_pack_elimination",
    name: "Elimination Reactions Video Pack",
    description: "Unlocks the curated E1/E2 video recommendations playlist — anti-periplanar geometry, Zaitsev, and competing SN/E pathways.",
    cost: 5,
    icon: "🎬",
    category: "Videos",
    href: "/video-recommendations",
    openLabel: "Open Video Recommendations",
  },
  {
    id: "arena_wildcard",
    name: "Practice Arena Wildcard",
    description: "Grants a bonus 5-question Practice Arena match — a great way to test whether your revision is paying off in ELO.",
    cost: 12,
    icon: "⚔️",
    category: "Arena",
    href: "/duel",
    openLabel: "Enter Arena",
  },
  {
    id: "skill_tree_accelerator",
    name: "Skill Tree Accelerator",
    description: "Unlocks access to the Skill Tree mastery map and highlights the 3 nodes closest to being unlocked — focus your revision where it matters most.",
    cost: 15,
    icon: "🌳",
    category: "Mastery",
    href: "/skill-tree",
    openLabel: "Open Skill Tree",
  },
];

// ── Category filter list ───────────────────────────────────────────────────

const CATEGORIES = ["All", ...Array.from(new Set(REWARDS.map((r) => r.category)))];

// ── Reward card ────────────────────────────────────────────────────────────

interface RewardCardProps {
  reward: Reward;
  chemCoins: number;
  purchased: boolean;
  onPurchase: (id: string) => void;
}

function RewardCard({ reward, chemCoins, purchased, onPurchase }: RewardCardProps) {
  const canAfford  = chemCoins >= reward.cost;
  const isPurchased = purchased;

  const borderCls = isPurchased
    ? "border-emerald-200"
    : canAfford
    ? "border-amber-200 hover:border-amber-300"
    : "border-slate-200 opacity-70";

  const bgCls = isPurchased ? "bg-emerald-50" : canAfford ? "bg-amber-50" : "bg-white";

  return (
    <div className={`rounded-2xl border ${borderCls} ${bgCls} p-5 flex flex-col gap-3 transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{reward.icon}</span>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-snug">{reward.name}</p>
            <span className="text-[0.6rem] font-semibold text-slate-400 uppercase tracking-widest">
              {reward.category}
            </span>
          </div>
        </div>
        {/* Cost badge */}
        <div className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${
          isPurchased
            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
            : canAfford
            ? "bg-amber-100 text-amber-700 border-amber-300"
            : "bg-slate-100 text-slate-400 border-slate-200"
        }`}>
          🪙 {reward.cost}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 leading-relaxed flex-1">{reward.description}</p>

      {/* CTA */}
      {isPurchased ? (
        reward.href ? (
          <Link
            href={reward.href}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl py-2.5 no-underline transition-colors"
          >
            ✅ {reward.openLabel} →
          </Link>
        ) : (
          <div className="flex items-center justify-center bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl py-2.5">
            ✅ Unlocked
          </div>
        )
      ) : (
        <button
          onClick={() => onPurchase(reward.id)}
          disabled={!canAfford}
          className={`w-full text-xs font-bold rounded-xl py-2.5 transition-colors ${
            canAfford
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {canAfford ? `🪙 Unlock for ${reward.cost} ChemCoins` : `Need ${reward.cost - chemCoins} more 🪙`}
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const chemCoins   = useChemStore((s) => s.chemCoins);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [category, setCategory]   = useState("All");
  const [flash, setFlash]         = useState<string | null>(null);

  // Hydrate coins + purchased from localStorage on mount
  useEffect(() => {
    const stored = readCoins();
    useChemStore.setState({ chemCoins: stored });
    setPurchased(loadPurchased());
  }, []);

  function handlePurchase(id: string) {
    const reward = REWARDS.find((r) => r.id === id);
    if (!reward) return;
    if (purchased.has(id)) return;           // duplicate guard
    const current = readCoins();
    if (current < reward.cost) return;       // balance guard

    // Deduct
    const next = current - reward.cost;
    saveCoins(next);
    useChemStore.setState({ chemCoins: next });

    // Record purchase
    const nextPurchased = new Set(purchased);
    nextPurchased.add(id);
    setPurchased(nextPurchased);
    savePurchased(nextPurchased);

    // Flash confirmation
    setFlash(`🎉 "${reward.name}" unlocked!`);
    setTimeout(() => setFlash(null), 3000);
  }

  const filtered = category === "All"
    ? REWARDS
    : REWARDS.filter((r) => r.category === category);

  const totalPurchased = purchased.size;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-amber-600 text-xs font-semibold tracking-wide uppercase">
            Reward Shop
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-black text-amber-500">🪙 {chemCoins}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400 text-xs">{totalPurchased}/{REWARDS.length} unlocked</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-2">
            Educational Rewards
          </p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            🪙 ChemCoins <span className="text-amber-500">Shop</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Spend your ChemCoins to unlock bonus practice packs, revision sessions and learning paths.
            Earn more coins from Daily Missions on the Dashboard.
          </p>
        </div>

        {/* Balance card */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-sm flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Your Balance</p>
            <p className="text-4xl font-black text-amber-500">🪙 {chemCoins}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Rewards unlocked</p>
            <p className="text-2xl font-black text-emerald-600">{totalPurchased} <span className="text-sm text-slate-400 font-normal">/ {REWARDS.length}</span></p>
          </div>
        </div>

        {/* Flash banner */}
        {flash && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-700">
            {flash}
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                category === cat
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
              }`}
            >
              {cat} ({cat === "All" ? REWARDS.length : REWARDS.filter((r) => r.category === cat).length})
            </button>
          ))}
        </div>

        {/* Reward grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              chemCoins={chemCoins}
              purchased={purchased.has(reward.id)}
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        {/* How to earn more */}
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">How to Earn More 🪙</p>
          <div className="space-y-2">
            {[
              { action: "Daily Login",            reward: "+1 🪙",  href: "/" },
              { action: "Complete Daily Challenge", reward: "+10 🪙", href: "/" },
            ].map(({ action, reward: r, href }) => (
              <div key={action} className="flex items-center justify-between text-sm">
                <Link href={href} className="text-slate-600 no-underline hover:text-amber-600 transition-colors">
                  {action}
                </Link>
                <span className="font-bold text-amber-600">{r}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
