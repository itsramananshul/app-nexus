"use client";

import { useEffect, useRef, useState } from "react";
import {
  COLLAPSE_STEP_LABELS,
  runFactoryCollapse,
} from "@/lib/collapse";
import type {
  CollapseApiKeys,
  CollapseResult,
  CollapseStep,
  CollapseUrls,
  SentinelAlert,
} from "@/lib/types";

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
  urls: CollapseUrls;
  apiKeys: CollapseApiKeys;
  onAlert: (alert: SentinelAlert) => void;
  onStateChange: (state: ScenarioState) => void;
  onStepStart: (index: number, label: string) => void;
  onStepDone: (index: number, label: string) => void;
  onStepError: (index: number, label: string, error: string) => void;
  onComplete: (result: CollapseResult) => void;
  onReset: () => void;
}

export const SCENARIO_STAGE_LABELS: readonly string[] = [
  "Anomaly detected — Factory 2 Raw Materials deviation",
  "Production halt — Factory 2 inventory declining",
  "Supply chain impact — Downstream nodes affected",
  "Cascade propagation — Warehouse stock depletion",
  "Critical state — Enterprise-wide impact",
];

const AVAILABLE_SCENARIOS: { id: string; label: string; disabled?: boolean }[] = [
  { id: "factory-2-disruption", label: "Factory 2 Supply Disruption" },
  { id: "warehouse-1-outage", label: "Warehouse 1 Outage", disabled: true },
  { id: "global-materials", label: "Global Materials Shortage", disabled: true },
];

function newAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ScenarioController({
  state,
  steps,
  currentStage,
  elapsedSec,
  urls,
  apiKeys,
  onAlert,
  onStateChange,
  onStepStart,
  onStepDone,
  onStepError,
  onComplete,
  onReset,
}: ScenarioControllerProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>(
    AVAILABLE_SCENARIOS[0].id,
  );
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dropOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [dropOpen]);

  const scenario = AVAILABLE_SCENARIOS.find((s) => s.id === selectedScenario)!;

  const handleInitiate = () => {
    onStateChange("confirming");
  };

  const handleConfirm = () => {
    onStateChange("executing");
    onAlert({
      id: newAlertId(),
      timestamp: new Date(),
      nodeId: "f2-materials",
      nodeLabel: "Factory 2",
      location: "Factory 2",
      type: "collapse_triggered",
      message:
        "SCENARIO INITIATED · Factory 2 Supply Disruption · Cascade propagation imminent",
      severity: "critical",
    });
    void runFactoryCollapse(urls, apiKeys, {
      onStepStart: (i, label) => {
        onStepStart(i, label);
      },
      onStepDone: (i, label) => {
        onStepDone(i, label);
      },
      onStepError: (i, label, err) => {
        onStepError(i, label, err);
      },
      onComplete: (result) => {
        onComplete(result);
      },
    });
  };

  const handleCancel = () => {
    onStateChange("idle");
  };

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

        {state === "idle" ? (
          <div className="flex flex-1 items-center gap-3">
            {/* Scenario dropdown */}
            <div ref={dropRef} className="relative">
              <button
                type="button"
                onClick={() => setDropOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/20 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:border-cyan-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-haspopup="listbox"
                aria-expanded={dropOpen}
              >
                <span aria-hidden>⚡</span>
                <span>{scenario.label}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-3 w-3 transition-transform ${dropOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {dropOpen ? (
                <ul
                  role="listbox"
                  className="absolute bottom-full left-0 z-10 mb-1 w-72 overflow-hidden rounded-md border border-cyan-500/20 bg-[#070b16] py-1 shadow-2xl"
                >
                  {AVAILABLE_SCENARIOS.map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={opt.id === selectedScenario}
                        disabled={opt.disabled}
                        onClick={() => {
                          if (opt.disabled) return;
                          setSelectedScenario(opt.id);
                          setDropOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs ${
                          opt.disabled
                            ? "cursor-not-allowed text-slate-600"
                            : opt.id === selectedScenario
                              ? "bg-cyan-500/10 text-cyan-200"
                              : "text-slate-300 hover:bg-slate-800/60"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.disabled ? (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">
                            Coming soon
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleInitiate}
              className="glow-amber-box inline-flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span aria-hidden>⚡</span>
              Initiate Scenario
            </button>
            <p className="ml-2 text-[10px] text-slate-500">
              Confirmation required · cascade simulation
            </p>
          </div>
        ) : null}

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

      {state === "confirming" ? (
        <ConfirmModal
          scenarioLabel={scenario.label}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      ) : null}
    </footer>
  );
}

interface ConfirmModalProps {
  scenarioLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmModal({ scenarioLabel, onCancel, onConfirm }: ConfirmModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020409]/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-amber-500/40 bg-[#0a1322] p-6 shadow-2xl">
        <h3 className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-amber-300">
          <span aria-hidden>⚡</span>
          Scenario: {scenarioLabel}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          This will simulate a <strong className="text-amber-200">5-stage cascade failure</strong>{" "}
          originating at Factory 2, propagating across the supply network.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              Blast radius
            </dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-amber-200">
              8 nodes
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              Est. exposure
            </dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-rose-300">
              $1.2M – $2.4M
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="glow-amber-box rounded-md border border-amber-400/50 bg-amber-500 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 shadow-lg hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Confirm &amp; Execute
          </button>
        </div>
      </div>
    </div>
  );
}

export { COLLAPSE_STEP_LABELS };
