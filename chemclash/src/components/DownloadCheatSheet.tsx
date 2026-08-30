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
  // Dynamic import keeps jspdf out of the SSR bundle
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // ── Page metadata ──────────────────────────────────────────────
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const now    = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  // ── Dark header bar ────────────────────────────────────────────
  doc.setFillColor(8, 12, 16);           // #080c10 — app background
  doc.rect(0, 0, pageW, 22, "F");

  // ── Title ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 255, 136);         // #00ff88 — brand green
  doc.text("ChemClash — Organic Chemistry Concepts", 12, 13);

  // ── Subtitle / date ────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);       // slate-500
  doc.text(`Generated ${now}  ·  JEE / NEET Exam Reference  ·  chemclash.app`, 12, 19);

  // ── Table ─────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 26,
    head: [["Concept", "Core Rule", "Common Exception", "Keywords"]],
    body: concepts.map((c) => [c.concept, c.coreRule, c.exception, c.keywords]),

    // Column widths (landscape A4 = 297 mm, margins = ~12 mm each side)
    columnStyles: {
      0: { cellWidth: 28,  fontStyle: "bold" },
      1: { cellWidth: 84 },
      2: { cellWidth: 84 },
      3: { cellWidth: 73 },
    },

    // Header style — dark row, green text
    headStyles: {
      fillColor:  [17, 24, 32],          // #111820
      textColor:  [0, 255, 136],         // #00ff88
      fontStyle:  "bold",
      fontSize:   8,
      halign:     "left",
    },

    // Body style
    bodyStyles: {
      fontSize:   7.2,
      textColor:  [226, 232, 240],       // slate-200
      lineColor:  [30, 45, 61],          // #1e2d3d
      lineWidth:  0.2,
      valign:     "top",
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },

    // Zebra striping — dark cyberpunk palette
    alternateRowStyles: {
      fillColor: [14, 20, 28],           // slightly lighter than black
    },
    styles: {
      fillColor: [8, 14, 22],
      overflow:  "linebreak",
    },

    // Accent the "Concept" column cells
    didParseCell(data) {
      if (data.column.index === 0 && data.section === "body") {
        data.cell.styles.textColor = [0, 200, 110];  // slightly darker green
        data.cell.styles.fontStyle = "bold";
      }
    },

    // Footer on every page
    didDrawPage(data) {
      const pageCount = doc.internal.pages.length - 1;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);      // slate-700
      doc.text(
        `ChemClash · Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        pageH - 4,
        { align: "center" }
      );
    },

    margin: { top: 26, right: 12, bottom: 10, left: 12 },
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
  /** Optional extra inline styles on the wrapper. */
  style?: React.CSSProperties;
}

export default function DownloadCheatSheet({
  concepts = CHEM_CONCEPTS,
  style,
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

  // ── Label & icon by state ──────────────────────────────────────
  const label =
    state === "loading" ? "Generating…"
    : state === "done"    ? "✓ Downloaded!"
    : "⬇ Download PDF Guide";

  // ── Green cyberpunk button (matches app theme, no Tailwind needed) ──
  const isLoading = state === "loading";
  const isDone    = state === "done";

  return (
    <div style={style}>
      <button
        id="cheatsheet-download-btn"
        onClick={handleClick}
        disabled={isLoading}
        aria-label="Download ChemClash Cheat Sheet PDF"
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            8,
          padding:        "10px 22px",
          background:     isDone
            ? "linear-gradient(135deg, #00cc6a 0%, #009950 100%)"
            : isLoading
            ? "linear-gradient(135deg, #1a4a30 0%, #122e1e 100%)"
            : "linear-gradient(135deg, #003d20 0%, #00ff88 100%)",
          color:          isDone ? "#fff" : isLoading ? "#4ade80" : "#080c10",
          border:         `1px solid ${isDone ? "#00cc6a" : "#00ff88"}`,
          borderRadius:   8,
          fontFamily:     "Courier New, monospace",
          fontWeight:     900,
          fontSize:       "0.78rem",
          letterSpacing:  "0.06em",
          cursor:         isLoading ? "not-allowed" : "pointer",
          transition:     "all 0.2s ease",
          boxShadow:      isDone
            ? "0 0 18px rgba(0,204,106,0.6)"
            : isLoading
            ? "none"
            : "0 0 14px rgba(0,255,136,0.35), 0 0 28px rgba(0,255,136,0.15)",
          whiteSpace:     "nowrap",
          userSelect:     "none",
          position:       "relative",
          overflow:       "hidden",
        }}
        onMouseEnter={(e) => {
          if (!isLoading && !isDone)
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 22px rgba(0,255,136,0.7), 0 0 44px rgba(0,255,136,0.3)";
        }}
        onMouseLeave={(e) => {
          if (!isLoading && !isDone)
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 14px rgba(0,255,136,0.35), 0 0 28px rgba(0,255,136,0.15)";
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {/* Spinner overlay when loading */}
        {isLoading && (
          <span
            style={{
              width:        14,
              height:       14,
              border:       "2px solid #4ade80",
              borderTop:    "2px solid transparent",
              borderRadius: "50%",
              display:      "inline-block",
              animation:    "spin 0.7s linear infinite",
              flexShrink:   0,
            }}
          />
        )}
        {label}

        {/* Keyframe injection (tiny, runs once) */}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </button>

      {/* Micro-hint below the button */}
      <p
        style={{
          marginTop:   6,
          fontSize:    "0.62rem",
          color:       "#334155",
          fontFamily:  "Courier New, monospace",
          letterSpacing: "0.08em",
        }}
      >
        {isDone
          ? "// PDF saved to your downloads folder"
          : isLoading
          ? "// building pdf…"
          : `// ${concepts.length} concepts · landscape A4 · browser-only`}
      </p>
    </div>
  );
}
