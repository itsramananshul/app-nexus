"use client";

import { useMemo } from "react";
import type { NodeConfig } from "@/lib/nodes";
import {
  NODE_TYPE_EMOJI,
  primaryMetricFor,
  secondaryMetricFor,
} from "@/lib/nodes";
import type { NodeStatus } from "@/lib/types";

interface NetworkGraphProps {
  nodes: NodeConfig[];
  statuses: Map<string, NodeStatus>;
  collapsingNodeIds: Set<string>;
  now: Date;
  isLoadingKeys?: boolean;
  history?: Map<string, number[]>;
}

type NodePos = { x: number; y: number };

const NODE_W = 150;
const NODE_H = 88;

const POSITIONS: Record<string, NodePos> = {
  // Top — Factory 1 + Factory 3
  "f1-product": { x: 70, y: 30 },
  "f1-materials": { x: 240, y: 30 },
  "f3-product": { x: 830, y: 30 },
  "f3-materials": { x: 1000, y: 30 },
  // Warehouses
  "w1-product": { x: 390, y: 240 },
  "w2-product": { x: 730, y: 240 },
  // Corporate apps
  "corp-orders": { x: 320, y: 460 },
  "corp-shipments": { x: 480, y: 460 },
  "corp-support": { x: 640, y: 460 },
  "corp-erp": { x: 800, y: 460 },
  // Bottom — Factory 2 + Factory 4
  "f2-product": { x: 70, y: 640 },
  "f2-materials": { x: 240, y: 640 },
  "f4-product": { x: 830, y: 640 },
  "f4-materials": { x: 1000, y: 640 },
};

// Virtual hubs (visual aggregators, not real nodes)
const HUB_POS: Record<string, NodePos> = {
  "factory-1": { x: 230, y: 140 },
  "factory-3": { x: 990, y: 140 },
  "factory-2": { x: 230, y: 580 },
  "factory-4": { x: 990, y: 580 },
  "corporate": { x: 600, y: 360 },
};

// Connection edges. `from` and `to` can reference real nodes (by id) or hub ids.
type Edge = { from: string; to: string; reverse?: boolean };

const EDGES: Edge[] = [
  // Factory 1 children -> Factory 1 hub
  { from: "f1-product", to: "factory-1" },
  { from: "f1-materials", to: "factory-1" },
  // Factory 3 children -> Factory 3 hub
  { from: "f3-product", to: "factory-3" },
  { from: "f3-materials", to: "factory-3" },
  // Factory 2 children -> Factory 2 hub
  { from: "f2-product", to: "factory-2" },
  { from: "f2-materials", to: "factory-2" },
  // Factory 4 children -> Factory 4 hub
  { from: "f4-product", to: "factory-4" },
  { from: "f4-materials", to: "factory-4" },
  // Factories -> Warehouses
  { from: "factory-1", to: "w1-product" },
  { from: "factory-2", to: "w1-product" },
  { from: "factory-3", to: "w2-product" },
  { from: "factory-4", to: "w2-product" },
  // Warehouses -> Corporate hub
  { from: "w1-product", to: "corporate" },
  { from: "w2-product", to: "corporate" },
  // Corporate hub -> Corporate apps
  { from: "corporate", to: "corp-orders" },
  { from: "corporate", to: "corp-shipments" },
  { from: "corporate", to: "corp-support" },
  { from: "corporate", to: "corp-erp" },
];

function center(p: NodePos): NodePos {
  return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
}

function posOf(id: string): NodePos | null {
  if (POSITIONS[id]) return POSITIONS[id];
  if (HUB_POS[id]) {
    // hubs are smaller — adjust to center based on hub size 60x60
    return { x: HUB_POS[id].x - 30, y: HUB_POS[id].y - 30 };
  }
  return null;
}

function hubCenter(id: string): NodePos | null {
  if (POSITIONS[id]) return center(POSITIONS[id]);
  if (HUB_POS[id]) return HUB_POS[id];
  return null;
}

function fmtAgo(now: Date, then: Date | undefined): string {
  if (!then) return "—";
  const ms = now.getTime() - then.getTime();
  if (ms < 1000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60_000)}m ago`;
}

export function NetworkGraph({
  nodes,
  statuses,
  collapsingNodeIds,
  now,
  isLoadingKeys = false,
  history,
}: NetworkGraphProps) {
  const byId = useMemo(() => {
    const m = new Map<string, NodeConfig>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Determine which edges should render as "alert" (red/amber animation)
  // — if either endpoint is degraded/unreachable or collapsing.
  const edgeStates = useMemo(() => {
    return EDGES.map((e) => {
      const fromIsReal = !!POSITIONS[e.from];
      const toIsReal = !!POSITIONS[e.to];
      let critical = false;
      let warning = false;
      if (fromIsReal) {
        const s = statuses.get(e.from);
        if (s?.health === "unreachable" || s?.health === "degraded")
          critical = true;
        if (collapsingNodeIds.has(e.from)) critical = true;
      }
      if (toIsReal) {
        const s = statuses.get(e.to);
        if (s?.health === "degraded") warning = true;
      }
      return { edge: e, critical, warning, fromIsReal, toIsReal };
    });
  }, [statuses, collapsingNodeIds]);

  return (
    <section className="relative h-full rounded-xl border border-cyan-500/10 bg-[#070b16]/60 p-3">
      <header className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Supply Network · Topology
          </h2>
          <p className="text-[10px] text-slate-500">
            {isLoadingKeys ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-live" />
                Loading configuration…
              </span>
            ) : (
              `${nodes.length} nodes · live telemetry`
            )}
          </p>
        </div>
        <Legend />
      </header>

      <div className="relative h-[calc(100%-2.5rem)] w-full overflow-auto rounded-lg border border-slate-800/60 bg-[#040711] scrollbar-thin">
        <div className="relative" style={{ width: 1200, height: 720 }}>
          <svg
            viewBox="0 0 1200 720"
            width="1200"
            height="720"
            className="absolute inset-0"
            style={{ zIndex: 0 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="rgba(0,212,255,0.6)" />
              </marker>
              <marker
                id="arrow-red"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="rgba(239,68,68,0.85)" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="rgba(245,158,11,0.8)" />
              </marker>
            </defs>

            {/* Grid background */}
            <g opacity="0.18">
              {Array.from({ length: 60 }).map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * 20}
                  y1={0}
                  x2={i * 20}
                  y2={720}
                  stroke="#0e1424"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 36 }).map((_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i * 20}
                  x2={1200}
                  y2={i * 20}
                  stroke="#0e1424"
                  strokeWidth="1"
                />
              ))}
            </g>

            {/* Connection lines */}
            {edgeStates.map(({ edge, critical, warning }, idx) => {
              const a = hubCenter(edge.from);
              const b = hubCenter(edge.to);
              if (!a || !b) return null;
              const stroke = critical
                ? "rgba(239,68,68,0.85)"
                : warning
                  ? "rgba(245,158,11,0.7)"
                  : "rgba(0,212,255,0.45)";
              const cls = critical
                ? "flow-line-fast"
                : warning
                  ? "flow-line-fast"
                  : "flow-line";
              const marker = critical
                ? "url(#arrow-red)"
                : warning
                  ? "url(#arrow-amber)"
                  : "url(#arrow-cyan)";
              return (
                <line
                  key={idx}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={critical ? 2 : 1.5}
                  className={cls}
                  markerEnd={marker}
                  opacity={critical ? 0.95 : warning ? 0.85 : 0.65}
                />
              );
            })}

            {/* Virtual hubs as small circles */}
            {Object.entries(HUB_POS).map(([id, p]) => {
              const isCorporate = id === "corporate";
              const r = isCorporate ? 26 : 20;
              return (
                <g key={id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 4}
                    fill="none"
                    stroke="rgba(0,212,255,0.15)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill="#06101e"
                    stroke="rgba(0,212,255,0.4)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x}
                    y={p.y - 2}
                    textAnchor="middle"
                    fontSize={isCorporate ? "10" : "9"}
                    fontWeight="600"
                    fill="rgba(0,212,255,0.85)"
                    letterSpacing="0.1em"
                  >
                    {isCorporate ? "CORP" : id.replace("factory-", "F")}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 10}
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgba(148,163,184,0.7)"
                    letterSpacing="0.1em"
                  >
                    {isCorporate ? "HUB" : "HUB"}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Node cards — absolutely positioned over the SVG */}
          {nodes.map((node) => {
            const pos = POSITIONS[node.id];
            if (!pos) return null;
            const status = statuses.get(node.id);
            const collapsing = collapsingNodeIds.has(node.id);
            return (
              <NodeCard
                key={node.id}
                node={node}
                status={status}
                pos={pos}
                collapsing={collapsing}
                hasKey={!!node.apiKey}
                loading={isLoadingKeys}
                ago={fmtAgo(now, status?.lastChecked)}
                history={history?.get(node.id) ?? []}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface NodeCardProps {
  node: NodeConfig;
  status: NodeStatus | undefined;
  pos: NodePos;
  collapsing: boolean;
  hasKey: boolean;
  loading: boolean;
  ago: string;
  history: number[];
}

function NodeCard({
  node,
  status,
  pos,
  collapsing,
  hasKey,
  loading,
  ago,
  history,
}: NodeCardProps) {
  const health = status?.health;
  const noKey = !hasKey;

  let borderCls = "border-slate-700/70";
  let glowCls = "";
  let dotCls = "bg-slate-500";
  let stateLabel = "—";
  if (loading) {
    borderCls = "border-slate-700/40 border-dashed";
    glowCls = "opacity-60";
    dotCls = "bg-slate-500 pulse-live";
    stateLabel = "LOADING";
  } else if (noKey) {
    borderCls = "border-slate-700/50 border-dashed";
    dotCls = "bg-slate-500";
    stateLabel = "NO KEY";
  } else if (collapsing) {
    borderCls = "border-rose-500/70";
    glowCls = "pulse-critical";
    dotCls = "bg-rose-500";
    stateLabel = "COLLAPSING";
  } else if (health === "ok") {
    borderCls = "border-emerald-500/40";
    glowCls = "glow-emerald-box";
    dotCls = "bg-emerald-400";
    stateLabel = "OK";
  } else if (health === "degraded") {
    borderCls = "border-amber-500/60";
    glowCls = "glow-amber-box";
    dotCls = "bg-amber-400 pulse-live";
    stateLabel = "DEGRADED";
  } else if (health === "unreachable") {
    borderCls = "border-rose-500/60";
    glowCls = "glow-red-box pulse-live";
    dotCls = "bg-rose-400 pulse-live";
    stateLabel = "UNREACHABLE";
  }

  const primary = status?.details
    ? primaryMetricFor(node.type, status.details)
    : { value: null, key: "" };
  const secondary = status?.details
    ? secondaryMetricFor(node.type, status.details)
    : null;

  return (
    <div
      className={`absolute overflow-hidden rounded-md border bg-[#0a1322]/95 px-2.5 py-1.5 transition-shadow ${borderCls} ${glowCls}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        height: NODE_H,
        zIndex: 1,
      }}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span aria-hidden className="text-[13px] leading-none">
            {NODE_TYPE_EMOJI[node.type]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-100">
              {node.label}
            </p>
            <p className="truncate text-[9px] text-slate-400">{node.location}</p>
          </div>
        </div>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dotCls}`}
          aria-label={stateLabel}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-1.5">
        <div className="min-w-0 flex-1 truncate">
          {primary.value !== null ? (
            <span className="font-mono text-[14px] font-bold leading-none tabular-nums text-cyan-300">
              {primary.value}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-slate-500">
              {stateLabel === "LOADING"
                ? "Loading…"
                : stateLabel === "NO KEY"
                  ? "Add key →"
                  : "—"}
            </span>
          )}
          {secondary ? (
            <span className="ml-1.5 font-mono text-[9px] text-rose-300">
              · {secondary.value} {secondary.label}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-[8px] tabular-nums text-slate-500">
          {ago}
        </span>
      </div>
      <div className="mt-1 hidden sm:flex justify-end">
        <Sparkline
          values={history}
          tone={
            collapsing || health === "unreachable"
              ? "#ef4444"
              : health === "degraded"
                ? "#f59e0b"
                : "#22d3ee"
          }
        />
      </div>
    </div>
  );
}

interface SparklineProps {
  values: number[];
  tone: string;
}

function Sparkline({ values, tone }: SparklineProps) {
  const W = 60;
  const H = 14;
  const Y_MIN = 2;
  const Y_MAX = H - 2;
  const X_MAX = W - 2;
  const svgStyle = { display: "block" as const, overflow: "hidden" as const };

  if (values.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={svgStyle}
        aria-hidden
      >
        <line
          x1="0"
          y1={H - 1}
          x2={W}
          y2={H - 1}
          stroke="#1f2937"
          strokeWidth="1"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = X_MAX / (values.length - 1);
  const clampY = (v: number) => {
    const raw = Y_MAX - ((v - min) / range) * (Y_MAX - Y_MIN);
    return Math.max(Y_MIN, Math.min(Y_MAX, raw));
  };
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${clampY(v).toFixed(1)}`)
    .join(" ");
  const lastX = (values.length - 1) * step;
  const lastY = clampY(values[values.length - 1]);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={svgStyle}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={tone}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="1.4" fill={tone} />
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
      <li className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        No key
      </li>
    </ul>
  );
}
