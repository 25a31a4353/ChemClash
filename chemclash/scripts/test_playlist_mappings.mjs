/**
 * Test Suite: Organic Chemistry Playlist Topic Mapping Verification
 * 
 * Verifies:
 * 1. All 3 playlists exist with correct URLs and metadata.
 * 2. All 7 topic mappings for each playlist (7 × 3 = 21 mappings).
 * 3. Recommendation filtering retrieves playlists for each of the 7 topics.
 * 4. Existing recommendations (sn2, carbocation, e2, etc.) still work.
 * 5. Playlist URLs match the required YouTube URLs exactly.
 */

import {
  ALL_PLAYLISTS,
  ORGANIC_TOPICS,
  TOPIC_PLAYLIST_MAPPINGS,
  pickCards,
  VIDEO_MAP,
  CURATED_PLAYLISTS,
} from "../src/app/video-recommendations/page.tsx";

console.log("=================================================");
console.log("🎬 PLAYLIST TOPIC MAPPING VERIFICATION SUITE");
console.log("=================================================\n");

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Verify all 3 playlists exist with correct URLs
// ─────────────────────────────────────────────────────────────────────────────
console.log("--- TEST 1: Verify all 3 playlists exist ---");

assert(ALL_PLAYLISTS.length === 3, `Expected 3 playlists, found ${ALL_PLAYLISTS.length}`);

const EXPECTED_PLAYLISTS = [
  {
    title: "Complete OC Mission 30 for Reneet",
    url: "https://youtube.com/playlist?list=PLY_RLZcWR38c&si=B64yfXuPN2hFZfbT",
  },
  {
    title: "Complete Organic Chemistry (One Shots - for Quick Exam Preparation)",
    url: "https://youtube.com/playlist?list=PLJyab0VQDBGUlZybgOULmNV1vbvWmUGxn&si=y-H96gQrUhKK5M_8",
  },
  {
    title: "ORGANIC CHEMISTRY ONE SHOT NEET 2026",
    url: "https://youtube.com/playlist?list=PLWE6zIJIGejd-7VudTKaFSX9ziIi7b1X_&si=arKlH8Aa9n2xurHP",
  },
];

for (const exp of EXPECTED_PLAYLISTS) {
  const match = ALL_PLAYLISTS.find((p) => p.url === exp.url && p.title === exp.title);
  assert(!!match, `Found playlist: "${exp.title}" (${exp.url})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Verify all 7 topic mappings for each playlist (7 × 3 = 21 mappings)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 2: Verify all 7 topic mappings for each playlist (7 × 3 = 21) ---");

assert(ORGANIC_TOPICS.length === 7, `Expected 7 organic topics, found ${ORGANIC_TOPICS.length}`);

const EXPECTED_TOPIC_IDS = [
  "purification",
  "goc",
  "hydrocarbons",
  "halogens",
  "oxygen",
  "nitrogen",
  "biomolecules",
];

for (const topicId of EXPECTED_TOPIC_IDS) {
  const topicObj = ORGANIC_TOPICS.find((t) => t.id === topicId);
  assert(!!topicObj, `Found official topic: "${topicId}" (${topicObj?.name})`);

  for (const pl of EXPECTED_PLAYLISTS) {
    const mapping = TOPIC_PLAYLIST_MAPPINGS.find(
      (m) => m.topicId === topicId && m.playlistUrl === pl.url
    );
    assert(
      !!mapping,
      `Mapping exists: Topic [${topicId}] ➔ Playlist [${pl.title}]`
    );
  }
}

assert(
  TOPIC_PLAYLIST_MAPPINGS.length === 21,
  `Confirmed exact 7 × 3 = 21 topic mappings (found ${TOPIC_PLAYLIST_MAPPINGS.length})`
);

// Verify in CURATED_PLAYLISTS each playlist has all 7 topics
for (const pl of CURATED_PLAYLISTS) {
  assert(
    pl.topics.length === 7,
    `Curated playlist "${pl.title}" displays all 7 topics (found ${pl.topics.length})`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Verify recommendation filtering retrieves them for each topic
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 3: Recommendation filtering retrieves playlists for each topic ---");

for (const topicId of EXPECTED_TOPIC_IDS) {
  const filteredCards = pickCards([], topicId);
  assert(
    filteredCards.length >= 3,
    `Filtering by topic "${topicId}" returns at least 3 cards (returned ${filteredCards.length})`
  );

  // Check that all 3 playlist URLs are present in the filtered cards
  for (const pl of EXPECTED_PLAYLISTS) {
    const hasPl = filteredCards.some((c) => c.youtube_search === pl.url);
    assert(
      hasPl,
      `Topic "${topicId}" recommendation results include playlist: "${pl.title}"`
    );
  }
}

// Test weakness-based retrieval for each topic
console.log("\n--- Weakness-based retrieval checks ---");
const TEST_WEAKNESSES = [
  { tag: "goc", topic: "GOC" },
  { tag: "hydrocarbons", topic: "Hydrocarbons" },
  { tag: "amines", topic: "Amines / Nitrogen" },
  { tag: "purification", topic: "Purification" },
  { tag: "haloalkanes", topic: "Halogens" },
  { tag: "oxygen", topic: "Oxygen" },
  { tag: "biomolecules", topic: "Biomolecules" },
];

for (const tw of TEST_WEAKNESSES) {
  const weaknessCards = pickCards([tw.tag], "all");
  assert(
    weaknessCards.length >= 1,
    `Weakness = "${tw.tag}" (${tw.topic}) returns recommendations (returned ${weaknessCards.length})`
  );
  const containsPlaylist = weaknessCards.some((c) => c.type === "playlist");
  assert(
    containsPlaylist,
    `Weakness = "${tw.tag}" correctly surfaces curated playlists`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Verify existing recommendations still work
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 4: Verify existing recommendations still work ---");

const EXISTING_CONCEPTS_TO_CHECK = [
  "sn2",
  "sn1",
  "carbocation",
  "e2",
  "eas",
  "stereochemistry",
  "aldol",
];

for (const concept of EXISTING_CONCEPTS_TO_CHECK) {
  const card = VIDEO_MAP[concept];
  assert(!!card, `Existing video entry for "${concept}" exists in VIDEO_MAP`);
  assert(
    card.youtube_search.includes("youtube.com"),
    `Existing video "${concept}" has valid YouTube search URL`
  );

  // Test retrieval via pickCards
  const picked = pickCards([concept], "all");
  const foundConcept = picked.some(
    (c) => c.concept === card.concept || c.youtube_search === card.youtube_search
  );
  assert(
    foundConcept,
    `pickCards([${concept}]) successfully returns "${card.concept}"`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Verify clicking each playlist opens the correct YouTube URL
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 5: Verify clicking each playlist opens the correct YouTube URL ---");

for (const pl of ALL_PLAYLISTS) {
  assert(
    pl.url.startsWith("https://youtube.com/playlist?list="),
    `Playlist "${pl.title}" URL starts with valid playlist prefix: ${pl.url}`
  );
  assert(
    !pl.url.includes("search_query"),
    `Playlist "${pl.title}" is a direct playlist link, NOT a search query`
  );
}

console.log("\n=================================================");
if (failures === 0) {
  console.log("🎉 ALL TESTS PASSED! ZERO FAILURES.");
} else {
  console.error(`💥 ${failures} TEST FAILURES DETECTED.`);
  process.exit(1);
}
console.log("=================================================");
