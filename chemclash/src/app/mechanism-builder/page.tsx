"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2 {
  x: number;
  y: number;
}

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
    color: "#1a1a2e",
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
    color: "#1a0a00",
    electronColor: "#f59e0b",
    description: "Leaving Group (Br⁻)",
  },
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Quadratic bezier midpoint offset for the curved arrow */
function curveControlPoint(from: Vec2, to: Vec2): Vec2 {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Perpendicular offset
  return { x: mx - dy * 0.3, y: my + dx * 0.3 };
}

/** Arrowhead path at the tip of a bezier curve */
function arrowheadPath(cp: Vec2, to: Vec2, size = 10): string {
  const angle = Math.atan2(to.y - cp.y, to.x - cp.x);
  const a1 = angle + (2.8);
  const a2 = angle - (2.8);
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
  const glowOpacity = isDragSource ? 0.5 : isTarget ? 0.4 : 0.0;
  const glowColor = isDragSource ? atom.electronColor : "#3b82f6";

  return (
    <g
      onMouseDown={(e) => onMouseDown(atom, e)}
      style={{ cursor: "crosshair" }}
    >
      {/* Glow ring */}
      <circle
        cx={atom.x}
        cy={atom.y}
        r={atom.radius + 10}
        fill="none"
        stroke={glowColor}
        strokeWidth={2}
        opacity={glowOpacity}
        style={{ transition: "opacity 0.15s" }}
      />

      {/* Atom circle */}
      <circle
        cx={atom.x}
        cy={atom.y}
        r={atom.radius}
        fill={atom.color}
        stroke={isDragSource ? atom.electronColor : isTarget ? "#3b82f6" : "#374151"}
        strokeWidth={isDragSource || isTarget ? 2 : 1.5}
        style={{ transition: "stroke 0.15s" }}
      />

      {/* Electron dot decoration */}
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
            opacity={isDragSource ? 0.9 : 0.25}
            style={{ transition: "opacity 0.15s" }}
          />
        );
      })}

      {/* Symbol */}
      <text
        x={atom.x}
        y={atom.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={atom.electronColor}
        fontSize={atom.radius * 0.65}
        fontWeight="800"
        fontFamily="Courier New, monospace"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {atom.symbol}
      </text>

      {/* Label below */}
      <text
        x={atom.x}
        y={atom.y + atom.radius + 22}
        textAnchor="middle"
        fill="#6b7280"
        fontSize={11}
        fontFamily="Courier New, monospace"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {atom.description}
      </text>
    </g>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MechanismBuilderPage() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag state
  const [dragFrom, setDragFrom] = useState<Atom | null>(null);
  const [dragPos, setDragPos] = useState<Vec2 | null>(null);
  const [targetAtom, setTargetAtom] = useState<Atom | null>(null);

  // Connection state
  const [connections, setConnections] = useState<
    { from: Atom; to: Atom; id: number }[]
  >([]);
  const [flash, setFlash] = useState<string | null>(null);

  // ── SVG coordinate helper
  const svgPoint = useCallback((e: MouseEvent | React.MouseEvent): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // ── Drag start
  const handleMouseDown = (atom: Atom, e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    setDragFrom(atom);
    setDragPos(svgPoint(e));
  };

  // ── Drag move + target detection
  useEffect(() => {
    if (!dragFrom) return;

    const onMove = (e: MouseEvent) => {
      const pos = svgPoint(e);
      setDragPos(pos);

      // Detect hover over another atom
      const hit = ATOMS.find(
        (a) => a.id !== dragFrom.id && dist(pos, { x: a.x, y: a.y }) < a.radius + 16
      );
      setTargetAtom(hit ?? null);
    };

    const onUp = (e: MouseEvent) => {
      const pos = svgPoint(e);
      const hit = ATOMS.find(
        (a) => a.id !== dragFrom.id && dist(pos, { x: a.x, y: a.y }) < a.radius + 16
      );

      if (hit) {
        console.log("Mechanism Attempted:", dragFrom.label, "→", hit.label);
        setConnections((prev) => [
          ...prev,
          { from: dragFrom, to: hit, id: Date.now() },
        ]);
        setFlash(`Mechanism Attempted: ${dragFrom.label} → ${hit.label}`);
        setTimeout(() => setFlash(null), 2800);
      }

      setDragFrom(null);
      setDragPos(null);
      setTargetAtom(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragFrom, svgPoint]);

  // ── Bond line between connected atoms (last connection only renders as a bond)
  const lastConnection =
    connections.length > 0 ? connections[connections.length - 1] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Courier New, monospace",
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 780, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Link href="/" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none" }}>
            ← Dashboard
          </Link>
          <button
            onClick={() => setConnections([])}
            style={{
              background: "transparent",
              border: "1px solid #374151",
              color: "#6b7280",
              padding: "4px 12px",
              borderRadius: 6,
              fontFamily: "Courier New, monospace",
              fontSize: "0.72rem",
              cursor: "pointer",
              letterSpacing: "0.08em",
            }}
          >
            RESET CANVAS
          </button>
        </div>
        <h1 style={{ color: "#ffffff", fontSize: "1.4rem", fontWeight: 800, margin: "0 0 4px", letterSpacing: "0.05em" }}>
          🧬 Mechanism{" "}
          <span style={{ color: "#3b82f6" }}>Builder</span>
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.78rem", margin: 0 }}>
          Click and drag from an atom to draw a curved electron arrow. Connect{" "}
          <span style={{ color: "#00ff88" }}>Carbon → Bromine</span> to attempt
          the mechanism.
        </p>
      </div>

      {/* Flash message */}
      {flash && (
        <div
          style={{
            width: "100%",
            maxWidth: 780,
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.4)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "#3b82f6",
            fontSize: "0.82rem",
            marginBottom: 12,
            letterSpacing: "0.05em",
          }}
        >
          ✓ <strong>Mechanism Attempted</strong> — {flash.replace("Mechanism Attempted: ", "")}
        </div>
      )}

      {/* Canvas */}
      <div
        style={{
          width: "100%",
          maxWidth: 780,
          background: "#111111",
          border: "1px solid #1f2937",
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Grid background */}
        <svg
          ref={svgRef}
          width="100%"
          viewBox="0 0 780 480"
          style={{ display: "block", userSelect: "none" }}
        >
          {/* Dot-grid */}
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#1f2937" />
            </pattern>
            {/* Arrow marker (SVG marker is used for the bond line, curved uses manual path) */}
          </defs>
          <rect width="780" height="480" fill="url(#dots)" />

          {/* ── Existing bond lines ── */}
          {connections.map((conn) => {
            const cp = curveControlPoint(
              { x: conn.from.x, y: conn.from.y },
              { x: conn.to.x, y: conn.to.y }
            );
            const pathD = `M ${conn.from.x} ${conn.from.y} Q ${cp.x} ${cp.y} ${conn.to.x} ${conn.to.y}`;
            const head = arrowheadPath(cp, { x: conn.to.x, y: conn.to.y });
            return (
              <g key={conn.id} opacity={conn === lastConnection ? 1 : 0.35}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={conn === lastConnection ? "#3b82f6" : "#374151"}
                  strokeWidth={conn === lastConnection ? 2.5 : 1.5}
                  strokeDasharray={conn === lastConnection ? "none" : "4 3"}
                />
                <path
                  d={head}
                  fill={conn === lastConnection ? "#3b82f6" : "#374151"}
                />
              </g>
            );
          })}

          {/* ── Live drag arrow ── */}
          {dragFrom && dragPos && (() => {
            const from = { x: dragFrom.x, y: dragFrom.y };
            const to = dragPos;
            const cp = curveControlPoint(from, to);
            const head = arrowheadPath(cp, to, 9);
            return (
              <g>
                <path
                  d={`M ${from.x} ${from.y} Q ${cp.x} ${cp.y} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  opacity={0.85}
                />
                <path d={head} fill="#00ff88" opacity={0.85} />
                {/* Electron dot travelling along */}
                <circle cx={to.x} cy={to.y} r={4} fill="#00ff88" opacity={0.9} />
              </g>
            );
          })()}

          {/* ── Atoms ── */}
          {ATOMS.map((atom) => (
            <AtomNode
              key={atom.id}
              atom={atom}
              isDragSource={dragFrom?.id === atom.id}
              isTarget={targetAtom?.id === atom.id}
              onMouseDown={handleMouseDown}
            />
          ))}

          {/* Canvas label */}
          <text x="390" y="455" textAnchor="middle" fill="#374151" fontSize={10} fontFamily="Courier New, monospace">
            // MECHANISM CANVAS — drag from any atom to draw an electron arrow
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          width: "100%",
          maxWidth: 780,
          marginTop: 16,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {[
          { color: "#00ff88", label: "Active drag arrow (electrons moving)" },
          { color: "#3b82f6", label: "Completed electron arrow / bond" },
          { color: "#6b7280", label: "Historical arrows (dimmed)" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 3,
                background: item.color,
                borderRadius: 2,
              }}
            />
            <span style={{ color: "#6b7280", fontSize: "0.7rem" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
