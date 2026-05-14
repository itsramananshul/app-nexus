"use client";

import { useState } from "react";
import { IncidentReportModal, type IncidentReport } from "./IncidentReportModal";

interface RecoveryPanelProps {
  report: IncidentReport;
  recovering: boolean;
  currentLabel: string | null;
  onTriggerRecovery: () => void;
}

export function RecoveryPanel({
  report,
  recovering,
  currentLabel,
  onTriggerRecovery,
}: RecoveryPanelProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-emerald-500/20 bg-[#070b16]/95 backdrop-blur supports-[backdrop-filter]:bg-[#070b16]/80">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex flex-col gap-0.5 lg:min-w-[260px]">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
              <span aria-hidden>⚡</span>
              Scenario Complete · Recovery Mode
            </h2>
            <p className="text-[10px] text-slate-500">
              Reverse cascade · restore operations
            </p>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-[11px] md:grid-cols-4">
            <Stat label="Duration" value={report.durationLabel} />
            <Stat label="Peak Exposure" value={report.exposureLabel} tone="text-rose-300" />
            <Stat label="Nodes Affected" value={`${report.affectedCount}/${report.totalNodes}`} />
            <Stat label="Cascade Depth" value={`${report.maxStage} stages`} />
          </dl>

          <div className="flex items-center gap-2">
            {recovering ? (
              <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                Recovering · {currentLabel ?? "…"}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onTriggerRecovery}
                  className="glow-cyan-box inline-flex items-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <span aria-hidden>🔄</span>
                  Initiate Recovery Protocol
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <span aria-hidden>📋</span>
                  Generate Incident Report
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {reportOpen ? (
        <IncidentReportModal
          report={report}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </>
  );
}

interface StatProps {
  label: string;
  value: string;
  tone?: string;
}

function Stat({ label, value, tone = "text-slate-100" }: StatProps) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </dt>
      <dd className={`font-mono text-sm font-semibold tabular-nums ${tone}`}>
        {value}
      </dd>
    </div>
  );
}
