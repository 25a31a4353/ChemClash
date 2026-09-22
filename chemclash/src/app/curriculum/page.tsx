"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";
import { LS_MODULE_KEY } from "@/app/skill-tree/page";
import {
  fetchCurriculumModules,
  fetchCurriculumModule,
  CurriculumModuleSummary,
  CurriculumModule,
  CurriculumSlide,
} from "@/lib/api";

// ── Offline fallback modules (3 Tier-1 basics, always available) ────────────
// These match the Skill Tree node IDs bas_01/bas_02/bas_04 so completing them
// offline still unlocks the Skill Tree correctly.

const FALLBACK_MODULES: CurriculumModuleSummary[] = [
  {
    module_id: "bas_01",
    title: "Lewis Structures & Bonding",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["lewis_structure", "covalent_bond", "lone_pairs"],
    slide_count: 3,
  },
  {
    module_id: "bas_02",
    title: "Electronegativity & Polarity",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["electronegativity", "polarity", "dipole_moment"],
    slide_count: 3,
  },
  {
    module_id: "bas_04",
    title: "Nucleophiles & Electrophiles",
    difficulty: "basics",
    difficulty_tier: 1,
    game_tags: ["nucleophile", "electrophile", "lewis_acid"],
    slide_count: 3,
  },
];

const FALLBACK_MODULE_DATA: Record<string, CurriculumModule> = {
  bas_01: {
    module_id: "bas_01", title: "Lewis Structures & Bonding",
    difficulty: "basics", difficulty_tier: 1,
    game_tags: ["lewis_structure", "covalent_bond", "lone_pairs"], slide_count: 3,
    tutorial_sequence: [
      { slide: 1, concept_term: "Valence Electrons",
        short_definition: "Valence electrons are the outermost electrons of an atom. Carbon has 4 valence electrons; oxygen has 6; nitrogen has 5.",
        action_prompt: "How many valence electrons does a carbon atom have?" },
      { slide: 2, concept_term: "Octet Rule",
        short_definition: "Most atoms are stable when surrounded by 8 electrons (an octet). Hydrogen is the exception — it needs only 2 (duet).",
        action_prompt: "Which molecule satisfies the octet rule for carbon: CH₄ or CH₃?" },
      { slide: 3, concept_term: "Lone Pairs",
        short_definition: "Lone pairs are non-bonding electron pairs. Water has 2 lone pairs on oxygen; ammonia has 1 lone pair on nitrogen.",
        action_prompt: "How many lone pairs does nitrogen have in ammonia (NH₃)?" },
    ],
  },
  bas_02: {
    module_id: "bas_02", title: "Electronegativity & Polarity",
    difficulty: "basics", difficulty_tier: 1,
    game_tags: ["electronegativity", "polarity", "dipole_moment"], slide_count: 3,
    tutorial_sequence: [
      { slide: 1, concept_term: "Electronegativity",
        short_definition: "Electronegativity measures how strongly an atom attracts shared electrons. F > O > N > Cl > Br > C > H.",
        action_prompt: "Which bond is more polar: C–F or C–Cl?" },
      { slide: 2, concept_term: "Bond Polarity",
        short_definition: "A bond is polar when atoms of different electronegativities share electrons unequally. The more electronegative atom gets δ⁻.",
        action_prompt: "In C–O, which atom carries the partial negative charge (δ⁻)?" },
      { slide: 3, concept_term: "Dipole Moment",
        short_definition: "A molecule's net dipole moment is the vector sum of all bond dipoles. CO₂ is linear and symmetric — its dipoles cancel to zero.",
        action_prompt: "Does CO₂ have a net dipole moment? Answer yes or no and why." },
    ],
  },
  bas_04: {
    module_id: "bas_04", title: "Nucleophiles & Electrophiles",
    difficulty: "basics", difficulty_tier: 1,
    game_tags: ["nucleophile", "electrophile", "lewis_acid"], slide_count: 3,
    tutorial_sequence: [
      { slide: 1, concept_term: "Nucleophile",
        short_definition: "A nucleophile is an electron-rich species that donates electrons to form a new bond. Examples: OH⁻, NH₃, CN⁻, I⁻.",
        action_prompt: "Is BF₃ a nucleophile or an electrophile? Why?" },
      { slide: 2, concept_term: "Electrophile",
        short_definition: "An electrophile is an electron-poor species that accepts electrons. Examples: carbocations, BF₃, carbonyl carbon.",
        action_prompt: "In CH₃Br, which atom is the electrophilic centre?" },
      { slide: 3, concept_term: "Nucleophilicity vs. Basicity",
        short_definition: "Nucleophilicity is kinetic (speed of attack); basicity is thermodynamic (affinity for H⁺). In polar protic solvents, I⁻ > Br⁻ > Cl⁻ > F⁻ for nucleophilicity.",
        action_prompt: "Rank these by nucleophilicity in DMSO: I⁻, Br⁻, Cl⁻, F⁻" },
    ],
  },
};

// ── Answer key (quiz behavior is preserved exactly) ────────────────────────
const ANSWERS: Record<string, string> = {
  "Valence Electrons":"4","Octet Rule":"CH₄","Lone Pairs":"1","Electronegativity":"C–F","Bond Polarity":"O",
  "Dipole Moment":"No — symmetric linear molecule, dipoles cancel","Resonance":"2","Electron Delocalization":"6",
  "Formal Charge":"+1","Nucleophile":"BF₃","Electrophile":"Carbon (C)","Nucleophilicity vs. Basicity":"I⁻ > Br⁻ > Cl⁻ > F⁻",
  "Functional Group":"Alcohol (hydroxyl, –OH)","Carbonyl Group":"Aldehyde","Priority in Nomenclature":"Ketone",
  "Curved Arrow":"(b) an electron pair","Bond-Breaking Arrow":"Toward Br","Arrow Pushing Rules":"False",
  "SN2 Mechanism":"Inversion (Walden inversion)","Neopentyl Exception":"Steric hindrance from quaternary carbon",
  "SN2 Solvent":"DMSO","SN1 Mechanism":"No effect (zero order in nucleophile)","SN1 Substrates":"tert-butyl > isopropyl > methyl",
  "E2 Geometry":"180° (anti-periplanar)","Zaitsev vs Hofmann":"KOtBu","Markovnikov Rule":"2-chloropropane",
  "Peroxide Effect":"No (only HBr)","Aldol Addition":"α,β-unsaturated carbonyl (enone)","Crossed Aldol Selectivity":"No alpha-hydrogens",
  "Directing Groups":"Meta","Halogen Anomaly":"Resonance donation of lone pairs (+M)","1,2-Shifts":"1,2-methyl shift",
};

// ── Difficulty styling ─────────────────────────────────────────────────────
const DIFF_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  basics:   { text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  medium:   { text: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200"    },
  advanced: { text: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200"  },
};
const DIFF_BAR: Record<string, string> = {
  basics: "bg-emerald-500", medium: "bg-blue-500", advanced: "bg-violet-500",
};

// ── SlideQuiz (unchanged) ──────────────────────────────────────────────────
function SlideQuiz({ slide, onComplete }: { slide: CurriculumSlide; onComplete: (correct: boolean) => void }) {
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
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{slide.short_definition}</p>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-slate-700 leading-relaxed mb-3">{slide.action_prompt}</p>
        {!revealed ? (
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Type your answer…"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            <button onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              Check →
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-3 rounded-xl border ${userCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className={`text-sm font-bold mb-1 ${userCorrect ? "text-emerald-700" : "text-red-600"}`}>
              {userCorrect ? "✓ Correct!" : "✗ Not quite"}
            </div>
            <div className="text-sm text-slate-600">
              Answer: <span className="font-semibold text-slate-800">{correct}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CurriculumPage() {
  // Module listing state
  const [modules, setModules] = useState<CurriculumModuleSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Active module (full, with tutorial_sequence)
  const [selectedModule, setSelectedModule] = useState<CurriculumModule | null>(null);
  const [loadingModule, setLoadingModule] = useState(false);

  // Tutorial progress
  const [slideIndex, setSlideIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<string>>(() => {
    // Hydrate from localStorage on initial render so already-done modules show correctly.
    // Scan all localStorage keys that match the completion prefix.
    if (typeof window === "undefined") return new Set<string>();
    const ids = new Set<string>();
    const prefix = "chemclash_completed_";
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix) && localStorage.getItem(k) === "1") {
        ids.add(k.slice(prefix.length));
      }
    }
    return ids;
  });
  const [slidesDone, setSlidesDone] = useState<number[]>([]);

  // Filter
  const [filterDiff, setFilterDiff] = useState<string>("all");

  const eloRating = useChemStore((s) => s.eloRating);

  // ── Fetch module listing whenever filter changes ────────────────────────
  const loadModules = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await fetchCurriculumModules(filterDiff);
      setModules(data);
    } catch {
      // Backend unreachable — surface the 3 built-in basics modules so Learn
      // flow and Skill Tree still work offline.
      const fallback = filterDiff === "all" || filterDiff === "basics"
        ? FALLBACK_MODULES
        : [];
      setModules(fallback);
      if (fallback.length === 0) {
        setListError("Backend offline. Switch to 'ALL' or 'BASICS' to use offline modules.");
      }
    } finally {
      setLoadingList(false);
    }
  }, [filterDiff]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch in effect; setState calls are in try/finally
  useEffect(() => { loadModules(); }, [loadModules]);

  // ── Open a module: fetch full data (includes tutorial_sequence) ─────────
  const openModule = async (summary: CurriculumModuleSummary) => {
    setLoadingModule(true);
    try {
      const full = await fetchCurriculumModule(summary.module_id);
      setSelectedModule(full);
      setSlideIndex(0);
      setSlidesDone([]);
    } catch {
      // Backend unreachable — check local fallback before showing error
      const fallback = FALLBACK_MODULE_DATA[summary.module_id];
      if (fallback) {
        setSelectedModule(fallback);
        setSlideIndex(0);
        setSlidesDone([]);
      } else {
        setListError(`Could not load module "${summary.title}". Please try again.`);
      }
    } finally {
      setLoadingModule(false);
    }
  };

  // ── Slide completion ────────────────────────────────────────────────────
  const handleSlideComplete = (correct: boolean) => {
    if (correct) useChemStore.setState((s) => ({ eloRating: s.eloRating + 5 }));
    const next = slideIndex + 1;
    if (next >= (selectedModule?.tutorial_sequence.length ?? 0)) {
      if (selectedModule) {
        setCompletedModules((prev) => new Set([...prev, selectedModule.module_id]));
        // Persist to localStorage so the Skill Tree can read mastery status
        localStorage.setItem(LS_MODULE_KEY(selectedModule.module_id), "1");
        // Dispatch a custom event so the Skill Tree updates in the same tab
        window.dispatchEvent(new StorageEvent("storage", { key: LS_MODULE_KEY(selectedModule.module_id) }));
        useChemStore.setState((s) => ({ eloRating: s.eloRating + 20 }));
      }
      setSelectedModule(null);
    } else {
      setSlidesDone((p) => [...p, slideIndex]);
      setSlideIndex(next);
    }
  };

  // ── Total slides count (used in header subtitle) ───────────────────────
  const totalSlides = modules.reduce((n, m) => n + m.slide_count, 0);

  // ══════════════════════════════════════════════════════════════════════════
  // TUTORIAL VIEW — active module
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedModule) {
    const slide = selectedModule.tutorial_sequence[slideIndex];
    const totalModSlides = selectedModule.tutorial_sequence.length;
    const dc = DIFF_COLOR[selectedModule.difficulty];
    const db = DIFF_BAR[selectedModule.difficulty];

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <button onClick={() => setSelectedModule(null)}
            className="text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer">
            ← Back to Modules
          </button>
          <span className={`text-xs font-semibold tracking-wide uppercase ${dc.text}`}>
            {selectedModule.module_id.toUpperCase()} · Slide {slideIndex + 1}/{totalModSlides}
          </span>
          <span className="text-sm text-slate-500">⚡ <span className="text-emerald-600 font-bold">{eloRating}</span></span>
        </div>

        <div className="max-w-xl mx-auto px-5 py-10 pb-20">
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-8 justify-center">
            {selectedModule.tutorial_sequence.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${db} ${i === slideIndex ? "opacity-100 w-6" : slidesDone.includes(i) ? "opacity-70 w-2" : "opacity-25 w-2"}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={slideIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
              <span className={`inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border mb-3 ${dc.bg} ${dc.text} ${dc.border}`}>
                Concept {slideIndex + 1}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mb-5 leading-tight">{slide.concept_term}</h2>
              <SlideQuiz slide={slide} onComplete={handleSlideComplete} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedModule.game_tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">#{tag}</span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE LISTING VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">← Dashboard</Link>
          <span className="text-slate-300">|</span>
          <span className="text-blue-600 text-xs font-semibold tracking-wide uppercase">Curriculum</span>
        </div>
        <span className="text-sm text-slate-500">⚡ <span className="text-emerald-600 font-bold">{eloRating}</span></span>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10 pb-20">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-2">Level 0 Tutorial</p>
          <h1 className="text-3xl font-black text-slate-900 mb-1">📚 Concept Curriculum</h1>
          <p className="text-sm text-slate-500">
            {loadingList
              ? "Loading curriculum…"
              : `${modules.length} modules · ${totalSlides} slides · +5 ELO per correct answer`}
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-7 bg-slate-100 border border-slate-200 rounded-xl p-1 w-fit">
          {["all", "basics", "medium", "advanced"].map((f) => (
            <button key={f} onClick={() => setFilterDiff(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                filterDiff === f
                  ? `bg-white shadow-sm border border-slate-200 ${f === "all" ? "text-slate-800" : DIFF_COLOR[f]?.text ?? "text-slate-800"}`
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loadingList && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-16 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-full mb-1" />
                <div className="h-3 bg-slate-100 rounded w-5/6 mb-4" />
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3].map((j) => <div key={j} className="flex-1 h-1 rounded-full bg-slate-100" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loadingList && listError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 text-center">
            <p className="text-sm font-semibold text-red-700 mb-1">Could not load curriculum</p>
            <p className="text-xs text-red-500 mb-4">{listError}</p>
            <button onClick={loadModules}
              className="text-xs font-bold text-red-600 underline underline-offset-2 hover:text-red-800 transition-colors bg-transparent border-none cursor-pointer">
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingList && !listError && modules.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No modules found for this difficulty level.
          </div>
        )}

        {/* Module grid */}
        {!loadingList && !listError && modules.length > 0 && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {modules.map((mod, idx) => {
              const done = completedModules.has(mod.module_id);
              const isOpening = loadingModule;
              const dc = DIFF_COLOR[mod.difficulty];
              const db = DIFF_BAR[mod.difficulty];
              return (
                <motion.div key={mod.module_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  onClick={() => !done && !isOpening && openModule(mod)}
                  className={`bg-white border rounded-2xl p-5 transition-all duration-180 shadow-sm ${
                    done ? "border-slate-200 opacity-75 cursor-default"
                         : isOpening ? "border-slate-200 opacity-60 cursor-wait"
                         : "border-slate-200 cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-bold tracking-wide px-2.5 py-0.5 rounded-full border ${dc.bg} ${dc.text} ${dc.border}`}>
                      {mod.difficulty.toUpperCase()}
                    </span>
                    {done && <span className="text-emerald-500 text-base">✓</span>}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 mb-2 leading-snug">{mod.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    {mod.game_tags.slice(0, 3).join(" · ")}
                  </p>
                  {/* Slide bar */}
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: mod.slide_count }).map((_, i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full ${done ? db : "bg-slate-200"} ${done ? "opacity-80" : ""}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mod.game_tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[0.6rem] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-400">#{tag}</span>
                    ))}
                  </div>
                  <div className={`mt-3 text-xs font-bold tracking-wide ${done ? "text-emerald-600" : dc.text}`}>
                    {done ? "Completed ✓" : "Start →"}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
