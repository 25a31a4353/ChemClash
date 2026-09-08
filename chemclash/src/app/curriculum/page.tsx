"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

interface Slide { slide: number; concept_term: string; short_definition: string; action_prompt: string; }
interface Module { module_id: string; title: string; difficulty: "basics" | "medium" | "advanced"; difficulty_tier: number; game_tags: string[]; tutorial_sequence: Slide[]; }

const MODULES: Module[] = [
  { module_id:"bas_01", title:"Lewis Structures and Bonding", difficulty:"basics", difficulty_tier:1, game_tags:["lewis_structure","covalent_bond","lone_pairs","octet_rule","valence_electrons"], tutorial_sequence:[
    { slide:1, concept_term:"Valence Electrons", short_definition:"Valence electrons are the outermost electrons of an atom that participate in chemical bonding. The number of valence electrons determines how many bonds an atom can form.", action_prompt:"How many valence electrons does carbon have?" },
    { slide:2, concept_term:"Octet Rule", short_definition:"Most atoms are stable when surrounded by 8 electrons in their outer shell. Covalent bonds form by sharing electron pairs to satisfy this rule.", action_prompt:"Which of these molecules satisfies the octet rule? CH₄, CH₃⁻, or CH₂?" },
    { slide:3, concept_term:"Lone Pairs", short_definition:"Lone pairs are pairs of valence electrons not involved in bonding. They are crucial for nucleophilicity and contribute to molecular geometry.", action_prompt:"How many lone pairs does the nitrogen in NH₃ have?" },
  ]},
  { module_id:"bas_02", title:"Electronegativity and Polarity", difficulty:"basics", difficulty_tier:1, game_tags:["electronegativity","polarity","dipole_moment","partial_charge","bond_polarity"], tutorial_sequence:[
    { slide:1, concept_term:"Electronegativity", short_definition:"Electronegativity is an atom's ability to attract shared electrons toward itself. Fluorine is the most electronegative element; cesium is the least.", action_prompt:"Which bond is most polar: C–C, C–N, C–O, or C–F?" },
    { slide:2, concept_term:"Bond Polarity", short_definition:"When two atoms of different electronegativity share a bond, electrons shift toward the more electronegative atom, creating a polar bond with δ+ and δ− ends.", action_prompt:"In a C–O bond, which atom carries the δ− partial charge?" },
    { slide:3, concept_term:"Dipole Moment", short_definition:"A dipole moment is a vector quantity measuring the overall charge separation in a molecule. Symmetrical molecules can have polar bonds but zero net dipole.", action_prompt:"Does CO₂ have a net dipole moment? Why or why not?" },
  ]},
  { module_id:"bas_03", title:"Resonance Structures", difficulty:"basics", difficulty_tier:1, game_tags:["resonance","delocalization","resonance_hybrid","formal_charge","pi_electrons"], tutorial_sequence:[
    { slide:1, concept_term:"Resonance", short_definition:"Resonance describes molecules that cannot be represented by a single Lewis structure. The true structure is a hybrid — a blend of all valid contributors.", action_prompt:"How many resonance structures does the carboxylate anion (RCOO⁻) have?" },
    { slide:2, concept_term:"Electron Delocalization", short_definition:"Delocalization spreads electron density over multiple atoms, lowering potential energy and increasing stability. Benzene is the classic example.", action_prompt:"How many π electrons are delocalized in benzene's aromatic ring?" },
    { slide:3, concept_term:"Formal Charge", short_definition:"Formal charge = valence electrons − lone pair electrons − ½ bonding electrons. The best resonance structure minimizes formal charges.", action_prompt:"Calculate the formal charge on N in NH₄⁺ (N has 4 bonds, 0 lone pairs)." },
  ]},
  { module_id:"bas_04", title:"Nucleophiles and Electrophiles", difficulty:"basics", difficulty_tier:1, game_tags:["nucleophile","electrophile","electron_donor","electron_acceptor","lewis_base","lewis_acid"], tutorial_sequence:[
    { slide:1, concept_term:"Nucleophile", short_definition:"A nucleophile is an electron-rich species that donates electrons to form a new bond. Common nucleophiles include OH⁻, CN⁻, and NH₃.", action_prompt:"Which of these is NOT a nucleophile: OH⁻, H₂O, BF₃, NH₃?" },
    { slide:2, concept_term:"Electrophile", short_definition:"An electrophile is an electron-deficient species that accepts electrons to form a new bond. Carbocations, H⁺, and Lewis acids are all electrophiles.", action_prompt:"In CH₃Br, which atom is the electrophilic centre attacked by nucleophiles?" },
    { slide:3, concept_term:"Nucleophilicity vs. Basicity", short_definition:"Nucleophilicity is kinetic (attack speed), while basicity is thermodynamic (affinity for H⁺). A species can be nucleophilic but weakly basic, or vice versa.", action_prompt:"In polar aprotic solvent, rank by nucleophilicity: F⁻, Cl⁻, Br⁻, I⁻ (best → worst)." },
  ]},
  { module_id:"bas_05", title:"Functional Groups Overview", difficulty:"basics", difficulty_tier:1, game_tags:["functional_groups","alkene","alkyne","alcohol","aldehyde","ketone","amine","carboxylic_acid"], tutorial_sequence:[
    { slide:1, concept_term:"Functional Group", short_definition:"A functional group is a specific arrangement of atoms that determines a molecule's reactivity. The rest of the molecule (the 'R group') is mostly inert.", action_prompt:"Name the functional group in CH₃–OH." },
    { slide:2, concept_term:"Carbonyl Group", short_definition:"The carbonyl (C=O) is the most important functional group in organic chemistry. Aldehydes, ketones, esters, and carboxylic acids all contain a carbonyl.", action_prompt:"Which carbonyl compound is most electrophilic: aldehyde, ketone, or ester?" },
    { slide:3, concept_term:"Priority in Nomenclature", short_definition:"IUPAC nomenclature prioritizes functional groups: carboxylic acid > ester > aldehyde > ketone > alcohol > amine > alkene > alkyne.", action_prompt:"What is the highest-priority group in a molecule containing both an alcohol and a ketone?" },
  ]},
  { module_id:"med_01", title:"Curved Arrow Notation", difficulty:"medium", difficulty_tier:2, game_tags:["arrow_pushing","curved_arrow","electron_flow","bond_breaking","bond_forming","mechanism"], tutorial_sequence:[
    { slide:1, concept_term:"Curved Arrow", short_definition:"A curved arrow shows the movement of a pair of electrons from a source (tail) to a destination (head). The tail always starts on an electron pair or bond.", action_prompt:"A curved arrow tail should start on: (a) a positive charge, (b) an electron pair, or (c) a hydrogen atom?" },
    { slide:2, concept_term:"Bond-Breaking Arrow", short_definition:"When an arrow starts on a bond, it shows that bond breaking. The electrons move toward the arrow's head, generating either a radical or an ionic intermediate.", action_prompt:"In heterolytic C–Br cleavage, where does the arrow head point — toward C or toward Br?" },
    { slide:3, concept_term:"Arrow Pushing Rules", short_definition:"Arrows always flow from electron-rich to electron-poor regions. Never draw an arrow backward (from positive to negative). Each step must be electronically balanced.", action_prompt:"True or False: A curved arrow can point FROM a positively charged atom TO a negatively charged atom." },
  ]},
  { module_id:"concept_sn2", title:"SN2 — Bimolecular Nucleophilic Substitution", difficulty:"basics", difficulty_tier:1, game_tags:["sn2","backside_attack","walden_inversion","primary_halide","polar_aprotic"], tutorial_sequence:[
    { slide:1, concept_term:"SN2 Mechanism", short_definition:"Concerted backside attack by nucleophile while leaving group departs simultaneously. Rate = k[Nu][substrate]. Produces 100% Walden inversion.", action_prompt:"What is the stereochemical outcome of an SN2 reaction on a chiral carbon?" },
    { slide:2, concept_term:"Neopentyl Exception", short_definition:"Neopentyl halides are primary but do NOT undergo SN2 due to severe steric crowding from the adjacent quaternary carbon blocking backside attack.", action_prompt:"Why does neopentyl bromide fail to undergo SN2 despite being a primary alkyl halide?" },
    { slide:3, concept_term:"SN2 Solvent", short_definition:"Polar aprotic solvents (DMSO, DMF, acetone) accelerate SN2 by leaving nucleophiles unencumbered by hydrogen-bonding shells.", action_prompt:"Which solvent favours SN2: DMSO or Ethanol?" },
  ]},
  { module_id:"concept_sn1", title:"SN1 — Unimolecular Nucleophilic Substitution", difficulty:"basics", difficulty_tier:1, game_tags:["sn1","carbocation","racemisation","tertiary_halide","polar_protic"], tutorial_sequence:[
    { slide:1, concept_term:"SN1 Mechanism", short_definition:"Two-step mechanism: slow rate-determining carbocation formation followed by fast nucleophile capture on either face (racemisation). Rate = k[substrate].", action_prompt:"What happens to the rate of an SN1 reaction if nucleophile concentration is doubled?" },
    { slide:2, concept_term:"SN1 Substrates", short_definition:"Favoured by tertiary substrates and resonance-stabilised allylic/benzylic halides that form stable carbocations.", action_prompt:"Rank in order of SN1 reactivity: tert-butyl chloride, isopropyl chloride, methyl chloride." },
  ]},
  { module_id:"concept_e2", title:"E2 — Bimolecular Elimination", difficulty:"medium", difficulty_tier:2, game_tags:["e2","elimination","anti_periplanar","zaitsev","hofmann"], tutorial_sequence:[
    { slide:1, concept_term:"E2 Geometry", short_definition:"Concerted elimination requiring a strong base and strict anti-periplanar geometry (H and LG 180° apart).", action_prompt:"What dihedral angle between H and leaving group is required for concerted E2?" },
    { slide:2, concept_term:"Zaitsev vs Hofmann", short_definition:"Small bases yield the more substituted Zaitsev alkene; bulky bases (KOtBu) yield the less substituted Hofmann alkene.", action_prompt:"Which base yields the Hofmann product from 2-bromobutane: NaOMe or KOtBu?" },
  ]},
  { module_id:"concept_markovnikov", title:"Markovnikov & Anti-Markovnikov Addition", difficulty:"basics", difficulty_tier:1, game_tags:["markovnikov","anti_markovnikov","hbr_peroxide","hydroboration"], tutorial_sequence:[
    { slide:1, concept_term:"Markovnikov Rule", short_definition:"Proton adds to the carbon with more hydrogens, generating the more stable carbocation intermediate.", action_prompt:"What is the major product of propene + HCl?" },
    { slide:2, concept_term:"Peroxide Effect", short_definition:"HBr with peroxides follows a radical chain mechanism giving anti-Markovnikov 1-bromopropane (applies ONLY to HBr).", action_prompt:"Does HCl + peroxide give anti-Markovnikov product? (Yes/No)" },
  ]},
  { module_id:"concept_aldol", title:"Aldol Condensation", difficulty:"advanced", difficulty_tier:3, game_tags:["aldol","enolate","condensation","alpha_hydrogen","dehydration"], tutorial_sequence:[
    { slide:1, concept_term:"Aldol Addition", short_definition:"Enolate attacks carbonyl of another aldehyde/ketone to give β-hydroxy carbonyl; heat eliminates water to give conjugated enone.", action_prompt:"What functional group is formed after aldol condensation and dehydration?" },
    { slide:2, concept_term:"Crossed Aldol Selectivity", short_definition:"Synthetically clean only when one partner has no α-hydrogens (e.g., Benzaldehyde + Acetaldehyde → Cinnamaldehyde).", action_prompt:"Why is benzaldehyde ideal for crossed aldol reactions?" },
  ]},
  { module_id:"concept_eas", title:"EAS & Directing Effects", difficulty:"advanced", difficulty_tier:3, game_tags:["eas","arenium_ion","ortho_para","meta","halogen_anomaly"], tutorial_sequence:[
    { slide:1, concept_term:"Directing Groups", short_definition:"EDGs (-OH, -NH2, -R) activate and direct ortho/para; EWGs (-NO2, -COOH) deactivate and direct meta.", action_prompt:"Where does incoming NO2+ attack on nitrobenzene: ortho, meta, or para?" },
    { slide:2, concept_term:"Halogen Anomaly", short_definition:"Halogens are deactivating by induction (-I) yet ortho/para directing due to lone-pair resonance (+M).", action_prompt:"Why is chlorobenzene ortho/para directing despite being deactivated?" },
  ]},
  { module_id:"concept_carbocation_rearrangement", title:"Carbocation Rearrangements", difficulty:"advanced", difficulty_tier:3, game_tags:["carbocation_shift","hydride_shift","methyl_shift","wagner_meerwein"], tutorial_sequence:[
    { slide:1, concept_term:"1,2-Shifts", short_definition:"1,2-hydride or 1,2-methyl shifts convert less stable carbocations to more stable 3° or benzylic/allylic cations.", action_prompt:"What type of shift occurs when 3,3-dimethylbutan-1-ol is dehydrated?" },
  ]},
];

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

const DIFF_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  basics:   { text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  medium:   { text: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200"    },
  advanced: { text: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200"  },
};
const DIFF_BAR: Record<string, string> = {
  basics: "bg-emerald-500", medium: "bg-blue-500", advanced: "bg-violet-500",
};

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

export default function CurriculumPage() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [slidesDone, setSlidesDone] = useState<number[]>([]);
  const [filterDiff, setFilterDiff] = useState<string>("all");
  const eloRating = useChemStore((s) => s.eloRating);

  const openModule = (mod: Module) => { setSelectedModule(mod); setSlideIndex(0); setSlidesDone([]); };

  const handleSlideComplete = (correct: boolean) => {
    if (correct) useChemStore.setState((s) => ({ eloRating: s.eloRating + 5 }));
    const next = slideIndex + 1;
    if (next >= (selectedModule?.tutorial_sequence.length ?? 0)) {
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

  if (selectedModule) {
    const slide = selectedModule.tutorial_sequence[slideIndex];
    const totalSlides = selectedModule.tutorial_sequence.length;
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
            {selectedModule.module_id.toUpperCase()} · Slide {slideIndex + 1}/{totalSlides}
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
            {MODULES.length} modules · {MODULES.reduce((n, m) => n + m.tutorial_sequence.length, 0)} slides · +5 ELO per correct answer
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

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {visible.map((mod, idx) => {
            const done = completedModules.has(mod.module_id);
            const dc = DIFF_COLOR[mod.difficulty];
            const db = DIFF_BAR[mod.difficulty];
            return (
              <motion.div key={mod.module_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                onClick={() => !done && openModule(mod)}
                className={`bg-white border rounded-2xl p-5 transition-all duration-180 shadow-sm ${
                  done ? "border-slate-200 opacity-75 cursor-default"
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
                  {mod.tutorial_sequence[0].short_definition.slice(0, 80)}…
                </p>
                {/* Slide bar */}
                <div className="flex gap-1 mb-3">
                  {mod.tutorial_sequence.map((_, i) => (
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
      </div>
    </div>
  );
}
