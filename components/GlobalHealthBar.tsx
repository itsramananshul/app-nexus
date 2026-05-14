"use client";

import type { NodeStatus } from "@/lib/types";

interface GlobalHealthBarProps {
  total: number;
  statuses: Map<string, NodeStatus>;
}

export function GlobalHealthBar({ total, statuses }: GlobalHealthBarProps) {
  let ok = 0;
  let degraded = 0;
  let unreachable = 0;
  for (const s of statuses.values()) {
    if (s.health === "ok") ok++;
    else if (s.health === "degraded") degraded++;
    else unreachable++;
  }
  const unknown = total - (ok + degraded + unreachable);
  const allHealthy = ok === total && total > 0;
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-4">
        <Stat dot="bg-emerald-400" label="ok" value={ok} />
        <Stat dot="bg-rose-500" label="degraded" value={degraded} />
        <Stat dot="bg-slate-500" label="unreachable" value={unreachable} />
        {unknown > 0 ? (
          <Stat dot="bg-slate-700" label="pending" value={unknown} />
        ) : null}
      </div>
      <div
        className={`hidden md:inline-flex items-baseline gap-2 rounded-lg px-3 py-1 ring-1 ring-inset ${
          allHealthy
            ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40"
            : "bg-rose-500/10 text-rose-300 ring-rose-500/40"
        }`}
      >
        <span className="text-2xl font-semibold tabular-nums">
          {ok}
          <span className="mx-1 text-slate-500">/</span>
          {total}
        </span>
        <span className="text-xs uppercase tracking-[0.2em]">
          Systems Healthy
        </span>
      </div>
    </div>
  );
}

interface StatProps {
  dot: string;
  label: string;
  value: number;
}

function Stat({ dot, label, value }: StatProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-sm tabular-nums text-slate-200">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </span>
  );
}
