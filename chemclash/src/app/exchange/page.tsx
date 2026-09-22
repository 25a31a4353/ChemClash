"use client";

/**
 * ChemClash Exchange MVP
 *
 * Educational-material marketplace prototype.
 * Sample listings only — no real transactions, sellers, payments, or shipping.
 * "Interested" state is stored locally (localStorage) per listing.
 */

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

type ListingType = "Book" | "Notes" | "Revision Sheet" | "Cheat Sheet" | "Practice Pack";
type ListingCondition = "New" | "Like New" | "Good" | "Digital";
type ListingAction = "Buy" | "Borrow" | "View";

interface Listing {
  id: string;
  title: string;
  type: ListingType;
  condition: ListingCondition;
  concept: string;           // primary concept tag (matches ChemClash tag set)
  conceptTags: string[];     // all matched concept tags
  priceLabel: string;        // display-only, e.g. "₹120" or "Free"
  action: ListingAction;
  description: string;
  postedBy: string;          // fictional placeholder — not a real seller
}

// ── Seed listings ──────────────────────────────────────────────────────────

const LISTINGS: Listing[] = [
  {
    id: "ncert_oc_12",
    title: "NCERT Chemistry Part-II — Class 12 (Organic)",
    type: "Book",
    condition: "Good",
    concept: "nucleophile",
    conceptTags: ["nucleophile", "electrophile", "carbonyl", "eas", "resonance", "sn1", "sn2"],
    priceLabel: "₹80",
    action: "Buy",
    description:
      "Physical copy of NCERT Class 12 Part-II. Covers all organic chapters including haloalkanes, alcohols, carbonyls, and amines. Spine intact, minor pencil marks only.",
    postedBy: "Sample listing",
  },
  {
    id: "ncert_oc_11",
    title: "NCERT Chemistry Part-II — Class 11 (GOC)",
    type: "Book",
    condition: "Like New",
    concept: "resonance",
    conceptTags: ["resonance", "aromaticity", "nucleophile", "electrophile", "functional_groups"],
    priceLabel: "₹60",
    action: "Buy",
    description:
      "Class 11 Part-II covering General Organic Chemistry: hybridisation, IUPAC, resonance, inductive effect, and hyperconjugation. Barely used.",
    postedBy: "Sample listing",
  },
  {
    id: "morrison_boyd_book",
    title: "Morrison & Boyd — Organic Chemistry (7th Ed.)",
    type: "Book",
    condition: "Good",
    concept: "sn1",
    conceptTags: ["sn1", "sn2", "e1", "e2", "stereochemistry", "carbocation", "nucleophile"],
    priceLabel: "₹350",
    action: "Buy",
    description:
      "Classic JEE reference. Hardcover, all chapters intact. Some highlighting in nucleophilic substitution and elimination chapters.",
    postedBy: "Sample listing",
  },
  {
    id: "ms_chauhan_pb",
    title: "M.S. Chauhan — Advanced Problems in Organic Chemistry",
    type: "Practice Pack",
    condition: "Like New",
    concept: "sn2",
    conceptTags: ["sn2", "sn1", "e2", "stereochemistry", "aldol", "carbonyl", "eas", "markovnikov"],
    priceLabel: "₹280",
    action: "Buy",
    description:
      "JEE Advanced level problem book. All pages clean, no writing. Ideal for Phase 3 JEE preparation.",
    postedBy: "Sample listing",
  },
  {
    id: "sn_notes_handwritten",
    title: "SN1 / SN2 / E1 / E2 — Handwritten Notes (20 pages)",
    type: "Notes",
    condition: "Digital",
    concept: "sn2",
    conceptTags: ["sn1", "sn2", "e1", "e2", "leaving_group", "steric_hindrance", "nucleophile"],
    priceLabel: "Free",
    action: "View",
    description:
      "Scanned handwritten notes. Comparison tables for SN1 vs SN2 vs E1 vs E2, rate laws, stereochemistry outcomes. Includes 15 solved JEE MCQs.",
    postedBy: "Sample listing",
  },
  {
    id: "stereo_typed_notes",
    title: "Stereochemistry Typed Notes — R/S, Chirality, Optical Activity",
    type: "Notes",
    condition: "Digital",
    concept: "stereochemistry",
    conceptTags: ["stereochemistry", "chirality", "sn2"],
    priceLabel: "Free",
    action: "View",
    description:
      "Typed PDF notes covering CIP rules, R/S assignment, enantiomers vs diastereomers, optical activity, and the SN2 inversion rule with worked examples.",
    postedBy: "Sample listing",
  },
  {
    id: "eas_cheat_sheet",
    title: "EAS Directing Effects — Reaction Cheat Sheet",
    type: "Cheat Sheet",
    condition: "Digital",
    concept: "eas",
    conceptTags: ["eas", "aromaticity", "resonance"],
    priceLabel: "Free",
    action: "View",
    description:
      "One-page cheat sheet: activating / deactivating substituents, ortho/para vs meta directors, halogen anomaly, and common JEE trap questions.",
    postedBy: "Sample listing",
  },
  {
    id: "carbonyl_revision_sheet",
    title: "Carbonyl Chemistry & Aldol — Revision Sheet",
    type: "Revision Sheet",
    condition: "Digital",
    concept: "carbonyl",
    conceptTags: ["carbonyl", "aldol", "nucleophile"],
    priceLabel: "Free",
    action: "View",
    description:
      "Compact revision summary: nucleophilic addition, Grignard reactions, aldol condensation, crossed aldol selectivity, and reactivity order of acyl derivatives.",
    postedBy: "Sample listing",
  },
  {
    id: "aromaticity_quick_ref",
    title: "Aromaticity & Hückel's Rule — Quick Reference Card",
    type: "Cheat Sheet",
    condition: "Digital",
    concept: "aromaticity",
    conceptTags: ["aromaticity", "eas"],
    priceLabel: "Free",
    action: "View",
    description:
      "Covers Hückel 4n+2 rule, aromatic vs anti-aromatic vs non-aromatic systems, heterocycles (pyrrole vs pyridine), and EAS reactivity implications.",
    postedBy: "Sample listing",
  },
  {
    id: "carbocation_notes",
    title: "Carbocation Stability & Rearrangements — Notes",
    type: "Notes",
    condition: "Digital",
    concept: "carbocation",
    conceptTags: ["carbocation", "rearrangement", "sn1", "markovnikov"],
    priceLabel: "Free",
    action: "View",
    description:
      "Notes covering stability order, hyperconjugation vs inductive effect, 1,2-hydride and methyl shifts with JEE MCQ practice. Essential for SN1 and E1.",
    postedBy: "Sample listing",
  },
  {
    id: "reaction_map_poster",
    title: "JEE Organic Reactions Map — A3 Poster (PDF)",
    type: "Cheat Sheet",
    condition: "Digital",
    concept: "nucleophile",
    conceptTags: ["nucleophile", "electrophile", "sn1", "sn2", "eas", "markovnikov", "carbonyl", "aldol"],
    priceLabel: "₹20",
    action: "Buy",
    description:
      "All major JEE organic reaction types on a single A3 poster: reagents, conditions, mechanism type, and product type. Printable PDF.",
    postedBy: "Sample listing",
  },
  {
    id: "wade_og_book",
    title: "L.G. Wade Jr. — Organic Chemistry (8th Ed.)",
    type: "Book",
    condition: "Good",
    concept: "stereochemistry",
    conceptTags: ["sn2", "sn1", "e2", "markovnikov", "stereochemistry", "carbonyl", "aromaticity"],
    priceLabel: "₹400",
    action: "Borrow",
    description:
      "Available for 1-month borrow. Visual approach with strong problem-solving emphasis. Highlighting in SN2 and carbonyl chapters only.",
    postedBy: "Sample listing",
  },
];

// ── Constants ───────────────────────────────────────────────────────────────

const LS_KEY = "chemclash_exchange_interested";

const ALL_TYPES: ListingType[] = ["Book", "Notes", "Revision Sheet", "Cheat Sheet", "Practice Pack"];
const ALL_CONCEPTS = Array.from(new Set(LISTINGS.flatMap((l) => l.conceptTags))).sort();

const TYPE_ICON: Record<ListingType, string> = {
  "Book": "📗",
  "Notes": "📝",
  "Revision Sheet": "🔁",
  "Cheat Sheet": "⚡",
  "Practice Pack": "🎯",
};

const ACTION_STYLE: Record<ListingAction, string> = {
  Buy:    "bg-emerald-600 hover:bg-emerald-700 text-white",
  Borrow: "bg-blue-600 hover:bg-blue-700 text-white",
  View:   "bg-slate-700 hover:bg-slate-800 text-white",
};

const CONDITION_STYLE: Record<ListingCondition, string> = {
  "New":      "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Like New": "bg-blue-50 text-blue-700 border-blue-200",
  "Good":     "bg-amber-50 text-amber-700 border-amber-200",
  "Digital":  "bg-violet-50 text-violet-700 border-violet-200",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function readInterested(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveInterested(ids: Set<string>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
  }
}

// ── Listing card ───────────────────────────────────────────────────────────

function ListingCard({
  listing,
  interested,
  onInterested,
  onOpen,
}: {
  listing: Listing;
  interested: boolean;
  onInterested: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 flex flex-col gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md ${
        interested ? "border-emerald-300" : "border-slate-200"
      }`}
      onClick={() => onOpen(listing.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{TYPE_ICON[listing.type]}</span>
          <div className="flex flex-col gap-0.5">
            <span className={`text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${CONDITION_STYLE[listing.condition]}`}>
              {listing.condition}
            </span>
            <span className="text-[0.6rem] font-semibold text-slate-400 uppercase tracking-widest pl-0.5">
              {listing.type}
            </span>
          </div>
        </div>
        {interested && (
          <span className="text-[0.6rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            ✓ Interested
          </span>
        )}
      </div>

      {/* Title + price */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-black text-slate-900 leading-snug">{listing.title}</p>
        <span className="shrink-0 text-sm font-black text-emerald-700">{listing.priceLabel}</span>
      </div>

      {/* Description snippet */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{listing.description}</p>

      {/* Concept tags */}
      <div className="flex flex-wrap gap-1">
        {listing.conceptTags.slice(0, 4).map((t) => (
          <span key={t} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-medium">
            #{t}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpen(listing.id)}
          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors ${ACTION_STYLE[listing.action]}`}
        >
          {listing.action} →
        </button>
        <button
          onClick={() => onInterested(listing.id)}
          className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
            interested
              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
              : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
          }`}
        >
          {interested ? "✓ Saved" : "♡ Interested"}
        </button>
      </div>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────

function DetailModal({
  listing,
  interested,
  onInterested,
  onClose,
}: {
  listing: Listing;
  interested: boolean;
  onInterested: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{TYPE_ICON[listing.type]}</span>
            <span className={`text-[0.65rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${CONDITION_STYLE[listing.condition]}`}>
              {listing.condition}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ✕
          </button>
        </div>

        {/* Title + price */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-black text-slate-900 leading-snug">{listing.title}</h2>
          <span className="shrink-0 text-lg font-black text-emerald-700">{listing.priceLabel}</span>
        </div>

        {/* Type + action */}
        <p className="text-xs text-slate-500 font-medium">
          {listing.type} · Action: <span className="font-bold text-slate-700">{listing.action}</span>
        </p>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed">{listing.description}</p>

        {/* Concept tags */}
        <div className="flex flex-wrap gap-1.5">
          {listing.conceptTags.map((t) => (
            <span key={t} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
              #{t}
            </span>
          ))}
        </div>

        {/* MVP disclaimer */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-[0.65rem] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Exchange MVP</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            This is a prototype listing. No real transactions, payments, or seller contact is available yet. &ldquo;Interested&rdquo; saves this listing locally for your reference.
          </p>
        </div>

        {/* Posted by */}
        <p className="text-[0.65rem] text-slate-400">{listing.postedBy}</p>

        {/* CTA */}
        <div className="flex gap-3">
          <button
            onClick={() => onInterested(listing.id)}
            className={`flex-1 text-sm font-bold py-3 rounded-xl border transition-colors ${
              interested
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
            }`}
          >
            {interested ? "✓ Saved as Interested" : "♡ Mark as Interested"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ExchangePage() {
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState<"all" | ListingType>("all");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [sortBy, setSortBy]           = useState<"default" | "price-asc" | "price-desc">("default");
  const [interested, setInterested]   = useState<Set<string>>(new Set());
  const [openId, setOpenId]           = useState<string | null>(null);

  // Hydrate interested set from localStorage
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional localStorage hydration
  useEffect(() => { setInterested(readInterested()); }, []);

  const toggleInterested = (id: string) => {
    setInterested((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveInterested(next);
      return next;
    });
  };

  // Derive numeric price for sorting (Free = 0, unknown = 999)
  const priceNum = (l: Listing): number => {
    if (l.priceLabel === "Free") return 0;
    const m = l.priceLabel.match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 999;
  };

  const filtered = useMemo(() => {
    let list = LISTINGS.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || l.title.toLowerCase().includes(q)
        || l.conceptTags.some((t) => t.includes(q))
        || l.type.toLowerCase().includes(q);
      const matchType    = typeFilter === "all" || l.type === typeFilter;
      const matchConcept = conceptFilter === "all"
        || l.conceptTags.some((t) => t === conceptFilter || t.includes(conceptFilter) || conceptFilter.includes(t));
      return matchSearch && matchType && matchConcept;
    });

    if (sortBy === "price-asc")  list = [...list].sort((a, b) => priceNum(a) - priceNum(b));
    if (sortBy === "price-desc") list = [...list].sort((a, b) => priceNum(b) - priceNum(a));

    return list;
  }, [search, typeFilter, conceptFilter, sortBy]);

  const openListing = openId ? LISTINGS.find((l) => l.id === openId) ?? null : null;
  const savedCount = interested.size;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-blue-600 text-xs font-semibold tracking-wide uppercase">Exchange</span>
          <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 uppercase tracking-widest">MVP</span>
        </div>
        {savedCount > 0 && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-0.5">
            {savedCount} Saved
          </span>
        )}
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Exchange MVP</p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            📦 ChemClash <span className="text-blue-600">Exchange</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
            Browse sample educational materials — books, notes, revision sheets, and reaction cheat sheets.
            Mark listings as Interested to save them locally.
            <span className="font-medium text-amber-700"> No real transactions, payments, or sellers.</span>
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, concept, or type…"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Filters + sort row */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Type filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all ${
                typeFilter === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              All Types
            </button>
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all ${
                  typeFilter === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                {TYPE_ICON[t]} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Concept filter (scrollable) */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="flex gap-2 w-max">
            <button
              onClick={() => setConceptFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all ${
                conceptFilter === "all"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              All Concepts
            </button>
            {ALL_CONCEPTS.map((c) => (
              <button
                key={c}
                onClick={() => setConceptFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-all ${
                  conceptFilter === c
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >
                #{c}
              </button>
            ))}
          </div>
        </div>

        {/* Sort + result count */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="text-xs text-slate-500 font-medium">
            {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
            {search ? ` for "${search}"` : ""}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            {(["default", "price-asc", "price-desc"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                  sortBy === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                }`}
              >
                {s === "default" ? "Default" : s === "price-asc" ? "Price ↑" : "Price ↓"}
              </button>
            ))}
          </div>
        </div>

        {/* Listings grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            No listings matched your search or filter.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                interested={interested.has(l.id)}
                onInterested={toggleInterested}
                onOpen={setOpenId}
              />
            ))}
          </div>
        )}

        {/* Cross-link to Resources */}
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Looking for curated book recommendations?</p>
            <p className="text-xs text-slate-400">Personalised resources matched to your weakness profile.</p>
          </div>
          <Link
            href="/resources"
            className="shrink-0 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl no-underline transition-colors"
          >
            📗 Resource Recommendations →
          </Link>
        </div>

      </main>

      {/* Detail modal */}
      {openListing && (
        <DetailModal
          listing={openListing}
          interested={interested.has(openListing.id)}
          onInterested={toggleInterested}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
