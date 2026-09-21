"use client";

/**
 * ChemClash — Smart Video Recommendations
 *
 * Reads the user's top_weaknesses from the existing Zustand store and maps
 * them to curated YouTube search URLs for the concepts already present in
 * the project (pyq_db.json / concept_tree.json).
 *
 * No YouTube API. No external keys. Search URLs only.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ── Curated concept → video card mapping ──────────────────────────────────
// Keys are lowercase concept_tag values from pyq_db.json / concept_tree.json.
// youtube_search is a YouTube search URL — safe MVP without knowing exact video IDs.

interface VideoCard {
  concept: string;         // display name
  title: string;           // recommended video title / search query
  channel: string;         // channel hint shown to user
  reason: string;          // why it was recommended
  youtube_search: string;  // https://www.youtube.com/results?search_query=…
}

const VIDEO_MAP: Record<string, VideoCard> = {
  // ── SN1 / SN2 / Substitution ─────────────────────────────────────────
  "sn2": {
    concept: "SN2 Mechanism",
    title: "SN2 Reaction Mechanism — Backside Attack & Walden Inversion",
    channel: "Khan Academy / Organic Chemistry Tutor",
    reason: "You've been losing ELO on SN2 questions. This video covers backside attack and inversion.",
    youtube_search: "https://www.youtube.com/results?search_query=SN2+reaction+mechanism+organic+chemistry",
  },
  "sn1": {
    concept: "SN1 Mechanism",
    title: "SN1 Reaction — Carbocation Intermediate & Racemisation",
    channel: "Khan Academy",
    reason: "SN1 carbocation formation is a common weak point. This search covers rate-determining steps.",
    youtube_search: "https://www.youtube.com/results?search_query=SN1+reaction+mechanism+carbocation+racemization",
  },
  "nucleophilic_substitution": {
    concept: "Nucleophilic Substitution",
    title: "SN1 vs SN2 — Choosing the Right Mechanism",
    channel: "Organic Chemistry Tutor",
    reason: "Deciding between SN1 and SN2 is a key JEE skill. Watch the comparison.",
    youtube_search: "https://www.youtube.com/results?search_query=SN1+vs+SN2+mechanism+comparison+JEE",
  },
  // ── E1 / E2 / Elimination ─────────────────────────────────────────────
  "e2": {
    concept: "E2 Elimination",
    title: "E2 Elimination — Anti-Periplanar Geometry & Zaitsev's Rule",
    channel: "Khan Academy",
    reason: "E2 anti-periplanar requirement is frequently tested. This covers the key geometry.",
    youtube_search: "https://www.youtube.com/results?search_query=E2+elimination+mechanism+anti+periplanar+Zaitsev",
  },
  "e1": {
    concept: "E1 Elimination",
    title: "E1 Elimination — Carbocation & Zaitsev Product",
    channel: "Organic Chemistry Tutor",
    reason: "E1 and its relationship to SN1 conditions is a common JEE trap.",
    youtube_search: "https://www.youtube.com/results?search_query=E1+elimination+mechanism+organic+chemistry",
  },
  "elimination": {
    concept: "Elimination Reactions",
    title: "Substitution vs Elimination — Predicting the Major Product",
    channel: "Khan Academy",
    reason: "Choosing SN vs E is a high-value skill in JEE Organic Chemistry.",
    youtube_search: "https://www.youtube.com/results?search_query=substitution+vs+elimination+organic+chemistry+JEE",
  },
  // ── Carbocation ────────────────────────────────────────────────────────
  "carbocation": {
    concept: "Carbocation Stability",
    title: "Carbocation Stability — Hyperconjugation & Rearrangements",
    channel: "Organic Chemistry Tutor",
    reason: "Carbocation stability rules underpin SN1, E1, and Markovnikov additions.",
    youtube_search: "https://www.youtube.com/results?search_query=carbocation+stability+hyperconjugation+rearrangement",
  },
  "carbocation_stability": {
    concept: "Carbocation Stability",
    title: "Carbocation Stability — Hyperconjugation & Rearrangements",
    channel: "Organic Chemistry Tutor",
    reason: "Carbocation stability rules underpin SN1, E1, and Markovnikov additions.",
    youtube_search: "https://www.youtube.com/results?search_query=carbocation+stability+hyperconjugation+rearrangement",
  },
  "rearrangement": {
    concept: "Carbocation Rearrangements",
    title: "1,2-Hydride and Methyl Shifts — Carbocation Rearrangements",
    channel: "Khan Academy",
    reason: "Rearrangements change the expected product and are a common JEE trap.",
    youtube_search: "https://www.youtube.com/results?search_query=carbocation+rearrangement+1+2+hydride+methyl+shift",
  },
  // ── EAS / Aromatic ─────────────────────────────────────────────────────
  "eas": {
    concept: "Electrophilic Aromatic Substitution",
    title: "EAS — Directing Effects, Ortho/Para vs Meta",
    channel: "Khan Academy",
    reason: "EAS directing groups are frequently tested in JEE Paper 2.",
    youtube_search: "https://www.youtube.com/results?search_query=electrophilic+aromatic+substitution+directing+effects+JEE",
  },
  "aromatic": {
    concept: "Aromaticity",
    title: "Aromaticity — Hückel's Rule and Anti-Aromatic Compounds",
    channel: "Khan Academy",
    reason: "Aromaticity criteria appear in both theory and mechanism questions.",
    youtube_search: "https://www.youtube.com/results?search_query=aromaticity+Huckel+rule+organic+chemistry",
  },
  // ── Stereochemistry ────────────────────────────────────────────────────
  "stereochemistry": {
    concept: "Stereochemistry",
    title: "R/S Configuration — CIP Rules Step by Step",
    channel: "Khan Academy",
    reason: "R/S assignments are tested in almost every JEE Organic question.",
    youtube_search: "https://www.youtube.com/results?search_query=R+S+configuration+CIP+rules+organic+chemistry",
  },
  "chirality": {
    concept: "Chirality & Enantiomers",
    title: "Chirality, Enantiomers, and Diastereomers Explained",
    channel: "Organic Chemistry Tutor",
    reason: "Chiral centres and stereorelationships are core JEE Organic topics.",
    youtube_search: "https://www.youtube.com/results?search_query=chirality+enantiomers+diastereomers+organic+chemistry",
  },
  // ── Markovnikov / Addition ─────────────────────────────────────────────
  "markovnikov": {
    concept: "Markovnikov's Rule",
    title: "Markovnikov's Rule — Regioselectivity in HX Addition",
    channel: "Khan Academy",
    reason: "Markovnikov and anti-Markovnikov products are tested every year in JEE.",
    youtube_search: "https://www.youtube.com/results?search_query=Markovnikov+rule+HX+addition+alkene+JEE",
  },
  "electrophilic_addition": {
    concept: "Electrophilic Addition",
    title: "Electrophilic Addition to Alkenes — HBr, H₂O, Br₂",
    channel: "Organic Chemistry Tutor",
    reason: "Alkene addition reactions are the most tested topic in JEE Organic.",
    youtube_search: "https://www.youtube.com/results?search_query=electrophilic+addition+alkenes+HBr+bromine+water",
  },
  // ── Resonance ──────────────────────────────────────────────────────────
  "resonance": {
    concept: "Resonance Structures",
    title: "Resonance Structures — Drawing and Ranking Contributors",
    channel: "Khan Academy",
    reason: "Resonance stability determines reaction outcomes in EAS, carbonyl, and acid/base chemistry.",
    youtube_search: "https://www.youtube.com/results?search_query=resonance+structures+organic+chemistry+ranking",
  },
  // ── Carbonyl / Aldol ───────────────────────────────────────────────────
  "carbonyl": {
    concept: "Carbonyl Chemistry",
    title: "Nucleophilic Addition to Carbonyls — Aldehydes & Ketones",
    channel: "Khan Academy",
    reason: "Carbonyl nucleophilic addition is a major JEE Organic section.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophilic+addition+carbonyl+aldehyde+ketone+JEE",
  },
  "aldol": {
    concept: "Aldol Condensation",
    title: "Aldol Reaction and Condensation — Enolate Chemistry",
    channel: "Khan Academy",
    reason: "Aldol mechanisms involve enolate formation which is a common JEE question.",
    youtube_search: "https://www.youtube.com/results?search_query=aldol+reaction+condensation+enolate+organic+chemistry",
  },
  // ── Lewis / Nucleophile / Electrophile ────────────────────────────────
  "nucleophile": {
    concept: "Nucleophiles & Electrophiles",
    title: "Nucleophiles vs Electrophiles — Recognising Reactants",
    channel: "Khan Academy",
    reason: "Identifying nucleophilic and electrophilic species is the foundation of all mechanisms.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophile+electrophile+organic+chemistry+basics",
  },
  "electrophile": {
    concept: "Nucleophiles & Electrophiles",
    title: "Nucleophiles vs Electrophiles — Recognising Reactants",
    channel: "Khan Academy",
    reason: "Electrophile recognition is the first step in predicting reaction outcomes.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophile+electrophile+organic+chemistry+basics",
  },
  // ── Acid / Base ────────────────────────────────────────────────────────
  "acidity": {
    concept: "Acidity & pKa",
    title: "Organic Acid Strength — Factors Affecting pKa",
    channel: "Organic Chemistry Tutor",
    reason: "Relative acidity questions appear frequently in JEE Mains.",
    youtube_search: "https://www.youtube.com/results?search_query=organic+acidity+pKa+factors+JEE",
  },
  // ── Leaving group / Steric ────────────────────────────────────────────
  "leaving_group": {
    concept: "Leaving Groups",
    title: "Leaving Group Ability — What Makes a Good Leaving Group?",
    channel: "Organic Chemistry Tutor",
    reason: "Leaving group quality directly controls SN1/SN2 reactivity.",
    youtube_search: "https://www.youtube.com/results?search_query=leaving+group+ability+SN1+SN2+organic+chemistry",
  },
  "steric_hindrance": {
    concept: "Steric Hindrance",
    title: "Steric Effects in SN2 — Why Tertiary Substrates Resist",
    channel: "Khan Academy",
    reason: "Steric hindrance explains the SN2 reactivity order — a must-know for JEE.",
    youtube_search: "https://www.youtube.com/results?search_query=steric+hindrance+SN2+primary+secondary+tertiary",
  },
};

// Fallback cards shown when the student has no weakness data yet
const FOUNDATIONAL_CARDS: VideoCard[] = [
  {
    concept: "Organic Chemistry Fundamentals",
    title: "Introduction to Organic Chemistry — Bonding, Functional Groups, Isomers",
    channel: "Khan Academy",
    reason: "Build a strong foundation before tackling mechanisms.",
    youtube_search: "https://www.youtube.com/results?search_query=introduction+organic+chemistry+JEE+basics",
  },
  {
    concept: "Reaction Mechanisms Overview",
    title: "How to Draw Mechanisms — Curved Arrow Notation",
    channel: "Organic Chemistry Tutor",
    reason: "Arrow pushing is the language of every organic mechanism.",
    youtube_search: "https://www.youtube.com/results?search_query=curved+arrow+notation+mechanism+organic+chemistry",
  },
  {
    concept: "Nucleophiles & Electrophiles",
    title: "Nucleophiles vs Electrophiles — Recognising Reactants",
    channel: "Khan Academy",
    reason: "Every reaction starts by identifying who attacks and who gets attacked.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophile+electrophile+organic+chemistry+basics",
  },
];

// ── Pick cards from weakness list ─────────────────────────────────────────

function pickCards(topWeaknesses: string[]): VideoCard[] {
  const seen = new Set<string>();
  const cards: VideoCard[] = [];

  for (const tag of topWeaknesses) {
    const key = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
    // exact match first
    let card = VIDEO_MAP[key];
    // partial match fallback
    if (!card) {
      const matchKey = Object.keys(VIDEO_MAP).find(
        (k) => key.includes(k) || k.includes(key)
      );
      if (matchKey) card = VIDEO_MAP[matchKey];
    }
    if (card && !seen.has(card.concept)) {
      seen.add(card.concept);
      cards.push(card);
    }
    if (cards.length >= 3) break;
  }

  // Fill to 3 with foundational cards if needed
  for (const fb of FOUNDATIONAL_CARDS) {
    if (cards.length >= 3) break;
    if (!seen.has(fb.concept)) {
      seen.add(fb.concept);
      cards.push(fb);
    }
  }

  return cards;
}

// ── Video card component ──────────────────────────────────────────────────

function VideoCardUI({ card, index }: { card: VideoCard; index: number }) {
  const accentColors = [
    { border: "border-violet-200", bg: "bg-violet-50", tag: "bg-violet-100 text-violet-700 border-violet-200", btn: "bg-violet-600 hover:bg-violet-700" },
    { border: "border-blue-200",   bg: "bg-blue-50",   tag: "bg-blue-100 text-blue-700 border-blue-200",       btn: "bg-blue-600 hover:bg-blue-700"   },
    { border: "border-emerald-200",bg: "bg-emerald-50",tag: "bg-emerald-100 text-emerald-700 border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700" },
  ];
  const ac = accentColors[index % accentColors.length];

  return (
    <div className={`rounded-2xl border ${ac.border} ${ac.bg} p-5 flex flex-col gap-3`}>
      {/* Concept tag */}
      <span className={`self-start text-[0.6rem] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${ac.tag}`}>
        {card.concept}
      </span>

      {/* Title */}
      <p className="text-sm font-bold text-slate-800 leading-snug">{card.title}</p>

      {/* Channel hint */}
      <p className="text-[0.65rem] text-slate-400 font-medium">
        Search: <span className="text-slate-500">{card.channel}</span>
      </p>

      {/* Reason */}
      <p className="text-xs text-slate-600 leading-relaxed flex-1">{card.reason}</p>

      {/* Watch button */}
      <a
        href={card.youtube_search}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 ${ac.btn} text-white text-xs font-bold rounded-xl py-2.5 transition-colors no-underline`}
      >
        <span>▶</span> Watch on YouTube →
      </a>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function VideoRecommendationsPage() {
  const profile        = useChemStore((s) => s.profile);
  const eloRating      = useChemStore((s) => s.eloRating);
  const refreshProfile = useChemStore((s) => s.refreshProfile);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const topWeaknesses = profile?.top_weaknesses ?? [];
  const cards = pickCards(topWeaknesses);
  const hasWeaknesses = topWeaknesses.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-violet-600 text-xs font-semibold tracking-wide uppercase">
            Video Recommendations
          </span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-10 pb-24">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-2">
            Learn Next
          </p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            🎬 Video <span className="text-violet-600">Recommendations</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {hasWeaknesses
              ? `Based on your top weakness${topWeaknesses.length > 1 ? "es" : ""} — ${topWeaknesses.slice(0, 2).join(", ")}.`
              : "No weakness data yet. Here are the best places to start."}
          </p>
        </div>

        {/* Weakness pills (if present) */}
        {hasWeaknesses && (
          <div className="flex flex-wrap gap-2 mb-7">
            {topWeaknesses.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-[0.65rem] font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-0.5"
              >
                ⬇ {tag}
              </span>
            ))}
          </div>
        )}

        {/* Cards */}
        <div className="flex flex-col gap-5">
          {cards.map((card, i) => (
            <VideoCardUI key={card.concept} card={card} index={i} />
          ))}
        </div>

        {/* Footer nudge */}
        <div className="mt-10 bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm font-bold text-slate-700 mb-1">
            Want targeted practice after watching?
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Head to Adaptive PYQ to answer questions on exactly these concepts.
          </p>
          <Link
            href="/adaptive-pyq"
            className="inline-flex items-center bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-5 py-2 rounded-xl no-underline transition-colors"
          >
            Practice with Adaptive PYQ →
          </Link>
        </div>

      </main>
    </div>
  );
}
