/**
 * POST /auth/login
 * Authenticates with email + password.
 * Returns JWT token + public account doc.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").toLowerCase().trim();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ detail: "Email and password are required." }, { status: 422 });
  }

  const store = await getAccountsStore();
  const account = await store.findByEmail(email);

  if (!account || !bcrypt.compareSync(password, account.password_hash)) {
    return NextResponse.json({ detail: "Invalid email or password." }, { status: 401 });
  }

  const token = await makeToken(account.user_id);
  const secure = isHttps(req);

  const res = NextResponse.json({ ok: true, token, account: publicAccount(account) });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
