"use client";

interface KpiStripProps {
  totalNodes: number;
  healthyNodes: number;
  estimatedSavings: number;
}

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

export function KpiStrip({
  totalNodes,
  healthyNodes,
  estimatedSavings,
}: KpiStripProps) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
        padding: "12px 24px",
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 24,
      }}
    >
      <Stat
        value={
          <span>
            45 min <span style={{ color: "#555" }}>→</span>{" "}
            <span style={{ color: "#14b8a6" }}>90 sec</span>
          </span>
        }
        label="Recovery time"
      />
      <Stat
        value={
          <span>
            <span style={{ color: healthyNodes < totalNodes ? "#f59e0b" : "#22c55e" }}>
              {healthyNodes}
            </span>
            <span style={{ color: "#555" }}> / {totalNodes}</span>{" "}
            <span style={{ color: "#888", fontSize: 14, fontWeight: 500 }}>healthy</span>
          </span>
        }
        label="Nodes online"
      />
      <Stat
        value={<span>{fmtMoney(estimatedSavings)}</span>}
        label="Cost avoided per incident (est.)"
      />
    </div>
  );
}

function Stat({
  value,
  label,
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#fff",
          lineHeight: 1.2,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 500,
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}
