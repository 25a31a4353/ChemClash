"use client";

/**
 * ChemClash — Skill Tree / Mastery
 *
 * Derives node status from localStorage completions written by the
 * curriculum page (key: "chemclash_completed_<module_id>").
 *
 * Status rules:
 *  Mastered  — localStorage has a completion record for this module_id
 *  Available — tier 1 always, OR any tier-N node where ≥1 tier-(N-1)
 *               node is Mastered
 *  Locked    — otherwise
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ── Static tree definition ─────────────────────────────────────────────────
// Derived from concept_tree.json; only module_id / title / tier / route needed.

interface TreeNode {
  id: string;
  title: string;
  tier: number;               // 1 = basics, 2 = medium, 3 = advanced
  tags: string[];
  href: string;               // click-through learning destination
  hrefLabel: string;
}

const TREE_NODES: TreeNode[] = [
  // ── Tier 1 — Basics ──────────────────────────────────────────────────────
  { id: "bas_01", title: "Lewis Structures & Bonding",    tier: 1, tags: ["lewis_structure","covalent_bond","lone_pairs"],      href: "/curriculum", hrefLabel: "Learn" },
  { id: "bas_02", title: "Electronegativity & Polarity",  tier: 1, tags: ["electronegativity","polarity","dipole_moment"],      href: "/curriculum", hrefLabel: "Learn" },
  { id: "bas_03", title: "Resonance Structures",          tier: 1, tags: ["resonance","delocalization","formal_charge"],        href: "/curriculum", hrefLabel: "Learn" },
  { id: "bas_04", title: "Nucleophiles & Electrophiles",  tier: 1, tags: ["nucleophile","electrophile","lewis_acid"],           href: "/curriculum", hrefLabel: "Learn" },
  { id: "bas_05", title: "Functional Groups Overview",    tier: 1, tags: ["functional_groups","carbonyl","amine"],              href: "/curriculum", hrefLabel: "Learn" },
  // ── Tier 2 — Medium ──────────────────────────────────────────────────────
  { id: "med_01", title: "Curved Arrow Notation",         tier: 2, tags: ["arrow_pushing","electron_flow","mechanism"],         href: "/mechanism-builder", hrefLabel: "Practice" },
  { id: "med_02", title: "Carbocation Stability",         tier: 2, tags: ["carbocation","stability","rearrangement"],           href: "/adaptive-pyq",      hrefLabel: "Practice" },
  { id: "med_03", title: "SN1 and SN2 Mechanisms",        tier: 2, tags: ["SN1","SN2","inversion","leaving_group"],             href: "/adaptive-pyq",      hrefLabel: "Practice" },
  { id: "med_04", title: "E1 and E2 Elimination",         tier: 2, tags: ["E1","E2","Zaitsev","anti_periplanar"],               href: "/adaptive-pyq",      hrefLabel: "Practice" },
  { id: "med_05", title: "Stereochemistry",               tier: 2, tags: ["chirality","R_S","enantiomer","diastereomer"],       href: "/curriculum", hrefLabel: "Learn" },
  { id: "med_06", title: "Electrophilic Addition",        tier: 2, tags: ["Markovnikov","bromonium_ion","anti_addition"],       href: "/watch-execute",     hrefLabel: "Watch" },
  // ── Tier 3 — Advanced ────────────────────────────────────────────────────
  { id: "adv_01", title: "Electrophilic Aromatic Sub.",   tier: 3, tags: ["EAS","directing_effects","nitration"],               href: "/adaptive-pyq",      hrefLabel: "Practice" },
  { id: "adv_02", title: "Carbonyl — Nucleophilic Add.",  tier: 3, tags: ["Grignard","hemiacetal","hydride_reduction"],         href: "/mechanism-builder", hrefLabel: "Practice" },
  { id: "adv_03", title: "Aldol Condensation",            tier: 3, tags: ["enolate","aldol","condensation"],                    href: "/adaptive-pyq",      hrefLabel: "Practice" },
  { id: "adv_04", title: "Retrosynthetic Analysis",       tier: 3, tags: ["retrosynthesis","synthon","FGI"],                    href: "/curriculum", hrefLabel: "Learn" },
  { id: "adv_05", title: "Oxidation & Reduction",         tier: 3, tags: ["PCC","LiAlH4","ozonolysis","selective_reduction"],   href: "/curriculum", hrefLabel: "Learn" },
  { id: "adv_06", title: "Acyl Substitution",             tier: 3, tags: ["ester","saponification","Fischer_esterification"],   href: "/mechanism-builder", hrefLabel: "Practice" },
];

const TIERS = [1, 2, 3];
const TIER_LABELS: Record<number, string> = { 1: "Basics", 2: "Intermediate", 3: "Advanced" };
const TIER_COLOR: Record<number, { badge: string; dot: string; connector: string; nodeAvail: string; nodeMastered: string }> = {
  1: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500", connector: "bg-emerald-200", nodeAvail: "border-emerald-300 bg-emerald-50",   nodeMastered: "border-emerald-500 bg-emerald-100" },
  2: { badge: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-500",    connector: "bg-blue-200",    nodeAvail: "border-blue-300 bg-blue-50",           nodeMastered: "border-blue-500 bg-blue-100" },
  3: { badge: "bg-violet-50 text-violet-700 border-violet-200",     dot: "bg-violet-500",  connector: "bg-violet-200",  nodeAvail: "border-violet-300 bg-violet-50",       nodeMastered: "border-violet-500 bg-violet-100" },
};

// ── localStorage key helper ────────────────────────────────────────────────

export const LS_MODULE_KEY = (id: string) => `chemclash_completed_${id}`;

/**
 * Explicit mapping: Skill Tree node.id → Curriculum module_id (from concept_tree.json).
 * The backend module_ids for the 17 primary nodes are identical to the node ids used
 * here (bas_01…bas_05, med_01…med_06, adv_01…adv_06), so no translation is needed.
 * The concept_* modules in concept_tree.json (concept_sn2, concept_sn1, etc.) have no
 * corresponding Skill Tree node and are intentionally ignored by this map.
 *
 * When the Curriculum page writes:
 *   localStorage.setItem(`chemclash_completed_${module_id}`, "1")
 * and module_id is e.g. "med_03", this Skill Tree reads:
 *   localStorage.getItem(`chemclash_completed_med_03`) === "1"  → marks node mastered ✓
 */
const NODE_MODULE_IDS: Record<string, string> = {
  bas_01: "bas_01", bas_02: "bas_02", bas_03: "bas_03", bas_04: "bas_04", bas_05: "bas_05",
  med_01: "med_01", med_02: "med_02", med_03: "med_03", med_04: "med_04", med_05: "med_05", med_06: "med_06",
  adv_01: "adv_01", adv_02: "adv_02", adv_03: "adv_03", adv_04: "adv_04", adv_05: "adv_05", adv_06: "adv_06",
};

// ── Status derivation ─────────────────────────────────────────────────────

type NodeStatus = "mastered" | "available" | "locked";

function deriveStatuses(masteredIds: Set<string>): Map<string, NodeStatus> {
  const map = new Map<string, NodeStatus>();

  for (const node of TREE_NODES) {
    if (masteredIds.has(node.id)) {
      map.set(node.id, "mastered");
      continue;
    }
    if (node.tier === 1) {
      map.set(node.id, "available");
      continue;
    }
    // Available if any node in the previous tier is mastered
    const prevTierMastered = TREE_NODES.some(
      (n) => n.tier === node.tier - 1 && masteredIds.has(n.id)
    );
    map.set(node.id, prevTierMastered ? "available" : "locked");
  }

  return map;
}

// ── Skill node card ────────────────────────────────────────────────────────

interface NodeCardProps {
  node: TreeNode;
  status: NodeStatus;
}

function NodeCard({ node, status }: NodeCardProps) {
  const tc = TIER_COLOR[node.tier];
  const isLocked   = status === "locked";
  const isMastered = status === "mastered";

  const borderCls = isLocked
    ? "border-slate-200 bg-slate-50 opacity-50"
    : isMastered
    ? tc.nodeMastered
    : tc.nodeAvail;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${borderCls} ${isLocked ? "cursor-not-allowed" : "hover:shadow-sm"}`}>
      {/* Status + tier badge row */}
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className={`text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${tc.badge}`}>
          Tier {node.tier}
        </span>
        <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${
          isMastered ? "text-emerald-600" : isLocked ? "text-slate-300" : "text-slate-500"
        }`}>
          {isMastered ? "✓ Mastered" : isLocked ? "🔒 Locked" : "● Available"}
        </span>
      </div>

      {/* Title */}
      <p className={`text-sm font-bold leading-snug mb-2 ${isLocked ? "text-slate-400" : "text-slate-800"}`}>
        {node.title}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {node.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-400 font-medium">
            #{t}
          </span>
        ))}
      </div>

      {/* CTA */}
      {!isLocked && (
        <Link
          href={node.href}
          className={`inline-flex items-center text-xs font-bold no-underline transition-colors rounded-lg px-3 py-1.5 ${
            isMastered
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          {isMastered ? "Review" : node.hrefLabel} →
        </Link>
      )}
    </div>
  );
}

// ── Connector line between tiers ───────────────────────────────────────────

function TierConnector({ tier }: { tier: number }) {
  const tc = TIER_COLOR[tier];
  return (
    <div className="flex flex-col items-center py-2">
      <div className={`w-0.5 h-8 ${tc.connector}`} />
      <div className={`w-2 h-2 rounded-full ${tc.dot}`} />
      <div className={`w-0.5 h-8 ${tc.connector}`} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SkillTreePage() {
  const eloRating = useChemStore((s) => s.eloRating);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  // Read completions from localStorage on mount and whenever localStorage changes
  // (e.g. the user completes a Curriculum module in the same or another tab).
  useEffect(() => {
    function readMastered() {
      const ids = new Set<string>();
      for (const node of TREE_NODES) {
        const moduleId = NODE_MODULE_IDS[node.id] ?? node.id;
        if (localStorage.getItem(LS_MODULE_KEY(moduleId)) === "1") {
          ids.add(node.id);
        }
      }
      setMasteredIds(ids);
    }

    readMastered();

    // Keep in sync if Curriculum writes to localStorage after this page mounts
    window.addEventListener("storage", readMastered);
    return () => window.removeEventListener("storage", readMastered);
  }, []);

  const statuses = deriveStatuses(masteredIds);
  const masteredCount  = [...statuses.values()].filter((s) => s === "mastered").length;
  const availableCount = [...statuses.values()].filter((s) => s === "available").length;
  const total          = TREE_NODES.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-600 text-xs font-semibold tracking-wide uppercase">Skill Tree</span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10 pb-24">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2">Mastery Map</p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">🌳 Skill Tree</h1>
          <p className="text-sm text-slate-500 mb-5">
            Complete curriculum modules to unlock higher tiers. Your progress is tracked locally.
          </p>

          {/* Summary bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-emerald-500 font-black text-lg">{masteredCount}</span>
              <span className="text-xs text-slate-500 font-semibold">/ {total} Mastered</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-blue-500 font-black text-lg">{availableCount}</span>
              <span className="text-xs text-slate-500 font-semibold">Available now</span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="flex justify-between text-[0.65rem] text-slate-400 mb-1">
                <span>Overall progress</span>
                <span>{Math.round((masteredCount / total) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${(masteredCount / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-8 flex-wrap text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Mastered</span>
          <span className="flex items-center gap-1.5"><span className="text-slate-600">●</span> Available</span>
          <span className="flex items-center gap-1.5"><span className="text-slate-400">🔒</span> Locked</span>
        </div>

        {/* Tree — rendered as stacked tiers with connectors */}
        {TIERS.map((tier, tIdx) => {
          const nodes = TREE_NODES.filter((n) => n.tier === tier);
          const tc = TIER_COLOR[tier];
          return (
            <div key={tier}>
              {/* Connector from previous tier */}
              {tIdx > 0 && <TierConnector tier={tier - 1} />}

              {/* Tier header */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${tc.badge}`}>
                  {TIER_LABELS[tier]}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">
                  {nodes.filter((n) => statuses.get(n.id) === "mastered").length}/{nodes.length} mastered
                </span>
              </div>

              {/* Node grid */}
              <div
                className="grid gap-3 mb-2"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
              >
                {nodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    status={statuses.get(node.id) ?? "locked"}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty-state nudge if nothing mastered */}
        {masteredCount === 0 && (
          <div className="mt-10 text-center bg-white border border-slate-200 rounded-xl p-8">
            <p className="text-base font-bold text-slate-700 mb-2">Start with Tier 1</p>
            <p className="text-sm text-slate-500 mb-4">
              Complete any Basics module in the Curriculum to begin unlocking the tree.
            </p>
            <Link
              href="/curriculum"
              className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-xl no-underline transition-colors"
            >
              Go to Curriculum →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
