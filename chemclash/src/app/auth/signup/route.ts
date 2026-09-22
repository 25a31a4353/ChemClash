/**
 * POST /auth/signup
 * Creates a new ChemClash account with email + password.
 * Returns JWT token + public account doc (no password_hash).
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getAccountsStore, AccountDoc } from "@/lib/db";
import { makeToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/jwt";

function publicAccount(doc: AccountDoc) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...pub } = doc;
  return pub;
}

function isHttps(req: NextRequest): boolean {
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    req.url.startsWith("https://") ||
    process.env.NODE_ENV === "production"
  );
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; display_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").toLowerCase().trim();
  const password = body.password ?? "";
  const displayName = (body.display_name ?? "").trim();

  // ── Validation ──────────────────────────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ detail: "Invalid email address." }, { status: 422 });
  }
  if (password.length < 6) {
    return NextResponse.json({ detail: "Password must be at least 6 characters." }, { status: 422 });
  }
  if (!displayName) {
    return NextResponse.json({ detail: "Display name is required." }, { status: 422 });
  }

  const store = await getAccountsStore();

  // ── Duplicate check ─────────────────────────────────────────────────────────
  const existing = await store.findByEmail(email);
  if (existing) {
    return NextResponse.json(
      { detail: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // ── Create account ──────────────────────────────────────────────────────────
  const userId = uuidv4();
  const account: AccountDoc = {
    user_id:         userId,
    email,
    password_hash:   bcrypt.hashSync(password, 12),
    display_name:    displayName,
    created_at:      new Date().toISOString(),
    onboarding_done: false,
    tour_done:       false,
    level:           "",
    goals:           [],
    chem_coins:      11,   // 1 login + 10 welcome bonus
    owned_rewards:   [],
  };

  await store.insert(account);

  const token = await makeToken(userId);
  const secure = isHttps(req);

  const res = NextResponse.json({ ok: true, token, account: publicAccount(account) }, { status: 201 });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
