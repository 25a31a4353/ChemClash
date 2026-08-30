"use client";

import React, { useState, useMemo } from "react";
import defaultOrganicDB from "@/data/organic_db.json";

// ═════════════════════════════════════════════════════════════════
// 1. DATA CONTRACT & TYPES
// ═════════════════════════════════════════════════════════════════

export interface ReagentItem {
  name: string;
  function: string;
  example: string;
}

export interface NamedReactionItem {
  name: string;
  reactants: string;
  products: string;
}

export interface BasicRuleItem {
  rule: string;
  definition: string;
}

export interface CoreConceptItem {
  concept: string;
  details?: string;
  core_rule?: string;
  exception?: string;
  keywords?: string;
}

export interface OrganicDatabase {
  reagents: ReagentItem[];
  named_reactions: NamedReactionItem[];
  basic_rules: BasicRuleItem[];
  core_concepts: CoreConceptItem[];
}

export type CategoryKey = keyof OrganicDatabase;

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  description: string;
  icon: string;
}

export const CATEGORIES_CONFIG: CategoryMeta[] = [
  {
    key: "reagents",
    label: "Reagents & Catalysts",
    description: "Reagent names, synthetic functions, and typical reactions",
    icon: "🧪",
  },
  {
    key: "named_reactions",
    label: "Named Reactions",
    description: "Key named mechanisms with reactants and expected products",
    icon: "⚗️",
  },
  {
    key: "basic_rules",
    label: "Fundamental Rules",
    description: "Zaitsev, Markovnikov, Hückel, CIP priority, and core principles",
    icon: "📜",
  },
  {
    key: "core_concepts",
    label: "Core Mechanisms",
    description: "SN1/SN2, EAS directing groups, carbocation shifts, and exceptions",
    icon: "🧬",
  },
];

// ═════════════════════════════════════════════════════════════════
// 2. MODULAR CLIENT-SIDE PDF GENERATOR FUNCTION
// ═════════════════════════════════════════════════════════════════

export async function generateCustomCheatSheetPDF(
  data: OrganicDatabase,
  selectedCategories: Record<CategoryKey, boolean>,
  customTitle: string = "ChemClash — Organic Chemistry Master Reference"
): Promise<void> {
  // Dynamically import to ensure SSR-safety in Next.js
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Calculate selected summary stats
  const activeKeys = (Object.keys(selectedCategories) as CategoryKey[]).filter(
    (k) => selectedCategories[k] && data[k]?.length > 0
  );

  if (activeKeys.length === 0) {
    throw new Error("No categories selected for PDF export.");
  }

  // Common styling tokens
  const primaryColor: [number, number, number] = [0, 255, 136]; // ChemClash Neon Green
  const headerBgColor: [number, number, number] = [17, 24, 32];
  const darkBgColor: [number, number, number] = [8, 12, 16];
  const textColor: [number, number, number] = [226, 232, 240];
  const borderColor: [number, number, number] = [30, 45, 61];

  let currentY = 24;

  // ── First Page Header Banner ───────────────────────────────────
  doc.setFillColor(...darkBgColor);
  doc.rect(0, 0, pageW, 20, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(customTitle, 12, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Exported: ${dateStr} · Categories: ${activeKeys.length} · ChemClash Platform`,
    pageW - 12,
    12,
    { align: "right" }
  );

  // ── Helper to check if new section fits or needs a page break ──
  const ensureSpace = (requiredHeightMm: number) => {
    if (currentY + requiredHeightMm > pageH - 18) {
      doc.addPage();
      currentY = 16;
    }
  };

  // ── 1. Reagents Table ──────────────────────────────────────────
  if (selectedCategories.reagents && data.reagents?.length > 0) {
    ensureSpace(20);

    // Section sub-heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(`1. Reagents & Catalysts (${data.reagents.length} items)`, 12, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [["Reagent / Catalyst", "Chemical Function & Mechanism Role", "Typical Example Reaction"]],
      body: data.reagents.map((r) => [r.name, r.function, r.example]),
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold", textColor: [0, 220, 120] },
        1: { cellWidth: 120 },
        2: { cellWidth: 98, fontStyle: "italic", textColor: [203, 213, 225] },
      },
      headStyles: {
        fillColor: headerBgColor,
        textColor: primaryColor,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: textColor,
        lineColor: borderColor,
        lineWidth: 0.15,
        valign: "top",
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [13, 19, 27] },
      styles: { fillColor: [8, 14, 22], overflow: "linebreak" },
      margin: { left: 12, right: 12 },
      rowPageBreak: "auto",
      showHead: "everyPage",
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 2. Named Reactions Table ───────────────────────────────────
  if (selectedCategories.named_reactions && data.named_reactions?.length > 0) {
    ensureSpace(20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(`2. Named Reactions & Transformations (${data.named_reactions.length} items)`, 12, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [["Named Reaction", "Key Reactants & Conditions", "Typical Products & Regiochemistry"]],
      body: data.named_reactions.map((nr) => [nr.name, nr.reactants, nr.products]),
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold", textColor: [56, 189, 248] },
        1: { cellWidth: 105 },
        2: { cellWidth: 113 },
      },
      headStyles: {
        fillColor: headerBgColor,
        textColor: [56, 189, 248],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: textColor,
        lineColor: borderColor,
        lineWidth: 0.15,
        valign: "top",
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [13, 19, 27] },
      styles: { fillColor: [8, 14, 22], overflow: "linebreak" },
      margin: { left: 12, right: 12 },
      rowPageBreak: "auto",
      showHead: "everyPage",
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 3. Basic Rules Table ───────────────────────────────────────
  if (selectedCategories.basic_rules && data.basic_rules?.length > 0) {
    ensureSpace(20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(`3. Fundamental Rules & Principles (${data.basic_rules.length} items)`, 12, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [["Rule / Principle", "Definition & Application in Exam Problems"]],
      body: data.basic_rules.map((br) => [br.rule, br.definition]),
      columnStyles: {
        0: { cellWidth: 65, fontStyle: "bold", textColor: [251, 191, 36] },
        1: { cellWidth: 208 },
      },
      headStyles: {
        fillColor: headerBgColor,
        textColor: [251, 191, 36],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: textColor,
        lineColor: borderColor,
        lineWidth: 0.15,
        valign: "top",
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [13, 19, 27] },
      styles: { fillColor: [8, 14, 22], overflow: "linebreak" },
      margin: { left: 12, right: 12 },
      rowPageBreak: "auto",
      showHead: "everyPage",
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 4. Core Concepts Table ─────────────────────────────────────
  if (selectedCategories.core_concepts && data.core_concepts?.length > 0) {
    ensureSpace(20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(`4. Core Concepts & Electronic Effects (${data.core_concepts.length} items)`, 12, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [["Core Concept / Intermediate", "Chemical Principles, Electronic Effects & Applications"]],
      body: data.core_concepts.map((cc) => [
        cc.concept,
        cc.details || cc.core_rule || "",
      ]),
      columnStyles: {
        0: { cellWidth: 70, fontStyle: "bold", textColor: [167, 139, 250] },
        1: { cellWidth: 203 },
      },
      headStyles: {
        fillColor: headerBgColor,
        textColor: [167, 139, 250],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: textColor,
        lineColor: borderColor,
        lineWidth: 0.15,
        valign: "top",
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [13, 19, 27] },
      styles: { fillColor: [8, 14, 22], overflow: "linebreak" },
      margin: { left: 12, right: 12 },
      rowPageBreak: "auto",
      showHead: "everyPage",
    });
  }

  // ── Global Footers on Every Page ───────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `ChemClash Study Guide · Page ${p} of ${totalPages}`,
      pageW / 2,
      pageH - 4,
      { align: "center" }
    );
  }

  doc.save("ChemClash_Custom_Guide.pdf");
}

// ═════════════════════════════════════════════════════════════════
// 3. REACT SELECTION UI COMPONENT
// ═════════════════════════════════════════════════════════════════

export interface CheatSheetDownloaderProps {
  /** Optional custom dataset (defaults to modular organic_db.json) */
  dataset?: OrganicDatabase;
  /** Optional title override */
  title?: string;
  /** Optional custom className container wrapper */
  className?: string;
}

export default function CheatSheetDownloader({
  dataset = defaultOrganicDB as OrganicDatabase,
  title = "Custom PDF Cheat Sheet Export",
  className = "",
}: CheatSheetDownloaderProps) {
  // Selection state for each category
  const [selected, setSelected] = useState<Record<CategoryKey, boolean>>({
    reagents: true,
    named_reactions: true,
    basic_rules: true,
    core_concepts: true,
  });

  const [downloadStatus, setDownloadStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Toggle single category
  const toggleCategory = (key: CategoryKey) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Select all or deselect all
  const setAll = (state: boolean) => {
    setSelected({
      reagents: state,
      named_reactions: state,
      basic_rules: state,
      core_concepts: state,
    });
  };

  // Metrics computation
  const { totalSelectedItems, totalAvailableItems, selectedCount } = useMemo(() => {
    let selItems = 0;
    let availItems = 0;
    let selCats = 0;

    CATEGORIES_CONFIG.forEach(({ key }) => {
      const count = dataset[key]?.length || 0;
      availItems += count;
      if (selected[key]) {
        selItems += count;
        selCats += 1;
      }
    });

    return {
      totalSelectedItems: selItems,
      totalAvailableItems: availItems,
      selectedCount: selCats,
    };
  }, [dataset, selected]);

  // Handle PDF Generation
  const handleDownload = async () => {
    if (selectedCount === 0) return;
    setDownloadStatus("generating");
    setErrorMessage("");

    try {
      await generateCustomCheatSheetPDF(dataset, selected);
      setDownloadStatus("success");
      setTimeout(() => setDownloadStatus("idle"), 3000);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setErrorMessage(err?.message || "An unexpected error occurred during PDF generation.");
      setDownloadStatus("error");
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-[#0d131a] p-6 shadow-2xl backdrop-blur-md ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs tracking-widest uppercase">
              // STUDY ARSENAL
            </span>
            <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-800/50">
              {totalSelectedItems} / {totalAvailableItems} items active
            </span>
          </div>
          <h2 className="mt-1 font-mono text-lg font-bold text-white tracking-wide">
            {title}
          </h2>
          <p className="text-xs text-slate-400">
            Choose the categories you want to include in your personalized PDF reference guide.
          </p>
        </div>

        {/* Quick select controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ── Category Selection Cards Grid ─────────────────────── */}
      <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CATEGORIES_CONFIG.map((cat) => {
          const isChecked = selected[cat.key];
          const itemCount = dataset[cat.key]?.length || 0;

          return (
            <label
              key={cat.key}
              htmlFor={`cat-${cat.key}`}
              className={`group relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 ${
                isChecked
                  ? "border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                  : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              {/* Checkbox */}
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  id={`cat-${cat.key}`}
                  checked={isChecked}
                  onChange={() => toggleCategory(cat.key)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
                />
              </div>

              {/* Category Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                      isChecked
                        ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {itemCount} items
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* ── Download Action Bar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
        <div className="text-xs text-slate-400 font-mono">
          {selectedCount === 0 ? (
            <span className="text-amber-400 flex items-center gap-1">
              ⚠️ Please select at least 1 category
            </span>
          ) : (
            <span>
              Target: <strong className="text-slate-200">{selectedCount}</strong>{" "}
              categories (<strong className="text-emerald-400">{totalSelectedItems}</strong>{" "}
              records)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={selectedCount === 0 || downloadStatus === "generating"}
          className={`relative inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            selectedCount === 0
              ? "cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-600"
              : downloadStatus === "success"
              ? "border border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.6)]"
              : "border border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {downloadStatus === "generating" ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              <span>Generating PDF…</span>
            </>
          ) : downloadStatus === "success" ? (
            <>
              <span>✓</span>
              <span>Guide Downloaded!</span>
            </>
          ) : (
            <>
              <span>⬇</span>
              <span>Generate Custom PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {downloadStatus === "error" && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/20 p-2.5 text-xs text-red-400">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
