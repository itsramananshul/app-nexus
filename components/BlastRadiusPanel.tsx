"use client";

import { useEffect, useMemo, useState } from "react";

interface BlastRadiusPanelProps {
  open: boolean;
  currentStage: number; // 0..4
  totalStages: number;
  affected: AffectedNode[];
  recommended: string[];
  freezeExposure?: number | null; // when set, stop ticking and hold at this value
}

export interface AffectedNode {
  id: string;
  label: string;
  location: string;
  severity: "critical" | "degraded" | "at_risk" | "monitoring";
}

interface Countdown {
  label: string;
  startedAt: number;
  totalMs: number;
}

const COUNTDOWNS: Countdown[] = [
  { label: "Factory 2 Inventory", startedAt: 0, totalMs: 2 * 3600_000 + 47 * 60_000 },
  { label: "Warehouse 1 Stock", startedAt: 0, totalMs: 4 * 3600_000 + 12 * 60_000 },
  { label: "Order SLA Breach", startedAt: 0, totalMs: 1 * 3600_000 + 15 * 60_000 },
];

const SEVERITY_STYLES: Record<
  AffectedNode["severity"],
  { dot: string; label: string; cls: string }
> = {
  critical: { dot: "bg-rose-500", label: "CRITICAL", cls: "text-rose-300" },
  degraded: { dot: "bg-amber-400", label: "DEGRADED", cls: "text-amber-300" },
  at_risk: { dot: "bg-amber-500/70", label: "AT RISK", cls: "text-amber-200" },
  monitoring: { dot: "bg-slate-400", label: "MONITORING", cls: "text-slate-400" },
};

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00h 00m 00s";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function BlastRadiusPanel({
  open,
  currentStage,
  totalStages,
  affected,
  recommended,
  freezeExposure,
}: BlastRadiusPanelProps) {
  const [exposure, setExposure] = useState<number>(0);
  const [tick, setTick] = useState<Date>(new Date());
  const [startedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!open) {
      setExposure(0);
      return;
    }
    if (typeof freezeExposure === "number") {
      setExposure(freezeExposure);
      return;
    }
    const id = setInterval(() => {
      setExposure((prev) => prev + Math.floor(500 + Math.random() * 1500));
      setTick(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, [open, freezeExposure]);

  const countdowns = useMemo(() => {
    const elapsed = tick.getTime() - startedAt;
    return COUNTDOWNS.map((c) => ({
      label: c.label,
      remaining: Math.max(0, c.totalMs - elapsed),
      pct: Math.max(0, Math.min(100, ((c.totalMs - elapsed) / c.totalMs) * 100)),
    }));
  }, [tick, startedAt]);

  if (!open) return null;

  return (
    <aside
      role="complementary"
      aria-label="Blast radius analysis"
      className="panel-enter flex h-full min-w-0 flex-col gap-3 overflow-y-auto border-l border-rose-500/20 bg-[#070b16] p-4 scrollbar-thin"
    >
      <header>
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-500 pulse-live" />
          Blast Radius Analysis
        </h2>
        <p className="text-[10px] text-slate-500">Real-time impact projection</p>
      </header>

      {/* Financial exposure */}
      <section className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300/80">
          Financial Exposure
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-rose-300 truncate" title={formatCurrency(exposure)}>
          {formatCurrency(exposure)}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-rose-500/80 to-rose-300 transition-all"
            style={{
              width: `${Math.min(100, (exposure / 3_000_000) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
          Ticking +$500–$2,000/sec · Projected ceiling $3.0M
        </p>
      </section>

      {/* Time to critical */}
      <section className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
          Time to Critical
        </p>
        <ul className="mt-2 space-y-2">
          {countdowns.map((c) => (
            <li key={c.label}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">{c.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-amber-200">
                  {formatCountdown(c.remaining)}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Affected nodes */}
      <section className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Affected Nodes
        </p>
        <ul className="mt-2 space-y-1.5">
          {affected.length === 0 ? (
            <li className="text-[11px] text-slate-500">
              No nodes affected · monitoring
            </li>
          ) : (
            affected.map((n) => {
              const s = SEVERITY_STYLES[n.severity];
              return (
                <li key={n.id} className="flex items-center gap-2 min-w-0">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                  <span
                    className="flex-1 min-w-0 truncate text-[11px] text-slate-200"
                    title={`${n.location} · ${n.label}`}
                  >
                    {n.location} · <span className="text-slate-400">{n.label}</span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[9px] uppercase tracking-wider ${s.cls}`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Cascade stage */}
      <section className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Cascade Stage
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: totalStages }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < currentStage
                    ? "bg-rose-500"
                    : i === currentStage
                      ? "bg-amber-400 pulse-live"
                      : "bg-slate-700"
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-slate-300">
            Stage {currentStage + 1} of {totalStages}
          </span>
        </div>
      </section>

      {/* Recommended actions */}
      <section className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
          Recommended Actions
        </p>
        <ul className="mt-2 space-y-1.5">
          {recommended.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-[11px] text-slate-300"
            >
              <span className="text-cyan-400">→</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
