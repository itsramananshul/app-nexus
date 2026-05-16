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
  // When a scenario is active, the set of node ids it targets. Cards in this
  // set get an "AFFECTED" badge; non-affected cards visually recede.
  affectedNodeIds?: Set<string>;
  scenarioActive?: boolean;
  // Nodes that have transitioned past "red blink" into the final "failed"
  // (gray) state during scenario playback.
  failedNodeIds?: Set<string>;
}

type NodePos = { x: number; y: number };

const NODE_W = 150;
const NODE_H = 88;

const POSITIONS: Record<string, NodePos> = {
  // Top — Factory 1 + Factory 3
  "f1-product": { x: 70, y: 20 },
  "f1-materials": { x: 240, y: 20 },
  "f3-product": { x: 830, y: 20 },
  "f3-materials": { x: 1000, y: 20 },
  // Warehouses
  "w1-product": { x: 390, y: 200 },
  "w2-product": { x: 730, y: 200 },
  // Corporate apps
  "corp-orders": { x: 320, y: 380 },
  "corp-shipments": { x: 480, y: 380 },
  "corp-support": { x: 640, y: 380 },
  "corp-erp": { x: 800, y: 380 },
  // Bottom — Factory 2 + Factory 4
  "f2-product": { x: 70, y: 560 },
  "f2-materials": { x: 240, y: 560 },
  "f4-product": { x: 830, y: 560 },
  "f4-materials": { x: 1000, y: 560 },
};

// Virtual hubs (visual aggregators, not real nodes)
const HUB_POS: Record<string, NodePos> = {
  "factory-1": { x: 230, y: 120 },
  "factory-3": { x: 990, y: 120 },
  "factory-2": { x: 230, y: 510 },
  "factory-4": { x: 990, y: 510 },
  "corporate": { x: 600, y: 300 },
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
  affectedNodeIds,
  scenarioActive = false,
  failedNodeIds,
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
    <section className="relative h-full" style={{ background: "#000" }}>
      <header className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2 style={{ fontSize: 11, color: "#888", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Supply Network
          </h2>
          <p style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
            {isLoadingKeys ? (
              <span style={{ color: "#f59e0b" }}>Loading configuration…</span>
            ) : (
              `${nodes.length} nodes · live telemetry`
            )}
          </p>
        </div>
        <Legend />
      </header>

      <div
        className="relative h-[calc(100%-2.5rem)] w-full overflow-auto scrollbar-thin"
        style={{ background: "#000" }}
      >
        <div className="relative" style={{ width: 1200, height: 660 }}>
          <svg
            viewBox="0 0 1200 660"
            width="1200"
            height="660"
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

            {/* No grid lines on the dark canvas — Vercel/Linear aesthetic */}

            {/* Orthogonal (right-angle) connector lines.
                Route each edge horizontally to the midpoint, then vertically
                to the target's row, then horizontally into the target.
                Color reflects the health of both endpoints, computed live
                from the polled statuses map. */}
            {edgeStates.map(({ edge, critical, warning }, idx) => {
              const a = hubCenter(edge.from);
              const b = hubCenter(edge.to);
              if (!a || !b) return null;
              const stroke = critical
                ? "#7f1d1d"
                : warning
                  ? "#92400e"
                  : "#166534";
              const strokeWidth = 1.5;
              const midX = (a.x + b.x) / 2;
              const d = `M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`;
              return (
                <g key={idx}>
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={critical ? "5 3" : undefined}
                  />
                  {/* Junction dot at the branching point */}
                  <circle cx={midX} cy={a.y} r={2} fill={stroke} />
                </g>
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
                    r={r}
                    fill="#0a0a0a"
                    stroke="#1e1e1e"
                    strokeWidth="1"
                  />
                  <text
                    x={p.x}
                    y={p.y - 1}
                    textAnchor="middle"
                    fontSize={isCorporate ? "11" : "10"}
                    fontWeight="500"
                    fill="#ffffff"
                    letterSpacing="0.08em"
                  >
                    {isCorporate ? "CORP" : id.replace("factory-", "F")}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 11}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#555555"
                    letterSpacing="0.08em"
                  >
                    HUB
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
            const isAffected = affectedNodeIds?.has(node.id) ?? false;
            const isFailed = failedNodeIds?.has(node.id) ?? false;
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
                affected={isAffected}
                scenarioActive={scenarioActive}
                failed={isFailed}
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
  affected?: boolean;
  scenarioActive?: boolean;
  failed?: boolean;
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
  affected = false,
  scenarioActive = false,
  failed = false,
}: NodeCardProps) {
  const health = status?.health;
  const noKey = !hasKey;

  // Vercel-dark palette — no glow, no colored fills, just a status dot and
  // a subtle border that turns the status color on warning/error.
  let borderColor = "#1e1e1e";
  let dotColor = "#2a2a2a";
  let stateLabel = "—";
  let dotPulse = false;
  let sparklineColor = "#444444";

  if (loading) {
    dotColor = "#2a2a2a";
    dotPulse = true;
    stateLabel = "LOADING";
  } else if (noKey) {
    dotColor = "#2a2a2a";
    stateLabel = "No API key — configure in API Keys panel";
  } else if (failed) {
    // Final "failed" state — after the red blink, the node settles into
    // a flat gray. Communicates: it's not coming back without recovery.
    borderColor = "#2a2a2a";
    dotColor = "#555555";
    dotPulse = false;
    sparklineColor = "#444444";
    stateLabel = "FAILED";
  } else if (collapsing) {
    borderColor = "#ef4444";
    dotColor = "#ef4444";
    dotPulse = true;
    sparklineColor = "#ef4444";
    stateLabel = "COLLAPSING";
  } else if (health === "ok") {
    dotColor = "#22c55e";
    sparklineColor = "#22c55e";
    stateLabel = "OK";
  } else if (health === "degraded") {
    borderColor = "#f59e0b";
    dotColor = "#f59e0b";
    dotPulse = true;
    sparklineColor = "#f59e0b";
    stateLabel = "DEGRADED";
  } else if (health === "unreachable") {
    borderColor = "#ef4444";
    dotColor = "#ef4444";
    dotPulse = true;
    sparklineColor = "#ef4444";
    stateLabel = "UNREACHABLE";
  }

  const primary = status?.details
    ? primaryMetricFor(node.type, status.details)
    : { value: null, key: "" };
  const secondary = status?.details
    ? secondaryMetricFor(node.type, status.details)
    : null;

  // When a scenario is running, dim cards that aren't on the affected list
  // so the eye lands on the relevant nodes.
  const dim = scenarioActive && !affected;

  return (
    <div
      className="absolute overflow-hidden transition-colors"
      style={{
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        height: NODE_H,
        zIndex: 1,
        background: "#0a0a0a",
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: 12,
        opacity: dim ? 0.55 : 1,
        transition: "opacity 200ms ease, border-color 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#0f0f0f";
        if (borderColor === "#1e1e1e")
          e.currentTarget.style.borderColor = "#2a2a2a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#0a0a0a";
        e.currentTarget.style.borderColor = borderColor;
      }}
      title={stateLabel}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
            className={dotPulse ? "pulse-live" : undefined}
          />
          <div className="min-w-0">
            <p
              className="truncate"
              style={{ fontSize: 13, color: "#fff", fontWeight: 500, lineHeight: 1.2 }}
            >
              {node.label}
            </p>
            <p className="truncate" style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
              {node.location}
            </p>
          </div>
        </div>
        {scenarioActive && affected ? (
          <span
            aria-label={failed ? "Failed" : "Affected"}
            style={{
              background: failed ? "rgba(120,120,120,0.18)" : "rgba(239,68,68,0.15)",
              color: failed ? "#888" : "#ef4444",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 5px",
              borderRadius: 3,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {failed ? "Failed" : "Affected"}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 truncate">
          {primary.value !== null ? (
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}
            >
              {primary.value}
            </span>
          ) : (
            <span className="font-mono" style={{ fontSize: 11, color: "#555" }}>
              {stateLabel === "LOADING" ? "Loading…" : "—"}
            </span>
          )}
          {secondary ? (
            <span className="ml-1.5 font-mono" style={{ fontSize: 11, color: "#666" }}>
              · {secondary.value} {secondary.label}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 font-mono tabular-nums" style={{ fontSize: 11, color: "#444" }}>
          {ago}
        </span>
      </div>
      {!noKey && !loading ? (
        <div className="mt-1 hidden sm:flex justify-end" style={{ overflow: "hidden" }}>
          <Sparkline values={history} tone={sparklineColor} />
        </div>
      ) : null}
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
