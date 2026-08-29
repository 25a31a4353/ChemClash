"use client";

import { useState } from "react";
import Link from "next/link";

export interface GameMode {
  id: string;
  title: string;
  level: string;
  description: string;
  icon: string;
  href: string;
  accentColor: string;
  badge?: string;
}

interface GameModeCardProps {
  mode: GameMode;
}

export default function GameModeCard({ mode }: GameModeCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={mode.href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "#1a1a1a" : "#111111",
          border: `1px solid ${hovered ? mode.accentColor : "#1f2937"}`,
          borderRadius: "12px",
          padding: "28px 24px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: hovered
            ? `0 0 24px ${mode.accentColor}33, inset 0 0 24px ${mode.accentColor}08`
            : "none",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Courier New, monospace",
          minHeight: "220px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top-right badge */}
        {mode.badge && (
          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              fontSize: "0.65rem",
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.4)",
              letterSpacing: "0.08em",
            }}
          >
            {mode.badge}
          </span>
        )}

        {/* Corner glow */}
        <div
          style={{
            position: "absolute",
            top: -40,
            left: -40,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${mode.accentColor}22 0%, transparent 70%)`,
            pointerEvents: "none",
            transition: "opacity 0.2s",
            opacity: hovered ? 1 : 0.4,
          }}
        />

        <div>
          {/* Icon + Level */}
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: "2rem" }}>{mode.icon}</span>
            <span
              style={{
                fontSize: "0.7rem",
                color: mode.accentColor,
                border: `1px solid ${mode.accentColor}66`,
                padding: "2px 8px",
                borderRadius: "4px",
                letterSpacing: "0.1em",
              }}
            >
              {mode.level}
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              color: "#ffffff",
              fontSize: "1.15rem",
              fontWeight: 700,
              margin: "0 0 10px 0",
              letterSpacing: "0.04em",
            }}
          >
            {mode.title}
          </h2>

          {/* Description */}
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.82rem",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {mode.description}
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: mode.accentColor,
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            opacity: hovered ? 1 : 0.6,
            transition: "opacity 0.2s",
          }}
        >
          <span>ENTER</span>
          <span style={{ fontSize: "1rem" }}>→</span>
        </div>
      </div>
    </Link>
  );
}
