"use client";

import { useEffect, useState } from "react";

export type KpiScenarioState =
  | "idle"
  | "executing"
  | "complete"
  | "recovering"
  | "nominal";

interface KpiStripProps {
  totalNodes: number;
  healthyNodes: number;
  pollIntervalSec: number;
  scenarioState: KpiScenarioState;
  peakExposure: number;
  elapsedMs: number;
  costAvoided: number | null;
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function KpiStrip({
  totalNodes,
  healthyNodes,
  pollIntervalSec,
  scenarioState,
  peakExposure,
  elapsedMs,
  costAvoided,
}: KpiStripProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6"
      style={{
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      {scenarioState === "idle" ? (
        <IdleSummary
          totalNodes={totalNodes}
          healthyNodes={healthyNodes}
          pollIntervalSec={pollIntervalSec}
        />
      ) : scenarioState === "executing" || scenarioState === "complete" ? (
        <ActiveIncident peakExposure={peakExposure} elapsedMs={elapsedMs} />
      ) : scenarioState === "recovering" ? (
        <RecoveryProgress elapsedMs={elapsedMs} />
      ) : (
        <RecoveryComplete
          costAvoided={costAvoided}
          elapsedMs={elapsedMs}
        />
      )}
    </div>
  );
}

function IdleSummary({
  totalNodes,
  healthyNodes,
  pollIntervalSec,
}: {
  totalNodes: number;
  healthyNodes: number;
  pollIntervalSec: number;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "#888",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span>
        <span style={{ color: "#fff", fontWeight: 600 }}>{totalNodes}</span>{" "}
        nodes monitored
      </span>
      <Dot />
      <span>
        <span style={{ color: "#fff", fontWeight: 600 }}>{pollIntervalSec}s</span>{" "}
        refresh
      </span>
      <Dot />
      <span>
        <span
          style={{
            color: healthyNodes === totalNodes ? "#22c55e" : "#f59e0b",
            fontWeight: 600,
          }}
        >
          {healthyNodes}/{totalNodes}
        </span>{" "}
        healthy
      </span>
      <Dot />
      <span style={{ color: "#22c55e" }}>0 incidents</span>
    </div>
  );
}

function ActiveIncident({
  peakExposure,
  elapsedMs,
}: {
  peakExposure: number;
  elapsedMs: number;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 18,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "#ef4444",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <PulseDot />
        Cascade active
      </span>
      <Dot />
      <span style={{ color: "#888" }}>
        <span
          style={{
            color: "#ef4444",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtMoney(peakExposure)}
        </span>{" "}
        exposure
      </span>
      <Dot />
      <span style={{ color: "#888" }}>
        <span
          style={{
            color: "#fff",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {fmtElapsed(elapsedMs)}
        </span>{" "}
        elapsed
      </span>
    </div>
  );
}

function RecoveryProgress({ elapsedMs }: { elapsedMs: number }) {
  return (
    <div
      style={{
        fontSize: 13,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "#14b8a6",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <PulseDot color="#14b8a6" />
        Recovery in progress
      </span>
      <Dot />
      <span style={{ color: "#888" }}>
        <span
          style={{
            color: "#fff",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {fmtElapsed(elapsedMs)}
        </span>{" "}
        elapsed
      </span>
    </div>
  );
}

function RecoveryComplete({
  costAvoided,
  elapsedMs,
}: {
  costAvoided: number | null;
  elapsedMs: number;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 16 }}>✓</span>
      <span style={{ color: "#888" }}>
        <span
          style={{
            color: "#22c55e",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtMoney(costAvoided ?? 0)}
        </span>{" "}
        saved
      </span>
      <Dot />
      <span style={{ color: "#888" }}>
        Recovered in{" "}
        <span
          style={{
            color: "#fff",
            fontWeight: 600,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {fmtElapsed(elapsedMs)}
        </span>
      </span>
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      style={{
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: "#333",
        display: "inline-block",
      }}
    />
  );
}

function PulseDot({ color = "#ef4444" }: { color?: string }) {
  const [bright, setBright] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBright((v) => !v), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        opacity: bright ? 1 : 0.35,
        transition: "opacity 200ms ease",
      }}
    />
  );
}
