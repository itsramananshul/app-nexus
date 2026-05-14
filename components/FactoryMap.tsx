"use client";

import createGlobe, { type COBEOptions } from "cobe";
import { useEffect, useMemo, useRef, useState } from "react";

// cobe v2's exported `COBEOptions` is missing `onRender` despite the runtime
// supporting it. Augment locally.
type CobeOptsWithRender = COBEOptions & {
  onRender: (state: Record<string, number>) => void;
};
import type { NodeConfig } from "@/lib/nodes";
import {
  NODE_TYPE_EMOJI,
  primaryMetricFor,
  secondaryMetricFor,
} from "@/lib/nodes";
import type { NodeStatus } from "@/lib/types";

interface FactoryMapProps {
  nodes: NodeConfig[];
  statuses: Map<string, NodeStatus>;
  collapsingNodeIds: Set<string>;
  isLoadingKeys?: boolean;
  history?: Map<string, number[]>;
}

// ─── Plant catalog ────────────────────────────────────────────────────────
// Real Ford manufacturing sites. Some have monitored Nexus nodes attached,
// others are shown on the globe for context (engine plants etc).
interface Plant {
  id: PlantId;
  name: string;
  sub: string;
  lat: number;
  lon: number;
}

type PlantId =
  | "dearborn"
  | "chicago"
  | "kansas-city"
  | "louisville"
  | "cleveland"
  | "romeo"
  | "flat-rock"
  | "nashville";

const PLANTS: Plant[] = [
  { id: "dearborn", name: "Dearborn, MI", sub: "Ford HQ · Rouge Complex", lat: 42.31, lon: -83.18 },
  { id: "chicago", name: "Chicago, IL", sub: "Chicago Assembly", lat: 41.85, lon: -87.75 },
  { id: "kansas-city", name: "Kansas City, MO", sub: "Kansas City Assembly", lat: 39.10, lon: -94.58 },
  { id: "louisville", name: "Louisville, KY", sub: "Louisville Truck Plant", lat: 38.20, lon: -85.65 },
  { id: "cleveland", name: "Cleveland, OH", sub: "Cleveland Engine", lat: 41.50, lon: -81.70 },
  { id: "romeo", name: "Romeo, MI", sub: "Romeo Engine Plant", lat: 42.80, lon: -83.01 },
  { id: "flat-rock", name: "Flat Rock, MI", sub: "Flat Rock Assembly", lat: 42.10, lon: -83.28 },
  { id: "nashville", name: "Nashville, TN", sub: "SE Distribution Hub", lat: 36.17, lon: -86.78 },
];

const NODE_TO_PLANT: Record<string, PlantId> = {
  "f1-product": "dearborn",
  "f1-materials": "dearborn",
  "f2-product": "louisville",
  "f2-materials": "louisville",
  "f3-product": "kansas-city",
  "f3-materials": "kansas-city",
  "f4-product": "chicago",
  "f4-materials": "chicago",
  "w1-product": "dearborn",
  "w2-product": "nashville",
  "corp-orders": "dearborn",
  "corp-shipments": "dearborn",
  "corp-support": "dearborn",
  "corp-erp": "dearborn",
};

type PlantHealth = "ok" | "degraded" | "critical" | "unknown";

// Cobe marker sizes per status (normalized 0–1 units cobe accepts)
const SIZE_BY_HEALTH: Record<PlantHealth, number> = {
  ok: 0.06,
  degraded: 0.08,
  critical: 0.1,
  unknown: 0.04,
};

const COLOR_BY_HEALTH: Record<PlantHealth, string> = {
  ok: "#22d3ee", // cyan-400
  degraded: "#f59e0b", // amber-500
  critical: "#ef4444", // rose-500
  unknown: "#64748b", // slate-500
};

// ─── lat/lon → screen projection (matches cobe's orthographic globe) ──────
function toXY(
  lat: number,
  lon: number,
  phi: number,
  size: number,
): { x: number; y: number } | null {
  const lambda = (lon * Math.PI) / 180;
  const phi2 = (lat * Math.PI) / 180;
  const x = Math.cos(phi2) * Math.sin(lambda - phi);
  const y = Math.sin(phi2);
  const z = Math.cos(phi2) * Math.cos(lambda - phi);
  if (z < 0) return null; // behind the globe
  return {
    x: (x * 0.5 + 0.5) * size,
    y: (1 - (y * 0.5 + 0.5)) * size,
  };
}

interface PlantSummary {
  plant: Plant;
  health: PlantHealth;
  totalNodes: number;
  okCount: number;
  degradedCount: number;
  criticalCount: number;
  noKeyCount: number;
  nodes: NodeConfig[];
}

export function FactoryMap({
  nodes,
  statuses,
  collapsingNodeIds,
  isLoadingKeys = false,
  history,
}: FactoryMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const phiRef = useRef(0);
  const positionsRef = useRef<Map<PlantId, { x: number; y: number } | null>>(
    new Map(),
  );
  const [tick, setTick] = useState(0);
  const [hoveredPlantId, setHoveredPlantId] = useState<PlantId | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // ── Compute per-plant health summary ───────────────────────────────────
  const summaries = useMemo<Map<PlantId, PlantSummary>>(() => {
    const map = new Map<PlantId, PlantSummary>();
    for (const plant of PLANTS) {
      map.set(plant.id, {
        plant,
        health: "unknown",
        totalNodes: 0,
        okCount: 0,
        degradedCount: 0,
        criticalCount: 0,
        noKeyCount: 0,
        nodes: [],
      });
    }
    for (const node of nodes) {
      const plantId = NODE_TO_PLANT[node.id];
      if (!plantId) continue;
      const s = map.get(plantId);
      if (!s) continue;
      s.totalNodes += 1;
      s.nodes.push(node);
      const status = statuses.get(node.id);
      if (collapsingNodeIds.has(node.id)) {
        s.criticalCount += 1;
      } else if (!node.apiKey) {
        s.noKeyCount += 1;
      } else if (status?.health === "ok") {
        s.okCount += 1;
      } else if (status?.health === "degraded") {
        s.degradedCount += 1;
      } else if (status?.health === "unreachable") {
        s.criticalCount += 1;
      }
    }
    for (const s of map.values()) {
      if (s.totalNodes === 0) {
        s.health = "unknown";
      } else if (s.criticalCount > 0) {
        s.health = "critical";
      } else if (s.degradedCount > 0) {
        s.health = "degraded";
      } else if (s.okCount > 0) {
        s.health = "ok";
      } else {
        s.health = "unknown";
      }
    }
    return map;
  }, [nodes, statuses, collapsingNodeIds]);

  // ── Build cobe markers list ────────────────────────────────────────────
  // cobe's marker color is single global — we set it cyan and overlay real
  // per-status dots in HTML on top. Marker SIZE varies by health to give
  // some visual cue on the globe itself.
  const markers = useMemo(() => {
    return PLANTS.map((p) => {
      const s = summaries.get(p.id);
      const size = SIZE_BY_HEALTH[s?.health ?? "unknown"];
      return { location: [p.lat, p.lon] as [number, number], size };
    });
  }, [summaries]);

  // ── Globe lifecycle ────────────────────────────────────────────────────
  // We rebuild the globe whenever the marker set/health changes so cobe
  // picks up the new sizes. This is uncommon (only on poll updates) so cost
  // is acceptable.
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let frameCounter = 0;
    const opts: CobeOptsWithRender = {
      devicePixelRatio: 2,
      width: 800,
      height: 800,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.05, 0.05, 0.05],
      markerColor: [0.13, 0.83, 0.94], // cyan
      glowColor: [0.05, 0.2, 0.3],
      markers,
      onRender(state: Record<string, number>) {
        state.phi = phiRef.current;
        phiRef.current += 0.003;

        // Recompute marker screen positions ~10× per second; setting state
        // every frame is wasteful.
        frameCounter++;
        if (frameCounter % 6 === 0) {
          const size = canvas.offsetWidth || 1;
          for (const p of PLANTS) {
            positionsRef.current.set(
              p.id,
              toXY(p.lat, p.lon, phiRef.current, size),
            );
          }
          setTick((t) => (t + 1) % 1_000_000);
        }
      },
    };
    const globe = createGlobe(canvas, opts);

    return () => {
      globe.destroy();
    };
  }, [markers]);

  // ── Mouse → nearest visible marker (within 20px) ───────────────────────
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: mx, y: my });

    let best: { id: PlantId; dist: number } | null = null;
    for (const [id, pos] of positionsRef.current.entries()) {
      if (!pos) continue;
      const dx = pos.x - mx;
      const dy = pos.y - my;
      const dist = Math.hypot(dx, dy);
      if (dist <= 20 && (!best || dist < best.dist)) {
        best = { id, dist };
      }
    }
    setHoveredPlantId(best?.id ?? null);
  }

  function handleMouseLeave() {
    setHoveredPlantId(null);
    setMousePos(null);
  }

  const hovered = hoveredPlantId ? summaries.get(hoveredPlantId) : null;

  return (
    <section className="relative h-full overflow-hidden rounded-xl border border-cyan-500/10 bg-[#070b16]/60 p-3">
      {/* Title overlay — top-left */}
      <div className="pointer-events-none absolute left-5 top-4 z-20">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
          Global Plant Network
        </h2>
        <p className="text-[10px] text-slate-500">
          {isLoadingKeys ? (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-live" />
              Loading configuration…
            </span>
          ) : (
            <>
              <span className="font-mono">{nodes.length}</span> monitored ·
              <span className="ml-1 font-mono">{PLANTS.length}</span> Ford sites
            </>
          )}
        </p>
      </div>

      {/* Legend — bottom-right */}
      <div className="pointer-events-none absolute bottom-4 right-5 z-20">
        <ul className="flex items-center gap-2 rounded-md border border-slate-800/60 bg-[#040711]/80 px-2 py-1 text-[9px] uppercase tracking-wider text-slate-500 backdrop-blur">
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            OK
          </li>
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Degraded
          </li>
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Critical
          </li>
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            No data
          </li>
        </ul>
      </div>

      {/* Globe container — square, centered, fills available space */}
      <div
        ref={wrapperRef}
        className="relative mx-auto flex h-full w-full items-center justify-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative"
          style={{
            aspectRatio: "1 / 1",
            width: "100%",
            height: "100%",
            maxWidth: "min(100%, 100cqh)",
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            style={{
              width: "100%",
              height: "100%",
              cursor: hoveredPlantId ? "pointer" : "default",
            }}
            aria-label="Ford plant globe"
          />

          {/* HTML marker overlay — one dot per visible plant, colored by health */}
          {/* `tick` re-renders force position refresh */}
          <div className="pointer-events-none absolute inset-0" data-tick={tick}>
            {PLANTS.map((plant) => {
              const pos = positionsRef.current.get(plant.id);
              if (!pos) return null;
              const summary = summaries.get(plant.id);
              const color = COLOR_BY_HEALTH[summary?.health ?? "unknown"];
              const isHovered = hoveredPlantId === plant.id;
              const isCritical = summary?.health === "critical";
              return (
                <div
                  key={plant.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    zIndex: isHovered ? 10 : 5,
                  }}
                >
                  {/* Ripple for critical/collapsing plants */}
                  {isCritical ? (
                    <>
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          width: 28,
                          height: 28,
                          background: "rgba(239,68,68,0.3)",
                          animation: "ripple 1.8s ease-out infinite",
                        }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          width: 28,
                          height: 28,
                          background: "rgba(239,68,68,0.2)",
                          animation: "ripple 1.8s ease-out 0.6s infinite",
                        }}
                      />
                    </>
                  ) : null}

                  {/* Pulse halo */}
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      background: color,
                      opacity: 0.25,
                    }}
                  />
                  {/* Solid dot */}
                  <span
                    className={`relative block rounded-full ring-2 ring-[#040711] transition-transform ${isHovered ? "scale-125" : ""}`}
                    style={{
                      width: 8,
                      height: 8,
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />

                  {/* Label */}
                  <div
                    className={`pointer-events-none absolute left-1/2 top-3 mt-1.5 -translate-x-1/2 whitespace-nowrap text-center transition-opacity ${isHovered ? "opacity-100" : "opacity-90"}`}
                  >
                    <p
                      className="text-[10px] font-semibold text-white"
                      style={{
                        textShadow:
                          "0 1px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.7)",
                      }}
                    >
                      {plant.name}
                    </p>
                    <p
                      className="text-[9px] text-slate-400"
                      style={{
                        textShadow:
                          "0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)",
                      }}
                    >
                      {plant.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hover tooltip card */}
          {hovered && mousePos ? (
            <HoverCard
              summary={hovered}
              statuses={statuses}
              collapsingNodeIds={collapsingNodeIds}
              history={history}
              mousePos={mousePos}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Hover card ───────────────────────────────────────────────────────────
interface HoverCardProps {
  summary: PlantSummary;
  statuses: Map<string, NodeStatus>;
  collapsingNodeIds: Set<string>;
  history: Map<string, number[]> | undefined;
  mousePos: { x: number; y: number };
}

function HoverCard({
  summary,
  statuses,
  collapsingNodeIds,
  history,
  mousePos,
}: HoverCardProps) {
  const { plant, health, totalNodes } = summary;
  const healthPct =
    totalNodes === 0
      ? null
      : Math.round((summary.okCount / totalNodes) * 100);

  const stateColor =
    health === "critical"
      ? "text-rose-300 border-rose-500/50 bg-rose-500/10"
      : health === "degraded"
        ? "text-amber-300 border-amber-500/50 bg-amber-500/10"
        : health === "ok"
          ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/10"
          : "text-slate-300 border-slate-600 bg-slate-800/40";

  return (
    <div
      role="tooltip"
      className="alert-enter pointer-events-none absolute z-30 w-64 rounded-lg border border-cyan-500/30 bg-[#0a1322]/95 p-3 shadow-2xl backdrop-blur"
      style={{
        left: Math.min(mousePos.x + 16, 99999),
        top: Math.max(mousePos.y - 8, 0),
        transform:
          mousePos.x > 400
            ? "translateX(calc(-100% - 32px))"
            : undefined,
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {plant.sub}
      </p>
      <p className="text-sm font-semibold text-slate-100">{plant.name}</p>

      <div
        className={`mt-2 inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-inset ${stateColor}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {health.toUpperCase()}
        {healthPct !== null ? ` · ${healthPct}%` : ""}
      </div>

      {totalNodes === 0 ? (
        <p className="mt-3 text-[11px] text-slate-500">
          No monitored systems at this site.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.nodes.slice(0, 6).map((node) => {
            const s = statuses.get(node.id);
            const isCollapsing = collapsingNodeIds.has(node.id);
            const isNoKey = !node.apiKey;
            const dot = isCollapsing
              ? "bg-rose-500"
              : isNoKey
                ? "bg-slate-500"
                : s?.health === "ok"
                  ? "bg-emerald-400"
                  : s?.health === "degraded"
                    ? "bg-amber-400"
                    : s?.health === "unreachable"
                      ? "bg-rose-500"
                      : "bg-slate-500";
            const metric = s?.details
              ? primaryMetricFor(node.type, s.details)
              : { value: null };
            const secondary = s?.details
              ? secondaryMetricFor(node.type, s.details)
              : null;
            return (
              <li
                key={node.id}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  <span aria-hidden className="text-[12px] leading-none">
                    {NODE_TYPE_EMOJI[node.type]}
                  </span>
                  <span className="truncate text-slate-200">{node.label}</span>
                </span>
                <span className="shrink-0 font-mono tabular-nums text-cyan-300">
                  {typeof metric.value === "number" ? metric.value : "—"}
                  {secondary && typeof secondary.value === "number"
                    ? ` · ${secondary.value}`
                    : ""}
                </span>
              </li>
            );
          })}
          {summary.nodes.length > 6 ? (
            <li className="text-[10px] text-slate-500">
              + {summary.nodes.length - 6} more nodes
            </li>
          ) : null}
        </ul>
      )}

      {history && summary.nodes.length > 0 ? (
        <p className="mt-2 text-[9px] uppercase tracking-wider text-slate-500">
          Hover to inspect · Click any node row in the network view for trends
        </p>
      ) : null}
    </div>
  );
}
