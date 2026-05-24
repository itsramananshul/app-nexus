"use client";

interface KpiStripProps {
  totalNodes: number;
  healthyNodes: number;
  pollIntervalSec: number;
}

export function KpiStrip({ totalNodes, healthyNodes, pollIntervalSec }: KpiStripProps) {
  const fleetHealth = totalNodes > 0 ? Math.round((healthyNodes / totalNodes) * 100) : 0;
  const healthColor = fleetHealth >= 100 ? "#22c55e" : fleetHealth >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 24,
        padding: "10px 18px",
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      <Kpi value={`${healthyNodes}/${totalNodes}`} label="Nodes Online" accent="#22c55e" />
      <Kpi value={`${fleetHealth}%`} label="Fleet Health" accent={healthColor} />
      <Kpi value={`${pollIntervalSec}s`} label="Poll Interval" accent="#888" />
    </div>
  );
}

function Kpi({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}
