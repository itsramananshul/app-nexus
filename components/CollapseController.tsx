"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLLAPSE_STEP_LABELS,
  runFactoryCollapse,
} from "@/lib/collapse";
import type {
  CollapseApiKeys,
  CollapseStep,
  CollapseUrls,
  SentinelAlert,
} from "@/lib/types";

interface CollapseControllerProps {
  urls: CollapseUrls;
  apiKeys: CollapseApiKeys;
  onAlert: (alert: SentinelAlert) => void;
  onCollapsingNodeChange: (nodeId: string | null) => void;
}

type Phase = "idle" | "running" | "complete";

const STEP_TO_NODE: Record<number, { id: string; label: string; location: string }> = {
  0: { id: "f2-materials", label: "Raw Materials", location: "Factory 2" },
  1: { id: "corp-orders", label: "Orders", location: "Corporate" },
  2: { id: "corp-shipments", label: "Shipments", location: "Corporate" },
  3: { id: "corp-support", label: "Support Tickets", location: "Corporate" },
  4: { id: "corp-erp", label: "ERP System", location: "Corporate" },
};

function newAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const INITIAL_STEPS: CollapseStep[] = COLLAPSE_STEP_LABELS.map((label, i) => ({
  index: i,
  label,
  status: "pending",
}));

const stepIcon: Record<CollapseStep["status"], string> = {
  pending: "⏳",
  running: "⚡",
  done: "✅",
  error: "❌",
};

const stepIconColor: Record<CollapseStep["status"], string> = {
  pending: "text-slate-500",
  running: "text-amber-300 pulse-live",
  done: "text-emerald-400",
  error: "text-rose-400",
};

export function CollapseController({
  urls,
  apiKeys,
  onAlert,
  onCollapsingNodeChange,
}: CollapseControllerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<CollapseStep[]>(INITIAL_STEPS);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [elapsed, setElapsed] = useState<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setCurrentIndex(-1);
    setElapsed(0);
  }, []);

  const handleTrigger = useCallback(() => {
    setPhase("running");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setCurrentIndex(0);
    startRef.current = Date.now();
    setElapsed(0);

    onAlert({
      id: newAlertId(),
      timestamp: new Date(),
      nodeId: "f2-materials",
      nodeLabel: "Factory 2",
      location: "Factory 2",
      type: "collapse_triggered",
      message:
        "FACTORY 2 COLLAPSE INITIATED · cascading failures across 5 systems",
      severity: "critical",
    });

    void runFactoryCollapse(urls, apiKeys, {
      onStepStart: (index, label) => {
        setCurrentIndex(index);
        setSteps((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, status: "running", error: undefined } : s,
          ),
        );
        const target = STEP_TO_NODE[index];
        if (target) onCollapsingNodeChange(target.id);
        onAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: target?.id ?? "nexus",
          nodeLabel: target?.label ?? "Nexus",
          location: target?.location ?? "Factory 2",
          type: "collapse_step",
          message: `Step ${index + 1}/5 · ${label}`,
          severity: "warning",
        });
      },
      onStepDone: (index, label) => {
        setSteps((prev) =>
          prev.map((s, i) => (i === index ? { ...s, status: "done" } : s)),
        );
        onCollapsingNodeChange(null);
        const target = STEP_TO_NODE[index];
        onAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: target?.id ?? "nexus",
          nodeLabel: target?.label ?? "Nexus",
          location: target?.location ?? "Factory 2",
          type: "collapse_step",
          message: `Step ${index + 1}/5 done · ${label}`,
          severity: "info",
        });
      },
      onStepError: (index, label, error) => {
        setSteps((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, status: "error", error } : s,
          ),
        );
        onCollapsingNodeChange(null);
        const target = STEP_TO_NODE[index];
        onAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: target?.id ?? "nexus",
          nodeLabel: target?.label ?? "Nexus",
          location: target?.location ?? "Factory 2",
          type: "collapse_error",
          message: `Step ${index + 1}/5 failed · ${label} — ${error}`,
          severity: "critical",
        });
      },
      onComplete: () => {
        setPhase("complete");
        onCollapsingNodeChange(null);
        onAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: "f2-materials",
          nodeLabel: "Factory 2",
          location: "Factory 2",
          type: "collapse_complete",
          message: "CASCADE COMPLETE · 5 systems affected",
          severity: "critical",
        });
      },
    });
  }, [urls, apiKeys, onAlert, onCollapsingNodeChange]);

  const completed = steps.filter(
    (s) => s.status === "done" || s.status === "error",
  ).length;
  const progressPct = Math.round((completed / steps.length) * 100);

  return (
    <footer className="border-t border-slate-800 bg-[#06070d]/95 backdrop-blur supports-[backdrop-filter]:bg-[#06070d]/70">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex flex-col gap-1 lg:min-w-[260px]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-300/90">
            Reality Engine · Scenario
          </h2>
          <p className="text-[11px] text-slate-500">
            Factory 2 Collapse · 5-step orchestrated cascade
          </p>
        </div>

        <div className="flex flex-1 items-center gap-3">
          {phase === "idle" ? (
            <div className="flex w-full flex-col gap-1 lg:flex-row lg:items-center lg:gap-3">
              <button
                type="button"
                onClick={handleTrigger}
                className="glow-red inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg ring-1 ring-rose-400/60 hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <span aria-hidden>⚡</span>
                TRIGGER FACTORY 2 COLLAPSE
              </button>
              <p className="text-[11px] text-amber-300/80">
                This will cascade failures across 5 systems.
              </p>
            </div>
          ) : phase === "running" ? (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                  Running…
                </span>
                <span className="text-sm text-slate-200">
                  {currentIndex >= 0 ? steps[currentIndex]?.label : "—"}
                </span>
                <span className="ml-auto font-mono text-xs text-slate-400 tabular-nums">
                  Step {Math.max(1, currentIndex + 1)} / {steps.length}
                </span>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {elapsed.toFixed(1)}s
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-inset ring-rose-500/40">
                <span aria-hidden>⚠</span> CASCADE COMPLETE — 5 systems affected
              </span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {elapsed.toFixed(1)}s elapsed
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="ml-auto rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Reset / Run Again
              </button>
            </div>
          )}
        </div>

        <ol className="grid grid-cols-1 gap-1 text-[11px] lg:max-w-[380px] lg:flex-shrink-0">
          {steps.map((s) => (
            <li key={s.index} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-flex w-4 shrink-0 ${stepIconColor[s.status]}`}
              >
                {stepIcon[s.status]}
              </span>
              <span
                className={`flex-1 truncate ${
                  s.status === "running"
                    ? "text-amber-200"
                    : s.status === "done"
                      ? "text-emerald-300"
                      : s.status === "error"
                        ? "text-rose-300"
                        : "text-slate-400"
                }`}
                title={s.error ?? s.label}
              >
                {s.label}
                {s.status === "error" && s.error ? (
                  <span className="ml-1 text-rose-400/80">— {s.error}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </footer>
  );
}
