"use client";

import Link from "next/link";
import { useState } from "react";
import { useChemStore } from "@/store/useChemStore";

interface TopNavProps {
  eloRating?: number;
  dailyStreak?: number;
  username?: string;
}

export default function TopNav({
  eloRating: eloProp = 1337,
  dailyStreak: streakProp = 7,
  username: usernameProp = "CH3M_L0RD",
}: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Live values from global store (props are fallback defaults)
  const storeElo      = useChemStore((s) => s.eloRating);
  const storeStreak   = useChemStore((s) => s.dailyStreak);
  const storeUsername = useChemStore((s) => s.username);

  const eloRating  = storeElo      ?? eloProp;
  const dailyStreak = storeStreak  ?? streakProp;
  const username   = storeUsername ?? usernameProp;

  return (
    <nav
      style={{
        background: "rgba(8,12,16,0.92)",
        borderBottom: "1px solid #1e2d3d",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: 2,
        background: "linear-gradient(90deg, transparent, #00ff88, #3b82f6, transparent)",
        opacity: 0.6,
      }} />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 20px",
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* ── Logo ── */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(0,255,136,0.1)",
              border: "1px solid rgba(0,255,136,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            ⚗
          </div>
          <span
            style={{
              color: "#00ff88",
              fontFamily: "Courier New, monospace",
              fontWeight: 800,
              fontSize: "1.1rem",
              letterSpacing: "0.08em",
            }}
            className="glow"
          >
            CHEM<span style={{ color: "#e2e8f0" }}>CLASH</span>
          </span>
          <span
            style={{
              fontSize: "0.6rem",
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(0,255,136,0.08)",
              color: "#00ff88",
              border: "1px solid rgba(0,255,136,0.2)",
              letterSpacing: "0.1em",
              fontFamily: "Courier New, monospace",
            }}
          >
            v0.1
          </span>
        </Link>

        {/* ── Center nav links ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
          className="hidden-mobile"
        >
          {[
            { href: "/react-or-reject",  label: "React or Reject",   color: "#00ff88" },
            { href: "/mechanism-builder",label: "Mechanism Builder",  color: "#3b82f6" },
            { href: "/adaptive-pyq",     label: "Adaptive PYQ",      color: "#a78bfa" },
            { href: "/curriculum",       label: "Curriculum",         color: "#3b82f6" },
            { href: "/reagents",         label: "Reagents",           color: "#f59e0b" },
            { href: "/leaderboard",      label: "Leaderboard",        color: "#f59e0b" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: "#64748b",
                textDecoration: "none",
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid transparent",
                transition: "all 0.15s",
                fontFamily: "Courier New, monospace",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = link.color;
                (e.currentTarget as HTMLAnchorElement).style.background = `${link.color}10`;
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${link.color}30`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "#64748b";
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "transparent";
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Right stats + user ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          {/* Streak */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 8,
              padding: "5px 12px",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>🔥</span>
            <div style={{ fontFamily: "Courier New, monospace", lineHeight: 1 }}>
              <div style={{ color: "#64748b", fontSize: "0.55rem", letterSpacing: "0.12em", marginBottom: 1 }}>STREAK</div>
              <div style={{ color: "#f59e0b", fontSize: "0.85rem", fontWeight: 800 }}>{dailyStreak}d</div>
            </div>
          </div>

          {/* ELO */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(0,255,136,0.07)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 8,
              padding: "5px 12px",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>⚡</span>
            <div style={{ fontFamily: "Courier New, monospace", lineHeight: 1 }}>
              <div style={{ color: "#64748b", fontSize: "0.55rem", letterSpacing: "0.12em", marginBottom: 1 }}>ELO</div>
              <div className="glow" style={{ color: "#00ff88", fontSize: "0.85rem", fontWeight: 800 }}>{eloRating}</div>
            </div>
          </div>

          {/* User avatar */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.2)",
                borderRadius: 8,
                padding: "5px 12px 5px 6px",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "Courier New, monospace",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,255,136,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.05)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,255,136,0.2)";
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #00ff88, #00cc6a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 900,
                  color: "#080c10",
                }}
              >
                {username[0]}
              </div>
              <span style={{ color: "#e2e8f0", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em" }}>
                {username}
              </span>
              <span style={{ color: "#64748b", fontSize: "0.7rem", marginLeft: 2, transform: menuOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                className="animate-slide-down"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "#111820",
                  border: "1px solid #1e2d3d",
                  borderRadius: 10,
                  minWidth: 180,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  zIndex: 200,
                }}
              >
                {[
                  { label: "Profile",      icon: "👤",  href: undefined      },
                  { label: "Leaderboard",  icon: "🏆",  href: "/leaderboard" },
                  { label: "Settings",     icon: "⚙️",  href: undefined      },
                  { label: "Sign Out",     icon: "→",   href: undefined, danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setMenuOpen(false); if (item.href) window.location.href = item.href; }}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      color: item.danger ? "#f87171" : "#64748b",
                      fontSize: "0.75rem",
                      fontFamily: "Courier New, monospace",
                      letterSpacing: "0.05em",
                      transition: "all 0.12s",
                      textAlign: "left",
                      borderTop: item.label === "Sign Out" ? "1px solid #1e2d3d" : "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#161e28";
                      (e.currentTarget as HTMLButtonElement).style.color = item.danger ? "#fca5a5" : "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = item.danger ? "#f87171" : "#64748b";
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
