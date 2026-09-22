/**
 * GET  /auth/me — return authenticated account (no password_hash)
 * PUT  /auth/me — update onboarding / tour / level / goals / display_name
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountsStore, AccountDoc } from "@/lib/db";
import { extractToken, decodeToken } from "@/lib/jwt";

function publicAccount(doc: AccountDoc) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...pub } = doc;
  return pub;
}

async function requireAuth(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return null;
  const userId = await decodeToken(token);
  if (!userId) return null;
  const store = await getAccountsStore();
  return store.findById(userId);
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const account = await requireAuth(req);
  if (!account) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  return NextResponse.json(publicAccount(account));
}

// ── PUT /auth/me ──────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const account = await requireAuth(req);
  if (!account) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  let body: {
    display_name?: string;
    onboarding_done?: boolean;
    tour_done?: boolean;
    level?: string;
    goals?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Partial<AccountDoc> = {};
  if (typeof body.display_name === "string" && body.display_name.trim()) {
    patch.display_name = body.display_name.trim();
  }
  if (typeof body.onboarding_done === "boolean") {
    patch.onboarding_done = body.onboarding_done;
  }
  if (typeof body.tour_done === "boolean") {
    patch.tour_done = body.tour_done;
  }
  if (typeof body.level === "string") {
    patch.level = body.level;
  }
  if (Array.isArray(body.goals)) {
    patch.goals = body.goals;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(publicAccount(account));
  }

  const store = await getAccountsStore();
  const updated = await store.update(account.user_id, patch);
  return NextResponse.json(publicAccount(updated ?? account));
}
