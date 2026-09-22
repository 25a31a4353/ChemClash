/**
 * ChemClash — LogoSpinner
 *
 * Branded loading screen using the official ChemClash logo.
 * Used everywhere the app needs a loading/buffering state.
 *
 * Usage:
 *   <LogoSpinner />                     — full-screen center
 *   <LogoSpinner size="sm" />           — small inline spinner
 *   <LogoSpinner label="Loading..." />  — with custom text
 */

import Image from "next/image";

interface LogoSpinnerProps {
  /** "sm" = 48px, "md" = 80px (default), "lg" = 120px */
  size?: "sm" | "md" | "lg";
  /** Optional label shown below the logo */
  label?: string;
  /** If true, wraps in a full-screen centered container */
  fullScreen?: boolean;
}

const SIZE_MAP = {
  sm: 48,
  md: 80,
  lg: 120,
};

export default function LogoSpinner({
  size = "md",
  label,
  fullScreen = true,
}: LogoSpinnerProps) {
  const px = SIZE_MAP[size];

  const inner = (
    <div className="flex flex-col items-center gap-3">
      {/* Pulsing logo */}
      <div
        className="animate-pulse"
        style={{ width: px, height: px, position: "relative" }}
      >
        <Image
          src="/logo.png"
          alt="ChemClash"
          width={px}
          height={px}
          className="rounded-full object-cover"
          priority
        />
      </div>
      {label && (
        <p className="text-xs font-semibold text-slate-400 tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (!fullScreen) return inner;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      {inner}
    </div>
  );
}
