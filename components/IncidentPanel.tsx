"use client";

import { useEffect, useState } from "react";
import type { AffectedNode } from "./BlastRadiusPanel";

interface IncidentPanelProps {
  // null when no incident is active
  scenarioName: string | null;
  scenarioState: "idle" | "executing" | "complete" | "recovering" | "nominal" | "confirming";
  affected: AffectedNode[];
  elapsedMs: number;
  recovering: boolean;
  recoveryProgressPct: number; // 0..100
  costAvoided: number | null; // shown after recovery complete
  onInitiateRecovery: () => void;
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

export function IncidentPanel({
  scenarioName,
  scenarioState,
  affected,
  elapsedMs,
  recovering,
  recoveryProgressPct,
  costAvoided,
  onInitiateRecovery,
}: IncidentPanelProps) {
  const incidentActive =
    scenarioState === "executing" ||
    scenarioState === "complete" ||
    scenarioState === "recovering" ||
    scenarioState === "nominal";

  if (!incidentActive) {
    return (
      <aside
        aria-label="No incident"
        style={{
          background: "#0a0a0a",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#22c55e",
              margin: "0 auto 12px",
            }}
            aria-hidden
          />
          <div
            style={{
              color: "#444",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            All systems nominal
          </div>
        </div>
      </aside>
    );
  }

  const showROIInline = scenarioState === "nominal" && costAvoided !== null;

  return (
    <aside
      role="complementary"
      aria-label="Incident & recovery"
      style={{
        background: "#0a0a0a",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 8px",
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              borderRadius: 4,
            }}
          >
            <Pulse />
            Incident active
          </span>
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtElapsed(elapsedMs)}
          </span>
        </div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.3,
          }}
        >
          {scenarioName ?? "Cascade Failure"}
        </h2>
      </header>

      {affected.length > 0 ? (
        <section>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#555",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Affected nodes
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {affected.slice(0, 8).map((n) => (
              <li
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#888",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: n.severity === "critical" ? "#ef4444" : "#f59e0b",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={`${n.location} · ${n.label}`}
                >
                  {n.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ height: 1, background: "#1a1a1a" }} />

      {showROIInline ? (
        <section style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ color: "#22c55e", fontSize: 28, lineHeight: 1, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            {fmtMoney(costAvoided!)} saved
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
            Recovery complete · {fmtElapsed(elapsedMs)}
          </div>
        </section>
      ) : (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#555",
              fontWeight: 500,
            }}
          >
            Recovery comparison
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ~45 min
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                Manual recovery
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#14b8a6",
                  lineHeight: 1.1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ~90 sec
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                AI recovery
              </div>
            </div>
          </div>

          {recovering ? (
            <div>
              <div
                style={{
                  height: 4,
                  background: "#1a1a1a",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(4, recoveryProgressPct))}%`,
                    height: "100%",
                    background: "#14b8a6",
                    transition: "width 300ms ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#14b8a6",
                  marginTop: 6,
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                Reverting cascade…
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onInitiateRecovery}
              disabled={scenarioState !== "complete"}
              style={{
                width: "100%",
                height: 40,
                background: scenarioState === "complete" ? "#0070f3" : "#1a1a1a",
                color: scenarioState === "complete" ? "#fff" : "#444",
                fontWeight: 600,
                fontSize: 13,
                border: "none",
                borderRadius: 8,
                cursor: scenarioState === "complete" ? "pointer" : "not-allowed",
                transition: "background 120ms ease",
              }}
            >
              {scenarioState === "executing"
                ? "Cascade in progress…"
                : "Initiate AI Recovery"}
            </button>
          )}
        </section>
      )}
    </aside>
  );
}

function Pulse() {
  const [bright, setBright] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBright((v) => !v), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "#ef4444",
        opacity: bright ? 1 : 0.4,
        transition: "opacity 200ms ease",
      }}
    />
  );
}
