"use client";

import { Cpu, GitBranch, Trash2 } from "lucide-react";
import type { ControllerSnapshot } from "@/lib/controller-types";

interface Props {
  snapshot: ControllerSnapshot;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const HEALTH_COLOR: Record<string, string> = {
  online:  "#22c55e",
  offline: "#ef4444",
  loading: "#f59e0b",
};

const HEALTH_LABEL: Record<string, string> = {
  online:  "Online",
  offline: "Offline",
  loading: "Connecting",
};

export function ControllerCard({ snapshot, selected, onSelect, onRemove }: Props) {
  const { entry, health, capabilities, apps } = snapshot;
  const isRouter = entry.role === "router";
  const localCaps = capabilities?.local.length ?? 0;
  const remoteCaps = capabilities?.remote.length ?? 0;
  const appCount = apps.length;

  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? "#111428" : "#0d0f1a",
        border: `1px solid ${selected ? "#4f6ef7" : "#1e2240"}`,
        borderRadius: 10,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isRouter
            ? <GitBranch size={16} color="#4f6ef7" />
            : <Cpu size={16} color="#4f6ef7" />}
          <span style={{ fontWeight: 700, fontSize: 14, color: "#dde1f5" }}>
            {entry.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: isRouter ? "#1a1f40" : "#141a30",
              color: isRouter ? "#7b8fff" : "#5a6aaa",
            }}
          >
            {entry.role}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "#3a4060",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
          }}
          title="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* URL */}
      <div style={{ fontSize: 11, color: "#3a4570", fontFamily: "monospace", marginBottom: 14 }}>
        {entry.url}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16 }}>
        <Stat label="Local caps" value={health === "loading" ? "…" : String(localCaps)} />
        <Stat label="Remote caps" value={health === "loading" ? "…" : String(remoteCaps)} />
        <Stat label="Apps" value={health === "loading" ? "…" : String(appCount)} />
      </div>

      {/* Health badge */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 44,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: HEALTH_COLOR[health],
            display: "inline-block",
            boxShadow: health === "online" ? `0 0 6px ${HEALTH_COLOR[health]}` : "none",
          }}
        />
        <span style={{ fontSize: 11, color: HEALTH_COLOR[health], fontWeight: 600 }}>
          {HEALTH_LABEL[health]}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#dde1f5", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#3a4570", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
