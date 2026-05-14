"use client";

import { GlobalHealthBar } from "./GlobalHealthBar";
import type { NodeStatus } from "@/lib/types";

interface TopBarProps {
  totalNodes: number;
  statuses: Map<string, NodeStatus>;
  lastPollAt: Date | null;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TopBar({ totalNodes, statuses, lastPollAt }: TopBarProps) {
  return (
    <header className="border-b border-cyan-500/10 bg-[#06070d]/95 backdrop-blur supports-[backdrop-filter]:bg-[#06070d]/70">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-3">
          <h1
            className="glow-cyan select-none text-3xl font-bold tracking-[0.18em] text-cyan-300"
            aria-label="NEXUS"
          >
            NEXUS
          </h1>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Enterprise Reality Engine · Command Center
          </p>
        </div>

        <div className="flex-1 lg:flex lg:justify-center">
          <GlobalHealthBar total={totalNodes} statuses={statuses} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Last poll
          </span>
          <span className="font-mono tabular-nums text-slate-200">
            {lastPollAt ? formatTime(lastPollAt) : "—"}
          </span>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Polling live
          </span>
        </div>
      </div>
    </header>
  );
}
