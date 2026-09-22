import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose backend URL to the browser bundle.
  // In Vercel: set NEXT_PUBLIC_BACKEND_URL in Project Settings > Environment Variables.
  // Locally: set it in chemclash/.env.local (see .env.local.example).
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",
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
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:8000";
    return [
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/user/:path*",
        destination: `${backendUrl}/user/:path*`,
      },
    ];
  },
};

export default nextConfig;
