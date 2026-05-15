"use client";

import { COLLAPSE_STEP_LABELS } from "@/lib/collapse";
import type { CollapseStep, SentinelAlert } from "@/lib/types";

export type ScenarioState =
  | "idle"
  | "confirming"
  | "executing"
  | "complete"
  | "recovering"
  | "nominal";

interface ScenarioControllerProps {
  state: ScenarioState;
  steps: CollapseStep[];
  currentStage: number;
  elapsedSec: number;
  onAlert: (alert: SentinelAlert) => void;
  onStateChange: (state: ScenarioState) => void;
  onTriggerCollapse: () => void;
  onReset: () => void;
}

export const SCENARIO_STAGE_LABELS: readonly string[] = [
  "Anomaly detected — Factory 2 Raw Materials deviation",
  "Production halt — Factory 2 inventory declining",
  "Supply chain impact — Downstream nodes affected",
  "Cascade propagation — Warehouse stock depletion",
  "Critical state — Enterprise-wide impact",
];

export function ScenarioController({
  state,
  steps,
  currentStage,
  elapsedSec,
  onReset,
  // The following props are intentionally accepted but no longer used here.
  // Scenario initiation is now driven entirely by the TopBar Scenarios menu;
  // this footer only renders progress + nominal states. Kept on the
  // interface for backwards compatibility with the page.tsx call site.
  onAlert: _onAlert,
  onStateChange: _onStateChange,
  onTriggerCollapse: _onTriggerCollapse,
}: ScenarioControllerProps) {
  void _onAlert;
  void _onStateChange;
  void _onTriggerCollapse;

  // Nothing to show in idle — the TopBar handles trigger UX now.
  if (state === "idle" || state === "confirming") {
    return null;
  }

  const completedStages = steps.filter(
    (s) => s.status === "done" || s.status === "error",
  ).length;
  const progressPct = Math.round((completedStages / steps.length) * 100);

  return (
    <footer className="border-t border-cyan-500/10 bg-[#070b16]/95 backdrop-blur supports-[backdrop-filter]:bg-[#070b16]/80">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex flex-col gap-0.5 lg:min-w-[240px]">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300/90">
            Reality Engine · Scenario
          </h2>
          <p className="text-[10px] text-slate-500">
            Cinematic cascade simulator
          </p>
        </div>

        {state === "executing" ? (
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="rounded-sm bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300 ring-1 ring-rose-500/40">
                SCENARIO IN PROGRESS
              </span>
              <span className="text-[11px] uppercase tracking-wider text-amber-200">
                Stage {Math.max(1, currentStage + 1)} of {steps.length}
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {SCENARIO_STAGE_LABELS[currentStage] ?? "—"}
              </span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-400">
                T+{elapsedSec.toFixed(1)}s
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-rose-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex gap-1 pt-0.5">
              {steps.map((s, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s.status === "done"
                      ? "bg-emerald-500/70"
                      : s.status === "error"
                        ? "bg-rose-500"
                        : s.status === "running"
                          ? "bg-amber-400 pulse-live"
                          : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {state === "recovering" ? (
          <div className="flex flex-1 items-center gap-3">
            <span className="rounded-sm bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300 ring-1 ring-cyan-500/40">
              RECOVERY IN PROGRESS
            </span>
            <span className="font-mono text-[11px] text-slate-300">
              Reverse cascade · restoring affected nodes
            </span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-400">
              T+{elapsedSec.toFixed(1)}s
            </span>
          </div>
        ) : null}

        {state === "nominal" ? (
          <div className="flex flex-1 items-center gap-3">
            <span className="glow-emerald-box rounded-sm bg-emerald-500/15 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300 ring-1 ring-emerald-500/40">
              SYSTEM NOMINAL
            </span>
            <span className="text-[11px] text-slate-400">
              All nodes restored · standing by
            </span>
            <button
              type="button"
              onClick={onReset}
              className="ml-auto rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>
    </footer>
  );
}

export { COLLAPSE_STEP_LABELS };
