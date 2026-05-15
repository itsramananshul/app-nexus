"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";

export type AuditSeverity = "info" | "warning" | "critical" | "success";

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  severity: AuditSeverity;
}

export interface AuditIncidentMeta {
  scenarioLabel: string | null;
  triggeredAt: Date | null;
  resolvedAt: Date | null;
  affectedNodes: { id: string; label: string; location: string }[];
  productionLoss: number;
  emergencyLabor: number;
  expeditedShipping: number;
}

interface AuditTimelineProps {
  open: boolean;
  onClose: () => void;
  events: AuditEvent[];
  incident: AuditIncidentMeta;
  instanceName: string;
}

const SEVERITY_COLOR: Record<AuditSeverity, string> = {
  info: "#64748b",
  warning: "#f59e0b",
  critical: "#ef4444",
  success: "#22c55e",
};

const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  info: "INFO",
  warning: "WARN",
  critical: "CRIT",
  success: "  OK",
};

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour12: false });
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtElapsed(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function AuditTimeline({
  open,
  onClose,
  events,
  incident,
  instanceName,
}: AuditTimelineProps) {
  const canExport =
    incident.triggeredAt !== null && incident.resolvedAt !== null;

  const sorted = useMemo(() => {
    return [...events].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }, [events]);

  const handleExport = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 48;
    let y = margin;
    const lineHeight = 14;
    const pageHeight = doc.internal.pageSize.getHeight();

    function ensure(lines = 1) {
      if (y + lines * lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }
    function write(text: string, opts?: { bold?: boolean; mono?: boolean; color?: [number, number, number] }) {
      const font = opts?.mono ? "courier" : "helvetica";
      const style = opts?.bold ? "bold" : "normal";
      doc.setFont(font, style);
      const [r, g, b] = opts?.color ?? [0, 0, 0];
      doc.setTextColor(r, g, b);
      const wrapped = doc.splitTextToSize(text, 540) as string[];
      for (const line of wrapped) {
        ensure(1);
        doc.text(line, margin, y);
        y += lineHeight;
      }
    }
    function divider() {
      ensure(2);
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y - 4, margin + 540, y - 4);
      y += 8;
    }

    // Header
    doc.setFontSize(18);
    write("OPENPREM INCIDENT REPORT", { bold: true, color: [13, 148, 136] });
    doc.setFontSize(10);
    write(`Generated: ${new Date().toLocaleString()}`);
    write(`Instance:  ${instanceName}`);
    divider();

    doc.setFontSize(11);
    write("INCIDENT SUMMARY", { bold: true });
    doc.setFontSize(10);
    write(`Scenario:        ${incident.scenarioLabel ?? "—"}`);
    write(
      `Triggered at:    ${incident.triggeredAt ? incident.triggeredAt.toLocaleString() : "—"}`,
    );
    write(
      `Resolved at:     ${incident.resolvedAt ? incident.resolvedAt.toLocaleString() : "—"}`,
    );
    const elapsed =
      incident.triggeredAt && incident.resolvedAt
        ? incident.resolvedAt.getTime() - incident.triggeredAt.getTime()
        : null;
    write(`Total downtime:  ${fmtElapsed(elapsed)}`);
    divider();

    doc.setFontSize(11);
    write("AFFECTED SYSTEMS", { bold: true });
    doc.setFontSize(10);
    if (incident.affectedNodes.length === 0) {
      write("(none recorded)");
    } else {
      for (const n of incident.affectedNodes) {
        write(`  · ${n.label}  (${n.location})  [${n.id}]`);
      }
    }
    divider();

    doc.setFontSize(11);
    write("TIMELINE", { bold: true });
    doc.setFontSize(9);
    const chronological = [...sorted].reverse();
    for (const e of chronological) {
      const line = `${fmtTime(e.timestamp)}  [${SEVERITY_LABEL[e.severity]}]  ${e.message}`;
      write(line, { mono: true });
    }
    divider();

    doc.setFontSize(11);
    write("IMPACT ASSESSMENT", { bold: true });
    doc.setFontSize(10);
    write(`Estimated production loss:   ${fmtMoney(incident.productionLoss)}`);
    write(`Emergency labor costs:       ${fmtMoney(incident.emergencyLabor)}`);
    write(`Expedited shipping:          ${fmtMoney(incident.expeditedShipping)}`);
    const total =
      incident.productionLoss + incident.emergencyLabor + incident.expeditedShipping;
    write(`Total cost avoided:          ${fmtMoney(total)}`, { bold: true });
    divider();

    doc.setFontSize(11);
    write("RESOLUTION", { bold: true });
    doc.setFontSize(10);
    write("Recovery method:   Automated (OpenPrem AI)");
    write("Manual time saved: ~45 minutes");
    write("Stages completed:  3/3");
    divider();

    doc.setFontSize(9);
    write("Prepared by OpenPrem Enterprise Operations Platform", {
      color: [100, 116, 139],
    });

    const date = new Date().toISOString().slice(0, 10);
    const safeInstance = instanceName.replace(/[^a-z0-9_-]+/gi, "-");
    doc.save(`openprem-incident-${date}-${safeInstance}.pdf`);
  };

  return (
    <div
      aria-hidden={!open}
      className="fixed inset-y-0 right-0 z-40 flex w-full sm:w-[400px]"
      style={{
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 250ms ease",
        background: "#0a0a0a",
        borderLeft: "1px solid #1a1a1a",
      }}
    >
      <div className="flex h-full w-full flex-col">
        <header
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid #1a1a1a" }}
        >
          <h2
            style={{
              fontSize: 11,
              color: "#444",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 500,
            }}
          >
            Audit Log
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!canExport}
              title={
                canExport
                  ? "Export incident report as PDF"
                  : "PDF available after a collapse + recovery cycle"
              }
              style={{
                background: "transparent",
                border: "1px solid #2a2a2a",
                color: canExport ? "#888" : "#444",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 500,
                cursor: canExport ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (canExport) e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                if (canExport) e.currentTarget.style.color = "#888";
              }}
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close audit timeline"
              style={{ color: "#555" }}
              className="text-lg leading-none px-1 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{ scrollbarColor: "#222 #000" }}
        >
          {sorted.length === 0 ? (
            <div
              className="p-6 text-center"
              style={{ color: "#444", fontSize: 12 }}
            >
              No events recorded yet. Trigger a scenario or wait for the system poll.
            </div>
          ) : (
            <ul>
              {sorted.map((e) => (
                <li
                  key={e.id}
                  className="px-4 py-3"
                  style={{
                    borderBottom: "1px solid #111",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(ev) =>
                    (ev.currentTarget.style.background = "#111")
                  }
                  onMouseLeave={(ev) =>
                    (ev.currentTarget.style.background = "transparent")
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: SEVERITY_COLOR[e.severity],
                        flexShrink: 0,
                        transform: "translateY(2px)",
                      }}
                      aria-hidden
                    />
                    <span
                      className="font-mono tabular-nums"
                      style={{ fontSize: 11, color: "#444" }}
                    >
                      {fmtTime(e.timestamp)}
                    </span>
                  </div>
                  <div
                    className="mt-1"
                    style={{ fontSize: 13, color: "#888", paddingLeft: 14 }}
                  >
                    {e.message}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
