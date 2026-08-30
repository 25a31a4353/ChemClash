import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose backend URL to the browser bundle.
  // In Vercel: set NEXT_PUBLIC_BACKEND_URL in Project Settings > Environment Variables.
  // Locally: set it in chemclash/.env.local (see .env.local.example).
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
