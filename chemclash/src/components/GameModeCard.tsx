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
  locked?: boolean;
  progress?: number; // 0–100
  plays?: number;
}

interface GameModeCardProps {
  mode: GameMode;
  index?: number;
}

export default function GameModeCard({ mode, index = 0 }: GameModeCardProps) {
  const [hovered, setHovered] = useState(false);

  const cardContent = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg, #161e28, #1c2535)`
          : "#111820",
        border: `1px solid ${hovered ? mode.accentColor + "60" : "#1e2d3d"}`,
        borderRadius: 14,
        padding: "26px 22px",
        cursor: mode.locked ? "not-allowed" : "pointer",
        transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: hovered
          ? `0 0 32px ${mode.accentColor}22, 0 8px 32px rgba(0,0,0,0.4)`
          : "0 2px 8px rgba(0,0,0,0.2)",
        transform: hovered && !mode.locked ? "translateY(-5px)" : "translateY(0)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Courier New, monospace",
        minHeight: 230,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: mode.locked ? 0.6 : 1,
        animationDelay: `${index * 0.08}s`,
      }}
      className="animate-slide-up"
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${mode.accentColor}18 0%, transparent 65%)`,
          pointerEvents: "none",
          transition: "opacity 0.3s",
          opacity: hovered ? 1 : 0.5,
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${mode.accentColor}, ${mode.accentColor}00)`,
          borderRadius: "14px 0 0 14px",
          opacity: hovered ? 1 : 0.4,
          transition: "opacity 0.2s",
        }}
      />

      {/* Badge */}
      {mode.badge && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: "0.58rem",
            padding: "3px 9px",
            borderRadius: 999,
            background: mode.locked
              ? "rgba(100,116,139,0.15)"
              : mode.badge === "COMING SOON"
              ? "rgba(245,158,11,0.12)"
              : `${mode.accentColor}15`,
            color: mode.locked
              ? "#64748b"
              : mode.badge === "COMING SOON"
              ? "#f59e0b"
              : mode.accentColor,
            border: `1px solid ${
              mode.locked
                ? "rgba(100,116,139,0.3)"
                : mode.badge === "COMING SOON"
                ? "rgba(245,158,11,0.3)"
                : `${mode.accentColor}40`
            }`,
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          {mode.badge}
        </span>
      )}

      <div>
        {/* Icon + Level pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: `${mode.accentColor}12`,
              border: `1px solid ${mode.accentColor}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              transition: "all 0.2s",
              transform: hovered ? "scale(1.08)" : "scale(1)",
            }}
          >
            {mode.icon}
          </div>
          <span
            style={{
              fontSize: "0.62rem",
              color: mode.accentColor,
              border: `1px solid ${mode.accentColor}50`,
              background: `${mode.accentColor}0c`,
              padding: "3px 9px",
              borderRadius: 4,
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            {mode.level}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            color: hovered ? "#ffffff" : "#e2e8f0",
            fontSize: "1.05rem",
            fontWeight: 800,
            margin: "0 0 8px 0",
            letterSpacing: "0.04em",
            transition: "color 0.15s",
          }}
        >
          {mode.title}
        </h2>

        {/* Description */}
        <p
          style={{
            color: "#64748b",
            fontSize: "0.78rem",
            margin: 0,
            lineHeight: 1.65,
          }}
        >
          {mode.description}
        </p>
      </div>

      {/* Bottom row */}
      <div style={{ marginTop: 20 }}>
        {/* Progress bar (if applicable) */}
        {mode.progress !== undefined && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#334155", fontSize: "0.6rem", letterSpacing: "0.1em" }}>PROGRESS</span>
              <span style={{ color: mode.accentColor, fontSize: "0.6rem", fontWeight: 700 }}>{mode.progress}%</span>
            </div>
            <div style={{ height: 3, background: "#1e2d3d", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${mode.progress}%`,
                  background: `linear-gradient(90deg, ${mode.accentColor}80, ${mode.accentColor})`,
                  borderRadius: 2,
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* CTA row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              color: mode.accentColor,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              opacity: hovered ? 1 : 0.55,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {mode.locked ? "LOCKED" : "ENTER"}
            {!mode.locked && (
              <span
                style={{
                  display: "inline-block",
                  transition: "transform 0.2s",
                  transform: hovered ? "translateX(4px)" : "translateX(0)",
                }}
              >
                →
              </span>
            )}
          </span>

          {mode.plays !== undefined && (
            <span style={{ color: "#334155", fontSize: "0.62rem", letterSpacing: "0.06em" }}>
              {mode.plays.toLocaleString()} plays
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (mode.locked) return cardContent;

  return (
    <Link href={mode.href} style={{ textDecoration: "none" }}>
      {cardContent}
    </Link>
  );
}
