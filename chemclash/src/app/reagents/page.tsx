"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { REAGENTS, REAGENT_CATEGORIES } from "@/data/reagents";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReactionEntry {
  substrate: string;
  product: string;
  conditions: string;
  type: string;
  notes?: string;
}

interface ReagentEntry {
  id: string;
  name: string;
  formula: string;
  category: string;
  description: string;
  reactions: ReactionEntry[];
}

interface BadgeStyle {
  bg: string;
  border: string;
  text: string;
}

// ─── Reaction type badge colours ──────────────────────────────────────────────
const TYPE_COLORS: Record<string, BadgeStyle> = {
  "Electrophilic Addition":         { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  text: "#f59e0b" },
  "Nucleophilic Addition":          { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.4)",  text: "#3b82f6" },
  "Nucleophilic Substitution":      { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.4)",  text: "#3b82f6" },
  "Free Radical":                   { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   text: "#ef4444" },
  "Elimination":                    { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.4)",  text: "#a855f7" },
  "Oxidation":                      { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  text: "#10b981" },
  "Reduction":                      { bg: "rgba(0,255,136,0.12)",   border: "rgba(0,255,136,0.4)",   text: "#00ff88" },
  "EAS":                            { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)",  text: "#fbbf24" },
  "No reaction":                    { bg: "rgba(107,114,128,0.1)",  border: "rgba(107,114,128,0.3)", text: "#6b7280" },
  "default":                        { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.4)",  text: "#6366f1" },
};

function typeBadgeStyle(type = ""): BadgeStyle {
  const key = Object.keys(TYPE_COLORS).find((k) => k !== "default" && type.includes(k));
  return key ? TYPE_COLORS[key] : TYPE_COLORS["default"];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReactionRow({ rx, idx }: { rx: ReactionEntry; idx: number }) {
  const badge = typeBadgeStyle(rx.type);
  return (
    <div
      style={{
        borderTop: idx === 0 ? "none" : "1px solid #1f2937",
        paddingTop: idx === 0 ? 0 : 14,
        marginTop: idx === 0 ? 0 : 14,
      }}
    >
      {/* Substrate → Product */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: "#e5e7eb", fontSize: "0.82rem", fontWeight: 600, minWidth: 120 }}>
          {rx.substrate}
        </span>
        <span style={{ color: "#374151", fontSize: "0.82rem" }}>→</span>
        <span style={{ color: "#00ff88", fontSize: "0.82rem", fontWeight: 600 }}>
          {rx.product}
        </span>
      </div>

      {/* Type badge + conditions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
        <span
          style={{
            fontSize: "0.62rem",
            padding: "2px 8px",
            borderRadius: 999,
            background: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          {rx.type}
        </span>
        {rx.conditions && rx.conditions !== "—" && (
          <span style={{ color: "#6b7280", fontSize: "0.72rem" }}>
            Conditions: <span style={{ color: "#9ca3af" }}>{rx.conditions}</span>
          </span>
        )}
      </div>

      {/* JEE note */}
      {rx.notes && (
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.72rem",
            margin: 0,
            lineHeight: 1.6,
            borderLeft: "2px solid #1f2937",
            paddingLeft: 10,
          }}
        >
          <span style={{ color: "#f59e0b" }}>⚑ </span>{rx.notes}
        </p>
      )}
    </div>
  );
}

function ReagentCard({ reagent, isOpen, onToggle }: { reagent: ReagentEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        background: "#111820",
        border: `1px solid ${isOpen ? "rgba(167,139,250,0.5)" : "#1e2d3d"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: isOpen ? "0 0 24px rgba(167,139,250,0.1)" : "none",
      }}
    >
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          gap: 12,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
          {/* Formula pill */}
          <span
            style={{
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.25)",
              color: "#00ff88",
              fontSize: "0.78rem",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 6,
              fontFamily: "Courier New, monospace",
              whiteSpace: "nowrap",
              letterSpacing: "0.04em",
            }}
          >
            {reagent.formula}
          </span>

          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#ffffff", fontSize: "0.88rem", fontWeight: 700, marginBottom: 2, letterSpacing: "0.03em" }}>
              {reagent.name}
            </div>
            <div style={{ color: "#6b7280", fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {reagent.description}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Reaction count badge */}
          <span
            style={{
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#3b82f6",
              fontSize: "0.65rem",
              padding: "2px 8px",
              borderRadius: 999,
              letterSpacing: "0.06em",
            }}
          >
            {reagent.reactions.length} rxn{reagent.reactions.length !== 1 ? "s" : ""}
          </span>

          {/* Chevron */}
          <span
            style={{
              color: "#6b7280",
              fontSize: "0.9rem",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded reaction table */}
      {isOpen && (
        <div
          style={{
            borderTop: "1px solid #1f2937",
            padding: "16px 20px",
            background: "#0d0d0d",
          }}
        >
          {reagent.reactions.map((rx: ReactionEntry, idx: number) => (
            <ReactionRow key={idx} rx={rx} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReagentsPage() {
  const [search, setSearch]           = useState("");
  const [activeCategory, setCategory] = useState("All");
  const [openId, setOpenId]           = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return REAGENTS.filter((r) => {
      const matchCat = activeCategory === "All" || r.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      if (
        r.name.toLowerCase().includes(q) ||
        r.formula.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      ) return true;
      // deep search into reaction text
      return r.reactions.some(
        (rx) =>
          rx.substrate.toLowerCase().includes(q) ||
          rx.product.toLowerCase().includes(q) ||
          rx.type.toLowerCase().includes(q) ||
          (rx.notes && rx.notes.toLowerCase().includes(q))
      );
    });
  }, [search, activeCategory]);

  const totalReactions = filtered.reduce((s, r) => s + r.reactions.length, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c10",
        fontFamily: "Courier New, monospace",
        paddingBottom: 60,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "rgba(8,12,16,0.96)",
          borderBottom: "1px solid #1e2d3d",
          padding: "20px 24px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Nav row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Link href="/" style={{ color: "#475569", fontSize: "0.78rem", textDecoration: "none" }}>
              ← Dashboard
            </Link>
            <span style={{ color: "#334155", fontSize: "0.65rem", letterSpacing: "0.15em" }}>
              // REAGENT EXPLORER
            </span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ color: "#e2e8f0", fontSize: "1.5rem", fontWeight: 900, margin: "0 0 4px", letterSpacing: "0.04em" }}>
              🧪 Reagents{" "}
              <span style={{ color: "#a78bfa" }}>Explorer</span>
            </h1>
            <p style={{ color: "#475569", fontSize: "0.75rem", margin: 0 }}>
              {filtered.length} reagent{filtered.length !== 1 ? "s" : ""} ·{" "}
              {totalReactions} reactions · JEE Mains &amp; Advanced
            </p>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#475569",
              fontSize: "0.85rem", pointerEvents: "none",
            }}>
              ⌕
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpenId(null); }}
              placeholder="Search reagent, formula, substrate, product, reaction type…"
              style={{
                width: "100%",
                background: "#0d1117",
                border: "1px solid #1e2d3d",
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: "0.82rem",
                padding: "10px 12px 10px 34px",
                fontFamily: "Courier New, monospace",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#a78bfa"; (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#1e2d3d"; (e.currentTarget as HTMLInputElement).style.boxShadow = "none"; }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute", right: 10, top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent", border: "none",
                  color: "#475569", cursor: "pointer",
                  fontSize: "1rem", lineHeight: 1, padding: 0,
                  transition: "color 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
              >
                ×
              </button>
            )}
          </div>

          {/* Category filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", ...REAGENT_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setOpenId(null); }}
                style={{
                  background: activeCategory === cat ? "rgba(167,139,250,0.12)" : "transparent",
                  border: `1px solid ${activeCategory === cat ? "rgba(167,139,250,0.4)" : "#1e2d3d"}`,
                  color: activeCategory === cat ? "#a78bfa" : "#475569",
                  fontSize: "0.62rem",
                  padding: "4px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: "Courier New, monospace",
                  letterSpacing: "0.08em",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  fontWeight: activeCategory === cat ? 700 : 400,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Reagent list ── */}
      <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", color: "#263245",
            padding: "80px 0", fontSize: "0.82rem",
            letterSpacing: "0.14em",
          }}>
            // NO REAGENTS MATCH YOUR QUERY
          </div>
        ) : (
          filtered.map((reagent) => (
            <ReagentCard
              key={reagent.id}
              reagent={reagent}
              isOpen={openId === reagent.id}
              onToggle={() => setOpenId(openId === reagent.id ? null : reagent.id)}
            />
          ))
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        <div style={{
          background: "#111820",
          border: "1px solid #1e2d3d",
          borderRadius: 10,
          padding: "12px 18px",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span style={{ color: "#263245", fontSize: "0.62rem", letterSpacing: "0.12em" }}>// LEGEND</span>
          {[
            { color: "#f59e0b", label: "Electrophilic" },
            { color: "#3b82f6", label: "Nucleophilic" },
            { color: "#ef4444", label: "Free Radical" },
            { color: "#a855f7", label: "Elimination" },
            { color: "#10b981", label: "Oxidation" },
            { color: "#00ff88", label: "Reduction" },
            { color: "#fbbf24", label: "EAS" },
            { color: "#64748b", label: "No Reaction" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
              <span style={{ color: "#475569", fontSize: "0.65rem" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
