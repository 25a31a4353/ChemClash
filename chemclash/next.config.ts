import type { NextConfig } from "next";

/**
 * Checks if a hostname or URL represents a private, loopback, or internal-only address.
 * Vercel Edge strictly blocks proxying to private addresses with DNS_HOSTNAME_RESOLVED_PRIVATE.
 */
function isPrivateHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr.startsWith("http") ? urlStr : `http://${urlStr}`);
    const hostname = parsed.hostname.toLowerCase();

    // Loopback & unspecified
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]"
    ) {
      return true;
    }

    // Render / Docker internal single-label service names (e.g. "chemclash-api", "chemclash", "backend")
    if (!hostname.includes(".")) {
      return true;
    }

    // Internal top-level domains (.internal, .local, .lan, etc.)
    if (
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".home")
    ) {
      return true;
    }

    // RFC 1918 private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);
      if (b1 === 10) return true;
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
      if (b1 === 192 && b2 === 168) return true;
      if (b1 === 169 && b2 === 254) return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Determines the target backend URL for Next.js rewrites.
 * - In Vercel / production environments: guarantees a public HTTPS destination,
 *   preventing DNS_HOSTNAME_RESOLVED_PRIVATE errors.
 * - In local development: defaults to http://localhost:8000.
 */
function getRewriteBackendUrl(): string {
  const envVal = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ""
  ).trim();

  // If running on Vercel or in production mode
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    // If the user configured an env var that is NOT a private hostname, use it
    if (envVal && !isPrivateHost(envVal)) {
      let cleaned = envVal.replace(/\/+$/, "");
      if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
        cleaned = `https://${cleaned}`;
      }
      return cleaned;
    }
    // Production default: public HTTPS Render service for ChemClash
    return "https://chemclash.onrender.com";
  }

  // Local development: use envVal if given, otherwise standard localhost:8000
  if (envVal) {
    return envVal.replace(/\/+$/, "");
  }
  return "http://localhost:8000";
}

const targetBackend = getRewriteBackendUrl();
if (process.env.NODE_ENV !== "test") {
  console.log(`[next.config.ts] Proxying auth/api/user requests to: ${targetBackend}`);
}

const nextConfig: NextConfig = {
  // Expose backend URL to the browser bundle.
  // In Vercel: set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL in Project Settings > Environment Variables.
  // Locally: set it in chemclash/.env.local (see .env.local.example).
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      targetBackend,
  },

  // Standalone output is intended for self-hosted Docker environments.
  // On Vercel, standalone mode must be disabled so Vercel uses its standard
  // deployment pipeline and avoids the Turbopack ENOENT next-server.js.nft.json error.
  output: process.env.VERCEL ? undefined : "standalone",

  // Compiler-level optimisations
  compiler: {
    // Remove console.log in production builds — reduces bundle size slightly
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Aggressively cache static assets at the CDN edge
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options",    value: "nosniff" },
        { key: "X-Frame-Options",           value: "DENY" },
        { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      // Next.js static chunks — immutable, safe to cache for 1 year
      source: "/_next/static/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],

  // Reverse-proxy API, auth, and user requests to the backend server.
  // This enables same-origin cookies and eliminates cross-origin Mixed Content blocks.
  // Destinations MUST be public HTTPS URLs on Vercel to avoid DNS_HOSTNAME_RESOLVED_PRIVATE.
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: `${targetBackend}/auth/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${targetBackend}/api/:path*`,
      },
      {
        source: "/user/:path*",
        destination: `${targetBackend}/user/:path*`,
      },
    ];
  },
};

export default nextConfig;
