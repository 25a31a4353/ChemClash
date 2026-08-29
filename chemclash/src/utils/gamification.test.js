/**
 * ChemClash — Gamification Engine Tests
 * Run with:  npx jest src/utils/gamification.test.js
 */

import { calculateELO, updateStreak } from "./gamification.js";

// ─── calculateELO ─────────────────────────────────────────────────────────────

describe("calculateELO", () => {
  // ── return shape ────────────────────────────────────────────────────────────
  test("returns newRating, delta, and expectedScore keys", () => {
    const result = calculateELO(1200, 1200, true);
    expect(result).toHaveProperty("newRating");
    expect(result).toHaveProperty("delta");
    expect(result).toHaveProperty("expectedScore");
  });

  // ── equal ratings ───────────────────────────────────────────────────────────
  test("equal ratings: expected score is 0.5", () => {
    const { expectedScore } = calculateELO(1200, 1200, true);
    expect(expectedScore).toBe(0.5);
  });

  test("equal ratings: win earns +K/2 points", () => {
    // K = 20 (both players at 1200, established bracket)
    const { delta } = calculateELO(1200, 1200, true);
    expect(delta).toBe(10); // Math.round(20 * (1 - 0.5)) = 10
  });

  test("equal ratings: loss loses K/2 points", () => {
    const { delta } = calculateELO(1200, 1200, false);
    expect(delta).toBe(-10);
  });

  // ── underdog wins ───────────────────────────────────────────────────────────
  test("underdog win yields a large positive delta", () => {
    const { delta } = calculateELO(1200, 1600, true);
    expect(delta).toBeGreaterThan(10);
  });

  test("heavy favourite win yields a small positive delta", () => {
    const { delta } = calculateELO(1600, 1200, true);
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(10);
  });

  // ── favourite loses ──────────────────────────────────────────────────────────
  test("favourite loss yields a large negative delta", () => {
    const { delta } = calculateELO(1600, 1200, false);
    expect(delta).toBeLessThan(-10);
  });

  // ── K-factor tiers ──────────────────────────────────────────────────────────
  test("provisional player (rating < 1000) uses K=40", () => {
    const { delta } = calculateELO(800, 800, true);
    expect(delta).toBe(20); // Math.round(40 * 0.5)
  });

  test("elite player (rating > 2000) uses K=10", () => {
    const { delta } = calculateELO(2200, 2200, true);
    expect(delta).toBe(5); // Math.round(10 * 0.5)
  });

  test("kOverride parameter bypasses the tier logic", () => {
    const { delta } = calculateELO(1200, 1200, true, 32);
    expect(delta).toBe(16); // Math.round(32 * 0.5)
  });

  // ── floor at 0 ──────────────────────────────────────────────────────────────
  test("rating never drops below 0", () => {
    // Use a large custom K to guarantee the delta drives rating negative.
    // K=1000, equal ratings, loss → delta = Math.round(1000 * (0 - 0.5)) = -500
    // So newRating = 5 + (-500) = -495 → clamped to 0.
    const { newRating } = calculateELO(5, 5, false, 1000);
    expect(newRating).toBe(0);
  });

  // ── newRating arithmetic ─────────────────────────────────────────────────────
  test("newRating equals playerRating + delta", () => {
    const r = calculateELO(1300, 1100, true);
    expect(r.newRating).toBe(Math.max(0, 1300 + r.delta));
  });

  // ── delta is an integer ──────────────────────────────────────────────────────
  test("delta is always an integer (Math.round applied)", () => {
    const { delta } = calculateELO(1205, 1438, false);
    expect(Number.isInteger(delta)).toBe(true);
  });

  // ── input validation ─────────────────────────────────────────────────────────
  test("throws TypeError if playerRating is not a number", () => {
    expect(() => calculateELO("1200", 1200, true)).toThrow(TypeError);
  });

  test("throws TypeError if opponentRating is not a number", () => {
    expect(() => calculateELO(1200, null, true)).toThrow(TypeError);
  });

  test("throws TypeError if didWin is not a boolean", () => {
    expect(() => calculateELO(1200, 1200, 1)).toThrow(TypeError);
  });

  test("throws TypeError if playerRating is Infinity", () => {
    expect(() => calculateELO(Infinity, 1200, true)).toThrow(TypeError);
  });
});

// ─── updateStreak ─────────────────────────────────────────────────────────────

describe("updateStreak", () => {
  // ── return shape ────────────────────────────────────────────────────────────
  test("returns streak, status, and gapMs keys", () => {
    const result = updateStreak("2024-06-01T09:00:00Z", "2024-06-02T09:00:00Z", 3);
    expect(result).toHaveProperty("streak");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("gapMs");
  });

  // ── consecutive day (24 h gap) ──────────────────────────────────────────────
  test("next-day login increments streak and returns 'continued'", () => {
    const { streak, status } = updateStreak(
      "2024-06-01T09:00:00Z",
      "2024-06-02T10:00:00Z",
      5
    );
    expect(streak).toBe(6);
    expect(status).toBe("continued");
  });

  // ── exactly 48 h gap (boundary — still consecutive) ─────────────────────────
  test("exactly 48 h gap is treated as consecutive", () => {
    const last    = new Date("2024-06-01T09:00:00Z");
    const current = new Date(last.getTime() + 48 * 60 * 60 * 1000);
    const { streak, status } = updateStreak(last, current, 3);
    expect(streak).toBe(4);
    expect(status).toBe("continued");
  });

  // ── 48 h + 1 ms (just outside window) ───────────────────────────────────────
  test("48 h + 1 ms gap resets streak to 1", () => {
    const last    = new Date("2024-06-01T09:00:00Z");
    const current = new Date(last.getTime() + 48 * 60 * 60 * 1000 + 1);
    const { streak, status } = updateStreak(last, current, 7);
    expect(streak).toBe(1);
    expect(status).toBe("reset");
  });

  // ── missed multiple days ─────────────────────────────────────────────────────
  test("gap of 3 days resets streak to 1", () => {
    const { streak, status } = updateStreak(
      "2024-06-01T09:00:00Z",
      "2024-06-04T09:00:00Z",
      12
    );
    expect(streak).toBe(1);
    expect(status).toBe("reset");
  });

  // ── same calendar day ────────────────────────────────────────────────────────
  test("second login on the same day does not increment streak", () => {
    const { streak, status } = updateStreak(
      "2024-06-01T08:00:00Z",
      "2024-06-01T20:00:00Z",
      3
    );
    expect(streak).toBe(3);
    expect(status).toBe("already_counted");
  });

  // ── same instant (< 1 s gap) ─────────────────────────────────────────────────
  test("same-instant call returns already_counted", () => {
    const now = new Date();
    const { status } = updateStreak(now, now, 1);
    expect(status).toBe("already_counted");
  });

  // ── default arguments ────────────────────────────────────────────────────────
  test("currentLoginDate defaults to now when omitted", () => {
    const yesterday = new Date(Date.now() - 22 * 60 * 60 * 1000);
    const { status } = updateStreak(yesterday, undefined, 1);
    expect(status).toBe("continued");
  });

  test("currentStreak defaults to 1 when omitted", () => {
    const yesterday = new Date(Date.now() - 22 * 60 * 60 * 1000);
    const { streak } = updateStreak(yesterday);
    expect(streak).toBe(2); // default 1 → incremented to 2
  });

  // ── string / number date inputs ──────────────────────────────────────────────
  test("accepts ISO string dates", () => {
    const { streak } = updateStreak("2024-01-10T00:00:00Z", "2024-01-11T00:00:00Z", 1);
    expect(streak).toBe(2);
  });

  test("accepts numeric timestamps", () => {
    const last    = Date.parse("2024-01-10T00:00:00Z");
    const current = Date.parse("2024-01-11T00:00:00Z");
    const { streak } = updateStreak(last, current, 1);
    expect(streak).toBe(2);
  });

  // ── gapMs is returned accurately ─────────────────────────────────────────────
  test("gapMs matches actual millisecond difference", () => {
    const last    = new Date("2024-06-01T00:00:00Z");
    const current = new Date("2024-06-02T00:00:00Z");
    const { gapMs } = updateStreak(last, current, 1);
    expect(gapMs).toBe(86_400_000); // exactly 24 h
  });

  // ── input validation ─────────────────────────────────────────────────────────
  test("throws TypeError for invalid lastLoginDate", () => {
    expect(() => updateStreak("not-a-date", new Date(), 1)).toThrow(TypeError);
  });

  test("throws TypeError for invalid currentLoginDate", () => {
    expect(() => updateStreak(new Date(), "bad", 1)).toThrow(TypeError);
  });

  test("throws TypeError for negative currentStreak", () => {
    expect(() => updateStreak(new Date("2024-01-01"), new Date("2024-01-02"), -1))
      .toThrow(TypeError);
  });

  test("throws RangeError if currentLoginDate is before lastLoginDate", () => {
    expect(() =>
      updateStreak("2024-06-05T00:00:00Z", "2024-06-01T00:00:00Z", 3)
    ).toThrow(RangeError);
  });
});
