import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose backend URL to the browser bundle.
  // In Vercel: set NEXT_PUBLIC_BACKEND_URL in Project Settings > Environment Variables.
  // Locally: set it in chemclash/.env.local (see .env.local.example).
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",
  },

  // Standalone output: bundles only the files needed to run the app — reduces
  // cold-start time on Vercel / Docker by ~60–70% vs. the default output.
  output: "standalone",

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
};

export default nextConfig;
