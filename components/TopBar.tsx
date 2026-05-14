"use client";

import { useEffect, useState } from "react";
import type { NodeStatus } from "@/lib/types";

interface TopBarProps {
  totalNodes: number;
  statuses: Map<string, NodeStatus>;
  activeAlerts: number;
  onOpenApiKeys: () => void;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function TopBar({
  totalNodes,
  statuses,
  activeAlerts,
  onOpenApiKeys,
}: TopBarProps) {
  const [clock, setClock] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let okCount = 0;
  let degradedCount = 0;
  for (const s of statuses.values()) {
    if (s.health === "ok") okCount++;
    else degradedCount++;
  }
  const online = okCount + degradedCount;
  const health =
    totalNodes === 0 ? 0 : Math.round((okCount / totalNodes) * 100);
  const healthTone =
    health >= 90
      ? "text-emerald-300"
      : health >= 60
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <header className="border-b border-cyan-500/15 bg-[#050810]/95 backdrop-blur supports-[backdrop-filter]:bg-[#050810]/75">
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-6 py-3">
        {/* Left — branding */}
        <div className="flex items-baseline gap-3">
          <h1
            className="glow-cyan select-none text-3xl font-bold tracking-[0.22em] text-cyan-300"
            aria-label="NEXUS"
          >
            NEXUS
          </h1>
          <p className="hidden text-[10px] uppercase tracking-[0.3em] text-slate-500 lg:block">
            Enterprise Reality Engine · Command Center
          </p>
        </div>

        {/* Center — three live counters */}
        <div className="ml-auto flex items-center gap-6">
          <Counter
            label="Nodes Online"
            value={`${online}/${totalNodes}`}
            tone="text-cyan-300"
            pulse
          />
          <span className="h-6 w-px bg-slate-800" aria-hidden />
          <Counter
            label="System Health"
            value={`${health}%`}
            tone={healthTone}
            pulse={health < 90}
          />
          <span className="h-6 w-px bg-slate-800" aria-hidden />
          <Counter
            label="Active Alerts"
            value={String(activeAlerts)}
            tone={
              activeAlerts > 0 ? "text-rose-300 pulse-live" : "text-slate-300"
            }
          />
        </div>

        {/* Right — clock + key button */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              UTC{(-new Date().getTimezoneOffset()) >= 0 ? "+" : ""}
              {-new Date().getTimezoneOffset() / 60}
            </span>
            <span className="font-mono text-lg tabular-nums text-slate-100">
              {formatTime(clock)}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenApiKeys}
            aria-label="API Keys"
            title="API Keys"
            className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <span aria-hidden>🔑</span>
          </button>
        </div>
      </div>
    </header>
  );
}

interface CounterProps {
  label: string;
  value: string;
  tone: string;
  pulse?: boolean;
}

function Counter({ label, value, tone, pulse }: CounterProps) {
  return (
    <div className="flex flex-col items-start leading-tight">
      <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
        {label}
      </span>
      <span
        className={`font-mono text-lg tabular-nums ${tone} ${pulse ? "pulse-live" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
