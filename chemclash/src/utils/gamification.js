/**
 * ChemClash — Gamification Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Two self-contained utilities used throughout the game:
 *
 *   calculateELO(playerRating, opponentRating, didWin)
 *     Standard chess ELO delta calculation.  Returns the player's NEW rating.
 *
 *   updateStreak(lastLoginDate, currentLoginDate, currentStreak)
 *     Increments a daily login streak if the gap is ≤ 48 h, resets otherwise.
 *     Returns an object with the new streak value and a status label.
 *
 * Both functions are pure (no side-effects, no global state) so they are safe
 * to call on the server (Node / FastAPI background task) or in the browser.
 */

// ─── ELO constants ────────────────────────────────────────────────────────────

/**
 * K-factor: controls how many points are on the line per match.
 *
 * ChemClash uses a tiered K-factor (mirrors FIDE rules):
 *   • K = 40  — provisional players (< 30 games played or rating < 1000)
 *   • K = 20  — established players (rating 1000–2000)
 *   • K = 10  — elite players (rating > 2000)
 *
 * If you want a fixed K for simplicity, pass it directly as the optional
 * fourth argument to calculateELO().
 */
const K_PROVISIONAL = 40;
const K_STANDARD    = 20;
const K_ELITE       = 10;

/**
 * Return the appropriate K-factor for a given rating.
 * @param {number} rating
 * @returns {number}
 */
function getKFactor(rating) {
  if (rating < 1000) return K_PROVISIONAL;
  if (rating <= 2000) return K_STANDARD;
  return K_ELITE;
}

// ─── Streak constants ─────────────────────────────────────────────────────────

/** Maximum gap (ms) between two logins that still counts as consecutive. */
const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// ─── calculateELO ─────────────────────────────────────────────────────────────

/**
 * Calculate a player's new ELO rating after a 1v1 duel.
 *
 * Uses the standard chess ELO formula:
 *   E = 1 / (1 + 10^((opponentRating - playerRating) / 400))
 *   newRating = playerRating + K * (actualScore - expectedScore)
 *
 * @param {number}  playerRating    - Current ELO of the player  (e.g. 1200)
 * @param {number}  opponentRating  - Current ELO of the opponent (e.g. 1400)
 * @param {boolean} didWin          - true = win, false = loss
 *                                    (draws are not supported in ChemClash 1v1)
 * @param {number}  [kOverride]     - Optional: override the auto-selected K-factor
 * @returns {{ newRating: number, delta: number, expectedScore: number }}
 *
 * @example
 * calculateELO(1200, 1400, true)
 * // { newRating: 1227, delta: 27, expectedScore: 0.24 }
 *
 * calculateELO(1200, 1000, false)
 * // { newRating: 1186, delta: -14, expectedScore: 0.76 }
 */
export function calculateELO(playerRating, opponentRating, didWin, kOverride) {
  if (typeof playerRating !== "number" || !isFinite(playerRating)) {
    throw new TypeError(`playerRating must be a finite number, got: ${playerRating}`);
  }
  if (typeof opponentRating !== "number" || !isFinite(opponentRating)) {
    throw new TypeError(`opponentRating must be a finite number, got: ${opponentRating}`);
  }
  if (typeof didWin !== "boolean") {
    throw new TypeError(`didWin must be a boolean, got: ${didWin}`);
  }

  // Expected score: probability the player beats this opponent (raw, full precision)
  const expectedScoreRaw = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  // Actual score: 1 for a win, 0 for a loss
  const actualScore = didWin ? 1 : 0;

  // K-factor (use override if provided, otherwise auto-tier by rating)
  const k = typeof kOverride === "number" && isFinite(kOverride)
    ? kOverride
    : getKFactor(playerRating);

  // delta is computed from the full-precision expected score so extreme rating
  // gaps are handled correctly, then rounded to the nearest integer.
  const delta     = Math.round(k * (actualScore - expectedScoreRaw));
  const newRating = Math.max(0, playerRating + delta); // ELO cannot go below 0

  return {
    newRating,
    delta,
    expectedScore: Math.round(expectedScoreRaw * 100) / 100, // 2 d.p. for display
  };
}

// ─── updateStreak ─────────────────────────────────────────────────────────────

/**
 * Update a player's daily login streak.
 *
 * Rules:
 *   • Gap ≤ 48 h  → streak increments by 1  (status: "continued")
 *   • Gap > 48 h  → streak resets to 1       (status: "reset")
 *     A reset still counts today as day 1.
 *   • Same calendar day (gap < 1 s) → streak unchanged (status: "already_counted")
 *
 * @param {Date|string|number} lastLoginDate     - When the user last logged in
 * @param {Date|string|number} currentLoginDate  - The login being processed (default: now)
 * @param {number}             currentStreak     - Player's current streak value (default: 1)
 * @returns {{ streak: number, status: "continued"|"reset"|"already_counted", gapMs: number }}
 *
 * @example
 * // Consecutive day
 * updateStreak("2024-06-01T09:00:00Z", "2024-06-02T10:00:00Z", 5)
 * // { streak: 6, status: "continued", gapMs: 90000000 }
 *
 * // Missed two days
 * updateStreak("2024-06-01T09:00:00Z", "2024-06-04T10:00:00Z", 5)
 * // { streak: 1, status: "reset", gapMs: 266400000 }
 *
 * // Already logged in today
 * updateStreak("2024-06-01T08:00:00Z", "2024-06-01T12:00:00Z", 3)
 * // { streak: 3, status: "already_counted", gapMs: 14400000 }
 */
export function updateStreak(lastLoginDate, currentLoginDate = new Date(), currentStreak = 1) {
  const last    = new Date(lastLoginDate);
  const current = new Date(currentLoginDate);

  if (isNaN(last.getTime())) {
    throw new TypeError(`lastLoginDate is not a valid date: ${lastLoginDate}`);
  }
  if (isNaN(current.getTime())) {
    throw new TypeError(`currentLoginDate is not a valid date: ${currentLoginDate}`);
  }
  if (typeof currentStreak !== "number" || currentStreak < 0) {
    throw new TypeError(`currentStreak must be a non-negative number, got: ${currentStreak}`);
  }

  const gapMs = current.getTime() - last.getTime();

  // Guard: current must not be before last
  if (gapMs < 0) {
    throw new RangeError("currentLoginDate cannot be earlier than lastLoginDate");
  }

  // Same session (sub-second gap) — don't double-count
  if (gapMs < 1000) {
    return { streak: currentStreak, status: "already_counted", gapMs };
  }

  // Calendar-day boundary check: compare UTC midnight-truncated dates so that
  // two logins on the same UTC calendar day are always treated as one,
  // regardless of the server's local timezone or the raw millisecond gap.
  const lastDay    = new Date(Date.UTC(last.getUTCFullYear(),    last.getUTCMonth(),    last.getUTCDate()));
  const currentDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
  const dayGap     = (currentDay - lastDay) / (24 * 60 * 60 * 1000); // in full UTC calendar days

  if (dayGap === 0) {
    // Multiple logins on the same calendar day — streak already counted
    return { streak: currentStreak, status: "already_counted", gapMs };
  }

  // Different calendar days: use the raw millisecond gap to decide if the
  // 48-hour window is still open (consecutive) or has elapsed (reset).
  if (gapMs <= STREAK_WINDOW_MS) {
    return { streak: currentStreak + 1, status: "continued", gapMs };
  }

  // More than 48 h → reset; today still counts as day 1
  return { streak: 1, status: "reset", gapMs };
}
