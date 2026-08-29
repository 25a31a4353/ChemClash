"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number; }

interface Atom {
  id: string;
  label: string;
  symbol: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  electronColor: string;
  description: string;
}

// ─── Atom data ────────────────────────────────────────────────────────────────

const ATOMS: Atom[] = [
  {
    id: "carbon",
    label: "Carbon",
    symbol: "C",
    x: 220,
    y: 240,
    radius: 48,
    color: "#0d1520",
    electronColor: "#00ff88",
    description: "Electrophilic Carbon (δ+)",
  },
  {
    id: "bromine",
    label: "Bromine",
    symbol: "Br",
    x: 560,
    y: 240,
    radius: 52,
    color: "#12080a",
    electronColor: "#f59e0b",
    description: "Leaving Group (Br⁻)",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function curveControlPoint(from: Vec2, to: Vec2): Vec2 {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return { x: mx - dy * 0.3, y: my + dx * 0.3 };
}

function arrowheadPath(cp: Vec2, to: Vec2, size = 10): string {
  const angle = Math.atan2(to.y - cp.y, to.x - cp.x);
  const a1 = angle + 2.8;
  const a2 = angle - 2.8;
  return `M ${to.x} ${to.y} L ${to.x + size * Math.cos(a1)} ${to.y + size * Math.sin(a1)} L ${to.x + size * Math.cos(a2)} ${to.y + size * Math.sin(a2)} Z`;
}

// ─── Atom Node ────────────────────────────────────────────────────────────────

interface AtomNodeProps {
  atom: Atom;
  isDragSource: boolean;
  isTarget: boolean;
  onMouseDown: (atom: Atom, e: React.MouseEvent<SVGGElement>) => void;
}

function AtomNode({ atom, isDragSource, isTarget, onMouseDown }: AtomNodeProps) {
  return (
    <g onMouseDown={(e) => onMouseDown(atom, e)} style={{ cursor: "crosshair" }}>
      {/* Outer pulse ring */}
      {isDragSource && (
        <circle
          cx={atom.x} cy={atom.y}
          r={atom.radius + 20}
          fill="none"
          stroke={atom.electronColor}
          strokeWidth={1}
          opacity={0.25}
          strokeDasharray="4 4"
        />
      )}

      {/* Glow ring */}
      <circle
        cx={atom.x} cy={atom.y}
        r={atom.radius + 10}
        fill="none"
        stroke={isDragSource ? atom.electronColor : isTarget ? "#3b82f6" : "transparent"}
        strokeWidth={isDragSource ? 2 : 1.5}
        opacity={isDragSource ? 0.6 : isTarget ? 0.5 : 0}
        style={{ transition: "opacity 0.15s" }}
      />

      {/* Main atom */}
      <circle
        cx={atom.x} cy={atom.y}
        r={atom.radius}
        fill={atom.color}
        stroke={isDragSource ? atom.electronColor : isTarget ? "#3b82f6" : "#1e2d3d"}
        strokeWidth={isDragSource || isTarget ? 2 : 1.5}
        style={{ transition: "stroke 0.15s, filter 0.15s" }}
        filter={isDragSource ? `drop-shadow(0 0 8px ${atom.electronColor}80)` : "none"}
      />

      {/* Electron dots */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = atom.radius + 6;
        return (
          <circle
            key={deg}
            cx={atom.x + r * Math.cos(rad)}
            cy={atom.y + r * Math.sin(rad)}
            r={2.5}
            fill={atom.electronColor}
            opacity={isDragSource ? 0.9 : 0.2}
            style={{ transition: "opacity 0.15s" }}
          />
        );
      })}

      {/* Symbol */}
      <text
        x={atom.x} y={atom.y + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={atom.electronColor}
        fontSize={atom.radius * 0.65}
        fontWeight="900"
        fontFamily="Courier New, monospace"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {atom.symbol}
      </text>

      {/* Label below */}
      <text
        x={atom.x} y={atom.y + atom.radius + 22}
        textAnchor="middle"
        fill="#475569"
        fontSize={10.5}
        fontFamily="Courier New, monospace"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {atom.description}
      </text>
    </g>
  );
}

// ─── Steps sidebar data ───────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identify nucleophile", done: false },
  { id: 2, label: "Draw electron arrow C→Br", done: false },
  { id: 3, label: "Br⁻ departs as leaving group", done: false },
  { id: 4, label: "Carbocation forms", done: false },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MechanismBuilderPage() {
  const svgRef = useRef<SVGSVGElement>(null);

  const [dragFrom, setDragFrom] = useState<Atom | null>(null);
  const [dragPos, setDragPos] = useState<Vec2 | null>(null);
  const [targetAtom, setTargetAtom] = useState<Atom | null>(null);
  const [connections, setConnections] = useState<{ from: Atom; to: Atom; id: number }[]>([]);
  const [flash, setFlash] = useState<{ msg: string; type: "success" | "info" } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // ── Zustand: live ELO — award +15 when mechanism is fully completed
  const eloRating = useChemStore((s) => s.eloRating);
  const eloAwarded = useRef(false);

  const svgPoint = useCallback((e: MouseEvent | React.MouseEvent): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = 780 / rect.width;
    const scaleY = 480 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = (atom: Atom, e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    setDragFrom(atom);
    setDragPos(svgPoint(e));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragFrom) return;
    const pos = svgPoint(e);
    setDragPos(pos);
    const hit = ATOMS.find(a => a.id !== dragFrom.id && dist(pos, { x: a.x, y: a.y }) < a.radius + 16);
    setTargetAtom(hit ?? null);
  }, [dragFrom, svgPoint]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragFrom) return;
    const pos = svgPoint(e);
    const hit = ATOMS.find(a => a.id !== dragFrom.id && dist(pos, { x: a.x, y: a.y }) < a.radius + 16);
    if (hit) {
      setConnections(prev => [...prev, { from: dragFrom, to: hit, id: Date.now() }]);
      setFlash({ msg: `${dragFrom.label} → ${hit.label}: electron arrow drawn`, type: "success" });
      setTimeout(() => setFlash(null), 3000);
      // Mark step 2 done when C→Br drawn
      if (dragFrom.id === "carbon" && hit.id === "bromine") {
        setCompletedSteps(prev => Array.from(new Set([...prev, 1, 2])));
        setTimeout(() => setCompletedSteps(prev => Array.from(new Set([...prev, 3]))), 800);
        setTimeout(() => {
          setCompletedSteps(prev => {
            const next = Array.from(new Set([...prev, 4]));
            // Award ELO once on full completion
            if (next.length >= STEPS.length && !eloAwarded.current) {
              eloAwarded.current = true;
              useChemStore.setState((s) => ({ eloRating: s.eloRating + 15 }));
            }
            return next;
          });
        }, 1600);
      }
    }
    setDragFrom(null);
    setDragPos(null);
    setTargetAtom(null);
  }, [dragFrom, svgPoint]);

  // Attach mouse listeners globally when dragging
  const handleCanvasMouseDown = () => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUpGlobal);
  };

  const handleMouseUpGlobal = useCallback((e: MouseEvent) => {
    handleMouseUp(e);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUpGlobal);
  }, [handleMouseMove, handleMouseUp]);

  const lastConnection = connections.length > 0 ? connections[connections.length - 1] : null;
  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "Courier New, monospace" }}>

      {/* Top bar */}
      <div style={{
        background: "rgba(8,12,16,0.95)",
        borderBottom: "1px solid #1e2d3d",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#475569", fontSize: "0.75rem", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            ← Dashboard
          </Link>
          <span style={{ color: "#1e2d3d" }}>|</span>
          <span style={{ color: "#3b82f6", fontSize: "0.72rem", letterSpacing: "0.12em" }}>// MECHANISM BUILDER</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live ELO */}
          <span style={{ color: "#475569", fontSize: "0.65rem" }}>
            ⚡ <span style={{ color: "#00ff88", fontWeight: 700 }}>{eloRating}</span>
          </span>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#475569", fontSize: "0.65rem" }}>PROGRESS</span>
            <div style={{ width: 80, height: 4, background: "#1e2d3d", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #3b82f6, #00ff88)",
                transition: "width 0.5s ease",
                borderRadius: 2,
              }} />
            </div>
            <span style={{ color: "#3b82f6", fontSize: "0.65rem", fontWeight: 700 }}>{progress}%</span>
          </div>

          <button
            onClick={() => { setConnections([]); setCompletedSteps([]); }}
            style={{
              background: "transparent",
              border: "1px solid #1e2d3d",
              color: "#475569",
              padding: "5px 12px",
              borderRadius: 6,
              fontFamily: "Courier New, monospace",
              fontSize: "0.65rem",
              cursor: "pointer",
              letterSpacing: "0.08em",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#263245"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2d3d"; (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
          >
            RESET
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ── Left: Canvas ── */}
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <h1 style={{ color: "#e2e8f0", fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px", letterSpacing: "0.04em" }}>
              🧬 Mechanism <span style={{ color: "#3b82f6" }}>Builder</span>
            </h1>
            <p style={{ color: "#475569", fontSize: "0.76rem", margin: 0 }}>
              Click and drag from an atom to draw a curved electron arrow.{" "}
              <span style={{ color: "#00ff88" }}>C → Br</span> to attempt the mechanism.
            </p>
          </div>

          {/* Flash */}
          {flash && (
            <div
              className="animate-slide-down"
              style={{
                background: flash.type === "success" ? "rgba(0,255,136,0.08)" : "rgba(59,130,246,0.08)",
                border: `1px solid ${flash.type === "success" ? "rgba(0,255,136,0.3)" : "rgba(59,130,246,0.3)"}`,
                borderRadius: 8,
                padding: "9px 14px",
                color: flash.type === "success" ? "#00ff88" : "#3b82f6",
                fontSize: "0.78rem",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{flash.type === "success" ? "✓" : "ℹ"}</span>
              {flash.msg}
            </div>
          )}

          {/* SVG Canvas */}
          <div
            style={{
              background: "#0d1520",
              border: "1px solid #1e2d3d",
              borderRadius: 14,
              overflow: "hidden",
            }}
            onMouseDown={handleCanvasMouseDown}
          >
            <svg
              ref={svgRef}
              width="100%"
              viewBox="0 0 780 480"
              style={{ display: "block", userSelect: "none" }}
            >
              <defs>
                <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#1e2d3d" opacity="0.6" />
                </pattern>
                <filter id="glow-blue">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <rect width="780" height="480" fill="url(#dots)" />

              {/* Subtle center line hint */}
              <line x1="220" y1="240" x2="560" y2="240" stroke="#1e2d3d" strokeWidth="1" strokeDasharray="6 6" opacity="0.4" />
              <text x="390" y="212" textAnchor="middle" fill="#263245" fontSize="10" fontFamily="Courier New, monospace">
                SN2 MECHANISM
              </text>

              {/* Existing arrows */}
              {connections.map((conn) => {
                const cp = curveControlPoint({ x: conn.from.x, y: conn.from.y }, { x: conn.to.x, y: conn.to.y });
                const pathD = `M ${conn.from.x} ${conn.from.y} Q ${cp.x} ${cp.y} ${conn.to.x} ${conn.to.y}`;
                const head = arrowheadPath(cp, { x: conn.to.x, y: conn.to.y });
                const isLast = conn === lastConnection;
                return (
                  <g key={conn.id} opacity={isLast ? 1 : 0.3}>
                    <path d={pathD} fill="none" stroke={isLast ? "#3b82f6" : "#263245"} strokeWidth={isLast ? 2.5 : 1.5} strokeDasharray={isLast ? "none" : "4 3"} />
                    <path d={head} fill={isLast ? "#3b82f6" : "#263245"} />
                  </g>
                );
              })}

              {/* Live drag arrow */}
              {dragFrom && dragPos && (() => {
                const from = { x: dragFrom.x, y: dragFrom.y };
                const cp = curveControlPoint(from, dragPos);
                const head = arrowheadPath(cp, dragPos, 9);
                return (
                  <g>
                    <path d={`M ${from.x} ${from.y} Q ${cp.x} ${cp.y} ${dragPos.x} ${dragPos.y}`}
                      fill="none" stroke="#00ff88" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.9} />
                    <path d={head} fill="#00ff88" opacity={0.9} />
                    <circle cx={dragPos.x} cy={dragPos.y} r={5} fill="#00ff88" opacity={0.8} />
                    {/* Trailing glow dot */}
                    <circle cx={dragPos.x} cy={dragPos.y} r={10} fill="#00ff88" opacity={0.15} />
                  </g>
                );
              })()}

              {/* Atoms */}
              {ATOMS.map((atom) => (
                <AtomNode
                  key={atom.id}
                  atom={atom}
                  isDragSource={dragFrom?.id === atom.id}
                  isTarget={targetAtom?.id === atom.id}
                  onMouseDown={handleMouseDown}
                />
              ))}

              <text x="390" y="456" textAnchor="middle" fill="#263245" fontSize={9} fontFamily="Courier New, monospace">
                // DRAG FROM ATOM TO DRAW ELECTRON ARROW
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { color: "#00ff88", label: "Live drag (electrons moving)" },
              { color: "#3b82f6", label: "Completed arrow" },
              { color: "#263245", label: "Historical (dimmed)" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 20, height: 3, background: item.color, borderRadius: 2 }} />
                <span style={{ color: "#475569", fontSize: "0.68rem" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Steps + info ── */}
        <div style={{ width: 240, flexShrink: 0 }}>

          {/* Steps panel */}
          <div style={{
            background: "#111820",
            border: "1px solid #1e2d3d",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
          }}>
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1e2d3d",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ color: "#334155", fontSize: "0.62rem", letterSpacing: "0.14em" }}>// MECHANISM STEPS</span>
              <span style={{ color: "#3b82f6", fontSize: "0.62rem" }}>{completedSteps.length}/{STEPS.length}</span>
            </div>
            {STEPS.map((step, idx) => {
              const done = completedSteps.includes(step.id);
              return (
                <div
                  key={step.id}
                  style={{
                    padding: "11px 16px",
                    borderBottom: idx < STEPS.length - 1 ? "1px solid #0d1520" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: done ? "rgba(0,255,136,0.04)" : "transparent",
                    transition: "background 0.4s",
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 6,
                    background: done ? "rgba(0,255,136,0.15)" : "#0d1520",
                    border: `1px solid ${done ? "#00ff88" : "#1e2d3d"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.65rem",
                    color: done ? "#00ff88" : "#334155",
                    flexShrink: 0,
                    transition: "all 0.3s",
                  }}>
                    {done ? "✓" : step.id}
                  </div>
                  <span style={{
                    fontSize: "0.72rem",
                    color: done ? "#e2e8f0" : "#475569",
                    transition: "color 0.3s",
                    lineHeight: 1.4,
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tip panel */}
          <div style={{
            background: "rgba(59,130,246,0.05)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 10,
            padding: "14px 16px",
          }}>
            <div style={{ color: "#3b82f6", fontSize: "0.6rem", letterSpacing: "0.14em", marginBottom: 8 }}>// TIP</div>
            <p style={{ color: "#475569", fontSize: "0.72rem", margin: 0, lineHeight: 1.6 }}>
              In an <span style={{ color: "#3b82f6" }}>SN2</span> mechanism the nucleophile attacks the electrophilic carbon from the back side, causing inversion of configuration (<span style={{ color: "#e2e8f0" }}>Walden inversion</span>).
            </p>
          </div>

          {/* Score */}
          {completedSteps.length === STEPS.length && (
            <div
              className="animate-slide-up"
              style={{
                marginTop: 16,
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.3)",
                borderRadius: 10,
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>🎉</div>
              <div style={{ color: "#00ff88", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em" }}>MECHANISM COMPLETE</div>
              <div style={{ color: "#475569", fontSize: "0.68rem", marginTop: 4 }}>+25 ELO awarded</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
