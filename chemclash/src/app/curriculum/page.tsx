"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slide {
  slide: number;
  concept_term: string;
  short_definition: string;
  action_prompt: string;
}

interface Module {
  module_id: string;
  title: string;
  difficulty: "basics" | "medium" | "advanced";
  difficulty_tier: number;
  game_tags: string[];
  tutorial_sequence: Slide[];
}

// ─── Static data (embedded — mirrors backend/concept_tree.json basics tier) ──

const MODULES: Module[] = [
  {
    module_id: "bas_01",
    title: "Lewis Structures and Bonding",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["lewis_structure", "covalent_bond", "lone_pairs", "octet_rule", "valence_electrons"],
    tutorial_sequence: [
      { slide: 1, concept_term: "Valence Electrons", short_definition: "Valence electrons are the outermost electrons of an atom that participate in chemical bonding. The number of valence electrons determines how many bonds an atom can form.", action_prompt: "How many valence electrons does carbon have?" },
      { slide: 2, concept_term: "Octet Rule", short_definition: "Most atoms are stable when surrounded by 8 electrons in their outer shell. Covalent bonds form by sharing electron pairs to satisfy this rule.", action_prompt: "Which of these molecules satisfies the octet rule? CH₄, CH₃⁺, or CH₂?" },
      { slide: 3, concept_term: "Lone Pairs", short_definition: "Lone pairs are pairs of valence electrons not involved in bonding. They are crucial for nucleophilicity and contribute to molecular geometry.", action_prompt: "How many lone pairs does the nitrogen in NH₃ have?" },
    ],
  },
  {
    module_id: "bas_02",
    title: "Electronegativity and Polarity",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["electronegativity", "polarity", "dipole_moment", "partial_charge", "bond_polarity"],
    tutorial_sequence: [
      { slide: 1, concept_term: "Electronegativity", short_definition: "Electronegativity is an atom's ability to attract shared electrons toward itself. Fluorine is the most electronegative element; cesium is the least.", action_prompt: "Which bond is most polar: C–C, C–N, C–O, or C–F?" },
      { slide: 2, concept_term: "Bond Polarity", short_definition: "When two atoms of different electronegativity share a bond, the electrons shift toward the more electronegative atom, creating a polar bond with δ+ and δ− ends.", action_prompt: "In a C–O bond, which atom carries the δ− partial charge?" },
      { slide: 3, concept_term: "Dipole Moment", short_definition: "A dipole moment is a vector quantity measuring the overall charge separation in a molecule. Symmetrical molecules can have polar bonds but zero net dipole.", action_prompt: "Does CO₂ have a net dipole moment? Why or why not?" },
    ],
  },
  {
    module_id: "bas_03",
    title: "Resonance Structures",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["resonance", "delocalization", "resonance_hybrid", "formal_charge", "pi_electrons"],
    tutorial_sequence: [
      { slide: 1, concept_term: "Resonance", short_definition: "Resonance describes molecules that cannot be represented by a single Lewis structure. The true structure is a hybrid — a blend of all valid contributors.", action_prompt: "How many resonance structures does the carboxylate anion (RCOO⁻) have?" },
      { slide: 2, concept_term: "Electron Delocalization", short_definition: "Delocalization spreads electron density over multiple atoms, lowering potential energy and increasing stability. Benzene is the classic example.", action_prompt: "How many π electrons are delocalized in benzene's aromatic ring?" },
      { slide: 3, concept_term: "Formal Charge", short_definition: "Formal charge = valence electrons − lone pair electrons − ½ bonding electrons. The best resonance structure minimizes formal charges.", action_prompt: "Calculate the formal charge on N in NH₄⁺ (N has 4 bonds, 0 lone pairs)." },
    ],
  },
  {
    module_id: "bas_04",
    title: "Nucleophiles and Electrophiles",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["nucleophile", "electrophile", "electron_donor", "electron_acceptor", "lewis_base", "lewis_acid"],
    tutorial_sequence: [
      { slide: 1, concept_term: "Nucleophile", short_definition: "A nucleophile is an electron-rich species that donates electrons to form a new bond. Common nucleophiles include OH⁻, CN⁻, and NH₃.", action_prompt: "Which of these is NOT a nucleophile: OH⁻, H₂O, BF₃, NH₃?" },
      { slide: 2, concept_term: "Electrophile", short_definition: "An electrophile is an electron-deficient species that accepts electrons to form a new bond. Carbocations, H⁺, and Lewis acids are all electrophiles.", action_prompt: "In CH₃Br, which atom is the electrophilic centre attacked by nucleophiles?" },
      { slide: 3, concept_term: "Nucleophilicity vs. Basicity", short_definition: "Nucleophilicity is kinetic (attack speed), while basicity is thermodynamic (affinity for H⁺). A species can be nucleophilic but weakly basic, or vice versa.", action_prompt: "In polar aprotic solvent, rank by nucleophilicity: F⁻, Cl⁻, Br⁻, I⁻ (best → worst)." },
    ],
  },
  {
    module_id: "bas_05",
    title: "Functional Groups Overview",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["functional_groups", "alkene", "alkyne", "alcohol", "aldehyde", "ketone", "amine", "carboxylic_acid"],
    tutorial_sequence: [
      { slide: 1, concept_term: "Functional Group", short_definition: "A functional group is a specific arrangement of atoms that determines a molecule's reactivity. The rest of the molecule (the 'R group') is mostly inert.", action_prompt: "Name the functional group in CH₃–OH." },
      { slide: 2, concept_term: "Carbonyl Group", short_definition: "The carbonyl (C=O) is the most important functional group in organic chemistry. Aldehydes, ketones, esters, and carboxylic acids all contain a carbonyl.", action_prompt: "Which carbonyl compound is most electrophilic: aldehyde, ketone, or ester?" },
      { slide: 3, concept_term: "Priority in Nomenclature", short_definition: "IUPAC nomenclature prioritizes functional groups: carboxylic acid > ester > aldehyde > ketone > alcohol > amine > alkene > alkyne.", action_prompt: "What is the highest-priority group in a molecule containing both an alcohol and a ketone?" },
    ],
  },
  {
    module_id: "med_01",
    title: "Curved Arrow Notation",
    difficulty: "medium",
    difficulty_tier: 2,
    game_tags: ["arrow_pushing", "curved_arrow", "electron_flow", "bond_breaking", "bond_forming", "mechanism"],
    tutorial_sequence: [
      { slide: 1, concept_term: "Curved Arrow", short_definition: "A curved arrow shows the movement of a pair of electrons from a source (tail) to a destination (head). The tail always starts on an electron pair or bond.", action_prompt: "A curved arrow tail should start on: (a) a positive charge, (b) an electron pair, or (c) a hydrogen atom?" },
      { slide: 2, concept_term: "Bond-Breaking Arrow", short_definition: "When an arrow starts on a bond, it shows that bond breaking. The electrons move toward the arrow's head, generating either a radical or an ionic intermediate.", action_prompt: "In heterolytic C–Br cleavage, where does the arrow head point — toward C or toward Br?" },
      { slide: 3, concept_term: "Arrow Pushing Rules", short_definition: "Arrows always flow from electron-rich to electron-poor regions. Never draw an arrow backward (from positive to negative). Each step must be electronically balanced.", action_prompt: "True or False: A curved arrow can point FROM a positively charged atom TO a negatively charged atom." },
    ],
  },
];

// ─── Answer keys (for the quiz mode) ─────────────────────────────────────────

const ANSWERS: Record<string, string> = {
  "Valence Electrons":            "4",
  "Octet Rule":                   "CH₄",
  "Lone Pairs":                   "1",
  "Electronegativity":            "C–F",
  "Bond Polarity":                "O",
  "Dipole Moment":                "No — symmetric linear molecule, dipoles cancel",
  "Resonance":                    "2",
  "Electron Delocalization":      "6",
  "Formal Charge":                "+1",
  "Nucleophile":                  "BF₃",
  "Electrophile":                 "Carbon (C)",
  "Nucleophilicity vs. Basicity": "I⁻ > Br⁻ > Cl⁻ > F⁻",
  "Functional Group":             "Alcohol (hydroxyl, –OH)",
  "Carbonyl Group":               "Aldehyde",
  "Priority in Nomenclature":     "Ketone",
  "Curved Arrow":                 "(b) an electron pair",
  "Bond-Breaking Arrow":          "Toward Br",
  "Arrow Pushing Rules":          "False",
};

// ─── Difficulty colours ────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  basics:   "#00ff88",
  medium:   "#3b82f6",
  advanced: "#a78bfa",
};

// ─── Quiz mini-game component ──────────────────────────────────────────────

function SlideQuiz({ slide, onComplete }: { slide: Slide; onComplete: (correct: boolean) => void }) {
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const correct = ANSWERS[slide.concept_term] ?? "";
  const userCorrect = input.trim().toLowerCase().includes(correct.toLowerCase().slice(0, 4));

  const handleSubmit = () => {
    if (!input.trim()) return;
    setRevealed(true);
    setTimeout(() => onComplete(userCorrect), 1400);
  };

  return (
    <div>
      <p style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: 12, lineHeight: 1.7 }}>
        {slide.short_definition}
      </p>
      <div style={{
        background: "rgba(0,255,136,0.04)",
        border: "1px solid rgba(0,255,136,0.15)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
      }}>
        <p style={{ color: "#a3b3c9", fontSize: "0.75rem", margin: "0 0 10px", lineHeight: 1.6 }}>
          {slide.action_prompt}
        </p>
        {!revealed ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Type your answer..."
              style={{
                flex: 1,
                background: "#0d1520",
                border: "1px solid #1e2d3d",
                borderRadius: 7,
                padding: "8px 12px",
                color: "#e2e8f0",
                fontFamily: "Courier New, monospace",
                fontSize: "0.78rem",
                outline: "none",
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                background: "rgba(0,255,136,0.1)",
                border: "1px solid rgba(0,255,136,0.3)",
                color: "#00ff88",
                borderRadius: 7,
                padding: "8px 16px",
                fontFamily: "Courier New, monospace",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              CHECK →
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: userCorrect ? "rgba(0,255,136,0.08)" : "rgba(248,113,113,0.08)",
              border: `1px solid ${userCorrect ? "rgba(0,255,136,0.3)" : "rgba(248,113,113,0.3)"}`,
              fontSize: "0.75rem",
            }}
          >
            <div style={{ color: userCorrect ? "#00ff88" : "#f87171", fontWeight: 700, marginBottom: 4 }}>
              {userCorrect ? "✓ Correct!" : "✗ Not quite"}
            </div>
            <div style={{ color: "#64748b" }}>
              Answer: <span style={{ color: "#e2e8f0" }}>{correct}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function CurriculumPage() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [slidesDone, setSlidesDone] = useState<number[]>([]);
  const [filterDiff, setFilterDiff] = useState<string>("all");

  const eloRating = useChemStore((s) => s.eloRating);

  const openModule = (mod: Module) => {
    setSelectedModule(mod);
    setSlideIndex(0);
    setSlidesDone([]);
  };

  const handleSlideComplete = (correct: boolean) => {
    if (correct) {
      useChemStore.setState((s) => ({ eloRating: s.eloRating + 5 }));
    }
    const next = slideIndex + 1;
    if (next >= (selectedModule?.tutorial_sequence.length ?? 0)) {
      // Module complete
      if (selectedModule) {
        setCompletedModules((prev) => new Set([...prev, selectedModule.module_id]));
        useChemStore.setState((s) => ({ eloRating: s.eloRating + 20 }));
      }
      setSelectedModule(null);
    } else {
      setSlidesDone((p) => [...p, slideIndex]);
      setSlideIndex(next);
    }
  };

  const visible = MODULES.filter((m) => filterDiff === "all" || m.difficulty === filterDiff);

  // ── Module reader / quiz modal
  if (selectedModule) {
    const slide = selectedModule.tutorial_sequence[slideIndex];
    const totalSlides = selectedModule.tutorial_sequence.length;
    const color = DIFF_COLOR[selectedModule.difficulty];

    return (
      <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "Courier New, monospace" }}>
        {/* Top bar */}
        <div style={{
          background: "rgba(8,12,16,0.95)",
          borderBottom: "1px solid #1e2d3d",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <button
            onClick={() => setSelectedModule(null)}
            style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontFamily: "Courier New, monospace", fontSize: "0.75rem" }}
          >
            ← Back to Modules
          </button>
          <span style={{ color, fontSize: "0.65rem", letterSpacing: "0.14em" }}>
            {selectedModule.module_id.toUpperCase()} · SLIDE {slideIndex + 1}/{totalSlides}
          </span>
          <span style={{ color: "#475569", fontSize: "0.65rem" }}>
            ⚡ <span style={{ color: "#00ff88", fontWeight: 700 }}>{eloRating}</span>
          </span>
        </div>

        <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 20px 80px" }}>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 32, justifyContent: "center" }}>
            {selectedModule.tutorial_sequence.map((_, i) => (
              <div key={i} style={{
                width: i === slideIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: slidesDone.includes(i) ? color : i === slideIndex ? color : "#1e2d3d",
                transition: "all 0.3s",
                opacity: i === slideIndex ? 1 : 0.6,
              }} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={slideIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* Concept badge */}
              <div style={{
                display: "inline-block",
                fontSize: "0.6rem",
                padding: "3px 10px",
                borderRadius: 999,
                background: `${color}15`,
                border: `1px solid ${color}40`,
                color,
                letterSpacing: "0.14em",
                marginBottom: 12,
              }}>
                CONCEPT {slideIndex + 1}
              </div>

              <h2 style={{ color: "#e2e8f0", fontSize: "1.5rem", fontWeight: 900, margin: "0 0 20px", lineHeight: 1.2 }}>
                {slide.concept_term}
              </h2>

              <SlideQuiz
                slide={slide}
                onComplete={handleSlideComplete}
              />

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {selectedModule.game_tags.slice(0, 4).map((tag) => (
                  <span key={tag} style={{
                    fontSize: "0.58rem",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "#111820",
                    border: "1px solid #1e2d3d",
                    color: "#334155",
                    letterSpacing: "0.08em",
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Module grid
  return (
    <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "Courier New, monospace" }}>

      {/* Top bar */}
      <div style={{
        background: "rgba(8,12,16,0.95)",
        borderBottom: "1px solid #1e2d3d",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none" }}>
            ← Dashboard
          </Link>
          <span style={{ color: "#1e2d3d" }}>|</span>
          <span style={{ color: "#3b82f6", fontSize: "0.72rem", letterSpacing: "0.12em" }}>// CURRICULUM</span>
        </div>
        <span style={{ color: "#475569", fontSize: "0.65rem" }}>
          ⚡ <span style={{ color: "#00ff88", fontWeight: 700 }}>{eloRating}</span>
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <p style={{ color: "#3b82f6", fontSize: "0.65rem", letterSpacing: "0.28em", margin: "0 0 8px" }}>
            // LEVEL 0 TUTORIAL
          </p>
          <h1 style={{ color: "#e2e8f0", fontSize: "1.8rem", fontWeight: 900, margin: "0 0 6px" }}>
            📚 Concept Curriculum
          </h1>
          <p style={{ color: "#475569", fontSize: "0.82rem", margin: 0 }}>
            Master the fundamentals — {MODULES.length} modules · {MODULES.reduce((n, m) => n + m.tutorial_sequence.length, 0)} slides · +5 ELO per correct answer
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#0d1520", border: "1px solid #1e2d3d", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {["all", "basics", "medium", "advanced"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterDiff(f)}
              style={{
                background: filterDiff === f ? "#111820" : "transparent",
                border: filterDiff === f ? "1px solid #1e2d3d" : "1px solid transparent",
                color: filterDiff === f ? (f === "all" ? "#e2e8f0" : DIFF_COLOR[f]) : "#475569",
                padding: "6px 16px",
                borderRadius: 7,
                fontFamily: "Courier New, monospace",
                fontSize: "0.68rem",
                fontWeight: filterDiff === f ? 700 : 400,
                cursor: "pointer",
                letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Module grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}>
          {visible.map((mod, idx) => {
            const done = completedModules.has(mod.module_id);
            const color = DIFF_COLOR[mod.difficulty];
            return (
              <motion.div
                key={mod.module_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                onClick={() => !done && openModule(mod)}
                style={{
                  background: "#0d1520",
                  border: `1px solid ${done ? color + "50" : "#1e2d3d"}`,
                  borderRadius: 14,
                  padding: "20px",
                  cursor: done ? "default" : "pointer",
                  opacity: done ? 0.75 : 1,
                  transition: "all 0.18s",
                  boxShadow: done ? `0 0 20px ${color}10` : "none",
                }}
                whileHover={!done ? { y: -3, boxShadow: `0 6px 24px ${color}15`, borderColor: color + "40" } : {}}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{
                    fontSize: "0.58rem",
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: `${color}12`,
                    border: `1px solid ${color}35`,
                    color,
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                  }}>
                    {mod.difficulty.toUpperCase()}
                  </div>
                  {done && (
                    <span style={{ color, fontSize: "1rem" }}>✓</span>
                  )}
                </div>

                <h3 style={{ color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 800, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {mod.title}
                </h3>

                <p style={{ color: "#475569", fontSize: "0.7rem", margin: "0 0 14px", lineHeight: 1.6 }}>
                  {mod.tutorial_sequence[0].short_definition.slice(0, 80)}…
                </p>

                {/* Slide indicators */}
                <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                  {mod.tutorial_sequence.map((_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: done ? color : "#1e2d3d",
                      opacity: done ? 0.8 : 0.5,
                    }} />
                  ))}
                </div>

                {/* Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {mod.game_tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={{
                      fontSize: "0.55rem",
                      padding: "1px 7px",
                      borderRadius: 3,
                      background: "#111820",
                      border: "1px solid #1e2d3d",
                      color: "#334155",
                      letterSpacing: "0.06em",
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>

                {!done && (
                  <div style={{ marginTop: 14, color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>
                    START →
                  </div>
                )}
                {done && (
                  <div style={{ marginTop: 14, color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>
                    COMPLETED ✓
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
