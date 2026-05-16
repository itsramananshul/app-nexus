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
      <footer
        style={{
          background: "#0a0a0a",
          borderTop: "1px solid #1a1a1a",
          flexShrink: 0,
        }}
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex flex-col gap-0.5 lg:min-w-[220px]">
            <h2
              style={{
                fontSize: 10,
                color: "#444",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
              }}
            >
              Cascade complete · recovery
            </h2>
            <p style={{ fontSize: 11, color: "#666" }}>
              Reverse cascade · restore operations
            </p>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
            <Stat label="Duration" value={report.durationLabel} />
            <Stat label="Peak exposure" value={report.exposureLabel} color="#ef4444" />
            <Stat label="Nodes affected" value={`${report.affectedCount}/${report.totalNodes}`} />
            <Stat label="Cascade depth" value={`${report.maxStage} stages`} />
          </dl>

          <div className="flex items-center gap-2">
            {recovering ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(20,184,166,0.1)",
                  color: "#14b8a6",
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  border: "1px solid rgba(20,184,166,0.4)",
                }}
              >
                <span
                  aria-hidden
                  className="pulse-live"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#14b8a6",
                  }}
                />
                Recovering · {currentLabel ?? "…"}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onTriggerRecovery}
                  style={{
                    background: "#0070f3",
                    color: "#fff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.02em",
                  }}
                >
                  Initiate AI Recovery
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  style={{
                    background: "transparent",
                    color: "#888",
                    border: "1px solid #2a2a2a",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
                >
                  Incident report
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
  color?: string;
}

function Stat({ label, value, color = "#ffffff" }: StatProps) {
  return (
    <div>
      <dt
        style={{
          fontSize: 9,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          fontWeight: 600,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </dd>
    </div>
  );
}
