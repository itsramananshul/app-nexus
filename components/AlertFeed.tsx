"use client";

import { useMemo, useState } from "react";
import type { SentinelAlert } from "@/lib/types";

interface AlertFeedProps {
  alerts: SentinelAlert[];
}

const SEVERITY_META: Record<
  SentinelAlert["severity"],
  { icon: string; bar: string; tag: string; tagBg: string }
> = {
  critical: {
    icon: "🔴",
    bar: "border-l-rose-500",
    tag: "text-rose-300",
    tagBg: "bg-rose-500/15 ring-rose-500/40",
  },
  warning: {
    icon: "🟡",
    bar: "border-l-amber-400",
    tag: "text-amber-300",
    tagBg: "bg-amber-500/15 ring-amber-500/40",
  },
  info: {
    icon: "🔵",
    bar: "border-l-cyan-500",
    tag: "text-cyan-300",
    tagBg: "bg-cyan-500/10 ring-cyan-500/30",
  },
};

const TYPE_HEADLINE: Record<SentinelAlert["type"], string> = {
  health_degraded: "Anomaly detected",
  health_recovered: "Node recovered",
  unreachable: "Node unreachable",
  collapse_triggered: "Scenario initiated",
  collapse_step: "Cascade stage",
  collapse_error: "Stage error",
  collapse_complete: "Cascade complete",
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function impactFor(alert: SentinelAlert): string | null {
  switch (alert.type) {
    case "health_degraded":
    case "unreachable":
      return `Impact: downstream nodes at risk · ${alert.location}`;
    case "collapse_step":
      return `Propagation continuing · monitoring downstream impact`;
    case "collapse_triggered":
      return `Cascade simulation engaged · 5 stages projected`;
    case "collapse_complete":
      return `Recovery protocol available · estimated reverse cascade 15s`;
    case "collapse_error":
      return `Stage step failed · review configuration`;
    case "health_recovered":
      return `Operational status restored`;
    default:
      return null;
  }
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const counts = useMemo(() => {
    let c = 0,
      w = 0,
      i = 0;
    for (const a of alerts) {
      if (a.severity === "critical") c++;
      else if (a.severity === "warning") w++;
      else i++;
    }
    return { critical: c, warning: w, info: i };
  }, [alerts]);

  return (
    <section className="flex h-full flex-col rounded-xl border border-cyan-500/10 bg-[#070b16]/60">
      <header className="border-b border-slate-800/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Sentinel · Alert Feed
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px]">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={alerts.length}
            tone="text-slate-300"
          />
          <FilterChip
            active={filter === "critical"}
            onClick={() => setFilter("critical")}
            label="Critical"
            count={counts.critical}
            tone="text-rose-300"
          />
          <FilterChip
            active={filter === "warning"}
            onClick={() => setFilter("warning")}
            label="Warning"
            count={counts.warning}
            tone="text-amber-300"
          />
        </div>
      </header>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin">
        {filtered.length === 0 ? (
          <li className="py-10 text-center text-[11px] text-slate-500">
            {filter === "all"
              ? "No alerts · system standing by"
              : `No ${filter} alerts`}
          </li>
        ) : (
          filtered.map((a) => {
            const meta = SEVERITY_META[a.severity];
            return (
              <li
                key={a.id}
                className={`alert-enter rounded-r-md border-l-2 bg-slate-900/40 px-3 py-2 ${meta.bar}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-slate-500">
                      {formatTime(a.timestamp)}
                    </span>
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-inset ${meta.tagBg} ${meta.tag}`}
                    >
                      {a.severity.toUpperCase()}
                    </span>
                  </div>
                  <span aria-hidden className="text-[10px]">
                    {meta.icon}
                  </span>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-slate-100">
                  {TYPE_HEADLINE[a.type]}
                </p>
                <p className="text-[11px] text-slate-300">
                  <span className="text-slate-400">{a.location}</span>
                  {" · "}
                  <span className="text-slate-500">{a.nodeLabel}</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {a.message}
                </p>
                {impactFor(a) ? (
                  <p className="mt-1 text-[10px] italic text-slate-500">
                    {impactFor(a)}
                  </p>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone: string;
}

function FilterChip({ active, onClick, label, count, tone }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono uppercase tracking-wider transition-colors ${
        active
          ? `bg-slate-800 ${tone} ring-1 ring-inset ring-slate-700`
          : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
      }`}
    >
      {label} <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
