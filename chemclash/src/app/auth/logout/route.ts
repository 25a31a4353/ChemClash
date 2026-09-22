/**
 * POST /auth/logout
 * Clears the session cookie. Stateless — JWT is not blocklisted.
 */

import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/jwt";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
