"use client";

/**
 * ChemClash — Tutor Shorts
 *
 * A micro-learning card feed. Each "short" is a curated chemistry tip/trick
 * grounded exclusively in concepts from pyq_db.json + concept_tree.json.
 *
 * No backend. No external APIs. Content-first MVP.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ── Types ──────────────────────────────────────────────────────────────────

interface Short {
  id: string;
  title: string;
  conceptTag: string;       // lowercase, matches pyq_db / concept_tree tags
  conceptLabel: string;     // display name
  difficulty: "easy" | "medium" | "hard";
  readingTimeSecs: number;
  tip: string;              // the core chemistry insight (2-4 sentences)
  keyFact: string;          // one memorable exam-oriented takeaway
  watchOutFor: string;      // common student mistake
}

// ── Curated short deck ─────────────────────────────────────────────────────
// All facts sourced from concepts present in pyq_db.json + concept_tree.json.

const SHORTS: Short[] = [
  // ── SN2 ──────────────────────────────────────────────────────────────────
  {
    id: "sn2-backside",
    title: "SN2: The Backside Attack Rule",
    conceptTag: "sn2",
    conceptLabel: "SN2 Mechanism",
    difficulty: "easy",
    readingTimeSecs: 45,
    tip: "In an SN2 reaction, the nucleophile attacks from the side directly opposite the leaving group — called backside attack. This geometry is why primary substrates react fastest: there is minimal steric blocking of the back face. The attack and departure happen in a single concerted step — no intermediate, no waiting.",
    keyFact: "SN2 rate order: CH₃X > 1° > 2° >> 3° (tertiary cannot react by SN2 at all).",
    watchOutFor: "Don't confuse 'concerted' with 'simultaneous and equal' — the nucleophile–carbon bond starts forming before the leaving group fully departs, but there is no discrete intermediate.",
  },
  {
    id: "sn2-inversion",
    title: "Walden Inversion: SN2 Always Flips Stereochemistry",
    conceptTag: "sn2",
    conceptLabel: "SN2 Mechanism",
    difficulty: "medium",
    readingTimeSecs: 40,
    tip: "Every SN2 reaction at a chiral centre produces inversion of configuration — the product has the opposite R/S designation to the starting material. Think of it like an umbrella being turned inside-out. This is called Walden inversion and is 100% predictable from the mechanism.",
    keyFact: "R starting material → S product (and vice versa) in a single SN2 step.",
    watchOutFor: "Inversion of configuration does NOT always mean a change in R/S label. If the nucleophile has higher CIP priority than the leaving group, the label may stay the same even though inversion occurred — always re-rank substituents.",
  },
  {
    id: "sn2-solvent",
    title: "Why SN2 Loves Polar Aprotic Solvents",
    conceptTag: "sn2",
    conceptLabel: "SN2 Mechanism",
    difficulty: "medium",
    readingTimeSecs: 40,
    tip: "Polar aprotic solvents (DMSO, DMF, acetone) cannot hydrogen-bond to the nucleophile, leaving it 'naked' and highly reactive. Protic solvents like water or ethanol solvate the nucleophile with H-bonds, caging it and dramatically slowing SN2 rate.",
    keyFact: "DMSO boosts SN2 rate of iodide by ~10⁵ compared to protic solvents.",
    watchOutFor: "Don't choose a protic solvent for a synthetic SN2 — it won't necessarily stop the reaction, but it will massively slow it and can favour SN1/E2 instead.",
  },
  // ── SN1 ──────────────────────────────────────────────────────────────────
  {
    id: "sn1-carbocation",
    title: "SN1 Step 1: Forming the Carbocation",
    conceptTag: "sn1",
    conceptLabel: "SN1 Mechanism",
    difficulty: "easy",
    readingTimeSecs: 45,
    tip: "SN1 is a two-step reaction. In the slow rate-determining step the leaving group departs unassisted, generating a planar carbocation intermediate. Only in the fast second step does the nucleophile attack. Because the carbocation is planar (sp² carbon), attack can occur from either face — giving a racemic mixture.",
    keyFact: "SN1 is first-order in substrate only: rate = k[RX]. Adding more nucleophile doesn't speed it up.",
    watchOutFor: "SN1 requires a stable carbocation — tertiary or allylic/benzylic. Primary substrates almost never follow SN1 because the resulting 1° carbocation is too unstable.",
  },
  {
    id: "sn1-racemisation",
    title: "SN1 Gives Racemisation, Not Pure Inversion",
    conceptTag: "sn1",
    conceptLabel: "SN1 Mechanism",
    difficulty: "medium",
    readingTimeSecs: 35,
    tip: "Because SN1 produces a flat carbocation, the nucleophile attacks both faces with equal probability. A single chiral centre gives a 50:50 mixture of R and S products — a racemate — even from a pure enantiomer starting material. In practice you often see slight excess of one enantiomer because the leaving group departs slowly and partially shields one face.",
    keyFact: "Optically pure starting material → optically inactive (racemic) product via SN1.",
    watchOutFor: "Don't say 'SN1 gives inversion'. Inversion is SN2. SN1 gives racemisation (or at best partial racemisation with slight inversion if ion-pair shielding is present).",
  },
  // ── E2 ───────────────────────────────────────────────────────────────────
  {
    id: "e2-antiperiplanar",
    title: "E2 Requires Anti-Periplanar Geometry",
    conceptTag: "e2",
    conceptLabel: "E2 Elimination",
    difficulty: "medium",
    readingTimeSecs: 50,
    tip: "E2 is a concerted one-step elimination: the base removes a β-H while the leaving group departs simultaneously, forming a π bond. For this to work, the H and the leaving group must be anti-periplanar — exactly 180° apart in the Newman projection. If they can't reach that geometry, E2 is impossible.",
    keyFact: "Anti-periplanar = H and LG on opposite sides in Newman projection (anti conformation of the C–C bond).",
    watchOutFor: "In cyclohexane rings, E2 requires the H and LG both in axial positions (diaxial arrangement). Equatorial leaving groups cannot undergo E2 — the substrate must first flip to the diaxial conformation.",
  },
  {
    id: "e2-zaitsev",
    title: "Zaitsev's Rule: Take the More Substituted Alkene",
    conceptTag: "e2",
    conceptLabel: "E2 Elimination",
    difficulty: "easy",
    readingTimeSecs: 35,
    tip: "When multiple β-hydrogens are available, E2 elimination with a small (non-bulky) base preferentially removes the H that gives the more substituted alkene — the Zaitsev product. More substituted alkenes are more stable due to hyperconjugation and are formed faster because the TS resembles the alkene product.",
    keyFact: "KOH / NaOEt (small base) → Zaitsev (more substituted). KOtBu (bulky base) → Hofmann (less substituted).",
    watchOutFor: "Zaitsev vs Hofmann depends on BASE size, not substrate. A bulky base steers attack to the less hindered (terminal) β-H even though it gives the less stable alkene.",
  },
  // ── Carbocation ───────────────────────────────────────────────────────────
  {
    id: "carbocation-stability",
    title: "Carbocation Stability: 3° > 2° > 1° > CH₃⁺",
    conceptTag: "carbocation",
    conceptLabel: "Carbocation Stability",
    difficulty: "easy",
    readingTimeSecs: 40,
    tip: "Carbocation stability increases with substitution because each adjacent C–H bond can hyperconjugate with the empty p orbital, spreading the positive charge. A tertiary carbocation has 9 C–H bonds available for hyperconjugation; methyl cation has none. Allylic and benzylic cations are especially stable because resonance delocalises the charge over π electrons.",
    keyFact: "Stability: allylic ≈ benzylic > 3° > 2° > 1° > CH₃⁺.",
    watchOutFor: "Don't confuse hyperconjugation with inductive effect. Both stabilise carbocations, but hyperconjugation (electron donation from C–H σ bonds) is the dominant stabilisation for alkyl carbocations.",
  },
  {
    id: "carbocation-rearrangement",
    title: "1,2-Hydride and Methyl Shifts",
    conceptTag: "rearrangement",
    conceptLabel: "Carbocation Rearrangements",
    difficulty: "medium",
    readingTimeSecs: 50,
    tip: "A carbocation will rearrange if a neighbouring C–H or C–CH₃ can migrate to produce a more stable cation. In a 1,2-hydride shift, H moves with its bonding pair to the adjacent cationic carbon. In a 1,2-methyl shift, a whole methyl group migrates. Both produce a new carbocation one step more stable than the original.",
    keyFact: "Rearrangements always go toward greater stability — a 2° cation rearranges to 3° but never the reverse.",
    watchOutFor: "Rearrangements can completely change the carbon skeleton of the product. In synthesis problems, always check if a more stable cation is reachable by a single 1,2-shift before predicting the product.",
  },
  // ── EAS ──────────────────────────────────────────────────────────────────
  {
    id: "eas-directing",
    title: "EAS: Ortho/Para vs Meta Directors",
    conceptTag: "eas",
    conceptLabel: "Electrophilic Aromatic Substitution",
    difficulty: "medium",
    readingTimeSecs: 50,
    tip: "Substituents on benzene control where the next electrophile attacks. Electron-donating groups (–OH, –NH₂, –alkyl, halogens via lone pairs) direct electrophiles to ortho and para positions. Electron-withdrawing groups (–NO₂, –COOH, –CN, –SO₃H) direct to meta. Halogens are a special case: they are o/p directors (lone-pair donation) but deactivators (−I > +M).",
    keyFact: "Memorise meta directors by the common rule: any group with a C=O or C≡N directly attached to the ring is a meta director.",
    watchOutFor: "Halogen anomaly: Cl, Br, F are ortho/para directors despite being ring deactivators. This trips up most students — the key is that their lone pairs donate into the ring via resonance even though inductive withdrawal reduces overall ring electron density.",
  },
  {
    id: "eas-arenium",
    title: "The Arenium Ion: Why Aromaticity is Temporarily Lost",
    conceptTag: "eas",
    conceptLabel: "Electrophilic Aromatic Substitution",
    difficulty: "hard",
    readingTimeSecs: 45,
    tip: "When an electrophile attacks benzene's π cloud, it forms a Wheland intermediate (arenium ion) — a non-aromatic, resonance-stabilised carbocation. The ring has lost one of its sp² carbons (now sp³). The driving force for the second step (proton loss) is restoration of aromaticity — substitution is therefore thermodynamically favourable.",
    keyFact: "EAS = addition (to form arenium) then elimination (loss of H⁺) — net substitution. Not simple electrophilic addition as for alkenes.",
    watchOutFor: "EAS always restores aromaticity by losing H⁺ — it does NOT add two groups across the ring. Confusing EAS with alkene addition reactions is a common source of errors in JEE.",
  },
  // ── Stereochemistry ───────────────────────────────────────────────────────
  {
    id: "rs-cip",
    title: "Assigning R/S with CIP Rules",
    conceptTag: "stereochemistry",
    conceptLabel: "Stereochemistry — R/S",
    difficulty: "medium",
    readingTimeSecs: 55,
    tip: "Assign CIP priorities (1 = highest atomic number, outward from chiral centre). Place group 4 pointing away from you, then trace 1→2→3. Clockwise = R (Rectus); counterclockwise = S (Sinister). If group 4 is pointing toward you, trace and then flip your conclusion.",
    keyFact: "CIP priority rule: atomic number first; if tied, go one bond further and compare again (the 'branching' rule).",
    watchOutFor: "Changing any single substituent can flip the R/S designation. In a reaction that inverts configuration (SN2), always re-assign CIP priorities for the product — don't just write the opposite letter automatically.",
  },
  // ── Resonance ─────────────────────────────────────────────────────────────
  {
    id: "resonance-stability",
    title: "Resonance Stabilisation: Why Delocalization Matters",
    conceptTag: "resonance",
    conceptLabel: "Resonance Structures",
    difficulty: "easy",
    readingTimeSecs: 40,
    tip: "Resonance structures are not equilibrium forms — the molecule exists as a single hybrid, intermediate between all contributors. More resonance contributors = more delocalization = more stability. Carboxylate (RCO₂⁻) has two equal contributors, which makes it far more stable (and its conjugate acid far more acidic) than an alcohol.",
    keyFact: "The more equivalent resonance contributors, the lower the energy of the real molecule.",
    watchOutFor: "Never draw curved arrows between two resonance structures that move atoms — only electrons (lone pairs or π bonds) move in resonance. Moving atoms means you're drawing a constitutional isomer, not a resonance structure.",
  },
  // ── Markovnikov ───────────────────────────────────────────────────────────
  {
    id: "markovnikov-rule",
    title: "Markovnikov's Rule: H Goes to the Carbon with More H's",
    conceptTag: "markovnikov",
    conceptLabel: "Markovnikov's Rule",
    difficulty: "easy",
    readingTimeSecs: 40,
    tip: "When HX adds to an unsymmetrical alkene, H⁺ adds to the carbon bearing more hydrogens, and X⁻ adds to the more substituted carbon. The reason: protonation at the terminal carbon gives the more substituted (more stable) carbocation intermediate. The product comes from nucleophilic attack on that carbocation.",
    keyFact: "Markovnikov addition = H⁺ adds to the less substituted carbon = more stable carbocation forms first.",
    watchOutFor: "In the presence of peroxides (ROOR), HBr adds anti-Markovnikov via a radical chain mechanism. This is Markovnikov violation — BUT it only works for HBr, NOT HCl or HI (bond energies make radical chains unfavourable for those).",
  },
  // ── Nucleophile / Electrophile ────────────────────────────────────────────
  {
    id: "nucleophilicity-vs-basicity",
    title: "Nucleophilicity ≠ Basicity",
    conceptTag: "nucleophile",
    conceptLabel: "Nucleophiles & Electrophiles",
    difficulty: "medium",
    readingTimeSecs: 45,
    tip: "Basicity measures affinity for a proton (thermodynamic, pKₐ). Nucleophilicity measures rate of attack on a carbon electrophile (kinetic). Large, polarisable atoms like I⁻ and S are excellent nucleophiles but weak bases. Small, electronegative F⁻ is a strong base but a poor nucleophile because its electrons are held tightly and it's heavily solvated in protic solvents.",
    keyFact: "In polar aprotic solvents, nucleophilicity roughly follows basicity. In polar protic solvents, nucleophilicity reverses for halides: I⁻ > Br⁻ > Cl⁻ > F⁻.",
    watchOutFor: "Students often assume the strongest base is always the best nucleophile. Wrong! I⁻ is one of the weakest bases among halides but the best SN2 nucleophile in protic solvents due to its polarisability.",
  },
  // ── Leaving group ─────────────────────────────────────────────────────────
  {
    id: "leaving-group-ability",
    title: "What Makes a Good Leaving Group?",
    conceptTag: "leaving_group",
    conceptLabel: "Leaving Groups",
    difficulty: "easy",
    readingTimeSecs: 35,
    tip: "A good leaving group departs with the bonding electron pair and stabilises the negative charge that results. It should be the conjugate base of a strong acid — because stable anions (weak bases) leave easily. I⁻, Br⁻, Cl⁻, TsO⁻, and MsO⁻ are excellent leaving groups. OH⁻ and F⁻ are poor leaving groups.",
    keyFact: "Leaving group ability order: TsO⁻ > I⁻ > Br⁻ > Cl⁻ >> F⁻ ≈ OH⁻.",
    watchOutFor: "OH is a terrible leaving group in neutral conditions, but under acid catalysis it gets protonated to form OH₂⁺ — and water is an excellent leaving group. This is why acid is needed for dehydration of alcohols.",
  },
  // ── Carbonyl ──────────────────────────────────────────────────────────────
  {
    id: "carbonyl-electrophilicity",
    title: "Why Carbonyl Carbon is Electrophilic",
    conceptTag: "carbonyl",
    conceptLabel: "Carbonyl Chemistry",
    difficulty: "easy",
    readingTimeSecs: 40,
    tip: "Oxygen is more electronegative than carbon, so the C=O bond is strongly polarised: δ⁺ on carbon, δ⁻ on oxygen. This makes the carbonyl carbon an electrophilic site that is readily attacked by nucleophiles. The more electron-withdrawing the groups on the carbonyl, the more electrophilic the carbon — acid chlorides react faster than esters, which react faster than amides.",
    keyFact: "Reactivity toward nucleophilic addition/substitution: RCOCl > (RCO)₂O > RCOOR′ > RCONH₂.",
    watchOutFor: "Aldehyde carbonyls are more electrophilic than ketone carbonyls (less electron donation from substituents). Always consider whether the substrate is an aldehyde or ketone when predicting relative reactivity.",
  },
  // ── Aromaticity ───────────────────────────────────────────────────────────
  {
    id: "huckel-rule",
    title: "Hückel's Rule: 4n+2 π Electrons",
    conceptTag: "aromaticity",
    conceptLabel: "Aromaticity",
    difficulty: "medium",
    readingTimeSecs: 45,
    tip: "A ring is aromatic if it is: (1) cyclic, (2) planar, (3) fully conjugated (each atom contributes a p orbital), and (4) contains 4n+2 π electrons (n = 0, 1, 2, …): 2, 6, 10, 14… Benzene has 6 π electrons (n=1) → aromatic. Cyclooctatetraene has 8 (4×2) → anti-aromatic. A ring with 4n electrons is anti-aromatic and destabilised.",
    keyFact: "4n+2 = aromatic (stable). 4n = anti-aromatic (very unstable). Non-cyclic or non-conjugated = non-aromatic (just unstable normally).",
    watchOutFor: "Lone pairs on heteroatoms can count toward the π system if they occupy a p orbital in the plane of the ring. Pyrrole N contributes its lone pair (making 6 π e⁻); pyridine N's lone pair is in the ring plane and does NOT count — pyridine has only 6 π e⁻ from the three double bonds.",
  },
];

// ── Concept filter list ────────────────────────────────────────────────────

const ALL_CONCEPTS = Array.from(
  new Set(SHORTS.map((s) => s.conceptTag))
).map((tag) => ({
  tag,
  label: SHORTS.find((s) => s.conceptTag === tag)!.conceptLabel,
}));

// ── Difficulty badge ───────────────────────────────────────────────────────

function DiffBadge({ d }: { d: "easy" | "medium" | "hard" }) {
  const cls =
    d === "easy"   ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
    d === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
                     "bg-red-50 text-red-600 border-red-200";
  return (
    <span className={`text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cls}`}>
      {d}
    </span>
  );
}

// ── Short card ─────────────────────────────────────────────────────────────

function ShortCard({
  short, index, total, isWeakness,
}: {
  short: Short; index: number; total: number; isWeakness: boolean;
}) {
  const readingMins = short.readingTimeSecs < 60
    ? `${short.readingTimeSecs}s read`
    : `${Math.round(short.readingTimeSecs / 60)}m read`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <DiffBadge d={short.difficulty} />
            <span className="text-[0.65rem] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
              #{short.conceptTag}
            </span>
            {isWeakness && (
              <span className="text-[0.6rem] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                ⬇ Your Weakness
              </span>
            )}
          </div>
          <span className="text-[0.65rem] text-slate-400 font-medium">{readingMins}</span>
        </div>
        <h2 className="text-lg font-black text-slate-900 leading-snug">{short.title}</h2>
        <p className="text-xs text-slate-400 mt-1">{index + 1} of {total}</p>
      </div>

      {/* Tip */}
      <div className="px-5 py-4">
        <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">Chemistry Tip</p>
        <p className="text-sm text-slate-700 leading-relaxed">{short.tip}</p>
      </div>

      {/* Key fact */}
      <div className="mx-5 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-[0.65rem] font-bold tracking-widest text-emerald-600 uppercase mb-1">⚡ Key Fact</p>
        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{short.keyFact}</p>
      </div>

      {/* Watch out */}
      <div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-[0.65rem] font-bold tracking-widest text-amber-600 uppercase mb-1">⚠ Watch Out For</p>
        <p className="text-sm text-slate-700 leading-relaxed">{short.watchOutFor}</p>
      </div>

      {/* Practice CTA */}
      <div className="px-5 pb-5">
        <Link
          href="/adaptive-pyq"
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl py-3 no-underline transition-colors"
        >
          🎯 Practice {short.conceptLabel} in Adaptive PYQ →
        </Link>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TutorShortsPage() {
  const eloRating      = useChemStore((s) => s.eloRating);
  const profile        = useChemStore((s) => s.profile);
  const refreshProfile = useChemStore((s) => s.refreshProfile);

  const [filter, setFilter]     = useState<string>("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const topWeaknesses = useMemo(
    () => (profile?.top_weaknesses ?? []).map((t) => t.toLowerCase()),
    [profile]
  );

  // Build sorted deck: weakness-matching shorts first, then rest
  const deck = useMemo(() => {
    const base = filter === "all" ? SHORTS : SHORTS.filter((s) => s.conceptTag === filter);
    const weak = base.filter((s) => topWeaknesses.some(
      (w) => s.conceptTag === w || w.includes(s.conceptTag) || s.conceptTag.includes(w)
    ));
    const rest = base.filter((s) => !weak.includes(s));
    return [...weak, ...rest];
  }, [filter, topWeaknesses]);

  // Reset index when filter or deck changes
  useEffect(() => { setCurrentIdx(0); }, [filter]);

  function scrollToCard() {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePrev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
    scrollToCard();
  }
  function handleNext() {
    setCurrentIdx((i) => Math.min(deck.length - 1, i + 1));
    scrollToCard();
  }

  const current = deck[currentIdx] ?? null;
  const isWeaknessCard = current
    ? topWeaknesses.some(
        (w) => current.conceptTag === w || w.includes(current.conceptTag) || current.conceptTag.includes(w)
      )
    : false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-violet-600 text-xs font-semibold tracking-wide uppercase">
            Tutor Shorts
          </span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-2">
            Micro-Learning
          </p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            ⚡ Tutor <span className="text-violet-600">Shorts</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            One chemistry concept per card — tip, key fact, and a common mistake to avoid.
            {topWeaknesses.length > 0 && (
              <> Your weak concepts appear <span className="text-red-600 font-semibold">first</span>.</>
            )}
          </p>
        </div>

        {/* Concept filter */}
        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex gap-2 w-max">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                filter === "all"
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
              }`}
            >
              All ({SHORTS.length})
            </button>
            {ALL_CONCEPTS.map(({ tag, label }) => {
              const isWeak = topWeaknesses.some(
                (w) => tag === w || w.includes(tag) || tag.includes(w)
              );
              return (
                <button
                  key={tag}
                  onClick={() => setFilter(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                    filter === tag
                      ? "bg-violet-600 text-white border-violet-600"
                      : isWeak
                      ? "bg-red-50 text-red-600 border-red-200 hover:border-red-400"
                      : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                  }`}
                >
                  {isWeak ? "⬇ " : ""}{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div ref={cardRef}>
          {deck.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">No shorts for this filter.</div>
          ) : current && (
            <ShortCard
              short={current}
              index={currentIdx}
              total={deck.length}
              isWeakness={isWeaknessCard}
            />
          )}
        </div>

        {/* Prev / Next nav */}
        {deck.length > 1 && (
          <div className="flex items-center justify-between mt-5 gap-3">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="flex-1 border border-slate-200 bg-white text-slate-600 font-bold text-sm py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {currentIdx + 1} / {deck.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIdx === deck.length - 1}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}

        {/* Progress dots */}
        {deck.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
            {deck.slice(0, 20).map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIdx(i); scrollToCard(); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIdx ? "bg-violet-600 w-4" : "bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
