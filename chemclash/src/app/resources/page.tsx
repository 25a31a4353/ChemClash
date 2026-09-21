"use client";

/**
 * ChemClash — Book & Resource Recommendations
 *
 * Personalised Organic Chemistry resource catalog.
 * Resources are matched against the user's top_weaknesses.
 * All links are Google/Amazon search URLs — no claimed specific availability.
 */

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ── Types ──────────────────────────────────────────────────────────────────

type ResourceType = "Book" | "Notes" | "Revision" | "Practice";

interface Resource {
  id: string;
  title: string;
  author: string;           // author / publisher hint
  type: ResourceType;
  conceptTags: string[];    // matches pyq_db / concept_tree tags (lowercase)
  difficulty: "basics" | "medium" | "advanced";
  description: string;
  whyRecommended: string;
  searchUrl: string;        // Google/Amazon search — no claimed specific availability
}

// ── Curated catalog ────────────────────────────────────────────────────────
// All concepts match tags present in pyq_db.json / concept_tree.json.

const CATALOG: Resource[] = [
  // ── Core textbooks ───────────────────────────────────────────────────────
  {
    id: "clayden_og",
    title: "Organic Chemistry",
    author: "Clayden, Greeves & Warren",
    type: "Book",
    conceptTags: ["resonance", "nucleophile", "electrophile", "carbocation", "sn1", "sn2", "e1", "e2", "eas", "carbonyl", "aldol", "aromaticity", "stereochemistry"],
    difficulty: "medium",
    description: "The definitive undergraduate Organic Chemistry text. Builds from Lewis structures to advanced carbonyl and aromatic chemistry using a mechanistic, electron-pushing approach throughout.",
    whyRecommended: "Exceptional at building conceptual depth for mechanism-heavy topics — every mechanism in ChemClash traces back to principles explained here.",
    searchUrl: "https://www.google.com/search?q=Clayden+Greeves+Warren+Organic+Chemistry+textbook",
  },
  {
    id: "morrison_boyd",
    title: "Organic Chemistry",
    author: "Morrison & Boyd",
    type: "Book",
    conceptTags: ["sn1", "sn2", "e1", "e2", "nucleophile", "leaving_group", "stereochemistry", "carbocation"],
    difficulty: "basics",
    description: "The classic JEE Organic Chemistry reference. Structured progressively from bonding and isomerism through substitution, elimination, addition and carbonyl reactions. Clear enough for self-study.",
    whyRecommended: "The most frequently recommended book for JEE Organic Chemistry preparation — covers every concept in ChemClash's PYQ bank.",
    searchUrl: "https://www.google.com/search?q=Morrison+Boyd+Organic+Chemistry+JEE",
  },
  {
    id: "wade_org",
    title: "Organic Chemistry",
    author: "L.G. Wade Jr.",
    type: "Book",
    conceptTags: ["sn2", "sn1", "e2", "markovnikov", "stereochemistry", "carbonyl", "aromaticity"],
    difficulty: "medium",
    description: "Known for its visual approach and problem-solving emphasis. Each chapter links structural concepts directly to reactivity. Excellent for building reaction-prediction skills tested in JEE.",
    whyRecommended: "Wade's problem sets closely mirror JEE question style — ideal for converting conceptual understanding into exam performance.",
    searchUrl: "https://www.google.com/search?q=Wade+Organic+Chemistry+textbook+JEE",
  },
  // ── Topic-specific ────────────────────────────────────────────────────────
  {
    id: "sn_substitution_notes",
    title: "Nucleophilic Substitution & Elimination — JEE Notes",
    author: "Standard JEE Coaching (search)",
    type: "Notes",
    conceptTags: ["sn1", "sn2", "e1", "e2", "leaving_group", "steric_hindrance", "nucleophile"],
    difficulty: "basics",
    description: "Focused notes covering SN1, SN2, E1, and E2 with comparison tables, rate laws, stereochemistry outcomes, and solved JEE examples. Best used alongside textbook reading.",
    whyRecommended: "Substitution and elimination reactions are the highest-frequency topic in JEE Organic — targeted notes save revision time.",
    searchUrl: "https://www.google.com/search?q=SN1+SN2+E1+E2+JEE+notes+PDF",
  },
  {
    id: "stereochem_notes",
    title: "Stereochemistry — R/S, Enantiomers & Diastereomers Notes",
    author: "Standard JEE Coaching (search)",
    type: "Notes",
    conceptTags: ["stereochemistry", "chirality", "sn2"],
    difficulty: "medium",
    description: "Condensed notes on chiral centres, CIP rules, R/S assignment, optical activity, and the relationship between SN2 and stereochemical inversion. Includes worked JEE examples.",
    whyRecommended: "Stereochemistry is calculation-heavy in JEE Paper 2. Dedicated notes with worked examples are more efficient than re-reading full chapters.",
    searchUrl: "https://www.google.com/search?q=stereochemistry+R+S+configuration+JEE+notes",
  },
  {
    id: "eas_notes",
    title: "Electrophilic Aromatic Substitution — Directing Effects Notes",
    author: "Standard JEE Coaching (search)",
    type: "Notes",
    conceptTags: ["eas", "aromaticity", "resonance"],
    difficulty: "medium",
    description: "Concise notes on EAS mechanism, arenium ion, activating/deactivating groups, ortho/para vs meta directors, and the halogen anomaly — with JEE-style MCQ examples.",
    whyRecommended: "EAS directing effects appear in JEE every year. A one-page reference card for activation/deactivation and direction is a revision essential.",
    searchUrl: "https://www.google.com/search?q=electrophilic+aromatic+substitution+directing+effects+JEE+notes",
  },
  {
    id: "carbocation_notes",
    title: "Carbocation Stability & Rearrangements Notes",
    author: "Standard JEE Coaching (search)",
    type: "Notes",
    conceptTags: ["carbocation", "rearrangement", "sn1", "markovnikov"],
    difficulty: "medium",
    description: "Notes covering carbocation stability order, hyperconjugation vs inductive effect, and 1,2-hydride/methyl shifts with JEE MCQ practice. Essential for SN1, E1, and Markovnikov addition.",
    whyRecommended: "Carbocation rearrangements are a classic JEE trap. Understanding when and how they occur prevents common mistakes across multiple reaction types.",
    searchUrl: "https://www.google.com/search?q=carbocation+stability+rearrangement+JEE+notes",
  },
  {
    id: "ncert_organic",
    title: "NCERT Chemistry — Organic Chemistry Chapters",
    author: "NCERT (Class 11 & 12)",
    type: "Book",
    conceptTags: ["nucleophile", "electrophile", "functional_groups", "resonance", "sn1", "sn2", "eas", "aldol", "carbonyl"],
    difficulty: "basics",
    description: "The NCERT Organic Chemistry chapters (Part I: General Organic Chemistry; Part II: Reactions of Hydrocarbons, Alcohols, Carbonyls). Forms the baseline for all JEE questions.",
    whyRecommended: "Every JEE question is NCERT-rooted. Mastering these chapters first makes all advanced resources easier to absorb.",
    searchUrl: "https://www.google.com/search?q=NCERT+chemistry+class+12+organic+chemistry+PDF",
  },
  {
    id: "ms_chauhan",
    title: "Organic Chemistry — Problem Book",
    author: "M.S. Chauhan",
    type: "Practice",
    conceptTags: ["sn1", "sn2", "e1", "e2", "eas", "stereochemistry", "carbocation", "aldol", "markovnikov"],
    difficulty: "advanced",
    description: "One of the most challenging JEE Organic practice books. Covers all reaction types with multi-step synthesis, mechanism prediction, and concept application questions at JEE Advanced difficulty.",
    whyRecommended: "Once conceptual foundations are solid, M.S. Chauhan's problem sets are the fastest way to reach JEE Advanced problem-solving speed.",
    searchUrl: "https://www.google.com/search?q=MS+Chauhan+organic+chemistry+problems+JEE+Advanced",
  },
  {
    id: "carbonyl_revision",
    title: "Carbonyl Chemistry & Aldol Condensation — Revision Sheet",
    author: "Standard JEE Coaching (search)",
    type: "Revision",
    conceptTags: ["carbonyl", "aldol", "nucleophile"],
    difficulty: "advanced",
    description: "One-page revision summary of nucleophilic addition to carbonyls, Grignard reactions, aldol addition, crossed aldol selectivity, and acyl substitution reactivity order.",
    whyRecommended: "Carbonyl chemistry is dense — a structured revision sheet covering reactivity trends and named reactions condenses hours of re-reading into minutes.",
    searchUrl: "https://www.google.com/search?q=carbonyl+chemistry+aldol+condensation+JEE+revision+notes",
  },
  {
    id: "huckel_aromaticity",
    title: "Aromaticity & Hückel's Rule — Quick Reference",
    author: "Standard JEE Coaching (search)",
    type: "Revision",
    conceptTags: ["aromaticity", "eas"],
    difficulty: "medium",
    description: "Compact reference covering Hückel's 4n+2 rule, aromatic vs anti-aromatic vs non-aromatic systems, heterocycles (pyrrole vs pyridine), and application to EAS reactivity.",
    whyRecommended: "Aromaticity rules take 30 minutes to master but appear in every JEE paper. A quick-reference card is the most time-efficient revision tool.",
    searchUrl: "https://www.google.com/search?q=Huckel+rule+aromaticity+anti-aromatic+JEE+notes",
  },
];

// ── Difficulty styling (mirrors concept_tree categories) ──────────────────

const DIFF_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  basics:   { text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  medium:   { text: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200"    },
  advanced: { text: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200"  },
};

const TYPE_ICON: Record<ResourceType, string> = {
  Book:     "📗",
  Notes:    "📝",
  Revision: "🔁",
  Practice: "🎯",
};

// ── Build recommendation list ─────────────────────────────────────────────

function pickResources(topWeaknesses: string[], filterTag: string): Resource[] {
  const base = filterTag === "all"
    ? CATALOG
    : CATALOG.filter((r) => r.conceptTags.some(
        (t) => t === filterTag || filterTag.includes(t) || t.includes(filterTag)
      ));

  const weak = base.filter((r) =>
    topWeaknesses.some((w) =>
      r.conceptTags.some((t) => t === w || w.includes(t) || t.includes(w))
    )
  );
  const rest = base.filter((r) => !weak.includes(r));
  return [...weak, ...rest].slice(0, 5);
}

// ── All concept tags from catalog (for filter) ────────────────────────────

const ALL_TAGS = Array.from(
  new Set(CATALOG.flatMap((r) => r.conceptTags))
).sort();

// ── Resource card ─────────────────────────────────────────────────────────

function ResourceCard({
  resource, isWeakness,
}: {
  resource: Resource; isWeakness: boolean;
}) {
  const ds = DIFF_STYLE[resource.difficulty];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{TYPE_ICON[resource.type]}</span>
          <div>
            <span className={`text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${ds.bg} ${ds.text} ${ds.border}`}>
              {resource.difficulty}
            </span>
            <span className="ml-1.5 text-[0.6rem] font-semibold text-slate-400 uppercase tracking-widest">
              {resource.type}
            </span>
          </div>
        </div>
        {isWeakness && (
          <span className="text-[0.6rem] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
            ⬇ Matches Your Weakness
          </span>
        )}
      </div>

      {/* Title + author */}
      <div>
        <p className="text-sm font-black text-slate-900 leading-snug mb-0.5">{resource.title}</p>
        <p className="text-xs text-slate-400 font-medium">{resource.author}</p>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 leading-relaxed">{resource.description}</p>

      {/* Why recommended */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
        <p className="text-[0.65rem] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Why recommended</p>
        <p className="text-xs text-slate-700 leading-relaxed">{resource.whyRecommended}</p>
      </div>

      {/* Concept tags */}
      <div className="flex flex-wrap gap-1">
        {resource.conceptTags.slice(0, 5).map((t) => (
          <span key={t} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-medium">
            #{t}
          </span>
        ))}
      </div>

      {/* CTA */}
      <a
        href={resource.searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl py-2.5 no-underline transition-colors"
      >
        🔍 Find this resource →
      </a>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const profile        = useChemStore((s) => s.profile);
  const eloRating      = useChemStore((s) => s.eloRating);
  const refreshProfile = useChemStore((s) => s.refreshProfile);

  const [filterTag, setFilterTag] = useState("all");

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  const topWeaknesses = useMemo(
    () => (profile?.top_weaknesses ?? []).map((t) => t.toLowerCase()),
    [profile]
  );

  const recommendations = useMemo(
    () => pickResources(topWeaknesses, filterTag),
    [topWeaknesses, filterTag]
  );

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
          <span className="text-blue-600 text-xs font-semibold tracking-wide uppercase">Resources</span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">
            Personalised Library
          </p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            📗 Book & Resource <span className="text-blue-600">Recommendations</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {hasWeaknesses
              ? `Resources matched to your weak concepts — ${topWeaknesses.slice(0, 2).join(", ")}.`
              : "Foundational Organic Chemistry resources to start with."}
            {" "}Links open Google/Amazon search — verify availability before purchasing.
          </p>
        </div>

        {/* Weakness pills */}
        {hasWeaknesses && (
          <div className="flex flex-wrap gap-2 mb-6">
            {topWeaknesses.slice(0, 5).map((t) => (
              <span key={t} className="text-[0.65rem] font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-0.5">
                ⬇ {t}
              </span>
            ))}
          </div>
        )}

        {/* Concept filter */}
        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex gap-2 w-max">
            <button
              onClick={() => setFilterTag("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                filterTag === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              All ({CATALOG.length})
            </button>
            {ALL_TAGS.map((tag) => {
              const isWeak = topWeaknesses.some(
                (w) => tag === w || w.includes(tag) || tag.includes(w)
              );
              return (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                    filterTag === tag
                      ? "bg-blue-600 text-white border-blue-600"
                      : isWeak
                      ? "bg-red-50 text-red-600 border-red-200 hover:border-red-400"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {isWeak ? "⬇ " : ""}{tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {recommendations.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            No resources matched this filter.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {recommendations.map((r) => {
              const isWeakness = topWeaknesses.some((w) =>
                r.conceptTags.some((t) => t === w || w.includes(t) || t.includes(w))
              );
              return <ResourceCard key={r.id} resource={r} isWeakness={isWeakness} />;
            })}
          </div>
        )}

        {/* Cross-link to Videos */}
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Looking for videos instead?</p>
            <p className="text-xs text-slate-400">Curated YouTube searches for the same concepts.</p>
          </div>
          <Link
            href="/video-recommendations"
            className="shrink-0 inline-flex items-center bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors"
          >
            🎬 Video Recommendations →
          </Link>
        </div>

        {/* Cross-link to Exchange */}
        <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Want to find or share physical materials?</p>
            <p className="text-xs text-slate-400">Browse books, notes, and cheat sheets on the Exchange MVP.</p>
          </div>
          <Link
            href="/exchange"
            className="shrink-0 inline-flex items-center bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors"
          >
            📦 ChemClash Exchange →
          </Link>
        </div>

      </main>
    </div>
  );
}
