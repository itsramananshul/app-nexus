"use client";

import type { NodeStatus } from "@/lib/types";

interface TopBarProps {
  totalNodes: number;
  statuses: Map<string, NodeStatus>;
  nodesWithoutKey: number;
  activeAlerts: number;
  onOpenApiKeys: () => void;
  onOpenAudit: () => void;
  mapVisible: boolean;
  onToggleMap: () => void;
}

export function TopBar({
  totalNodes,
  statuses,
  nodesWithoutKey,
  activeAlerts,
  onOpenApiKeys,
  onOpenAudit,
  mapVisible,
  onToggleMap,
}: TopBarProps) {
  let ok = 0;
  let degraded = 0;
  let down = 0;
  for (const s of statuses.values()) {
    if (s.health === "ok") ok += 1;
    else if (s.health === "degraded") degraded += 1;
    else if (s.health === "unreachable") down += 1;
  }

  return (
    <header
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "#000",
        borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
      }}
    >
      {/* Left: wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.15em",
          }}
        >
          OPENPREM
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#666",
            letterSpacing: "0.06em",
          }}
        >
          Open Intelligence Interconnect
        </span>
      </div>

      {/* Right: health pills + ghost buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <HealthPill color="#22c55e" label="Online" value={ok} />
        <HealthPill color="#f59e0b" label="Degraded" value={degraded} />
        <HealthPill color="#ef4444" label="Down" value={down} />
        <span style={{ fontSize: 10, color: "#444", marginRight: 4 }}>
          {totalNodes} total
        </span>
        {activeAlerts > 0 ? (
          <HealthPill color="#ef4444" label="Alerts" value={activeAlerts} />
        ) : null}

        <GhostButton onClick={onToggleMap} active={mapVisible} title="Toggle supply map">
          Map
        </GhostButton>
        <GhostButton onClick={onOpenAudit} title="Open audit log">
          Audit
        </GhostButton>
        <GhostButton
          onClick={onOpenApiKeys}
          title="API keys"
          accent={nodesWithoutKey > 0}
        >
          API Keys{nodesWithoutKey > 0 ? ` (${nodesWithoutKey})` : ""}
        </GhostButton>
      </div>
    </header>
  );
}

function HealthPill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 5,
        fontSize: 11,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}66`,
        }}
      />
      <span style={{ fontWeight: 700, color: "#fff" }}>{value}</span>
      <span style={{ color: "#888" }}>{label}</span>
    </span>
  );
}

function GhostButton({
  onClick,
  children,
  title,
  active,
  accent,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? "#111" : "transparent",
        border: `1px solid ${accent ? "#f59e0b" : active ? "#2a2a2a" : "#2a2a2a"}`,
        color: accent ? "#f59e0b" : active ? "#fff" : "#888",
        padding: "5px 10px",
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        transition: "color 120ms, border-color 120ms",
      }}
      onMouseEnter={(e) => {
        if (!active && !accent) {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "#444";
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !accent) {
          e.currentTarget.style.color = "#888";
          e.currentTarget.style.borderColor = "#2a2a2a";
        }
      }}
    >
      {children}
    </button>
  );
}
