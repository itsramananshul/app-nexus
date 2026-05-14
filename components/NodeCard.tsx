"use client";

import {
  NODE_TYPE_EMOJI,
  primaryMetricFor,
  secondaryMetricFor,
  type NodeConfig,
} from "@/lib/nodes";
import type { NodeStatus } from "@/lib/types";

interface NodeCardProps {
  node: NodeConfig;
  status: NodeStatus | undefined;
  collapsing: boolean;
  now: Date;
}

function relativeSeconds(now: Date, then: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
}

const healthLabel: Record<NodeStatus["health"], string> = {
  ok: "OK",
  degraded: "DEGRADED",
  unreachable: "UNREACHABLE",
};

const healthBorder: Record<NodeStatus["health"], string> = {
  ok: "border-emerald-500/50",
  degraded: "border-rose-500/60",
  unreachable: "border-slate-700",
};

const healthGlow: Record<NodeStatus["health"], string> = {
  ok: "glow-green",
  degraded: "glow-red",
  unreachable: "",
};

const healthDot: Record<NodeStatus["health"], string> = {
  ok: "bg-emerald-400",
  degraded: "bg-rose-500",
  unreachable: "bg-slate-500",
};

const healthText: Record<NodeStatus["health"], string> = {
  ok: "text-emerald-300",
  degraded: "text-rose-300",
  unreachable: "text-slate-400",
};

function formatMetricValue(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function NodeCard({ node, status, collapsing, now }: NodeCardProps) {
  const health: NodeStatus["health"] = status?.health ?? "unreachable";
  const initial = status === undefined;

  const primary = status ? primaryMetricFor(node.type, status.details) : null;
  const secondary = status ? secondaryMetricFor(node.type, status.details) : null;

  return (
    <div
      className={`relative flex flex-col gap-2 rounded-xl border bg-slate-900/70 p-3 transition-colors ${
        healthBorder[health]
      } ${collapsing ? "node-collapse glow-red" : healthGlow[health]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span aria-hidden className="text-base">
            {NODE_TYPE_EMOJI[node.type]}
          </span>
          <span className="text-sm font-medium text-slate-100">
            {node.label}
          </span>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-inset ring-slate-700">
          {node.location}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${healthDot[health]} ${
            health === "ok" ? "pulse-live" : ""
          }`}
        />
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${healthText[health]}`}
        >
          {initial ? "CONNECTING" : healthLabel[health]}
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        {primary && primary.value !== null ? (
          <div>
            <div className="text-2xl font-semibold tabular-nums text-slate-50">
              {formatMetricValue(primary.value)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {primary.key}
            </div>
            {secondary ? (
              <div className="mt-1 text-[10px] text-rose-300/80">
                {secondary.value} {secondary.label}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">No metric yet</div>
        )}
        <div className="text-right text-[10px] text-slate-500">
          {status ? `${relativeSeconds(now, status.lastChecked)}s ago` : "—"}
        </div>
      </div>

      {status?.error ? (
        <div className="truncate text-[10px] text-rose-400/80" title={status.error}>
          {status.error}
        </div>
      ) : null}
    </div>
  );
}
