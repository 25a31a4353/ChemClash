"use client";

/**
 * ChemClash — Smart Video Recommendations
 *
 * Reads the user's top_weaknesses from the existing Zustand store and maps
 * them to curated YouTube search URLs for the concepts already present in
 * the project (pyq_db.json / concept_tree.json).
 *
 * No YouTube API. No external keys. Search URLs only.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ── Curated concept → video card mapping ──────────────────────────────────
// Keys are lowercase concept_tag values from pyq_db.json / concept_tree.json.
// youtube_search is a YouTube search URL or direct YouTube playlist link.

interface VideoCard {
  concept: string;         // display name
  title: string;           // recommended video title / search query / playlist title
  channel: string;         // channel hint shown to user
  reason: string;          // why it was recommended
  youtube_search: string;  // https://www.youtube.com/results?search_query=… or https://youtube.com/playlist?list=…
  type?: "video" | "playlist"; // source / type label
}

const VIDEO_MAP: Record<string, VideoCard> = {
  // ── SN1 / SN2 / Substitution ─────────────────────────────────────────
  "sn2": {
    concept: "SN2 Mechanism",
    title: "SN2 Reaction Mechanism — Backside Attack & Walden Inversion",
    channel: "Khan Academy / Organic Chemistry Tutor",
    reason: "You've been losing ELO on SN2 questions. This video covers backside attack and inversion.",
    youtube_search: "https://www.youtube.com/results?search_query=SN2+reaction+mechanism+organic+chemistry",
  },
  "sn1": {
    concept: "SN1 Mechanism",
    title: "SN1 Reaction — Carbocation Intermediate & Racemisation",
    channel: "Khan Academy",
    reason: "SN1 carbocation formation is a common weak point. This search covers rate-determining steps.",
    youtube_search: "https://www.youtube.com/results?search_query=SN1+reaction+mechanism+carbocation+racemization",
  },
  "nucleophilic_substitution": {
    concept: "Nucleophilic Substitution",
    title: "SN1 vs SN2 — Choosing the Right Mechanism",
    channel: "Organic Chemistry Tutor",
    reason: "Deciding between SN1 and SN2 is a key JEE skill. Watch the comparison.",
    youtube_search: "https://www.youtube.com/results?search_query=SN1+vs+SN2+mechanism+comparison+JEE",
  },
  // ── E1 / E2 / Elimination ─────────────────────────────────────────────
  "e2": {
    concept: "E2 Elimination",
    title: "E2 Elimination — Anti-Periplanar Geometry & Zaitsev's Rule",
    channel: "Khan Academy",
    reason: "E2 anti-periplanar requirement is frequently tested. This covers the key geometry.",
    youtube_search: "https://www.youtube.com/results?search_query=E2+elimination+mechanism+anti+periplanar+Zaitsev",
  },
  "e1": {
    concept: "E1 Elimination",
    title: "E1 Elimination — Carbocation & Zaitsev Product",
    channel: "Organic Chemistry Tutor",
    reason: "E1 and its relationship to SN1 conditions is a common JEE trap.",
    youtube_search: "https://www.youtube.com/results?search_query=E1+elimination+mechanism+organic+chemistry",
  },
  "elimination": {
    concept: "Elimination Reactions",
    title: "Substitution vs Elimination — Predicting the Major Product",
    channel: "Khan Academy",
    reason: "Choosing SN vs E is a high-value skill in JEE Organic Chemistry.",
    youtube_search: "https://www.youtube.com/results?search_query=substitution+vs+elimination+organic+chemistry+JEE",
  },
  // ── Carbocation ────────────────────────────────────────────────────────
  "carbocation": {
    concept: "Carbocation Stability",
    title: "Carbocation Stability — Hyperconjugation & Rearrangements",
    channel: "Organic Chemistry Tutor",
    reason: "Carbocation stability rules underpin SN1, E1, and Markovnikov additions.",
    youtube_search: "https://www.youtube.com/results?search_query=carbocation+stability+hyperconjugation+rearrangement",
  },
  "carbocation_stability": {
    concept: "Carbocation Stability",
    title: "Carbocation Stability — Hyperconjugation & Rearrangements",
    channel: "Organic Chemistry Tutor",
    reason: "Carbocation stability rules underpin SN1, E1, and Markovnikov additions.",
    youtube_search: "https://www.youtube.com/results?search_query=carbocation+stability+hyperconjugation+rearrangement",
  },
  "rearrangement": {
    concept: "Carbocation Rearrangements",
    title: "1,2-Hydride and Methyl Shifts — Carbocation Rearrangements",
    channel: "Khan Academy",
    reason: "Rearrangements change the expected product and are a common JEE trap.",
    youtube_search: "https://www.youtube.com/results?search_query=carbocation+rearrangement+1+2+hydride+methyl+shift",
  },
  // ── EAS / Aromatic ─────────────────────────────────────────────────────
  "eas": {
    concept: "Electrophilic Aromatic Substitution",
    title: "EAS — Directing Effects, Ortho/Para vs Meta",
    channel: "Khan Academy",
    reason: "EAS directing groups are frequently tested in JEE Paper 2.",
    youtube_search: "https://www.youtube.com/results?search_query=electrophilic+aromatic+substitution+directing+effects+JEE",
  },
  "aromatic": {
    concept: "Aromaticity",
    title: "Aromaticity — Hückel's Rule and Anti-Aromatic Compounds",
    channel: "Khan Academy",
    reason: "Aromaticity criteria appear in both theory and mechanism questions.",
    youtube_search: "https://www.youtube.com/results?search_query=aromaticity+Huckel+rule+organic+chemistry",
  },
  // ── Stereochemistry ────────────────────────────────────────────────────
  "stereochemistry": {
    concept: "Stereochemistry",
    title: "R/S Configuration — CIP Rules Step by Step",
    channel: "Khan Academy",
    reason: "R/S assignments are tested in almost every JEE Organic question.",
    youtube_search: "https://www.youtube.com/results?search_query=R+S+configuration+CIP+rules+organic+chemistry",
  },
  "chirality": {
    concept: "Chirality & Enantiomers",
    title: "Chirality, Enantiomers, and Diastereomers Explained",
    channel: "Organic Chemistry Tutor",
    reason: "Chiral centres and stereorelationships are core JEE Organic topics.",
    youtube_search: "https://www.youtube.com/results?search_query=chirality+enantiomers+diastereomers+organic+chemistry",
  },
  // ── Markovnikov / Addition ─────────────────────────────────────────────
  "markovnikov": {
    concept: "Markovnikov's Rule",
    title: "Markovnikov's Rule — Regioselectivity in HX Addition",
    channel: "Khan Academy",
    reason: "Markovnikov and anti-Markovnikov products are tested every year in JEE.",
    youtube_search: "https://www.youtube.com/results?search_query=Markovnikov+rule+HX+addition+alkene+JEE",
  },
  "electrophilic_addition": {
    concept: "Electrophilic Addition",
    title: "Electrophilic Addition to Alkenes — HBr, H₂O, Br₂",
    channel: "Organic Chemistry Tutor",
    reason: "Alkene addition reactions are the most tested topic in JEE Organic.",
    youtube_search: "https://www.youtube.com/results?search_query=electrophilic+addition+alkenes+HBr+bromine+water",
  },
  // ── Resonance ──────────────────────────────────────────────────────────
  "resonance": {
    concept: "Resonance Structures",
    title: "Resonance Structures — Drawing and Ranking Contributors",
    channel: "Khan Academy",
    reason: "Resonance stability determines reaction outcomes in EAS, carbonyl, and acid/base chemistry.",
    youtube_search: "https://www.youtube.com/results?search_query=resonance+structures+organic+chemistry+ranking",
  },
  // ── Carbonyl / Aldol ───────────────────────────────────────────────────
  "carbonyl": {
    concept: "Carbonyl Chemistry",
    title: "Nucleophilic Addition to Carbonyls — Aldehydes & Ketones",
    channel: "Khan Academy",
    reason: "Carbonyl nucleophilic addition is a major JEE Organic section.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophilic+addition+carbonyl+aldehyde+ketone+JEE",
  },
  "aldol": {
    concept: "Aldol Condensation",
    title: "Aldol Reaction and Condensation — Enolate Chemistry",
    channel: "Khan Academy",
    reason: "Aldol mechanisms involve enolate formation which is a common JEE question.",
    youtube_search: "https://www.youtube.com/results?search_query=aldol+reaction+condensation+enolate+organic+chemistry",
  },
  // ── Lewis / Nucleophile / Electrophile ────────────────────────────────
  "nucleophile": {
    concept: "Nucleophiles & Electrophiles",
    title: "Nucleophiles vs Electrophiles — Recognising Reactants",
    channel: "Khan Academy",
    reason: "Identifying nucleophilic and electrophilic species is the foundation of all mechanisms.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophile+electrophile+organic+chemistry+basics",
  },
  "electrophile": {
    concept: "Nucleophiles & Electrophiles",
    title: "Nucleophiles vs Electrophiles — Recognising Reactants",
    channel: "Khan Academy",
    reason: "Electrophile recognition is the first step in predicting reaction outcomes.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophile+electrophile+organic+chemistry+basics",
  },
  // ── Acid / Base ────────────────────────────────────────────────────────
  "acidity": {
    concept: "Acidity & pKa",
    title: "Organic Acid Strength — Factors Affecting pKa",
    channel: "Organic Chemistry Tutor",
    reason: "Relative acidity questions appear frequently in JEE Mains.",
    youtube_search: "https://www.youtube.com/results?search_query=organic+acidity+pKa+factors+JEE",
  },
  // ── Leaving group / Steric ────────────────────────────────────────────
  "leaving_group": {
    concept: "Leaving Groups",
    title: "Leaving Group Ability — What Makes a Good Leaving Group?",
    channel: "Organic Chemistry Tutor",
    reason: "Leaving group quality directly controls SN1/SN2 reactivity.",
    youtube_search: "https://www.youtube.com/results?search_query=leaving+group+ability+SN1+SN2+organic+chemistry",
  },
  "steric_hindrance": {
    concept: "Steric Hindrance",
    title: "Steric Effects in SN2 — Why Tertiary Substrates Resist",
    channel: "Khan Academy",
    reason: "Steric hindrance explains the SN2 reactivity order — a must-know for JEE.",
    youtube_search: "https://www.youtube.com/results?search_query=steric+hindrance+SN2+primary+secondary+tertiary",
  },

  // ── Curated YouTube Playlists: NEET & JEE Organic Chemistry ───────────
  // Playlist 1: Complete OC Mission 30 for Reneet
  "purification": {
    concept: "Purification and Characterisation of Organic Compounds",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "Comprehensive coverage of qualitative & quantitative organic analysis, crystallization, sublimation, and chromatography.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "purification_and_characterisation_of_organic_compounds": {
    concept: "Purification and Characterisation of Organic Compounds",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "Comprehensive coverage of qualitative & quantitative organic analysis, crystallization, sublimation, and chromatography.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "characterisation": {
    concept: "Purification and Characterisation of Organic Compounds",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "Comprehensive coverage of qualitative & quantitative organic analysis, crystallization, sublimation, and chromatography.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "goc": {
    concept: "Some Basic Principles of Organic Chemistry (GOC)",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "General Organic Chemistry fundamentals — inductive effect, electromeric effect, resonance, hyperconjugation, and reactive intermediates.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "some_basic_principles_of_organic_chemistry": {
    concept: "Some Basic Principles of Organic Chemistry (GOC)",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "General Organic Chemistry fundamentals — inductive effect, electromeric effect, resonance, hyperconjugation, and reactive intermediates.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "basic_principles_of_organic_chemistry": {
    concept: "Some Basic Principles of Organic Chemistry (GOC)",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "General Organic Chemistry fundamentals — inductive effect, electromeric effect, resonance, hyperconjugation, and reactive intermediates.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "hydrocarbons": {
    concept: "Hydrocarbons",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "Thorough study of alkanes, alkenes, alkynes, and aromatic hydrocarbons with key addition, substitution, and combustion mechanisms.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },
  "hydrocarbon": {
    concept: "Hydrocarbons",
    title: "Complete OC Mission 30 for Reneet",
    channel: "YouTube Playlist",
    reason: "Thorough study of alkanes, alkenes, alkynes, and aromatic hydrocarbons with key addition, substitution, and combustion mechanisms.",
    youtube_search: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    type: "playlist",
  },

  // Playlist 2: Complete Organic Chemistry (One Shots - for Quick Exam Preparation)
  "halogens": {
    concept: "Organic Compounds Containing Halogens (Haloalkanes and Haloarenes)",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "One-shot deep dive into haloalkanes and haloarenes, nucleophilic substitution (SN1/SN2), elimination, and polyhalogen compounds.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },
  "haloalkanes": {
    concept: "Organic Compounds Containing Halogens (Haloalkanes and Haloarenes)",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "One-shot deep dive into haloalkanes and haloarenes, nucleophilic substitution (SN1/SN2), elimination, and polyhalogen compounds.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },
  "haloarenes": {
    concept: "Organic Compounds Containing Halogens (Haloalkanes and Haloarenes)",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "One-shot deep dive into haloalkanes and haloarenes, nucleophilic substitution (SN1/SN2), elimination, and polyhalogen compounds.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },
  "haloalkanes_and_haloarenes": {
    concept: "Organic Compounds Containing Halogens (Haloalkanes and Haloarenes)",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "One-shot deep dive into haloalkanes and haloarenes, nucleophilic substitution (SN1/SN2), elimination, and polyhalogen compounds.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },
  "organic_compounds_containing_halogens": {
    concept: "Organic Compounds Containing Halogens (Haloalkanes and Haloarenes)",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "One-shot deep dive into haloalkanes and haloarenes, nucleophilic substitution (SN1/SN2), elimination, and polyhalogen compounds.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },
  "oxygen": {
    concept: "Organic Compounds Containing Oxygen",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "Complete coverage of alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids, and their derivatives in one shot.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },
  "organic_compounds_containing_oxygen": {
    concept: "Organic Compounds Containing Oxygen",
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    channel: "YouTube Playlist",
    reason: "Complete coverage of alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids, and their derivatives in one shot.",
    youtube_search: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    type: "playlist",
  },

  // Playlist 3: ORGANIC CHEMISTRY ONE SHOT NEET 2026
  "nitrogen": {
    concept: "Organic Compounds Containing Nitrogen (Amines)",
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    channel: "YouTube Playlist",
    reason: "High-yield one-shot lecture covering aliphatic and aromatic amines, basicity orders, diazotisation, and diazonium salt reactions.",
    youtube_search: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
    type: "playlist",
  },
  "amines": {
    concept: "Organic Compounds Containing Nitrogen (Amines)",
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    channel: "YouTube Playlist",
    reason: "High-yield one-shot lecture covering aliphatic and aromatic amines, basicity orders, diazotisation, and diazonium salt reactions.",
    youtube_search: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
    type: "playlist",
  },
  "organic_compounds_containing_nitrogen": {
    concept: "Organic Compounds Containing Nitrogen (Amines)",
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    channel: "YouTube Playlist",
    reason: "High-yield one-shot lecture covering aliphatic and aromatic amines, basicity orders, diazotisation, and diazonium salt reactions.",
    youtube_search: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
    type: "playlist",
  },
  "biomolecules": {
    concept: "Biomolecules",
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    channel: "YouTube Playlist",
    reason: "Essential NEET one-shot covering carbohydrates (glucose/fructose), amino acids, proteins, enzymes, vitamins, and nucleic acids.",
    youtube_search: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
    type: "playlist",
  },
  "biomolecule": {
    concept: "Biomolecules",
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    channel: "YouTube Playlist",
    reason: "Essential NEET one-shot covering carbohydrates (glucose/fructose), amino acids, proteins, enzymes, vitamins, and nucleic acids.",
    youtube_search: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
    type: "playlist",
  },
};

// Fallback cards shown when the student has no weakness data yet
const FOUNDATIONAL_CARDS: VideoCard[] = [
  {
    concept: "Organic Chemistry Fundamentals",
    title: "Introduction to Organic Chemistry — Bonding, Functional Groups, Isomers",
    channel: "Khan Academy",
    reason: "Build a strong foundation before tackling mechanisms.",
    youtube_search: "https://www.youtube.com/results?search_query=introduction+organic+chemistry+JEE+basics",
  },
  {
    concept: "Reaction Mechanisms Overview",
    title: "How to Draw Mechanisms — Curved Arrow Notation",
    channel: "Organic Chemistry Tutor",
    reason: "Arrow pushing is the language of every organic mechanism.",
    youtube_search: "https://www.youtube.com/results?search_query=curved+arrow+notation+mechanism+organic+chemistry",
  },
  {
    concept: "Nucleophiles & Electrophiles",
    title: "Nucleophiles vs Electrophiles — Recognising Reactants",
    channel: "Khan Academy",
    reason: "Every reaction starts by identifying who attacks and who gets attacked.",
    youtube_search: "https://www.youtube.com/results?search_query=nucleophile+electrophile+organic+chemistry+basics",
  },
];

// ── Curated Playlists ─────────────────────────────────────────────────────

interface PlaylistTopic {
  key: string;
  label: string;
  emoji: string;
}

interface CuratedPlaylist {
  title: string;
  url: string;
  description: string;
  accent: {
    gradient: string;
    badge: string;
    btn: string;
    glow: string;
    icon: string;
  };
  topics: PlaylistTopic[];
}

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  {
    title: "Complete OC Mission 30 for Reneet",
    url: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
    description: "Master the analytical backbone of Organic Chemistry — from purification techniques and qualitative analysis to the fundamentals of GOC and all hydrocarbon reactions.",
    accent: {
      gradient: "from-violet-600 to-purple-700",
      badge: "bg-violet-100 text-violet-700 border-violet-200",
      btn: "bg-violet-600 hover:bg-violet-700 shadow-violet-200",
      glow: "shadow-violet-100",
      icon: "🧪",
    },
    topics: [
      { key: "purification", label: "Purification and Characterisation of Organic Compounds", emoji: "🔬" },
      { key: "goc", label: "Some Basic Principles of Organic Chemistry (GOC)", emoji: "⚛️" },
      { key: "hydrocarbons", label: "Hydrocarbons", emoji: "🛢️" },
    ],
  },
  {
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    url: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
    description: "Deep dive into haloalkanes, haloarenes, and all oxygen-containing functional groups — alcohols, phenols, ethers, aldehydes, ketones, carboxylic acids and derivatives in concise one-shots.",
    accent: {
      gradient: "from-blue-600 to-cyan-600",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-200",
      glow: "shadow-blue-100",
      icon: "💧",
    },
    topics: [
      { key: "halogens", label: "Organic Compounds Containing Halogens (Haloalkanes and Haloarenes)", emoji: "⚗️" },
      { key: "oxygen", label: "Organic Compounds Containing Oxygen", emoji: "🧬" },
    ],
  },
  {
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    url: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
    description: "Complete coverage of nitrogen-containing compounds (amines, diazonium salts) and the rich world of biomolecules — carbohydrates, amino acids, proteins, and nucleic acids.",
    accent: {
      gradient: "from-emerald-600 to-teal-600",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
      btn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
      glow: "shadow-emerald-100",
      icon: "🌿",
    },
    topics: [
      { key: "nitrogen", label: "Organic Compounds Containing Nitrogen (Amines)", emoji: "🔵" },
      { key: "biomolecules", label: "Biomolecules", emoji: "🌿" },
    ],
  },
];

// ── Topic Filter Options ──────────────────────────────────────────────────

interface TopicFilterOption {
  id: string;
  label: string;
  emoji: string;
}

const TOPIC_FILTERS: TopicFilterOption[] = [
  { id: "all", label: "All Recommendations", emoji: "✨" },
  { id: "purification", label: "Purification & Characterisation", emoji: "🔬" },
  { id: "goc", label: "GOC (Basic Principles)", emoji: "⚛️" },
  { id: "hydrocarbons", label: "Hydrocarbons", emoji: "🛢️" },
  { id: "halogens", label: "Haloalkanes & Haloarenes", emoji: "⚗️" },
  { id: "oxygen", label: "Oxygen Compounds", emoji: "💧" },
  { id: "nitrogen", label: "Nitrogen Compounds (Amines)", emoji: "🔵" },
  { id: "biomolecules", label: "Biomolecules", emoji: "🌿" },
];

// ── Pick cards from weakness list or filter ───────────────────────────────

function pickCards(topWeaknesses: string[], filterKey: string = "all"): VideoCard[] {
  const seen = new Set<string>();
  const cards: VideoCard[] = [];

  if (filterKey !== "all") {
    const normFilter = filterKey.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    for (const [k, card] of Object.entries(VIDEO_MAP)) {
      const normKey = k.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (
        normKey === normFilter ||
        normKey.includes(normFilter) ||
        normFilter.includes(normKey) ||
        card.concept.toLowerCase().includes(normFilter.replace(/_/g, " "))
      ) {
        if (!seen.has(card.concept) && !seen.has(card.youtube_search)) {
          seen.add(card.concept);
          seen.add(card.youtube_search);
          cards.push(card);
        }
      }
    }
    if (cards.length > 0) return cards;
  }

  for (const tag of topWeaknesses) {
    const key = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
    // exact match first
    let card = VIDEO_MAP[key];
    // partial match fallback
    if (!card) {
      const matchKey = Object.keys(VIDEO_MAP).find(
        (k) => key.includes(k) || k.includes(key)
      );
      if (matchKey) card = VIDEO_MAP[matchKey];
    }
    if (card && !seen.has(card.concept) && !seen.has(card.youtube_search)) {
      seen.add(card.concept);
      seen.add(card.youtube_search);
      cards.push(card);
    }
    if (cards.length >= 3) break;
  }

  // Fill to 3 with foundational cards if needed
  for (const fb of FOUNDATIONAL_CARDS) {
    if (cards.length >= 3) break;
    if (!seen.has(fb.concept) && !seen.has(fb.youtube_search)) {
      seen.add(fb.concept);
      seen.add(fb.youtube_search);
      cards.push(fb);
    }
  }

  return cards;
}

// ── Video card component ──────────────────────────────────────────────────

function VideoCardUI({ card, index }: { card: VideoCard; index: number }) {
  const accentColors = [
    { border: "border-violet-200", bg: "bg-violet-50", tag: "bg-violet-100 text-violet-700 border-violet-200", btn: "bg-violet-600 hover:bg-violet-700" },
    { border: "border-blue-200",   bg: "bg-blue-50",   tag: "bg-blue-100 text-blue-700 border-blue-200",       btn: "bg-blue-600 hover:bg-blue-700"   },
    { border: "border-emerald-200",bg: "bg-emerald-50",tag: "bg-emerald-100 text-emerald-700 border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700" },
  ];
  const ac = accentColors[index % accentColors.length];
  const isPlaylist = card.type === "playlist";

  return (
    <div className={`rounded-2xl border ${ac.border} ${ac.bg} p-5 flex flex-col gap-3 shadow-sm`}>
      {/* Concept tag & Type Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`self-start text-[0.6rem] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${ac.tag}`}>
          {card.concept}
        </span>
        {isPlaylist ? (
          <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
            <span>▶</span> YouTube Playlist
          </span>
        ) : (
          <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <span>🔍</span> Curated Video
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-bold text-slate-800 leading-snug">{card.title}</p>

      {/* Channel / Source hint */}
      <p className="text-[0.65rem] text-slate-400 font-medium">
        {isPlaylist ? "Source: " : "Search: "}
        <span className="text-slate-600 font-semibold">{card.channel}</span>
      </p>

      {/* Reason */}
      <p className="text-xs text-slate-600 leading-relaxed flex-1">{card.reason}</p>

      {/* Watch button */}
      <a
        href={card.youtube_search}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 ${ac.btn} text-white text-xs font-bold rounded-xl py-2.5 transition-colors no-underline shadow-sm`}
      >
        <span>▶</span> {isPlaylist ? "Open Playlist on YouTube →" : "Watch on YouTube →"}
      </a>
    </div>
  );
}

// ── Curated Playlist Card ─────────────────────────────────────────────────

function PlaylistCard({ playlist, index }: { playlist: CuratedPlaylist; index: number }) {
  const { accent } = playlist;
  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-lg flex flex-col`}
      style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.07)" }}
    >
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${accent.gradient} px-5 pt-5 pb-6`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/80 text-[0.6rem] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                YouTube Playlist {index + 1}
              </span>
              <span className="text-white/80 text-[0.6rem] font-bold uppercase tracking-wider">
                Full Series
              </span>
            </div>
            <h3 className="text-white font-black text-base sm:text-lg leading-snug mt-0.5">
              {playlist.title}
            </h3>
          </div>
          <span className="text-3xl flex-shrink-0 mt-1">{accent.icon}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-4 flex-1">
        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed">{playlist.description}</p>

        {/* Topic pills */}
        <div className="flex flex-wrap gap-1.5">
          {playlist.topics.map((t) => (
            <span
              key={t.label}
              className={`inline-flex items-center gap-1 text-[0.6rem] font-semibold px-2.5 py-1 rounded-full border ${accent.badge}`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </span>
          ))}
        </div>

        {/* Watch button */}
        <a
          href={playlist.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center gap-2 ${accent.btn} text-white text-xs font-bold rounded-xl py-3 shadow-md transition-all no-underline mt-auto`}
        >
          <span className="text-base">▶</span>
          Open Playlist on YouTube →
        </a>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function VideoRecommendationsPage() {
  const profile        = useChemStore((s) => s.profile);
  const eloRating      = useChemStore((s) => s.eloRating);
  const refreshProfile = useChemStore((s) => s.refreshProfile);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const topWeaknesses = profile?.top_weaknesses ?? [];
  const cards = pickCards(topWeaknesses, selectedTopic);
  const hasWeaknesses = topWeaknesses.length > 0;

  // Filter curated playlists based on selected topic
  const displayedPlaylists =
    selectedTopic === "all"
      ? CURATED_PLAYLISTS
      : CURATED_PLAYLISTS.filter((pl) =>
          pl.topics.some(
            (t) =>
              t.key === selectedTopic ||
              selectedTopic.includes(t.key) ||
              t.key.includes(selectedTopic) ||
              t.label.toLowerCase().includes(selectedTopic.toLowerCase())
          )
        );

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
            Video Recommendations
          </span>
        </div>
        <div className="text-sm text-slate-500">
          ⚡ <span className="text-emerald-600 font-bold">{eloRating}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-10 pb-24">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-2">
            Learn Next
          </p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            🎬 Video <span className="text-violet-600">Recommendations</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {selectedTopic !== "all"
              ? `Filtered to ${TOPIC_FILTERS.find((f) => f.id === selectedTopic)?.label ?? selectedTopic}.`
              : hasWeaknesses
              ? `Based on your top weakness${topWeaknesses.length > 1 ? "es" : ""} — ${topWeaknesses.slice(0, 2).join(", ")}.`
              : "No weakness data yet. Here are the best places to start."}
          </p>
        </div>

        {/* Weakness pills (if present) */}
        {hasWeaknesses && (
          <div className="mb-6">
            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Your Identified Weaknesses
            </p>
            <div className="flex flex-wrap gap-2">
              {topWeaknesses.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTopic(selectedTopic === tag ? "all" : tag)}
                  className={`text-[0.65rem] font-semibold border rounded-full px-2.5 py-0.5 transition-all cursor-pointer ${
                    selectedTopic === tag
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  }`}
                  title={`Filter by ${tag}`}
                >
                  ⬇ {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Topic filter bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
              Filter by Organic Chemistry Topic
            </span>
            {selectedTopic !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedTopic("all")}
                className="text-[0.65rem] font-semibold text-violet-600 hover:text-violet-800 transition-colors cursor-pointer"
              >
                Clear filter ×
              </button>
            )}
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 w-max">
              {TOPIC_FILTERS.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setSelectedTopic(tf.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                    selectedTopic === tf.id
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600"
                  }`}
                >
                  <span>{tf.emoji}</span>
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-5">
          {cards.map((card, i) => (
            <VideoCardUI key={`${card.concept}-${card.youtube_search}`} card={card} index={i} />
          ))}
        </div>

        {/* Curated YouTube Playlists Section */}
        <div className="mt-14 pt-10 border-t border-slate-200">
          <div className="mb-6">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
              Full Series
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              📚 Complete Organic Chemistry Playlists
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Curated YouTube playlist series covering every NEET & JEE Organic Chemistry topic from foundational principles to advanced problems.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {displayedPlaylists.map((pl, i) => (
              <PlaylistCard key={pl.url} playlist={pl} index={i} />
            ))}
          </div>
        </div>

        {/* Footer nudge */}
        <div className="mt-12 bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-1">
            Want targeted practice after watching?
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Head to Adaptive PYQ to answer questions on exactly these concepts.
          </p>
          <Link
            href="/adaptive-pyq"
            className="inline-flex items-center bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-5 py-2 rounded-xl no-underline transition-colors"
          >
            Practice with Adaptive PYQ →
          </Link>
        </div>

      </main>
    </div>
  );
}
