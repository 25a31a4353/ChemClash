"use client";

/**
 * DownloadCheatSheet.tsx
 * ─────────────────────────────────────────────────────────────────
 * Generates and downloads a professionally formatted PDF of the
 * Organic Chemistry concept cheat sheet entirely in the browser.
 *
 * Libraries: jspdf + jspdf-autotable (dynamically imported so
 * Next.js does not attempt to SSR them — they need window/document).
 *
 * Usage:
 *   import DownloadCheatSheet from "@/components/DownloadCheatSheet";
 *   <DownloadCheatSheet />
 *
 * No backend calls — 100% client-side PDF generation.
 */

import { useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// DATA  (sourced from chem_master_data.json / concept_sn2 … etc.)
// Extend this array to include more rows — the table auto-paginates.
// ─────────────────────────────────────────────────────────────────

export interface ChemConcept {
  concept: string;
  coreRule: string;
  exception: string;
  keywords: string;
}

export const CHEM_CONCEPTS: ChemConcept[] = [
  {
    concept: "SN2",
    coreRule:
      "Concerted backside attack by nucleophile; leaving group departs simultaneously. Rate = k[Nu][substrate].",
    exception:
      "Neopentyl halides are primary yet react extremely slowly — the adjacent quaternary carbon blocks the backside trajectory.",
    keywords: "backside attack · inversion · Walden · primary · polar aprotic",
  },
  {
    concept: "SN1",
    coreRule:
      "Two-step: slow ionisation → planar carbocation; fast Nu attack on either face. Rate = k[substrate] only.",
    exception:
      "Allylic/benzylic secondaries react via SN1 readily because resonance stabilises the carbocation intermediate.",
    keywords: "carbocation · racemisation · tertiary · polar protic",
  },
  {
    concept: "E2 Elimination",
    coreRule:
      "Concerted; strong base, anti-periplanar H–C–C–LG (180°). Zaitsev product unless bulky base → Hofmann.",
    exception:
      "Cyclohexane rings need diaxial H and LG. A cis-LG cannot reach anti-periplanar and reacts far more slowly.",
    keywords: "anti-periplanar · Zaitsev · diaxial · KOtBu · second-order",
  },
  {
    concept: "Markovnikov's Rule",
    coreRule:
      "H adds to the carbon with more H's (forms more stable carbocation); X adds to the other carbon.",
    exception:
      "HBr + ROOR → radical chain → anti-Markovnikov (1-bromopropane from propene). ONLY HBr, not HCl or HI.",
    keywords: "electrophilic addition · carbocation · regioselectivity · HBr · radical",
  },
  {
    concept: "Aldol Condensation",
    coreRule:
      "Enolate attacks another C=O → β-hydroxy carbonyl (aldol product); heat/acid → dehydration → α,β-unsaturated carbonyl.",
    exception:
      "Crossed aldol is useful ONLY when one partner has no α-H (e.g., PhCHO + CH3CHO → cinnamaldehyde). Otherwise 4-product mix.",
    keywords: "enolate · α-carbon · dehydration · cross aldol · Robinson annulation",
  },
  {
    concept: "EAS Directing Effects",
    coreRule:
      "EDG (OH, NH2, alkyl) activate ring → ortho/para. EWG (NO2, COOH) deactivate → meta direction.",
    exception:
      "Halogens are deactivators (inductive withdrawal) but ortho/para directors (resonance lone-pair donation). Rate slow; regiochemistry ortho/para.",
    keywords: "arenium ion · sigma complex · meta · ortho/para · halogen anomaly",
  },
  {
    concept: "Carbocation Rearrangement",
    coreRule:
      "1,2-hydride or methyl shift converts less stable carbocation → more stable. Common in SN1, E1, acid-catalysed reactions.",
    exception:
      "3,3-Dimethylbutan-1-ol dehydrates to 2,3-dimethylbut-2-ene (not expected 3,3-dimethylbut-1-ene) via methyl shift to tertiary carbocation.",
    keywords: "hydride shift · Wagner-Meerwein · 1,2-shift · tertiary stability",
  },
  {
    concept: "Nucleophilicity vs Basicity",
    coreRule:
      "Polar aprotic: Nu order mirrors basicity (F⁻ > Cl⁻ > Br⁻ > I⁻). Polar protic: solvation reverses order (I⁻ > Br⁻ > Cl⁻ > F⁻).",
    exception:
      "I⁻ is a better Nu than F⁻ in water despite F⁻ being far more basic — F⁻ is heavily H-bonded (solvation shell must break first).",
    keywords: "solvation · kinetic · polar aprotic · DMSO · DMF · halide",
  },
  {
    concept: "R/S Configuration (CIP)",
    coreRule:
      "Four different substituents on sp3 carbon. Assign priority by atomic number. Lowest away from viewer: CW = R, CCW = S.",
    exception:
      "If the lowest-priority group points toward the viewer (wedge bond), the observed rotation must be INVERTED to get the correct R/S.",
    keywords: "CIP rules · enantiomer · inversion · chirality · wedge-dash",
  },
  {
    concept: "Selective Reduction",
    coreRule:
      "NaBH4: reduces aldehydes & ketones only. LiAlH4: reduces all C=O including acids, esters, amides. H2/Pd-C: reduces C=C.",
    exception:
      "NaBH4 does NOT reduce esters or carboxylic acids. LiAlH4 does NOT reduce isolated unconjugated C=C bonds.",
    keywords: "NaBH4 · LiAlH4 · DIBAL-H · selectivity · oxidation state",
  },
];

// ─────────────────────────────────────────────────────────────────
// PDF GENERATOR  (runs only in the browser via dynamic import)
// ─────────────────────────────────────────────────────────────────

async function generatePDF(concepts: ChemConcept[]): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Light-theme colour tokens ─────────────────────────────────
  const emerald:    [number, number, number] = [5,   150, 105]; // emerald-600
  const bodyText:   [number, number, number] = [15,   23,  42]; // slate-900
  const mutedText:  [number, number, number] = [71,   85, 105]; // slate-600
  const headerBg:   [number, number, number] = [241, 245, 249]; // slate-100
  const borderColor:[number, number, number] = [226, 232, 240]; // slate-200
  const altRow:     [number, number, number] = [248, 250, 252]; // slate-50

  // ── Light header banner ────────────────────────────────────────
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, pageW, 22, "F");

  // Thin emerald top accent line
  doc.setDrawColor(...emerald);
  doc.setLineWidth(1.2);
  doc.line(0, 0, pageW, 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...emerald);
  doc.text("ChemClash — Organic Chemistry Concepts", 12, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  doc.text(
    `Generated ${now}  ·  JEE / NEET Exam Reference  ·  chemclash.app`,
    12,
    19
  );

  // ── Table ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 26,
    head: [["Concept", "Core Rule", "Common Exception", "Keywords"]],
    body: concepts.map((c) => [c.concept, c.coreRule, c.exception, c.keywords]),

    columnStyles: {
      0: { cellWidth: 28,  fontStyle: "bold", textColor: emerald },
      1: { cellWidth: 84,  textColor: bodyText },
      2: { cellWidth: 84,  textColor: bodyText },
      3: { cellWidth: 73,  textColor: mutedText, fontStyle: "italic" },
    },

    headStyles: {
      fillColor: headerBg,
      textColor: emerald,
      fontStyle:  "bold",
      fontSize:   8,
      halign:     "left",
      lineColor:  borderColor,
      lineWidth:  0.2,
    },

    bodyStyles: {
      fontSize:    7.2,
      textColor:   bodyText,
      lineColor:   borderColor,
      lineWidth:   0.2,
      valign:      "top",
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },

    alternateRowStyles: { fillColor: altRow },
    styles: { fillColor: [255, 255, 255], overflow: "linebreak" },

    didDrawPage(data) {
      const pageCount = doc.internal.pages.length - 1;

      // Thin emerald accent on pages 2+
      if (data.pageNumber > 1) {
        doc.setDrawColor(...emerald);
        doc.setLineWidth(0.6);
        doc.line(0, 0, pageW, 0);
      }

      // Footer divider
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.line(12, pageH - 8, pageW - 12, pageH - 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...mutedText);
      doc.text(
        `ChemClash · Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        pageH - 4,
        { align: "center" }
      );
    },

    margin: { top: 26, right: 12, bottom: 12, left: 12 },
    tableWidth: "auto",
    rowPageBreak: "auto",
    showHead: "everyPage",
  });

  doc.save("ChemClash_Study_Guide.pdf");
}

// ─────────────────────────────────────────────────────────────────
// BUTTON COMPONENT
// ─────────────────────────────────────────────────────────────────

interface DownloadCheatSheetProps {
  /** Override the default concept data (e.g. pass live API data). */
  concepts?: ChemConcept[];
  /** Optional Tailwind className on the wrapper div. */
  className?: string;
}

export default function DownloadCheatSheet({
  concepts = CHEM_CONCEPTS,
  className = "",
}: DownloadCheatSheetProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const handleClick = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      await generatePDF(concepts);
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setState("idle");
    }
  }, [concepts, state]);

  const isLoading = state === "loading";
  const isDone    = state === "done";

  const label =
    isLoading ? "Generating…"
    : isDone   ? "✓ Downloaded!"
    : "⬇ Download PDF Guide";

  return (
    <div className={className}>
      <button
        id="cheatsheet-download-btn"
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label="Download ChemClash Cheat Sheet PDF"
        className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 ${
          isDone
            ? "border-emerald-300 bg-emerald-500 text-white shadow-sm"
            : isLoading
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-emerald-300 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        }`}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent flex-shrink-0" />
        )}
        {label}
      </button>

      <p className="mt-1.5 text-xs text-slate-500 font-mono tracking-wide">
        {isDone
          ? "// PDF saved to your downloads folder"
          : isLoading
          ? "// building pdf…"
          : `// ${concepts.length} concepts · landscape A4 · browser-only`}
      </p>
    </div>
  );
}
