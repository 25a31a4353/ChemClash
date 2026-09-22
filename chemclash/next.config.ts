import type { NextConfig } from "next";

/**
 * ChemClash — Next.js Configuration
 *
 * Auth endpoints are now served by Next.js Route Handlers under
 * src/app/auth - NO external backend proxy needed for auth.
 *
 * Non-auth API endpoints (/api and /user paths) are proxied to an
 * optional external backend only when BACKEND_URL is set to a valid
 * public HTTPS URL. When BACKEND_URL is absent these routes simply
 * return 404 (gracefully handled in the frontend with .catch blocks).
 */

function getExternalBackendUrl(): string | null {
  const raw = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (!raw) return null;

  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const h = parsed.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      !h.includes(".") ||
      h.endsWith(".internal") ||
      h.endsWith(".local") ||
      h.endsWith(".onrender.com")
    ) {
      return null;
    }
    parsed.protocol = "https:";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const externalBackend = getExternalBackendUrl();

if (process.env.NODE_ENV !== "test") {
  if (externalBackend) {
    console.log(`[next.config] External backend API proxy → ${externalBackend}`);
  } else {
    console.log(
      "[next.config] No external backend configured. Auth is handled natively."
    );
  }
}

const nextConfig: NextConfig = {
  // Standalone output for self-hosted Docker environments.
  // On Vercel: disabled so Vercel uses its standard pipeline.
  output: process.env.VERCEL ? undefined : "standalone",

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/_next/static/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],

  // Only proxy non-auth routes to an external backend when explicitly configured.
  // Auth routes are intentionally excluded — handled by Next.js Route Handlers.
  async rewrites() {
    if (!externalBackend) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${externalBackend}/api/:path*`,
      },
      {
        source: "/user/:path*",
        destination: `${externalBackend}/user/:path*`,
      },
    ];
  },
};

export default nextConfig;
