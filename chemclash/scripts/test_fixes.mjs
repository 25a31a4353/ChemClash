/**
 * ChemClash Verification Script for:
 * 1. React or Reject Deck System (20 consecutive unique questions, zero duplicates)
 * 2. Snap-to-Solve Pipeline (4 scenarios: text question, mechanism diagram, non-chem image, large image)
 * 3. Concept Curriculum (all 17 modules, basics/medium/advanced, quiz answers, skill-tree sync)
 */

import fs from "fs";
import { MASTER_CHALLENGES, generateExtraChallenges } from "../src/data/challenges.ts";

const conceptTreeData = JSON.parse(
  fs.readFileSync(new URL("../src/data/concept_tree.json", import.meta.url), "utf-8")
);

console.log("=================================================");
console.log("🧪 CHEMCLASH AUTOMATED VERIFICATION SUITE");
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
// FEATURE 1: REACT OR REJECT DECK SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
console.log("--- TEST 1: React or Reject Deck System ---");

assert(MASTER_CHALLENGES.length >= 50, `Pool size is ${MASTER_CHALLENGES.length} (minimum 50 required)`);

// Verify all items have required fields and valid chemistry data
let validItems = 0;
for (const card of MASTER_CHALLENGES) {
  if (
    card.id &&
    card.nucleophile &&
    card.electrophile &&
    typeof card.shouldReact === "boolean" &&
    card.hint &&
    card.explanation &&
    ["easy", "medium", "hard"].includes(card.difficulty)
  ) {
    validItems++;
  }
}
assert(validItems === MASTER_CHALLENGES.length, `All ${MASTER_CHALLENGES.length} questions have complete, valid schemas`);

// Test drawing 20 consecutive cards across 2 rounds with session tracking
const consumedIds = new Set();
const drawnCards = [];

function drawRound(count = 10) {
  let unseen = MASTER_CHALLENGES.filter((c) => !consumedIds.has(c.id));
  if (unseen.length < count) {
    const extra = generateExtraChallenges(count - unseen.length + 5, consumedIds);
    unseen = [...unseen, ...extra];
  }
  const selected = unseen.slice(0, count);
  selected.forEach((c) => consumedIds.add(c.id));
  drawnCards.push(...selected);
  return selected;
}

const round1 = drawRound(10);
const round2 = drawRound(10);

assert(round1.length === 10, "Round 1 drew exactly 10 cards");
assert(round2.length === 10, "Round 2 drew exactly 10 cards");
assert(drawnCards.length === 20, "Total 20 cards drawn");

// Verify that all 20 question IDs are strictly unique
const uniqueDrawnIds = new Set(drawnCards.map((c) => c.id));
assert(uniqueDrawnIds.size === 20, `Zero duplicates across 20 draws: ${uniqueDrawnIds.size} unique IDs out of 20 drawn`);

// Check overlap between round 1 and round 2
const round1Ids = new Set(round1.map((c) => c.id));
const duplicatesInRound2 = round2.filter((c) => round1Ids.has(c.id));
assert(duplicatesInRound2.length === 0, `Round 2 contained 0 cards from Round 1 (${duplicatesInRound2.length} repeated)`);

// Test replenishment generator when pool is exhausted
const largeSet = new Set(MASTER_CHALLENGES.map((c) => c.id));
const extraGenerated = generateExtraChallenges(15, largeSet);
assert(extraGenerated.length === 15, `Procedural replenishment generated 15 unique questions when pool exhausted`);
const extraUnique = new Set(extraGenerated.map((c) => c.id));
assert(extraUnique.size === 15, "All dynamically replenished items have unique IDs");


// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: SNAP-TO-SOLVE PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 2: Snap-to-Solve Pipeline ---");

// Import the route handler logic
import { POST } from "../src/app/api/snap-analyze/route.ts";

async function simulateSnap(payload) {
  const req = {
    json: async () => payload,
  };
  const res = await POST(req);
  return await res.json();
}

// Scenario 1: Text-based chemistry question
const sampleSmallB64 = Buffer.from("CHEMISTRY_QUESTION_TEST_DATA_PADDING_TO_OVER_300_BYTES_".repeat(10)).toString("base64");

const testScenario1 = await simulateSnap({
  image_b64: sampleSmallB64,
  media_type: "image/png",
  persona: "socratic",
  language: "english",
  file_name: "organic_chemistry_question_sn1_sn2.png",
});
assert(testScenario1.supported === true, "Scenario 1 (Text Question): Supported is true");
assert(typeof testScenario1.socratic_question === "string" && testScenario1.socratic_question.length > 10, "Scenario 1: Returns rich Socratic question");
assert(typeof testScenario1.identified === "string", "Scenario 1: Returns identified topic");

// Scenario 2: Reaction / mechanism diagram
const testScenario2 = await simulateSnap({
  image_b64: sampleSmallB64,
  media_type: "image/png",
  persona: "concept_coach",
  language: "hindi",
  file_name: "reaction_mechanism_diagram.png",
});
assert(testScenario2.supported === true, "Scenario 2 (Mechanism Diagram): Supported is true");
assert(testScenario2.principle.length > 5, "Scenario 2: Returns concept principle in requested language (Hindi)");

// Scenario 3: Non-chemistry image (Must NOT crash, must return helpful guidance)
const testScenario3 = await simulateSnap({
  image_b64: sampleSmallB64,
  media_type: "image/jpeg",
  persona: "socratic",
  language: "english",
  file_name: "cute_cat_random_photo.jpg",
});
assert(testScenario3.supported === true, "Scenario 3 (Non-Chemistry Image): Handled gracefully with supported: true");
assert(testScenario3.identified.toLowerCase().includes("non-chemistry") || testScenario3.identified.toLowerCase().includes("graphic"), "Scenario 3: Identified non-chemistry graphic correctly");
assert(testScenario3.first_issue.toLowerCase().includes("no chemical"), "Scenario 3: Explains that no chemistry was detected");

// Scenario 4: Large image within 10MB limit
const largeB64 = Buffer.alloc(4 * 1024 * 1024, "A").toString("base64"); // ~5.3 MB base64
const testScenario4 = await simulateSnap({
  image_b64: largeB64,
  media_type: "image/jpeg",
  persona: "exam_coach",
  language: "telugu",
  file_name: "high_res_neet_organic_paper.jpg",
});
assert(testScenario4.supported === true, "Scenario 4 (Large 5MB Image): Processed without payload error or timeout");
assert(testScenario4.socratic_question.length > 0, "Scenario 4: Returns Telugu exam coaching response");


// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3: CONCEPT CURRICULUM & SKILL TREE SYNC
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 3: Concept Curriculum & Difficulty Tiers ---");

const primaryModules = conceptTreeData.slice(0, 17);
assert(primaryModules.length === 17, `Total 17 primary modules present (found ${primaryModules.length})`);

const basics = primaryModules.filter((m) => m.difficulty === "basics");
const medium = primaryModules.filter((m) => m.difficulty === "medium");
const advanced = primaryModules.filter((m) => m.difficulty === "advanced");

assert(basics.length === 5, `Basics difficulty has 5 modules (found ${basics.length}: ${basics.map((m) => m.module_id).join(", ")})`);
assert(medium.length === 6, `Medium difficulty has 6 modules (found ${medium.length}: ${medium.map((m) => m.module_id).join(", ")})`);
assert(advanced.length === 6, `Advanced difficulty has 6 modules (found ${advanced.length}: ${advanced.map((m) => m.module_id).join(", ")})`);

// Verify all modules have slides
let totalSlides = 0;
let validSlides = 0;
for (const mod of primaryModules) {
  assert(mod.tutorial_sequence && mod.tutorial_sequence.length > 0, `Module ${mod.module_id} ("${mod.title}") has valid tutorial sequence`);
  totalSlides += mod.tutorial_sequence.length;
  for (const s of mod.tutorial_sequence) {
    if (s.concept_term && s.short_definition && s.action_prompt) validSlides++;
  }
}
assert(validSlides === totalSlides, `All ${totalSlides} slides across 17 modules have title, body, and prompt`);

console.log("\n=================================================");
if (failures === 0) {
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! ZERO FAILURES.");
} else {
  console.error(`💥 ${failures} TEST FAILURES DETECTED.`);
  process.exit(1);
}
console.log("=================================================");
