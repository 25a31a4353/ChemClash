"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useChemStore } from "@/store/useChemStore";

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

const ATOMS: Atom[] = [
  { id: "carbon",  label: "Carbon",  symbol: "C",  x: 220, y: 240, radius: 48, color: "#f8fafc", electronColor: "#059669", description: "Electrophilic Carbon (δ+)" },
  { id: "bromine", label: "Bromine", symbol: "Br", x: 560, y: 240, radius: 52, color: "#fffbeb", electronColor: "#d97706", description: "Leaving Group (Br⁻)" },
];

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

interface AtomNodeProps {
  atom: Atom;
  isDragSource: boolean;
  isTarget: boolean;
  onMouseDown: (atom: Atom, e: React.MouseEvent<SVGGElement>) => void;
}

function AtomNode({ atom, isDragSource, isTarget, onMouseDown }: AtomNodeProps) {
  return (
    <g onMouseDown={(e) => onMouseDown(atom, e)} style={{ cursor: "crosshair" }}>
      {isDragSource && (
        <circle cx={atom.x} cy={atom.y} r={atom.radius + 20} fill="none"
          stroke={atom.electronColor} strokeWidth={1} opacity={0.4} strokeDasharray="4 4" />
      )}
      <circle cx={atom.x} cy={atom.y} r={atom.radius + 10} fill="none"
        stroke={isDragSource ? atom.electronColor : isTarget ? "#2563eb" : "transparent"}
        strokeWidth={isDragSource ? 2 : 1.5}
        opacity={isDragSource ? 0.5 : isTarget ? 0.4 : 0}
        style={{ transition: "opacity 0.15s" }} />
      <circle cx={atom.x} cy={atom.y} r={atom.radius}
        fill={atom.color}
        stroke={isDragSource ? atom.electronColor : isTarget ? "#2563eb" : "#cbd5e1"}
        strokeWidth={isDragSource || isTarget ? 2 : 1.5}
        style={{ transition: "stroke 0.15s" }} />
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = atom.radius + 6;
        return (
          <circle key={deg} cx={atom.x + r * Math.cos(rad)} cy={atom.y + r * Math.sin(rad)}
            r={2.5} fill={atom.electronColor}
            opacity={isDragSource ? 0.9 : 0.25} style={{ transition: "opacity 0.15s" }} />
        );
      })}
      <text x={atom.x} y={atom.y + 1} textAnchor="middle" dominantBaseline="middle"
        fill={atom.electronColor} fontSize={atom.radius * 0.65} fontWeight="900"
        fontFamily="ui-monospace, monospace" style={{ userSelect: "none", pointerEvents: "none" }}>
        {atom.symbol}
      </text>
      <text x={atom.x} y={atom.y + atom.radius + 22} textAnchor="middle"
        fill="#64748b" fontSize={10.5} fontFamily="ui-monospace, monospace"
        style={{ userSelect: "none", pointerEvents: "none" }}>
        {atom.description}
      </text>
    </g>
  );
}

const STEPS = [
  { id: 1, label: "Identify nucleophile" },
  { id: 2, label: "Draw electron arrow C→Br" },
  { id: 3, label: "Br⁻ departs as leaving group" },
  { id: 4, label: "Carbocation forms" },
];

export default function MechanismBuilderPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragFrom, setDragFrom] = useState<Atom | null>(null);
  const [dragPos, setDragPos] = useState<Vec2 | null>(null);
  const [targetAtom, setTargetAtom] = useState<Atom | null>(null);
  const [connections, setConnections] = useState<{ from: Atom; to: Atom; id: number }[]>([]);
  const [flash, setFlash] = useState<{ msg: string; type: "success" | "info" } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const eloRating = useChemStore((s) => s.eloRating);
  const eloAwarded = useRef(false);

  const svgPoint = useCallback((e: MouseEvent | React.MouseEvent): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (780 / rect.width),
      y: (e.clientY - rect.top) * (480 / rect.height),
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
      if (dragFrom.id === "carbon" && hit.id === "bromine") {
        setCompletedSteps(prev => Array.from(new Set([...prev, 1, 2])));
        setTimeout(() => setCompletedSteps(prev => Array.from(new Set([...prev, 3]))), 800);
        setTimeout(() => {
          setCompletedSteps(prev => {
            const next = Array.from(new Set([...prev, 4]));
            if (next.length >= STEPS.length && !eloAwarded.current) {
              eloAwarded.current = true;
              useChemStore.setState((s) => ({ eloRating: s.eloRating + 15 }));
            }
            return next;
          });
        }, 1600);
      }
    }
    setDragFrom(null); setDragPos(null); setTargetAtom(null);
  }, [dragFrom, svgPoint]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-blue-600 text-xs font-semibold tracking-wide uppercase">Mechanism Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">⚡ <span className="text-emerald-600 font-bold">{eloRating}</span></span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Progress</span>
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-blue-600 text-xs font-bold">{progress}%</span>
          </div>
          <button
            onClick={() => { setConnections([]); setCompletedSteps([]); }}
            className="border border-slate-200 bg-white text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:text-slate-700 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 flex gap-5 items-start flex-wrap">
        {/* Canvas area */}
        <div className="flex-1 min-w-0" style={{ minWidth: 320 }}>
          <div className="mb-4">
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              🧬 Mechanism <span className="text-blue-600">Builder</span>
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Click and drag from an atom to draw a curved electron arrow.{" "}
              <span className="text-emerald-600 font-semibold">C → Br</span> to attempt the mechanism.
            </p>
          </div>

          {flash && (
            <div className={`animate-slide-down rounded-xl border px-4 py-2.5 text-sm font-medium mb-3 flex items-center gap-2 ${
              flash.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"
            }`}>
              <span>{flash.type === "success" ? "✓" : "ℹ"}</span>
              {flash.msg}
            </div>
          )}

          {/* SVG Canvas */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" onMouseDown={handleCanvasMouseDown}>
            <svg ref={svgRef} width="100%" viewBox="0 0 780 480" style={{ display: "block", userSelect: "none" }}>
              <defs>
                <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#e2e8f0" opacity="0.8" />
                </pattern>
              </defs>
              <rect width="780" height="480" fill="url(#dots)" />
              <line x1="220" y1="240" x2="560" y2="240" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6 6" opacity="0.7" />
              <text x="390" y="212" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="ui-monospace, monospace">
                SN2 MECHANISM
              </text>

              {connections.map((conn) => {
                const cp = curveControlPoint({ x: conn.from.x, y: conn.from.y }, { x: conn.to.x, y: conn.to.y });
                const pathD = `M ${conn.from.x} ${conn.from.y} Q ${cp.x} ${cp.y} ${conn.to.x} ${conn.to.y}`;
                const head = arrowheadPath(cp, { x: conn.to.x, y: conn.to.y });
                const isLast = conn === lastConnection;
                return (
                  <g key={conn.id} opacity={isLast ? 1 : 0.3}>
                    <path d={pathD} fill="none" stroke={isLast ? "#2563eb" : "#94a3b8"} strokeWidth={isLast ? 2.5 : 1.5} strokeDasharray={isLast ? "none" : "4 3"} />
                    <path d={head} fill={isLast ? "#2563eb" : "#94a3b8"} />
                  </g>
                );
              })}

              {dragFrom && dragPos && (() => {
                const from = { x: dragFrom.x, y: dragFrom.y };
                const cp = curveControlPoint(from, dragPos);
                const head = arrowheadPath(cp, dragPos, 9);
                return (
                  <g>
                    <path d={`M ${from.x} ${from.y} Q ${cp.x} ${cp.y} ${dragPos.x} ${dragPos.y}`}
                      fill="none" stroke="#059669" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.9} />
                    <path d={head} fill="#059669" opacity={0.9} />
                    <circle cx={dragPos.x} cy={dragPos.y} r={5} fill="#059669" opacity={0.8} />
                    <circle cx={dragPos.x} cy={dragPos.y} r={12} fill="#059669" opacity={0.12} />
                  </g>
                );
              })()}

              {ATOMS.map((atom) => (
                <AtomNode key={atom.id} atom={atom}
                  isDragSource={dragFrom?.id === atom.id}
                  isTarget={targetAtom?.id === atom.id}
                  onMouseDown={handleMouseDown} />
              ))}

              <text x="390" y="456" textAnchor="middle" fill="#94a3b8" fontSize={9} fontFamily="ui-monospace, monospace">
                // DRAG FROM ATOM TO DRAW ELECTRON ARROW
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex gap-5 mt-3 flex-wrap">
            {[
              { color: "#059669", label: "Live drag (electrons moving)" },
              { color: "#2563eb", label: "Completed arrow" },
              { color: "#cbd5e1", label: "Historical (dimmed)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-5 h-0.5 rounded" style={{ background: item.color }} />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps sidebar */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Mechanism Steps</span>
              <span className="text-blue-600 text-xs font-bold">{completedSteps.length}/{STEPS.length}</span>
            </div>
            {STEPS.map((step, idx) => {
              const done = completedSteps.includes(step.id);
              return (
                <div key={step.id}
                  className={`px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
                    idx < STEPS.length - 1 ? "border-b border-slate-100" : ""
                  } ${done ? "bg-emerald-50/60" : "bg-white"}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 border ${
                    done ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    {done ? "✓" : step.id}
                  </div>
                  <span className={`text-sm transition-colors duration-300 leading-snug ${done ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tip box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-blue-600 text-xs font-semibold tracking-wide uppercase mb-2">Tip</div>
            <p className="text-sm text-slate-600 leading-relaxed m-0">
              In an <span className="text-blue-600 font-semibold">SN2</span> mechanism the nucleophile attacks from the back side, causing inversion of configuration (<span className="text-slate-800 font-medium">Walden inversion</span>).
            </p>
          </div>

          {completedSteps.length === STEPS.length && (
            <div className="animate-slide-up bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-emerald-700 text-sm font-bold tracking-wide">Mechanism Complete</div>
              <div className="text-slate-500 text-xs mt-1">+25 ELO awarded</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
