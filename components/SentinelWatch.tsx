"use client";

import type { SentinelAlert } from "@/lib/types";

interface SentinelWatchProps {
  alerts: SentinelAlert[];
}

function formatTime(ts: Date): string {
  return ts.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const severityStyle: Record<
  SentinelAlert["severity"],
  { dot: string; chip: string }
> = {
  info: {
    dot: "bg-sky-400",
    chip: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  },
  warning: {
    dot: "bg-amber-400",
    chip: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  },
  critical: {
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  },
};

const typeChipStyle: Record<SentinelAlert["type"], string> = {
  health_degraded: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  health_recovered: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  unreachable: "bg-slate-500/10 text-slate-300 ring-slate-500/30",
  collapse_triggered: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  collapse_step: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  collapse_error: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  collapse_complete: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
};

const typeLabel: Record<SentinelAlert["type"], string> = {
  health_degraded: "degraded",
  health_recovered: "recovered",
  unreachable: "unreachable",
  collapse_triggered: "collapse",
  collapse_step: "step",
  collapse_error: "step error",
  collapse_complete: "complete",
};

export function SentinelWatch({ alerts }: SentinelWatchProps) {
  const latestId = alerts[0]?.id;
  return (
    <section
      aria-label="Sentinel watch"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-cyan-300/90">
            SENTINEL WATCH
          </h2>
          <p className="text-[11px] text-slate-500">
            Health transitions and orchestration events, newest first.
          </p>
        </div>
        <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
          {alerts.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-12 text-center text-xs text-slate-500">
            No alerts yet — monitoring live.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {alerts.map((a) => {
              const s = severityStyle[a.severity];
              const isNewest = a.id === latestId;
              return (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 px-4 py-2.5 text-sm ${
                    isNewest ? "bg-slate-800/40" : ""
                  }`}
                >
                  <span className="mt-1 inline-flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                      {formatTime(a.timestamp)}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${s.dot}`}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${typeChipStyle[a.type]}`}
                  >
                    {typeLabel[a.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-slate-200">{a.message}</div>
                    <div className="text-[10px] text-slate-500">
                      {a.location}
                      {a.nodeLabel ? ` · ${a.nodeLabel}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
