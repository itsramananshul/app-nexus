"use client";

import { useMemo, useState } from "react";
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

type CityKey =
  | "dearborn"
  | "chicago"
  | "louisville"
  | "nashville"
  | "kansascity";

interface CityInfo {
  x: number;
  y: number;
  label: string;
  sublabel: string;
  state: string;
}

const CITIES: Record<CityKey, CityInfo> = {
  dearborn: {
    x: 745,
    y: 168,
    label: "Dearborn, MI",
    sublabel: "Ford HQ · Rouge Complex",
    state: "MI",
  },
  chicago: {
    x: 565,
    y: 215,
    label: "Chicago, IL",
    sublabel: "Chicago Assembly",
    state: "IL",
  },
  louisville: {
    x: 625,
    y: 290,
    label: "Louisville, KY",
    sublabel: "Kentucky Truck Plant",
    state: "KY",
  },
  nashville: {
    x: 595,
    y: 355,
    label: "Nashville, TN",
    sublabel: "SE Distribution Hub",
    state: "TN",
  },
  kansascity: {
    x: 415,
    y: 275,
    label: "Kansas City, MO",
    sublabel: "Kansas City Assembly",
    state: "MO",
  },
};

const NODE_TO_CITY: Record<string, CityKey> = {
  "f1-product": "dearborn",
  "f1-materials": "dearborn",
  "f2-product": "louisville",
  "f2-materials": "louisville",
  "f3-product": "kansascity",
  "f3-materials": "kansascity",
  "f4-product": "chicago",
  "f4-materials": "chicago",
  "w1-product": "dearborn",
  "w2-product": "nashville",
  "corp-orders": "dearborn",
  "corp-shipments": "dearborn",
  "corp-support": "dearborn",
  "corp-erp": "dearborn",
};

// Animated flow lines between cities
const FLOWS: Array<{ from: CityKey; to: CityKey }> = [
  { from: "chicago", to: "dearborn" },
  { from: "louisville", to: "nashville" },
  { from: "kansascity", to: "dearborn" },
  { from: "louisville", to: "dearborn" },
  { from: "chicago", to: "nashville" },
  { from: "nashville", to: "dearborn" },
];

// Stylized contiguous US outline (intentionally simplified for the demo).
// viewBox 0 0 1000 600. The shape suggests the US silhouette so the audience
// recognises the geography without it being a literal cartographic map.
const US_OUTLINE = `
  M 90 220
  C 95 160, 145 140, 220 130
  L 540 110
  L 770 100
  C 830 100, 870 130, 880 175
  L 880 215
  C 870 245, 845 255, 845 290
  L 880 360
  C 905 405, 895 470, 855 500
  L 815 510
  Q 790 505, 765 485
  L 690 470
  Q 605 480, 525 465
  L 425 470
  Q 360 475, 320 455
  L 240 425
  C 200 415, 175 400, 165 375
  L 115 340
  Q 90 305, 90 265
  Z
`;

// Lightly-suggested state separators (cosmetic — not accurate)
const STATE_LINES = [
  { x1: 510, y1: 165, x2: 510, y2: 380, label: "" },
  { x1: 610, y1: 175, x2: 610, y2: 410, label: "" },
  { x1: 730, y1: 195, x2: 700, y2: 380, label: "" },
  { x1: 320, y1: 200, x2: 340, y2: 430, label: "" },
  { x1: 400, y1: 320, x2: 450, y2: 450, label: "" },
  { x1: 525, y1: 350, x2: 800, y2: 365, label: "" }, // approximate Mason-Dixon
];

// Great Lakes — drawn as separate blobs on top of the land
const GREAT_LAKES = [
  // Lake Michigan
  "M 555 135 C 545 175, 555 200, 575 210 L 595 215 C 605 195, 600 160, 590 140 Z",
  // Lake Huron / Erie hint
  "M 700 145 C 720 135, 745 145, 750 165 L 745 195 C 730 200, 705 195, 700 175 Z",
];

function nodeColor(node: NodeConfig, status: NodeStatus | undefined, collapsing: boolean): string {
  if (collapsing) return "#ef4444";
  if (!node.apiKey) return "#64748b";
  if (!status) return "#64748b";
  if (status.health === "ok") return "#10b981";
  if (status.health === "degraded") return "#f59e0b";
  return "#ef4444"; // unreachable
}

function positionWithinCluster(
  center: { x: number; y: number },
  index: number,
  total: number,
): { x: number; y: number } {
  if (total === 1) return center;
  if (total === 2) {
    return { x: center.x + (index === 0 ? -12 : 12), y: center.y - 6 };
  }
  // Circular cluster — index 0 starts at top, goes clockwise
  const radius = total <= 4 ? 22 : 30;
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

export function FactoryMap({
  nodes,
  statuses,
  collapsingNodeIds,
  isLoadingKeys = false,
  history,
}: FactoryMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group nodes by city, preserving stable index for cluster positioning.
  const byCity = useMemo(() => {
    const map = new Map<CityKey, NodeConfig[]>();
    for (const n of nodes) {
      const city = NODE_TO_CITY[n.id];
      if (!city) continue;
      const list = map.get(city) ?? [];
      list.push(n);
      map.set(city, list);
    }
    return map;
  }, [nodes]);

  const pinPositions = useMemo(() => {
    const out = new Map<string, { x: number; y: number; cityKey: CityKey }>();
    for (const [cityKey, list] of byCity.entries()) {
      list.forEach((node, i) => {
        const pos = positionWithinCluster(CITIES[cityKey], i, list.length);
        out.set(node.id, { ...pos, cityKey });
      });
    }
    return out;
  }, [byCity]);

  // City-level health summary (for the city label color)
  const cityHealth = useMemo(() => {
    const out = new Map<CityKey, "ok" | "degraded" | "critical" | "unknown">();
    for (const [city, list] of byCity.entries()) {
      let worst: "ok" | "degraded" | "critical" | "unknown" = "ok";
      let hasAny = false;
      for (const n of list) {
        if (collapsingNodeIds.has(n.id)) {
          worst = "critical";
          hasAny = true;
          continue;
        }
        if (!n.apiKey) continue;
        const s = statuses.get(n.id);
        if (!s) continue;
        hasAny = true;
        if (s.health === "unreachable") worst = "critical";
        else if (s.health === "degraded" && worst === "ok") worst = "degraded";
      }
      out.set(city, hasAny ? worst : "unknown");
    }
    return out;
  }, [byCity, statuses, collapsingNodeIds]);

  const selectedNode = selectedId
    ? nodes.find((n) => n.id === selectedId) ?? null
    : null;

  return (
    <section className="relative h-full overflow-hidden rounded-xl border border-cyan-500/10 bg-[#070b16]/60 p-3">
      <header className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
            North America · Plant Map
          </h2>
          <p className="text-[10px] text-slate-500">
            {isLoadingKeys ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-live" />
                Loading configuration…
              </span>
            ) : (
              `${nodes.length} nodes across ${byCity.size} sites`
            )}
          </p>
        </div>
        <Legend />
      </header>

      <div className="relative h-[calc(100%-2.5rem)] w-full overflow-hidden rounded-lg border border-slate-800/60 bg-[#040711]">
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          onClick={() => setSelectedId(null)}
        >
          <defs>
            <radialGradient id="land-grad" cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="rgba(0,212,255,0.05)" />
              <stop offset="100%" stopColor="rgba(0,212,255,0)" />
            </radialGradient>
            <linearGradient id="flow-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(0,212,255,0.1)" />
              <stop offset="50%" stopColor="rgba(0,212,255,0.55)" />
              <stop offset="100%" stopColor="rgba(0,212,255,0.1)" />
            </linearGradient>
            <linearGradient id="flow-crit" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(239,68,68,0.15)" />
              <stop offset="50%" stopColor="rgba(239,68,68,0.85)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0.15)" />
            </linearGradient>
            <marker
              id="arrow-flow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(0,212,255,0.6)" />
            </marker>
          </defs>

          {/* Background grid */}
          <g opacity="0.12">
            {Array.from({ length: 50 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * 20}
                y1={0}
                x2={i * 20}
                y2={600}
                stroke="#0e1424"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 30 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * 20}
                x2={1000}
                y2={i * 20}
                stroke="#0e1424"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* US land mass — stylized */}
          <path
            d={US_OUTLINE}
            fill="rgba(8, 16, 32, 0.95)"
            stroke="rgba(0, 212, 255, 0.4)"
            strokeWidth="1.5"
          />
          <path d={US_OUTLINE} fill="url(#land-grad)" stroke="none" />

          {/* Great Lakes */}
          {GREAT_LAKES.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="#040711"
              stroke="rgba(0, 212, 255, 0.25)"
              strokeWidth="1"
            />
          ))}

          {/* State hint lines */}
          <g opacity="0.25">
            {STATE_LINES.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="rgba(0, 212, 255, 0.35)"
                strokeWidth="0.6"
                strokeDasharray="3 3"
              />
            ))}
          </g>

          {/* Flow lines between cities */}
          {FLOWS.map((edge, i) => {
            const a = CITIES[edge.from];
            const b = CITIES[edge.to];
            const sourceCrit =
              cityHealth.get(edge.from) === "critical" ||
              cityHealth.get(edge.from) === "degraded";
            const critical = sourceCrit;
            const stroke = critical
              ? "url(#flow-crit)"
              : "url(#flow-grad)";
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={critical ? 2.4 : 1.6}
                className={critical ? "flow-line-fast" : "flow-line"}
                markerEnd="url(#arrow-flow)"
                opacity={critical ? 0.95 : 0.75}
              />
            );
          })}

          {/* City labels + dots */}
          {(Object.entries(CITIES) as Array<[CityKey, CityInfo]>).map(
            ([key, city]) => {
              const tone = cityHealth.get(key);
              const dot =
                tone === "critical"
                  ? "#ef4444"
                  : tone === "degraded"
                    ? "#f59e0b"
                    : tone === "ok"
                      ? "#10b981"
                      : "#64748b";
              return (
                <g key={key}>
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="38"
                    fill="rgba(0,212,255,0.05)"
                    stroke="rgba(0,212,255,0.2)"
                    strokeWidth="0.5"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={city.x}
                    y={city.y + 58}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    letterSpacing="0.15em"
                    fill="rgba(226,232,240,0.85)"
                  >
                    {city.label.toUpperCase()}
                  </text>
                  <text
                    x={city.x}
                    y={city.y + 71}
                    textAnchor="middle"
                    fontSize="8"
                    fill="rgba(148,163,184,0.6)"
                  >
                    {city.sublabel}
                  </text>
                  <circle
                    cx={city.x - 60}
                    cy={city.y + 55}
                    r="2.5"
                    fill={dot}
                  />
                </g>
              );
            },
          )}

          {/* Pin clusters — node-level */}
          {nodes.map((node) => {
            const pos = pinPositions.get(node.id);
            if (!pos) return null;
            const status = statuses.get(node.id);
            const collapsing = collapsingNodeIds.has(node.id);
            const color = nodeColor(node, status, collapsing);
            const isSelected = selectedId === node.id;
            const isHovered = hoveredId === node.id;
            const titleParts: string[] = [node.location + " · " + node.label];
            if (status?.details) {
              const m = primaryMetricFor(node.type, status.details);
              if (typeof m.value === "number") titleParts.push(`${m.value}`);
            }
            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(node.id);
                }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {collapsing ? (
                  <>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="14"
                      fill="rgba(239,68,68,0.25)"
                      className="ripple-1"
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="14"
                      fill="rgba(239,68,68,0.2)"
                      className="ripple-2"
                    />
                  </>
                ) : null}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected || isHovered ? 11 : 9}
                  fill={color}
                  stroke="#040711"
                  strokeWidth="1.5"
                  opacity={collapsing ? 1 : 0.95}
                  filter={isHovered ? "brightness(1.2)" : undefined}
                />
                <text
                  x={pos.x}
                  y={pos.y + 3.5}
                  textAnchor="middle"
                  fontSize="9"
                  pointerEvents="none"
                >
                  {NODE_TYPE_EMOJI[node.type]}
                </text>
                <title>{titleParts.join(" · ")}</title>
              </g>
            );
          })}
        </svg>

        {/* Floating detail card on click */}
        {selectedNode ? (
          <DetailCard
            node={selectedNode}
            status={statuses.get(selectedNode.id)}
            history={history?.get(selectedNode.id) ?? []}
            collapsing={collapsingNodeIds.has(selectedNode.id)}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </section>
  );
}

interface DetailCardProps {
  node: NodeConfig;
  status: NodeStatus | undefined;
  history: number[];
  collapsing: boolean;
  onClose: () => void;
}

function DetailCard({ node, status, history, collapsing, onClose }: DetailCardProps) {
  const primary = status?.details
    ? primaryMetricFor(node.type, status.details)
    : { value: null, key: "" };
  const secondary = status?.details
    ? secondaryMetricFor(node.type, status.details)
    : null;

  const stateLabel = collapsing
    ? "COLLAPSING"
    : !node.apiKey
      ? "NO KEY"
      : status?.health === "ok"
        ? "OK"
        : status?.health === "degraded"
          ? "DEGRADED"
          : status?.health === "unreachable"
            ? "UNREACHABLE"
            : "—";

  const stateColor =
    collapsing || stateLabel === "UNREACHABLE"
      ? "text-rose-300 border-rose-500/50 bg-rose-500/10"
      : stateLabel === "DEGRADED"
        ? "text-amber-300 border-amber-500/50 bg-amber-500/10"
        : stateLabel === "OK"
          ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/10"
          : "text-slate-300 border-slate-600 bg-slate-800/40";

  return (
    <div
      role="dialog"
      aria-label={`${node.location} ${node.label} details`}
      className="alert-enter absolute right-4 top-4 z-10 w-72 rounded-lg border border-cyan-500/30 bg-[#0a1322]/95 p-4 shadow-2xl backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {node.location}
          </p>
          <p className="text-sm font-semibold text-slate-100">
            <span aria-hidden className="mr-1.5">
              {NODE_TYPE_EMOJI[node.type]}
            </span>
            {node.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div
        className={`mt-3 inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-inset ${stateColor}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {stateLabel}
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        {primary.value !== null ? (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              {primary.key.replace(/[A-Z]/g, (m) => " " + m).trim() || "Primary"}
            </dt>
            <dd className="font-mono text-xl font-bold tabular-nums text-cyan-300">
              {primary.value}
            </dd>
          </div>
        ) : null}
        {secondary ? (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              {secondary.label}
            </dt>
            <dd className="font-mono text-base font-semibold tabular-nums text-rose-300">
              {secondary.value}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-500">
            Last poll
          </dt>
          <dd className="font-mono text-[11px] tabular-nums text-slate-300">
            {status?.lastChecked
              ? status.lastChecked.toLocaleTimeString()
              : "—"}
          </dd>
        </div>
      </dl>

      {history.length > 1 ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Trend · last {history.length} polls
          </p>
          <Sparkline values={history} color={collapsing ? "#ef4444" : "#22d3ee"} />
        </div>
      ) : null}
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 220;
  const H = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = W / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = H - 2 - ((v - min) / range) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="mt-1">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function Legend() {
  return (
    <ul className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-500">
      <li className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
    </ul>
  );
}
