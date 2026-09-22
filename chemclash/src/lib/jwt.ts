/**
 * ChemClash — JWT Auth Utilities
 * Used by all /auth/* route handlers.
 */

import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ??
    "chemclash-dev-secret-key-stable-session-2026-fallback-32b"
);

const JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS ?? "30", 10);

export const COOKIE_NAME = "cc_session";

export function makeToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${JWT_EXPIRE_DAYS}d`)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function decodeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

/** Extract JWT from Bearer header or cc_session cookie. */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  // Cookie fallback
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key.trim() === COOKIE_NAME) return rest.join("=").trim();
  }
  return null;
}

/** Number of seconds in JWT_EXPIRE_DAYS */
export const COOKIE_MAX_AGE = JWT_EXPIRE_DAYS * 86400;
