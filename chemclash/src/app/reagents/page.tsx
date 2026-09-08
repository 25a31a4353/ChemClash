"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { REAGENTS, REAGENT_CATEGORIES } from "@/data/reagents";

interface ReactionEntry { substrate: string; product: string; conditions: string; type: string; notes?: string; }
interface ReagentEntry { id: string; name: string; formula: string; category: string; description: string; reactions: ReactionEntry[]; }
interface BadgeStyle { bg: string; border: string; text: string; }

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Electrophilic Addition": { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700"   },
  "Nucleophilic Addition":  { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700"    },
  "Nucleophilic Substitution": { bg: "bg-blue-50", border: "border-blue-200",   text: "text-blue-700"    },
  "Free Radical":           { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-600"     },
  "Elimination":            { bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700"  },
  "Oxidation":              { bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700" },
  "Reduction":              { bg: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-700"    },
  "EAS":                    { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-700"  },
  "No reaction":            { bg: "bg-slate-100",  border: "border-slate-200",  text: "text-slate-500"   },
  "default":                { bg: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-700"  },
};

function typeBadge(type = ""): BadgeStyle {
  const key = Object.keys(TYPE_COLORS).find((k) => k !== "default" && type.includes(k));
  return key ? TYPE_COLORS[key] : TYPE_COLORS["default"];
}

function ReactionRow({ rx, idx }: { rx: ReactionEntry; idx: number }) {
  const badge = typeBadge(rx.type);
  return (
    <div className={idx === 0 ? "" : "border-t border-slate-100 pt-3 mt-3"}>
      <div className="flex items-start gap-2 flex-wrap mb-2">
        <span className="text-sm font-semibold text-slate-800 min-w-[100px]">{rx.substrate}</span>
        <span className="text-slate-400 text-sm">→</span>
        <span className="text-sm font-semibold text-emerald-700">{rx.product}</span>
      </div>
      <div className="flex gap-2 flex-wrap items-center mb-1.5">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border} ${badge.text}`}>
          {rx.type}
        </span>
        {rx.conditions && rx.conditions !== "—" && (
          <span className="text-xs text-slate-500">
            Conditions: <span className="text-slate-700 font-medium">{rx.conditions}</span>
          </span>
        )}
      </div>
      {rx.notes && (
        <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-slate-200 pl-3 m-0">
          <span className="text-amber-600">★ </span>{rx.notes}
        </p>
      )}
    </div>
  );
}

function ReagentCard({ reagent, isOpen, onToggle }: { reagent: ReagentEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
      isOpen ? "border-violet-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
    }`}>
      <button onClick={onToggle}
        className="w-full bg-transparent border-none px-5 py-4 flex items-center justify-between cursor-pointer gap-3 text-left">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-black px-3 py-1 rounded-lg font-mono whitespace-nowrap tracking-wide">
            {reagent.formula}
          </span>
          <div className="min-w-0">
            <div className="text-slate-900 text-sm font-bold mb-0.5">{reagent.name}</div>
            <div className="text-slate-500 text-xs truncate">{reagent.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {reagent.reactions.length} rxn{reagent.reactions.length !== 1 ? "s" : ""}
          </span>
          <span className={`text-slate-400 text-sm inline-block transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
          {reagent.reactions.map((rx: ReactionEntry, idx: number) => (
            <ReactionRow key={idx} rx={rx} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReagentsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return REAGENTS.filter((r) => {
      const matchCat = activeCategory === "All" || r.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      if (r.name.toLowerCase().includes(q) || r.formula.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) return true;
      return r.reactions.some((rx) =>
        rx.substrate.toLowerCase().includes(q) || rx.product.toLowerCase().includes(q) ||
        rx.type.toLowerCase().includes(q) || (rx.notes && rx.notes.toLowerCase().includes(q))
      );
    });
  }, [search, activeCategory]);

  const totalReactions = filtered.reduce((s, r) => s + r.reactions.length, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Sticky header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto">
          {/* Nav */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">← Dashboard</Link>
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Reagent Explorer</span>
          </div>

          {/* Title */}
          <div className="mb-4">
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              🧪 Reagents <span className="text-violet-600">Explorer</span>
            </h1>
            <p className="text-sm text-slate-500">
              {filtered.length} reagent{filtered.length !== 1 ? "s" : ""} · {totalReactions} reactions · JEE Mains &amp; Advanced
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
            <input type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setOpenId(null); }}
              placeholder="Search reagent, formula, substrate, product, reaction type…"
              className="w-full bg-white border border-slate-200 rounded-xl text-slate-800 text-sm pl-9 pr-10 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg bg-transparent border-none cursor-pointer">
                ×
              </button>
            )}
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 flex-wrap">
            {["All", ...REAGENT_CATEGORIES].map((cat) => (
              <button key={cat} onClick={() => { setCategory(cat); setOpenId(null); }}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-violet-50 border-violet-300 text-violet-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reagent list */}
      <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center text-slate-400 py-20 text-sm font-medium">
            No reagents match your query
          </div>
        ) : (
          filtered.map((reagent) => (
            <ReagentCard key={reagent.id} reagent={reagent}
              isOpen={openId === reagent.id}
              onToggle={() => setOpenId(openId === reagent.id ? null : reagent.id)} />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex gap-4 flex-wrap items-center shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Legend</span>
          {[
            { color: "bg-amber-400",  label: "Electrophilic" },
            { color: "bg-blue-500",   label: "Nucleophilic"  },
            { color: "bg-red-500",    label: "Free Radical"  },
            { color: "bg-violet-500", label: "Elimination"   },
            { color: "bg-emerald-500",label: "Oxidation"     },
            { color: "bg-teal-500",   label: "Reduction"     },
            { color: "bg-yellow-400", label: "EAS"           },
            { color: "bg-slate-400",  label: "No Reaction"   },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
