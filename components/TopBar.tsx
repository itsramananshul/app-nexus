"use client";

import { useEffect, useRef, useState } from "react";
import type { NodeStatus } from "@/lib/types";
import { isMuted, setMuted } from "@/lib/sounds";

export type ScenarioKey = "cascade" | "warehouse" | "materials";

export interface ScenarioOption {
  key: ScenarioKey;
  label: string;
  short: string;
}

export const SCENARIO_OPTIONS: ScenarioOption[] = [
  { key: "cascade", label: "Cascade Failure — Full Supply Chain", short: "Cascade Failure" },
  { key: "warehouse", label: "Warehouse Outage — W1 + W2 Down", short: "Warehouse Outage" },
  { key: "materials", label: "Materials Shortage — All Factories", short: "Materials Shortage" },
];

interface TopBarProps {
  totalNodes: number;
  statuses: Map<string, NodeStatus>;
  nodesWithoutKey: number;
  collapsingNodeIds: Set<string>;
  activeAlerts: number;
  eraMode: "before" | "after";
  onChangeEra: (era: "before" | "after") => void;
  onOpenApiKeys: () => void;
  onStartPitch: () => void;
  onResetDemo: () => void;
  onRunScenario: (key: ScenarioKey) => void;
  onOpenAudit: () => void;
  activeScenario: ScenarioKey | null;
  scenarioBusy: boolean;
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
  eraMode,
  onChangeEra,
  onOpenApiKeys,
  onStartPitch,
  onResetDemo,
  onRunScenario,
  onOpenAudit,
  activeScenario,
  scenarioBusy,
}: TopBarProps) {
  const [clock, setClock] = useState<Date>(new Date());
  const [muted, setMutedState] = useState<boolean>(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const scenariosRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  useEffect(() => {
    if (!scenariosOpen) return;
    const close = (e: MouseEvent) => {
      if (!scenariosRef.current) return;
      if (!scenariosRef.current.contains(e.target as Node)) {
        setScenariosOpen(false);
      }
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [scenariosOpen]);

  // ── System Health computation (unchanged from prior version) ──
  let degradedCount = 0;
  let criticalCount = 0;
  let okCount = 0;
  for (const s of statuses.values()) {
    if (s.health === "ok") okCount++;
    else if (s.health === "degraded") degradedCount++;
    else criticalCount++;
  }
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
  const activeOption = activeScenario
    ? SCENARIO_OPTIONS.find((o) => o.key === activeScenario) ?? null
    : null;

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  return (
    <header className="border-b border-cyan-500/15 bg-[#050810]/95 backdrop-blur supports-[backdrop-filter]:bg-[#050810]/75">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 sm:gap-6 px-3 sm:px-6 py-2 sm:py-3">
        {/* Left — branding */}
        <div className="flex items-baseline gap-3">
          <h1
            className="glow-cyan select-none text-xl sm:text-3xl font-bold tracking-[0.18em] sm:tracking-[0.22em] text-cyan-300"
            aria-label="NEXUS"
          >
            NEXUS
          </h1>
          <p className="hidden text-[10px] uppercase tracking-[0.3em] text-slate-500 lg:block">
            Enterprise Reality Engine · Command Center
          </p>
        </div>

        {/* Center — live counters (collapse to essentials on mobile) */}
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <Counter
            label="Nodes"
            value={`${online}/${totalNodes}`}
            tone="text-cyan-300"
          />
          <span className="hidden sm:inline-block h-6 w-px bg-slate-800" aria-hidden />
          <Counter
            label="Alerts"
            value={String(activeAlerts)}
            tone={
              activeAlerts > 0 ? "text-rose-300 pulse-live" : "text-slate-300"
            }
            hideLabelOnMobile
          />
          <span className="hidden sm:inline-block h-6 w-px bg-slate-800" aria-hidden />
          <Counter
            label="Health"
            value={`${health}%`}
            tone={healthTone}
            pulse={health < 80}
            hideLabelOnMobile
          />
          <span className="hidden lg:inline-block h-6 w-px bg-slate-800" aria-hidden />
          <div className="hidden lg:flex flex-col items-end">
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
        <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
          {/* Scenarios dropdown */}
          <div ref={scenariosRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setScenariosOpen((v) => !v);
              }}
              disabled={scenarioBusy}
              title="Run a scenario"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 sm:px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300 hover:border-amber-400 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span aria-hidden>⚡</span>
              <span className="hidden sm:inline">Scenarios</span>
              {activeOption ? (
                <span className="hidden md:inline text-cyan-300 normal-case tracking-normal">
                  · {activeOption.short}
                </span>
              ) : null}
            </button>
            {scenariosOpen ? (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full z-40 mt-1 w-[280px] rounded-md border border-amber-500/30 bg-[#0a0f1c] p-1 shadow-2xl"
              >
                {SCENARIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setScenariosOpen(false);
                      onRunScenario(opt.key);
                    }}
                    disabled={scenarioBusy}
                    className="block w-full rounded px-3 py-2 text-left text-[11px] text-slate-200 hover:bg-amber-500/10 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="block font-semibold">{opt.short}</span>
                    <span className="block text-[9px] text-slate-500 mt-0.5 tracking-[0.04em]">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Before / After era toggle */}
          <div
            className="inline-flex overflow-hidden rounded-md border border-amber-500/30 bg-slate-900/60 text-[9px] font-semibold uppercase tracking-[0.2em]"
            role="group"
            aria-label="View era"
          >
            <button
              type="button"
              onClick={() => onChangeEra("before")}
              aria-pressed={eraMode === "before"}
              className={`px-2 sm:px-2.5 py-1.5 transition-colors ${
                eraMode === "before"
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
              }`}
            >
              Before
            </button>
            <button
              type="button"
              onClick={() => onChangeEra("after")}
              aria-pressed={eraMode === "after"}
              className={`border-l border-amber-500/30 px-2 sm:px-2.5 py-1.5 transition-colors ${
                eraMode === "after"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
              }`}
            >
              After
            </button>
          </div>

          <button
            type="button"
            onClick={onStartPitch}
            aria-label="Pitch Mode"
            title="Start Pitch Mode (presenter overlay)"
            className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20"
          >
            <span aria-hidden>▶</span>
            Pitch Mode
          </button>
          <button
            type="button"
            onClick={onOpenAudit}
            aria-label="Open audit timeline"
            title="Audit timeline"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-900/60 px-2 sm:px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300"
          >
            <span aria-hidden>⏱</span>
            <span className="hidden lg:inline text-[10px] font-semibold uppercase tracking-[0.15em]">Audit</span>
          </button>
          <button
            type="button"
            onClick={onResetDemo}
            aria-label="Reset demo data"
            title="Re-seed all demo data"
            className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 sm:px-2.5 py-1.5 text-xs text-slate-400 hover:border-amber-500/40 hover:bg-slate-800 hover:text-amber-300"
          >
            <span aria-hidden>↺</span>
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
            title={muted ? "Unmute" : "Mute"}
            className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 sm:px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300"
          >
            <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
          </button>
          <button
            type="button"
            onClick={onOpenApiKeys}
            aria-label="API Keys"
            title="API Keys"
            className="rounded-md border border-slate-700/60 bg-slate-900/60 px-2 sm:px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300"
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
  hideLabelOnMobile?: boolean;
}

function Counter({ label, value, tone, pulse, hideLabelOnMobile }: CounterProps) {
  return (
    <div className="flex flex-col items-start leading-tight">
      <span
        className={`text-[10px] uppercase tracking-[0.25em] text-slate-500 ${
          hideLabelOnMobile ? "hidden sm:inline" : ""
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-base sm:text-lg tabular-nums transition-colors ${tone} ${pulse ? "pulse-live" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
