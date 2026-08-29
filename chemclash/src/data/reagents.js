/**
 * ChemClash — Reagents Master Database
 * ─────────────────────────────────────────────────────────────────────────────
 * Every entry describes one reagent with:
 *   id            – slug used in URLs / keys
 *   name          – IUPAC / common name
 *   formula       – molecular formula (Unicode subscripts)
 *   category      – grouping label for filtering
 *   description   – one-line role in organic chemistry
 *   reactions[]   – list of reaction scenarios:
 *       substrate   – what the reagent is reacting with
 *       product     – what forms
 *       conditions  – temperature, catalyst, solvent notes
 *       type        – reaction type label
 *       notes       – JEE-relevant tip / mechanism note
 */

export const REAGENTS = [

  // ── ACIDS ──────────────────────────────────────────────────────────────────

  {
    id: "h2so4_conc",
    name: "Concentrated Sulphuric Acid",
    formula: "H₂SO₄",
    category: "Acids",
    description: "Strong acid, dehydrating agent, sulfonating agent.",
    reactions: [
      { substrate: "Alcohol (primary/secondary)", product: "Alkene", conditions: "Conc. H₂SO₄, 170 °C (excess acid)", type: "Dehydration (E1/E2)", notes: "Saytzeff's rule governs alkene formed; at 140 °C with excess alcohol gives ether instead." },
      { substrate: "Alcohol (excess)", product: "Ether (Williamson via acid)", conditions: "Conc. H₂SO₄, 140 °C", type: "Intermolecular dehydration", notes: "Only works well for primary alcohols; secondary/tertiary give mainly alkene." },
      { substrate: "Benzene", product: "Benzenesulphonic acid", conditions: "Fuming H₂SO₄ (oleum), heat", type: "Electrophilic Aromatic Substitution — Sulfonation", notes: "Reversible reaction; desulfonation at 170 °C with steam." },
      { substrate: "Nitrobenzene", product: "m-Dinitrobenzene", conditions: "Conc. HNO₃ + Conc. H₂SO₄, 100 °C", type: "Nitration (EAS)", notes: "-NO₂ is a meta-director; requires harsh conditions." },
      { substrate: "Alkene", product: "Alkyl hydrogen sulphate → Alcohol", conditions: "Cold conc. H₂SO₄ then H₂O", type: "Indirect hydration", notes: "Markovnikov addition; used industrially for alcohol synthesis from alkenes." },
      { substrate: "Carbohydrate (sugar)", product: "Carbon + water (charring)", conditions: "Concentrated", type: "Dehydration", notes: "Classic dehydrating power demo — C₁₂H₂₂O₁₁ → 12C + 11H₂O." },
    ],
  },

  {
    id: "hcl",
    name: "Hydrochloric Acid",
    formula: "HCl",
    category: "Acids",
    description: "Strong acid, source of Cl⁻ nucleophile.",
    reactions: [
      { substrate: "Alcohol (tertiary > secondary > primary)", product: "Alkyl chloride", conditions: "Anhydrous ZnCl₂ catalyst (Lucas reagent)", type: "Nucleophilic Substitution (SN1 > SN2)", notes: "Lucas test: 3° reacts immediately (turbidity), 2° in 5 min, 1° no reaction at RT." },
      { substrate: "Alkene", product: "Alkyl chloride", conditions: "Anhydrous, RT", type: "Electrophilic Addition (Markovnikov)", notes: "H adds to less-substituted carbon; Cl goes to more substituted (Markovnikov)." },
      { substrate: "Alkyne (terminal)", product: "Vinyl chloride (then gem-dichloride)", conditions: "Anhydrous, stepwise", type: "Electrophilic Addition", notes: "First addition gives vinyl chloride; second gives gem-dichloride." },
      { substrate: "Sodium acetate", product: "Acetic acid + NaCl", conditions: "Aqueous", type: "Acid–base (salt hydrolysis)", notes: "Used to liberate weaker acids from their salts." },
    ],
  },

  {
    id: "hbr",
    name: "Hydrobromic Acid",
    formula: "HBr",
    category: "Acids",
    description: "Strong acid; Br⁻ is a better nucleophile than Cl⁻.",
    reactions: [
      { substrate: "Alcohol", product: "Alkyl bromide", conditions: "Conc. HBr or PBr₃", type: "SN1 (3°) / SN2 (1°)", notes: "Faster than HCl; no ZnCl₂ needed for tertiary." },
      { substrate: "Alkene", product: "Alkyl bromide (Markovnikov)", conditions: "Anhydrous, dark", type: "Electrophilic Addition", notes: "In the presence of peroxide (ROOR), anti-Markovnikov product via free-radical mechanism." },
      { substrate: "Alkene + peroxide (ROOR)", product: "Anti-Markovnikov alkyl bromide", conditions: "Peroxide, hν or heat", type: "Free Radical Addition", notes: "Only HBr shows anti-Markovnikov with peroxides; HCl and HI do not (thermodynamic reasons)." },
      { substrate: "Phenol (via diazonium)", product: "Bromobenzene (Sandmeyer)", conditions: "CuBr, Δ", type: "Sandmeyer Reaction", notes: "Diazonium salt + CuBr → aryl bromide + N₂." },
    ],
  },

  {
    id: "hi",
    name: "Hydroiodic Acid",
    formula: "HI",
    category: "Acids",
    description: "Strongest of the halogen acids; excellent nucleophilic iodide.",
    reactions: [
      { substrate: "Ether (dialkyl)", product: "Alcohol + Alkyl iodide", conditions: "Conc. HI, heat", type: "Ether cleavage (SN2)", notes: "Cleavage at the less hindered C–O bond; excess HI converts alcohol to iodide." },
      { substrate: "Methyl ether", product: "Methyl iodide + Alcohol", conditions: "Conc. HI", type: "SN2 cleavage", notes: "Used in Zeisel's method to determine methoxy groups." },
      { substrate: "Alkene", product: "Alkyl iodide (Markovnikov)", conditions: "Anhydrous", type: "Electrophilic Addition", notes: "Least favoured haloacid addition — HI bond is weakest, but I⁻ is the best nucleophile." },
    ],
  },

  // ── HALOGENATING AGENTS ───────────────────────────────────────────────────

  {
    id: "br2",
    name: "Bromine",
    formula: "Br₂",
    category: "Halogenating Agents",
    description: "Electrophilic bromine; decolorisation used as unsaturation test.",
    reactions: [
      { substrate: "Alkene", product: "Vicinal dibromide (anti addition)", conditions: "CCl₄, dark, RT", type: "Electrophilic Addition", notes: "Anti addition via bromonium ion intermediate; stereochemistry is anti." },
      { substrate: "Alkyne", product: "Tetrabromoalkane (two-step)", conditions: "CCl₄", type: "Electrophilic Addition (×2)", notes: "First addition gives dibromoalkene; second gives tetrabromoalkane." },
      { substrate: "Benzene", product: "Bromobenzene + HBr", conditions: "Br₂, FeBr₃ (Lewis acid catalyst)", type: "EAS — Halogenation", notes: "FeBr₃ activates Br₂ as electrophile; HBr is lost in the last step." },
      { substrate: "Alkane", product: "Alkyl bromide + HBr", conditions: "hν (light), heat", type: "Free Radical Halogenation", notes: "Selectivity: 3°H > 2°H > 1°H; bromine is more selective than chlorine." },
      { substrate: "Phenol", product: "2,4,6-Tribromophenol", conditions: "Br₂/H₂O (bromine water)", type: "EAS (activated ring)", notes: "Instantaneous white precipitate; used as test for phenol. No catalyst needed." },
      { substrate: "Aniline", product: "2,4,6-Tribromoaniline", conditions: "Br₂/H₂O", type: "EAS (activated ring)", notes: "White precipitate test for aniline; -NH₂ strongly activates ortho/para positions." },
      { substrate: "Ketone (α-position)", product: "α-Bromoketone", conditions: "Br₂ in acetic acid", type: "Alpha halogenation", notes: "Goes through enol intermediate; acid-catalysed (base also works)." },
      { substrate: "Carboxylic acid (Hell-Volhard-Zelinsky)", product: "α-Bromo acid", conditions: "Br₂ + red phosphorus (P)", type: "HVZ Reaction", notes: "P converts acid to acyl bromide first; enolises more easily; only α-position brominated." },
    ],
  },

  {
    id: "cl2",
    name: "Chlorine",
    formula: "Cl₂",
    category: "Halogenating Agents",
    description: "Versatile halogenating agent; less selective than Br₂.",
    reactions: [
      { substrate: "Alkane (CH₄)", product: "CH₃Cl → CH₂Cl₂ → CHCl₃ → CCl₄", conditions: "hν, excess Cl₂", type: "Free Radical Halogenation", notes: "Less selective than Br₂; all positions attacked almost equally." },
      { substrate: "Benzene", product: "Chlorobenzene + HCl", conditions: "Cl₂, FeCl₃", type: "EAS — Halogenation", notes: "FeCl₃ acts as Lewis acid catalyst." },
      { substrate: "Alkene", product: "Vicinal dichloride", conditions: "Cl₂/CCl₄, RT, dark", type: "Electrophilic Addition", notes: "Anti addition; less clean than Br₂ due to chlorine's higher reactivity." },
      { substrate: "Benzene + hν", product: "Benzene hexachloride (BHC / Lindane)", conditions: "hν, no catalyst", type: "Free Radical Addition (not EAS)", notes: "Six Cl atoms add across benzene ring; gives mixture of stereoisomers; γ-isomer = lindane (insecticide)." },
      { substrate: "Sodium hydroxide solution (cold, dilute)", product: "Sodium hypochlorite (bleaching powder constituent)", conditions: "Cold, dilute NaOH", type: "Disproportionation", notes: "Cl₂ + 2NaOH → NaCl + NaOCl + H₂O." },
    ],
  },

  {
    id: "nbs",
    name: "N-Bromosuccinimide",
    formula: "C₄H₄BrNO₂",
    category: "Halogenating Agents",
    description: "Selective free-radical allylic/benzylic brominating agent.",
    reactions: [
      { substrate: "Alkene (allylic position)", product: "Allylic bromide", conditions: "CCl₄, hν or AIBN (initiator)", type: "Allylic Free Radical Bromination", notes: "NBS provides low, steady concentration of Br₂; selectivity for allylic C–H bond." },
      { substrate: "Toluene (benzylic position)", product: "Benzyl bromide", conditions: "CCl₄, hν", type: "Benzylic Bromination", notes: "Benzylic radical is stabilised by resonance; NBS gives mono-bromination cleanly." },
      { substrate: "Alkene (electrophilic addition)", product: "Bromohydrin-like products", conditions: "Aqueous conditions", type: "Electrophilic Addition", notes: "Less common use; in aqueous media NBS can act as Br⁺ source." },
    ],
  },

  // ── OXIDISING AGENTS ──────────────────────────────────────────────────────

  {
    id: "kmno4_alk",
    name: "Alkaline Potassium Permanganate (Baeyer's Reagent)",
    formula: "KMnO₄ / NaOH",
    category: "Oxidising Agents",
    description: "Cold, dilute: cis-diol formation (syn addition). Hot, conc.: oxidative cleavage.",
    reactions: [
      { substrate: "Alkene (cold, dilute)", product: "Vicinal diol (cis/syn)", conditions: "Cold, dilute KMnO₄, alkaline", type: "Oxidation — Baeyer's Test", notes: "Purple colour is discharged; used as test for unsaturation. Syn addition of two OH groups." },
      { substrate: "Alkene (hot, conc.)", product: "Carboxylic acids / ketones / CO₂ (depends on substitution)", conditions: "Hot, concentrated KMnO₄", type: "Oxidative Cleavage", notes: "R-CH=CH-R → 2 RCOOH; R₂C=CH₂ → ketone + CO₂ + H₂O; terminal =CH₂ gives CO₂." },
      { substrate: "Toluene / alkylbenzene", product: "Benzoic acid", conditions: "Hot, acidic KMnO₄", type: "Side-chain oxidation", notes: "Only benzylic position oxidised; benzene ring itself survives KMnO₄." },
      { substrate: "Primary alcohol", product: "Carboxylic acid", conditions: "Acidic KMnO₄", type: "Oxidation", notes: "Aldehyde intermediate is quickly oxidised further to acid." },
      { substrate: "Secondary alcohol", product: "Ketone", conditions: "Acidic KMnO₄", type: "Oxidation", notes: "Stops at ketone stage (no α-H on carbonyl side for further oxidation)." },
    ],
  },

  {
    id: "k2cr2o7",
    name: "Potassium Dichromate",
    formula: "K₂Cr₂O₇",
    category: "Oxidising Agents",
    description: "Mild oxidant; oxidises 1° alcohols to aldehydes if distilled, or to acids.",
    reactions: [
      { substrate: "Primary alcohol", product: "Aldehyde (if distilled) or Carboxylic acid", conditions: "H₂SO₄, heat", type: "Oxidation", notes: "Orange Cr₂O₇²⁻ turns green (Cr³⁺); useful for distinguishing 1° from 3° alcohols." },
      { substrate: "Secondary alcohol", product: "Ketone", conditions: "H₂SO₄, heat", type: "Oxidation", notes: "Ketones are not further oxidised by K₂Cr₂O₇ under normal conditions." },
      { substrate: "Tertiary alcohol", product: "No reaction", conditions: "Any", type: "No reaction", notes: "No α-hydrogen on the oxygen-bearing carbon; cannot be oxidised without C–C cleavage." },
    ],
  },

  {
    id: "ozone_o3",
    name: "Ozone / Ozonolysis",
    formula: "O₃",
    category: "Oxidising Agents",
    description: "Cleaves C=C double bonds; product depends on workup (reductive vs oxidative).",
    reactions: [
      { substrate: "Alkene — reductive workup (Zn/H₂O or Me₂S)", product: "Aldehydes and/or ketones (no further oxidation)", conditions: "1. O₃ 2. Zn/H₂O or Me₂S", type: "Ozonolysis (reductive)", notes: "RCH=CHR → 2 RCHO; R₂C=CHR → ketone + aldehyde. Used in structural determination." },
      { substrate: "Alkene — oxidative workup (H₂O₂)", product: "Carboxylic acids (from -CHR) or ketones (from -CR₂)", conditions: "1. O₃ 2. H₂O₂", type: "Ozonolysis (oxidative)", notes: "Aldehydes are further oxidised to acids; terminal CH₂= gives CO₂ + H₂O." },
      { substrate: "Alkyne", product: "Carboxylic acids (two molecules)", conditions: "1. O₃ 2. H₂O", type: "Ozonolysis of triple bond", notes: "Gives carboxylic acids directly; used to locate triple bond position." },
    ],
  },

  {
    id: "h2o2",
    name: "Hydrogen Peroxide",
    formula: "H₂O₂",
    category: "Oxidising Agents",
    description: "Mild oxidant / electrophilic oxygen source.",
    reactions: [
      { substrate: "Alkene (with OsO₄ cat.)", product: "cis-Diol", conditions: "Cat. OsO₄, H₂O₂ (Upjohn)", type: "Dihydroxylation", notes: "Catalytic OsO₄ + H₂O₂ as stoichiometric oxidant; syn addition gives cis-diol." },
      { substrate: "Borate ester (from hydroboration)", product: "Alcohol (anti-Markovnikov)", conditions: "H₂O₂, NaOH", type: "Oxidation of organoborane", notes: "Second step of hydroboration-oxidation; overall anti-Markovnikov, syn addition of OH." },
      { substrate: "Ketone (Baeyer-Villiger)", product: "Ester or Lactone", conditions: "m-CPBA or H₂O₂ + acid", type: "Baeyer-Villiger Oxidation", notes: "Oxygen inserted between carbonyl C and the more substituted α-carbon; migrating group order: 3° > 2° > aryl > 1° > methyl." },
    ],
  },

  {
    id: "mncpba",
    name: "meta-Chloroperoxybenzoic Acid",
    formula: "m-ClC₆H₄CO₃H",
    category: "Oxidising Agents",
    description: "Peracid; epoxidises alkenes, Baeyer-Villiger oxidation.",
    reactions: [
      { substrate: "Alkene", product: "Epoxide", conditions: "CH₂Cl₂, RT", type: "Epoxidation", notes: "Syn delivery of oxygen; more substituted alkenes react faster. Sharpless asymmetric uses Ti-tartrate instead." },
      { substrate: "Ketone", product: "Ester / Lactone", conditions: "CH₂Cl₂", type: "Baeyer-Villiger Oxidation", notes: "Most reliable peracid for BV; selectivity follows migratory aptitude." },
    ],
  },

  // ── REDUCING AGENTS ───────────────────────────────────────────────────────

  {
    id: "nabh4",
    name: "Sodium Borohydride",
    formula: "NaBH₄",
    category: "Reducing Agents",
    description: "Mild, selective hydride donor; reduces C=O but NOT C=C, ester, or carboxylic acid.",
    reactions: [
      { substrate: "Aldehyde", product: "Primary alcohol", conditions: "EtOH or MeOH, RT", type: "Nucleophilic Reduction", notes: "Hydride (H⁻) attacks carbonyl carbon; protonation gives alcohol. Chemo-selective over alkenes." },
      { substrate: "Ketone", product: "Secondary alcohol", conditions: "EtOH or MeOH, RT", type: "Nucleophilic Reduction", notes: "Less reactive than LiAlH₄ but selective; does not reduce esters or acids." },
      { substrate: "Acid chloride", product: "Primary alcohol", conditions: "Mild", type: "Reduction", notes: "Acid chlorides are reactive enough to be reduced by NaBH₄." },
      { substrate: "Alkene", product: "No reaction", conditions: "—", type: "No reaction", notes: "NaBH₄ cannot reduce isolated C=C bonds; LiAlH₄ also cannot reduce alkenes." },
    ],
  },

  {
    id: "lialh4",
    name: "Lithium Aluminium Hydride",
    formula: "LiAlH₄",
    category: "Reducing Agents",
    description: "Powerful hydride donor; reduces almost all carbonyl-containing functional groups.",
    reactions: [
      { substrate: "Aldehyde", product: "Primary alcohol", conditions: "Dry ether (Et₂O), then H₂O workup", type: "Reduction", notes: "Violent reaction with water; must use dry solvents." },
      { substrate: "Ketone", product: "Secondary alcohol", conditions: "Dry ether", type: "Reduction", notes: "More powerful than NaBH₄; used when NaBH₄ fails." },
      { substrate: "Carboxylic acid", product: "Primary alcohol", conditions: "Dry ether", type: "Reduction", notes: "Unique ability of LiAlH₄ — NaBH₄ cannot do this." },
      { substrate: "Ester", product: "Two alcohols (acid portion → primary alcohol)", conditions: "Dry ether", type: "Reduction", notes: "Cleaves C–O bond; ester R'COOR → R'CH₂OH + ROH." },
      { substrate: "Amide", product: "Amine", conditions: "Dry ether", type: "Reduction", notes: "RCONH₂ → RCH₂NH₂; very useful for amine synthesis." },
      { substrate: "Nitrile", product: "Primary amine", conditions: "Dry ether", type: "Reduction", notes: "RCN → RCH₂NH₂; two-electron reduction." },
      { substrate: "Nitro compound", product: "Primary amine", conditions: "Dry ether", type: "Reduction", notes: "RNO₂ → RNH₂; six-electron reduction." },
      { substrate: "Alkene / Alkyne", product: "No reaction", conditions: "—", type: "No reaction", notes: "LiAlH₄ does NOT reduce isolated C=C or C≡C bonds." },
    ],
  },

  {
    id: "h2_pd",
    name: "Hydrogen gas over Palladium catalyst",
    formula: "H₂ / Pd–C",
    category: "Reducing Agents",
    description: "Catalytic hydrogenation; adds H₂ across multiple bonds.",
    reactions: [
      { substrate: "Alkene", product: "Alkane", conditions: "H₂, Pd/C or Pt, RT–50 °C", type: "Catalytic Hydrogenation", notes: "Syn addition of H₂; heterogeneous catalyst; exothermic (heat of hydrogenation)." },
      { substrate: "Alkyne (partial)", product: "cis-Alkene (Lindlar's)", conditions: "H₂, Lindlar's catalyst (Pd/BaSO₄/quinoline)", type: "Semi-hydrogenation", notes: "Stops at cis-alkene; Lindlar's is partially poisoned Pd — cannot fully reduce alkyne." },
      { substrate: "Alkyne (full)", product: "Alkane", conditions: "H₂, Pd/C, excess", type: "Catalytic Hydrogenation", notes: "Two equivalents of H₂ consumed; goes through alkene." },
      { substrate: "Benzene ring", product: "Cyclohexane", conditions: "H₂ (3 equiv.), Pt, high pressure", type: "Aromatic Hydrogenation", notes: "Very high activation energy; requires high pressure/temperature due to aromaticity." },
      { substrate: "Nitrobenzene", product: "Aniline", conditions: "H₂, Pd/C, EtOH", type: "Reduction of nitro group", notes: "Industrial method for aniline; also done with Fe/HCl (Baeyer reduction)." },
      { substrate: "Aldehyde/Ketone", product: "Alcohol", conditions: "H₂, Pd/C or Raney Ni", type: "Hydrogenation of C=O", notes: "Less common than hydride reduction; used in industrial scale." },
    ],
  },

  {
    id: "na_liq_nh3",
    name: "Sodium in Liquid Ammonia (Birch Reduction)",
    formula: "Na / liq. NH₃",
    category: "Reducing Agents",
    description: "Dissolving metal reduction; reduces alkynes to trans-alkenes and aromatic rings selectively.",
    reactions: [
      { substrate: "Internal alkyne", product: "trans-Alkene (E-alkene)", conditions: "Na or Li, liq. NH₃, –33 °C", type: "Dissolving Metal Reduction", notes: "Anti addition via radical anion intermediate; opposite stereochemistry to Lindlar's (cis)." },
      { substrate: "Benzene ring (electron-rich)", product: "1,4-cyclohexadiene (unsubstituted positions reduced)", conditions: "Na, liq. NH₃, t-BuOH", type: "Birch Reduction", notes: "Electron-donating substituents (OH, NR₂) direct reduction to unsubstituted positions. Electron-withdrawing groups (COOH, COR) direct reduction to substituted positions." },
      { substrate: "Benzene ring (electron-poor)", product: "Substituted positions reduced preferentially", conditions: "Na, liq. NH₃", type: "Birch Reduction", notes: "EWG-substituted rings reduce at positions bearing the substituent." },
    ],
  },

  {
    id: "clemmensen",
    name: "Clemmensen Reduction",
    formula: "Zn(Hg) / conc. HCl",
    category: "Reducing Agents",
    description: "Reduces C=O of ketones/aldehydes directly to CH₂ under acidic conditions.",
    reactions: [
      { substrate: "Ketone (aryl)", product: "Methylene compound (Ar-CH₂-R)", conditions: "Zn amalgam, conc. HCl, heat", type: "Deoxygenation", notes: "Used to synthesise alkylbenzenes from Friedel-Crafts ketones; avoids the enol intermediate." },
      { substrate: "Aldehyde", product: "Alkane (from RCHO → RCH₃)", conditions: "Zn amalgam, conc. HCl", type: "Deoxygenation", notes: "Works in acidic medium; complementary to Wolff-Kishner (alkaline)." },
      { substrate: "Acid-sensitive substrate", product: "Not suitable", conditions: "—", type: "Limitation", notes: "Clemmensen uses strongly acidic conditions; acid-labile groups are destroyed. Use Wolff-Kishner instead." },
    ],
  },

  {
    id: "wolff_kishner",
    name: "Wolff–Kishner Reduction",
    formula: "NH₂NH₂ / KOH",
    category: "Reducing Agents",
    description: "Reduces C=O to CH₂ under strongly basic conditions via hydrazone.",
    reactions: [
      { substrate: "Ketone / Aldehyde", product: "Methylene compound (C=O → CH₂)", conditions: "NH₂NH₂, KOH, ethylene glycol, heat (200 °C) or Huang-Minlon modification", type: "Deoxygenation via hydrazone", notes: "Complementary to Clemmensen; use when substrate is base-stable. Mechanism: C=O → hydrazone → N₂ lost → CH₂." },
    ],
  },

  {
    id: "rosenmund",
    name: "Rosenmund Reduction",
    formula: "H₂ / Pd–BaSO₄",
    category: "Reducing Agents",
    description: "Selective reduction of acid chloride to aldehyde (stops at aldehyde).",
    reactions: [
      { substrate: "Acid chloride (RCOCl)", product: "Aldehyde (RCHO)", conditions: "H₂, Pd/BaSO₄ (poisoned catalyst), xylene", type: "Selective Hydrogenation", notes: "Poisoned catalyst prevents over-reduction to alcohol. Key reaction for aldehyde synthesis." },
    ],
  },

  {
    id: "stephen",
    name: "Stephen Reduction",
    formula: "SnCl₂ / HCl",
    category: "Reducing Agents",
    description: "Reduces nitriles to aldehydes (via imine salt hydrolysis).",
    reactions: [
      { substrate: "Nitrile (RCN)", product: "Aldehyde (RCHO)", conditions: "SnCl₂, HCl (anhydrous), then H₂O hydrolysis", type: "Partial Reduction", notes: "Nitrile → imine salt (via SnCl₂) → aldehyde on hydrolysis. Useful for aromatic aldehydes." },
    ],
  },

  // ── GRIGNARD & ORGANOMETALLICS ────────────────────────────────────────────

  {
    id: "grignard",
    name: "Grignard Reagent",
    formula: "RMgX",
    category: "Organometallics",
    description: "Carbanion equivalent; adds to carbonyl groups and other electrophiles.",
    reactions: [
      { substrate: "Formaldehyde (HCHO)", product: "Primary alcohol", conditions: "Dry ether, then H₂O⁺", type: "Nucleophilic Addition", notes: "HCHO + RMgX → RCH₂OH after workup. Used to add one carbon with a CH₂OH group." },
      { substrate: "Aldehyde (RCHO)", product: "Secondary alcohol", conditions: "Dry ether, then H₂O⁺", type: "Nucleophilic Addition", notes: "One carbon higher; product is secondary alcohol." },
      { substrate: "Ketone (RCOR')", product: "Tertiary alcohol", conditions: "Dry ether, then H₂O⁺", type: "Nucleophilic Addition", notes: "Two existing R groups + new R from RMgX = tertiary alcohol." },
      { substrate: "CO₂", product: "Carboxylic acid (one carbon longer)", conditions: "1. Dry ether 2. H₂O⁺", type: "Carboxylation", notes: "RMgX + CO₂ → RCOOMgX → RCOOH. Carbon chain extended by one carboxyl group." },
      { substrate: "Ester (RCOOR')", product: "Tertiary alcohol (two R groups same)", conditions: "Dry ether (excess RMgX)", type: "Double Addition", notes: "First addition gives ketone intermediate (which reacts again); product has two identical R groups from Grignard." },
      { substrate: "Nitrile (RCN)", product: "Ketone (after hydrolysis)", conditions: "Dry ether, then H₃O⁺", type: "Addition to C≡N", notes: "RMgX + R'CN → imine salt → R'COR (ketone) after acid hydrolysis." },
      { substrate: "Terminal alkyne (R-C≡C-H)", product: "Alkynyl Grignard (R-C≡C-MgX)", conditions: "EtMgBr exchange", type: "Acid-base reaction", notes: "Acidic terminal alkyne proton replaces Mg from another Grignard; forms alkynyl Grignard." },
      { substrate: "Water / alcohol / acid (protic source)", product: "Alkane (RH) — destroyed", conditions: "—", type: "Decomposition (limitation)", notes: "Grignard reagents are destroyed by any proton source; all glassware must be bone dry." },
    ],
  },

  // ── BASES ─────────────────────────────────────────────────────────────────

  {
    id: "naoh",
    name: "Sodium Hydroxide",
    formula: "NaOH",
    category: "Bases",
    description: "Strong base; nucleophile (OH⁻) and base for E2 eliminations.",
    reactions: [
      { substrate: "Haloalkane (primary)", product: "Alcohol (SN2 dominant)", conditions: "Dilute NaOH, aqueous", type: "Nucleophilic Substitution (SN2)", notes: "Aqueous/dilute favours substitution; primary alkyl halide + OH⁻ → alcohol." },
      { substrate: "Haloalkane (with alc. KOH)", product: "Alkene (E2 dominant)", conditions: "Alcoholic NaOH/KOH, heat", type: "Elimination (E2)", notes: "Hot alcoholic base favours elimination; Saytzeff's rule predicts major alkene." },
      { substrate: "Ester", product: "Carboxylate salt + Alcohol (saponification)", conditions: "Aqueous NaOH, heat", type: "Base-catalysed Ester Hydrolysis (Saponification)", notes: "Irreversible; carboxylate salt formed — must acidify to get free acid." },
      { substrate: "Chloroform + Benzene (Reimer-Tiemann)", product: "Salicylaldehyde (ortho-hydroxybenzaldehyde)", conditions: "CHCl₃, conc. NaOH, heat", type: "Reimer-Tiemann Reaction", notes: "Carbene (:CCl₂) generated from CHCl₃; adds to phenoxide ring; ortho-selective." },
      { substrate: "Amide (Hofmann bromamide)", product: "Primary amine (one carbon fewer)", conditions: "NaOH + Br₂", type: "Hofmann Bromamide Degradation", notes: "RCONH₂ → RNH₂; carbon count reduces by 1; isocyanate intermediate." },
      { substrate: "Aldehyde (Cannizzaro — no α-H)", product: "Alcohol + Carboxylate salt (1:1)", conditions: "Conc. NaOH", type: "Cannizzaro Reaction", notes: "Self-disproportionation; one mol oxidised, one reduced. Works only for aldehydes with no α-H (HCHO, PhCHO, (CH₃)₃CCHO)." },
    ],
  },

  {
    id: "koh_alc",
    name: "Alcoholic Potassium Hydroxide",
    formula: "KOH / EtOH",
    category: "Bases",
    description: "Strong base in non-polar medium; strongly favours E2 elimination.",
    reactions: [
      { substrate: "Haloalkane (secondary / tertiary)", product: "Alkene (Saytzeff product major)", conditions: "Hot alcoholic KOH", type: "E2 Elimination", notes: "Hot + alcoholic = elimination. Saytzeff: more substituted alkene is major product." },
      { substrate: "Geminal dihalide (gem-RCHCl₂)", product: "Alkyne (two E2 steps)", conditions: "Hot, excess KOH/EtOH", type: "Double Elimination", notes: "Two HX eliminated sequentially; useful synthesis of alkynes from 1,1-dihaloalkanes." },
      { substrate: "Vicinal dihalide (anti configuration)", product: "Alkyne", conditions: "Hot, excess KOH/EtOH", type: "Double Elimination", notes: "Anti periplanar requirement for each E2 step." },
    ],
  },

  // ── NAMED REACTION REAGENTS ───────────────────────────────────────────────

  {
    id: "tollens",
    name: "Tollens' Reagent",
    formula: "[Ag(NH₃)₂]OH",
    category: "Named Reaction Reagents",
    description: "Ammoniacal silver nitrate; 'silver mirror test' for aldehydes.",
    reactions: [
      { substrate: "Aldehyde (RCHO)", product: "Carboxylic acid salt + Ag metal (silver mirror)", conditions: "Warm, freshly prepared", type: "Oxidation (Tollens' Test)", notes: "Silver mirror lines the inside of the test tube. Ketones do NOT react (except α-hydroxy ketones). Formic acid also reacts." },
      { substrate: "Ketone (general)", product: "No reaction", conditions: "—", type: "Negative test", notes: "Distinguishes aldehydes from ketones; however methyl ketones give +ve iodoform test." },
      { substrate: "Glucose", product: "Gluconate + Silver mirror", conditions: "Warm", type: "Oxidation of reducing sugar", notes: "Tollens' positive confirms reducing sugar character." },
    ],
  },

  {
    id: "fehling",
    name: "Fehling's Solution",
    formula: "Cu²⁺ (tartrate complex)",
    category: "Named Reaction Reagents",
    description: "Deep blue Cu²⁺ complex; reduces to brick-red Cu₂O precipitate with reducing sugars/aldehydes.",
    reactions: [
      { substrate: "Aliphatic aldehyde", product: "Carboxylate + Cu₂O (brick-red ppt)", conditions: "Heat", type: "Fehling's Test", notes: "Aliphatic aldehydes give positive test. Aromatic aldehydes (PhCHO) do NOT reduce Fehling's." },
      { substrate: "Aromatic aldehyde (PhCHO)", product: "No reaction", conditions: "—", type: "Negative test", notes: "Key difference from Tollens' — PhCHO reduces Tollens' but NOT Fehling's." },
      { substrate: "Glucose / reducing sugars", product: "Cu₂O (brick-red precipitate)", conditions: "Heat", type: "Fehling's Test", notes: "Positive for all reducing sugars (maltose, lactose, glucose, fructose); sucrose = non-reducing (negative)." },
    ],
  },

  {
    id: "lucas",
    name: "Lucas Reagent",
    formula: "ZnCl₂ / conc. HCl",
    category: "Named Reaction Reagents",
    description: "Distinguishes primary, secondary and tertiary alcohols by turbidity time.",
    reactions: [
      { substrate: "Tertiary alcohol", product: "Alkyl chloride (turbidity immediately)", conditions: "RT, shake", type: "SN1", notes: "Carbocation formed immediately; turbidity within 5 min at RT." },
      { substrate: "Secondary alcohol", product: "Alkyl chloride (turbidity in ~5 min)", conditions: "RT", type: "SN1 (slower)", notes: "Intermediate stability; turbidity after ~5 minutes." },
      { substrate: "Primary alcohol", product: "No turbidity at RT (only on heating)", conditions: "RT", type: "SN2 too slow at RT", notes: "Primary alcohols give no turbidity at room temperature — key diagnostic." },
      { substrate: "Allyl / Benzyl alcohol", product: "Turbidity immediately", conditions: "RT", type: "SN1 (stabilised carbocation)", notes: "Resonance-stabilised cations react as fast as tertiary." },
    ],
  },

  {
    id: "hinsberg",
    name: "Hinsberg Reagent",
    formula: "C₆H₅SO₂Cl",
    category: "Named Reaction Reagents",
    description: "Benzenesulfonyl chloride; distinguishes primary, secondary, tertiary amines.",
    reactions: [
      { substrate: "Primary amine (RNH₂)", product: "Sulfonamide (soluble in NaOH)", conditions: "Shake with Hinsberg reagent + NaOH", type: "Sulfonamide formation", notes: "Product has N-H; acidic enough to dissolve in NaOH (pKa ~16). Two layers → one layer on NaOH addition = 1° amine." },
      { substrate: "Secondary amine (R₂NH)", product: "Sulfonamide (insoluble in NaOH)", conditions: "Shake with Hinsberg reagent", type: "Sulfonamide formation", notes: "No N-H; cannot ionise; precipitate forms but does NOT dissolve in NaOH." },
      { substrate: "Tertiary amine (R₃N)", product: "No reaction (or salt only)", conditions: "—", type: "No reaction", notes: "No N-H; cannot react with SO₂Cl; any salt formed dissolves in acid." },
    ],
  },

  {
    id: "iodoform",
    name: "Iodoform Reagent",
    formula: "I₂ / NaOH",
    category: "Named Reaction Reagents",
    description: "Identifies methyl ketones, acetaldehyde, and secondary alcohols oxidisable to methyl ketone.",
    reactions: [
      { substrate: "Methyl ketone (CH₃COR)", product: "CHI₃ (yellow ppt) + RCOONa", conditions: "I₂, NaOH, warm", type: "Iodoform Test (positive)", notes: "Yellow crystalline precipitate with antiseptic smell; confirms CH₃CO- group." },
      { substrate: "Acetaldehyde (CH₃CHO)", product: "CHI₃ + HCOONa", conditions: "I₂, NaOH", type: "Iodoform Test (positive)", notes: "Only aldehyde to give positive iodoform test; all others negative." },
      { substrate: "Ethanol (CH₃CH₂OH)", product: "CHI₃ (positive)", conditions: "I₂, NaOH", type: "Iodoform Test (positive)", notes: "Ethanol oxidised to acetaldehyde first, then iodoform reaction." },
      { substrate: "Secondary alcohol (with CH₃CHOH group)", product: "CHI₃ (positive)", conditions: "I₂, NaOH", type: "Iodoform Test (positive)", notes: "E.g. isopropanol, 2-butanol; oxidised to methyl ketone then CHI₃ forms." },
      { substrate: "Acetone (CH₃COCH₃)", product: "CHI₃ (positive)", conditions: "I₂, NaOH", type: "Iodoform Test (positive)", notes: "Both methyl groups halogenated; gives CHI₃ + CH₃COONa." },
    ],
  },

  {
    id: "sandmeyer",
    name: "Sandmeyer Reaction Reagents",
    formula: "CuCl / CuBr / CuCN / KI",
    category: "Named Reaction Reagents",
    description: "Replaces diazonium -N₂⁺ group with halide or CN via Cu(I) catalysis.",
    reactions: [
      { substrate: "Diazonium salt (ArN₂⁺)", product: "Aryl chloride (ArCl) + N₂", conditions: "CuCl, HCl, Δ", type: "Sandmeyer — Chlorination", notes: "Cu(I) catalyst essential; free radical mechanism via Ar• intermediate." },
      { substrate: "Diazonium salt (ArN₂⁺)", product: "Aryl bromide (ArBr) + N₂", conditions: "CuBr, HBr, Δ", type: "Sandmeyer — Bromination", notes: "Same mechanism; useful for regiospecific bromination of aromatic ring." },
      { substrate: "Diazonium salt (ArN₂⁺)", product: "Aryl nitrile (ArCN) + N₂", conditions: "CuCN, KCN", type: "Sandmeyer — Cyanation", notes: "Introduces CN group; subsequent hydrolysis gives ArCOOH; reduction gives ArCH₂NH₂." },
      { substrate: "Diazonium salt (ArN₂⁺)", product: "Aryl iodide (ArI) + N₂", conditions: "KI (no Cu needed)", type: "Finkelstein-type / direct", notes: "KI alone is sufficient; I⁻ is a good enough nucleophile without Cu catalyst." },
      { substrate: "Diazonium salt (ArN₂⁺)", product: "Arene (ArH) — deamination", conditions: "H₃PO₂ or EtOH", type: "Gattermann / Balz-Schiemann variant", notes: "Used to remove NH₂ group after it served as directing group in synthesis." },
    ],
  },

  {
    id: "nacn",
    name: "Sodium Cyanide",
    formula: "NaCN",
    category: "Nucleophilic Reagents",
    description: "Source of cyanide ion (CN⁻); both nucleophile and carbon chain extender.",
    reactions: [
      { substrate: "Haloalkane (primary)", product: "Nitrile (alkyl cyanide) — chain extended by 1C", conditions: "Alcoholic NaCN, SN2", type: "Nucleophilic Substitution", notes: "RX + CN⁻ → RCN; hydrolysis of RCN → RCOOH (one carbon longer acid)." },
      { substrate: "Aldehyde / Ketone", product: "Cyanohydrin", conditions: "HCN (or NaCN + acid)", type: "Nucleophilic Addition", notes: "CN⁻ adds to C=O; protonation gives α-hydroxy nitrile (cyanohydrin). Hydrolysis → α-hydroxy acid." },
      { substrate: "Benzaldehyde (benzoin condensation)", product: "Benzoin", conditions: "NaCN in EtOH/H₂O", type: "Benzoin Condensation", notes: "CN⁻ acts as nucleophile AND leaving group; umpolung of aldehyde reactivity." },
    ],
  },

  // ── CATALYST REAGENTS ─────────────────────────────────────────────────────

  {
    id: "alcl3",
    name: "Aluminium Chloride",
    formula: "AlCl₃",
    category: "Lewis Acid Catalysts",
    description: "Strong Lewis acid; catalyst for Friedel-Crafts alkylation and acylation.",
    reactions: [
      { substrate: "Benzene + RCl (Friedel-Crafts Alkylation)", product: "Alkylbenzene + HCl", conditions: "AlCl₃, anhydrous, RT", type: "Friedel-Crafts Alkylation (EAS)", notes: "Carbocation intermediate can rearrange (1° → 2° → 3°); problem with polyalkylation." },
      { substrate: "Benzene + RCOCl (Friedel-Crafts Acylation)", product: "Aryl ketone + HCl", conditions: "AlCl₃, anhydrous, 0°C→RT", type: "Friedel-Crafts Acylation (EAS)", notes: "Acylium ion R-C≡O⁺ is the electrophile; no rearrangement; no polyacylation. Preferred over alkylation in synthesis." },
      { substrate: "Deactivated ring (pyrrole, furan, thiophene)", product: "Reaction fails / decomposition", conditions: "—", type: "Limitation", notes: "Friedel-Crafts fails on rings with strong EWG (nitrobenzene etc.) and heteroaromatics that coordinate with AlCl₃." },
    ],
  },

  {
    id: "conc_hno3_h2so4",
    name: "Nitrating Mixture",
    formula: "HNO₃ / H₂SO₄",
    category: "Named Reaction Reagents",
    description: "Generates NO₂⁺ (nitronium ion); electrophile for aromatic nitration.",
    reactions: [
      { substrate: "Benzene", product: "Nitrobenzene", conditions: "Conc. HNO₃ + Conc. H₂SO₄, 50–60 °C", type: "EAS — Nitration", notes: "H₂SO₄ protonates HNO₃ to generate NO₂⁺ electrophile." },
      { substrate: "Nitrobenzene", product: "m-Dinitrobenzene", conditions: "Conc. HNO₃ + Fuming H₂SO₄, 100 °C", type: "EAS — Second Nitration", notes: "First NO₂ group deactivates ring and directs to meta; harsher conditions needed." },
      { substrate: "Toluene", product: "Mixture of o- and p-nitrotoluene (major) + m (minor)", conditions: "Dilute HNO₃ + H₂SO₄, <50 °C", type: "EAS — Nitration (activated ring)", notes: "-CH₃ is ortho/para-director; mild conditions give mono-nitration." },
      { substrate: "Phenol", product: "o- and p-Nitrophenol", conditions: "Dilute HNO₃ only (no H₂SO₄ needed)", type: "EAS — Nitration (highly activated)", notes: "OH strongly activates ring; dilute acid sufficient; H₂SO₄ would sulphonate/oxidise." },
    ],
  },

  {
    id: "pcl5_pcl3",
    name: "Phosphorus Pentachloride / Trichloride",
    formula: "PCl₅ / PCl₃",
    category: "Halogenating Agents",
    description: "Converts -OH, -COOH, -COOH to corresponding chloride.",
    reactions: [
      { substrate: "Alcohol (R-OH)", product: "Alkyl chloride (R-Cl) + POCl₃ + HCl", conditions: "Anhydrous, RT/gentle heat", type: "Halogenation", notes: "PCl₅ replaces -OH with -Cl with inversion of configuration at the carbon." },
      { substrate: "Carboxylic acid", product: "Acid chloride (RCOCl) + POCl₃ + HCl", conditions: "Anhydrous", type: "Preparation of acid chloride", notes: "RCOOH + PCl₅ → RCOCl. Also used: SOCl₂ (thionyl chloride) which gives SO₂ + HCl as only by-products (cleaner)." },
      { substrate: "Alcohol (using PCl₃)", product: "Alkyl chloride + H₃PO₃", conditions: "RT", type: "Halogenation", notes: "3 ROH + PCl₃ → 3 RCl + H₃PO₃. Less violent than PCl₅." },
    ],
  },

  {
    id: "socl2",
    name: "Thionyl Chloride",
    formula: "SOCl₂",
    category: "Halogenating Agents",
    description: "Best reagent for converting -OH and -COOH to chloride; by-products are gases.",
    reactions: [
      { substrate: "Carboxylic acid", product: "Acid chloride + SO₂ + HCl (both gases)", conditions: "Anhydrous, pyridine cat.", type: "Acid chloride synthesis", notes: "Preferred over PCl₅; by-products are volatile and leave the reaction mixture." },
      { substrate: "Alcohol", product: "Alkyl chloride + SO₂ + HCl", conditions: "Pyridine, 0°C or RT", type: "Halogenation", notes: "Proceeds with retention of configuration (due to ion-pair mechanism) or inversion depending on conditions." },
    ],
  },

  // ── SPECIAL / MISCELLANEOUS ────────────────────────────────────────────────

  {
    id: "conc_h3po4",
    name: "Phosphoric Acid",
    formula: "H₃PO₄",
    category: "Acids",
    description: "Acid catalyst for dehydration; milder than H₂SO₄.",
    reactions: [
      { substrate: "Alcohol", product: "Alkene (dehydration)", conditions: "Conc. H₃PO₄, 200 °C", type: "Dehydration (E1)", notes: "Milder alternative to H₂SO₄ for alcohol dehydration; less charring/oxidation side reactions." },
    ],
  },

  {
    id: "nahso3",
    name: "Sodium Bisulphite",
    formula: "NaHSO₃",
    category: "Named Reaction Reagents",
    description: "Forms crystalline addition compounds with aldehydes and methyl ketones.",
    reactions: [
      { substrate: "Aldehyde (RCHO)", product: "Bisulphite addition compound (crystalline)", conditions: "Saturated NaHSO₃, shake", type: "Nucleophilic Addition", notes: "Useful for purification of aldehydes; compound decomposes on heating with Na₂CO₃ or HCl to regenerate pure aldehyde." },
      { substrate: "Methyl ketone (CH₃COR)", product: "Bisulphite addition compound", conditions: "Saturated NaHSO₃", type: "Nucleophilic Addition", notes: "Only methyl ketones (not larger ketones) react due to steric reasons." },
      { substrate: "Dialkyl ketone (e.g. diethyl ketone)", product: "No reaction", conditions: "—", type: "No reaction (steric)", notes: "Too sterically hindered; larger ketones and most cyclic ketones do not react." },
    ],
  },

  {
    id: "naoco2et_claisen",
    name: "Sodium Ethoxide (Claisen Condensation)",
    formula: "NaOEt",
    category: "Bases",
    description: "Base for Claisen and aldol condensations; α-proton abstraction.",
    reactions: [
      { substrate: "Ethyl acetate (self-Claisen)", product: "Ethyl acetoacetate + EtOH", conditions: "NaOEt, EtOH, then acidify", type: "Claisen Condensation", notes: "α-carbon of one ester attacks carbonyl of second; β-keto ester formed. Requires at least one ester to have α-H." },
      { substrate: "Aldehyde with α-H (Aldol)", product: "β-Hydroxy aldehyde (aldol product)", conditions: "NaOH or NaOEt, cold", type: "Aldol Condensation", notes: "Warm/heat causes dehydration → α,β-unsaturated aldehyde (aldol + dehydration)." },
    ],
  },

  {
    id: "bh3_thf",
    name: "Borane / Hydroboration",
    formula: "BH₃·THF",
    category: "Reducing Agents",
    description: "Electrophilic boron reagent; adds to alkenes in anti-Markovnikov, syn fashion.",
    reactions: [
      { substrate: "Alkene → H₂O₂/NaOH workup", product: "Anti-Markovnikov alcohol (syn addition)", conditions: "1. BH₃/THF 2. H₂O₂, NaOH", type: "Hydroboration-Oxidation", notes: "Overall: anti-Markovnikov addition of H₂O. Syn addition. No rearrangement. Complementary to acid-catalysed hydration (Markovnikov)." },
      { substrate: "Alkyne → H₂O₂/NaOH", product: "Aldehyde (from terminal alkyne) or Ketone", conditions: "1. BH₃ 2. H₂O₂/NaOH", type: "Hydroboration of alkyne", notes: "Terminal alkyne gives aldehyde (anti-Markovnikov); contrast with Hg²⁺-catalysed hydration which gives methyl ketone (Markovnikov)." },
    ],
  },

  {
    id: "hgso4_h2so4",
    name: "Mercuric Sulphate (Markovnikov Hydration of Alkynes)",
    formula: "HgSO₄ / H₂SO₄",
    category: "Catalyst",
    description: "Catalyses Markovnikov addition of water to alkynes via oxymercuration.",
    reactions: [
      { substrate: "Terminal alkyne (R-C≡CH)", product: "Methyl ketone (R-CO-CH₃)", conditions: "HgSO₄, dil. H₂SO₄, H₂O, heat", type: "Markovnikov Hydration (Kucherov)", notes: "Vinyl alcohol (enol) intermediate immediately tautomerises to ketone (keto-enol tautomerism). Terminal alkyne → methyl ketone." },
      { substrate: "Acetylene (H-C≡C-H)", product: "Acetaldehyde (CH₃CHO)", conditions: "HgSO₄, dil. H₂SO₄, H₂O", type: "Hydration", notes: "Only exception — acetylene gives acetaldehyde (not methyl ketone) as both carbons are equivalent." },
    ],
  },

  {
    id: "lindlar",
    name: "Lindlar's Catalyst",
    formula: "Pd / BaSO₄ / quinoline",
    category: "Catalyst",
    description: "Partially poisoned Pd catalyst; reduces alkynes to cis-alkenes only.",
    reactions: [
      { substrate: "Internal alkyne (R-C≡C-R)", product: "cis-Alkene (Z-alkene)", conditions: "H₂ (1 equiv.), Lindlar's catalyst", type: "Semi-hydrogenation", notes: "Syn addition of H₂ → cis product. Complementary to Na/liq.NH₃ which gives trans-alkene." },
    ],
  },

];

/**
 * All unique category strings derived from the data — useful for filter dropdowns.
 */
export const REAGENT_CATEGORIES = [...new Set(REAGENTS.map((r) => r.category))];

/**
 * Flat list of all reaction entries across all reagents — useful for global search.
 */
export const ALL_REACTIONS = REAGENTS.flatMap((r) =>
  r.reactions.map((rx) => ({ ...rx, reagentId: r.id, reagentName: r.name, reagentFormula: r.formula }))
);
