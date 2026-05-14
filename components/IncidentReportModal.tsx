"use client";

import { useEffect, useState } from "react";

export interface IncidentReport {
  scenarioName: string;
  startedAt: Date;
  endedAt: Date;
  durationLabel: string;
  exposureLabel: string;
  affectedCount: number;
  totalNodes: number;
  maxStage: number;
  stages: { index: number; label: string; status: "done" | "error" | "pending" | "running" }[];
  affectedNodes: { id: string; label: string; location: string; severity: string }[];
}

interface IncidentReportModalProps {
  report: IncidentReport;
  onClose: () => void;
}

function formatReport(r: IncidentReport): string {
  const lines: string[] = [];
  lines.push("=== NEXUS INCIDENT REPORT ===");
  lines.push("");
  lines.push(`Scenario:        ${r.scenarioName}`);
  lines.push(`Started:         ${r.startedAt.toISOString()}`);
  lines.push(`Ended:           ${r.endedAt.toISOString()}`);
  lines.push(`Duration:        ${r.durationLabel}`);
  lines.push(`Peak exposure:   ${r.exposureLabel}`);
  lines.push(`Nodes affected:  ${r.affectedCount}/${r.totalNodes}`);
  lines.push(`Max cascade:     ${r.maxStage} stages`);
  lines.push("");
  lines.push("--- TIMELINE ---");
  for (const s of r.stages) {
    lines.push(
      `  Stage ${s.index + 1}  [${s.status.toUpperCase().padEnd(8)}]  ${s.label}`,
    );
  }
  lines.push("");
  lines.push("--- AFFECTED NODES ---");
  for (const n of r.affectedNodes) {
    lines.push(`  [${n.severity.padEnd(11)}]  ${n.location} · ${n.label}`);
  }
  lines.push("");
  lines.push("--- END OF REPORT ---");
  return lines.join("\n");
}

export function IncidentReportModal({ report, onClose }: IncidentReportModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = formatReport(report);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020409]/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-cyan-500/30 bg-[#0a1322] p-6 shadow-2xl">
        <header className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-cyan-300">
              <span aria-hidden>📋</span>
              Incident Report
            </h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
              {report.scenarioName} · {report.endedAt.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <pre className="mt-4 max-h-[60vh] overflow-auto rounded-md border border-slate-800 bg-[#040711] p-4 font-mono text-[11px] leading-relaxed text-slate-200 scrollbar-thin whitespace-pre-wrap">
          {text}
        </pre>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="glow-cyan-box inline-flex items-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
