"use client";

import { useEffect, useState } from "react";
import type { NodeStatus } from "@/lib/types";
import { isMuted, setMuted } from "@/lib/sounds";

interface TopBarProps {
  totalNodes: number;
  statuses: Map<string, NodeStatus>;
  nodesWithoutKey: number;
  collapsingNodeIds: Set<string>;
  activeAlerts: number;
  onOpenApiKeys: () => void;
  onStartPitch: () => void;
  onResetDemo: () => void;
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
  nodesWithoutKey,
  collapsingNodeIds,
  activeAlerts,
  onOpenApiKeys,
  onStartPitch,
  onResetDemo,
}: TopBarProps) {
  const [clock, setClock] = useState<Date>(new Date());
  const [muted, setMutedState] = useState<boolean>(false);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  // System Health score:
  //   start at 100
  //   each degraded node    -> -(100 / N)
  //   each critical/no-key  -> -(200 / N)
  //   (collapsing counts as critical for visual effect during the cascade)
  //   floor at 0, ceiling at 100
  let degradedCount = 0;
  let criticalCount = 0;
  let okCount = 0;
  for (const s of statuses.values()) {
    if (s.health === "ok") okCount++;
    else if (s.health === "degraded") degradedCount++;
    else criticalCount++; // unreachable
  }
  // Treat collapsing nodes as critical (they may still report "ok" from
  // /api/status during the cascade because the backend is up — the visual
  // distress is data-level, so reflect it in the score).
  const collapsing = collapsingNodeIds.size;
  const effectiveCritical = Math.min(totalNodes, criticalCount + collapsing);
  const totalForFormula = totalNodes || 1;
  const penalty =
    (degradedCount * 100) / totalForFormula +
    (effectiveCritical + nodesWithoutKey) * (200 / totalForFormula);
  const health = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const healthTone =
    health > 80
      ? "text-emerald-300"
      : health >= 50
        ? "text-amber-300"
        : "text-rose-300";

  const online = okCount + degradedCount + criticalCount;

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

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

        {/* Center — live counters */}
        <div className="ml-auto flex items-center gap-5">
          <Counter
            label="Nodes Online"
            value={`${online}/${totalNodes}`}
            tone="text-cyan-300"
          />
          <span className="h-6 w-px bg-slate-800" aria-hidden />
          <Counter
            label="Active Alerts"
            value={String(activeAlerts)}
            tone={
              activeAlerts > 0 ? "text-rose-300 pulse-live" : "text-slate-300"
            }
          />
          <span className="h-6 w-px bg-slate-800" aria-hidden />
          <Counter
            label="System Health"
            value={`${health}%`}
            tone={healthTone}
            pulse={health < 80}
          />
          <span className="h-6 w-px bg-slate-800" aria-hidden />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              UTC{(-new Date().getTimezoneOffset()) >= 0 ? "+" : ""}
              {-new Date().getTimezoneOffset() / 60}
            </span>
            <span className="font-mono text-lg tabular-nums text-slate-100">
              {formatTime(clock)}
            </span>
          </div>
        </div>

        {/* Right — action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartPitch}
            aria-label="Pitch Mode"
            title="Start Pitch Mode (presenter overlay)"
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <span aria-hidden>▶</span>
            Pitch Mode
          </button>
          <button
            type="button"
            onClick={onResetDemo}
            aria-label="Reset demo data"
            title="Re-seed all demo data"
            className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 hover:border-amber-500/40 hover:bg-slate-800 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span aria-hidden>↺</span>
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
            title={muted ? "Unmute" : "Mute"}
            className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
          </button>
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
        className={`font-mono text-lg tabular-nums transition-colors ${tone} ${pulse ? "pulse-live" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
