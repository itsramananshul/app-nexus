"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KpiStrip } from "@/components/KpiStrip";
import FactoryMap from "@/components/FactoryMap";
import { NetworkGraph } from "@/components/NetworkGraph";
import { NexusApiKeysPanel } from "@/components/NexusApiKeysPanel";
import { NoNodesView } from "@/components/NoNodesView";
import { TopBar } from "@/components/TopBar";
import {
  AuditTimeline,
  type AuditEvent,
  type AuditSeverity,
} from "@/components/AuditTimeline";
import { getNodes, primaryMetricFor, type NodeConfig } from "@/lib/nodes";
import { useNodeKeyOverrides } from "@/lib/nodeKeyOverrides";
import type { NodeStatus, SentinelAlert } from "@/lib/types";
import { usePoller } from "@/lib/usePoller";
import { useControllerHealth } from "@/lib/useControllerHealth";
import { notify, requestPermissionOnce } from "@/lib/notifications";

const ALERT_MAX = 200;
const SPARKLINE_HISTORY_MAX = 20;
const EMPTY_SET: Set<string> = new Set();

export default function Page() {
  const baseNodes = useMemo(() => getNodes(), []);
  const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [keysPanelOpen, setKeysPanelOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [history, setHistory] = useState<Map<string, number[]>>(new Map());
  const [mapExpanded, setMapExpanded] = useState(false);

  const { overrides, setOverride, clearOverride, isLoaded: keysLoaded } =
    useNodeKeyOverrides();

  const controllerHealth = useControllerHealth();

  const [mapVisible, setMapVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("nexus_map_visible") !== "false";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("nexus_map_visible", String(mapVisible));
  }, [mapVisible]);

  const lastPollLogAtRef = useRef<number>(0);

  const logEvent = useCallback(
    (severity: AuditSeverity, type: string, message: string) => {
      const ev: AuditEvent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
        type,
        message,
        severity,
      };
      setAuditEvents((prev) => [ev, ...prev].slice(0, 500));
    },
    [],
  );

  const nodes = useMemo<NodeConfig[]>(() => {
    return baseNodes.map((n) => {
      const override = overrides[n.id];
      if (override && override.trim() !== "") {
        return { ...n, apiKey: override.trim() };
      }
      return n;
    });
  }, [baseNodes, overrides]);

  const handleAlert = useCallback((alert: SentinelAlert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, ALERT_MAX));
    if (alert.type === "health_degraded" || alert.type === "unreachable") {
      const severity = alert.severity === "critical" ? "CRITICAL" : "DEGRADED";
      notify(
        alert.nodeId,
        `OpenPrem Alert · ${severity}`,
        `${alert.location} · ${alert.nodeLabel} — ${alert.message}`,
      );
    }
  }, []);

  // Don't poll apps unless at least one controller is reachable — the mesh is
  // gated on the OII controller plane, not on raw HTTP reachability of the
  // Vercel-hosted apps.
  const pollingNodes =
    keysLoaded && controllerHealth.loaded && controllerHealth.anyReachable
      ? nodes
      : [];
  const statuses = usePoller(pollingNodes, handleAlert);

  useEffect(() => {
    void requestPermissionOnce();
  }, []);

  const initLoggedRef = useRef(false);
  useEffect(() => {
    if (initLoggedRef.current) return;
    if (!keysLoaded || nodes.length === 0) return;
    initLoggedRef.current = true;
    logEvent("info", "loaded", `OpenPrem initialized · ${nodes.length} nodes connected`);
  }, [keysLoaded, nodes.length, logEvent]);

  useEffect(() => {
    if (statuses.size === 0) return;
    const t = Date.now();
    if (t - lastPollLogAtRef.current < 60_000) return;
    lastPollLogAtRef.current = t;
    let anomalies = 0;
    for (const s of statuses.values()) if (s.health !== "ok") anomalies += 1;
    if (anomalies === 0) {
      logEvent("info", "poll", "System poll · all nodes healthy");
    } else {
      logEvent(
        "warning",
        "poll",
        `System poll · ${anomalies} ${anomalies === 1 ? "anomaly" : "anomalies"} detected`,
      );
    }
  }, [statuses, logEvent]);

  useEffect(() => {
    if (statuses.size === 0) return;
    setHistory((prev) => {
      const next = new Map(prev);
      for (const node of nodes) {
        const s = statuses.get(node.id);
        if (!s?.details) continue;
        const { value } = primaryMetricFor(node.type, s.details);
        if (typeof value !== "number") continue;
        const arr = next.get(node.id) ?? [];
        if (arr.length > 0 && arr[arr.length - 1] === value) continue;
        next.set(node.id, [...arr, value].slice(-SPARKLINE_HISTORY_MAX));
      }
      return next;
    });
  }, [statuses, nodes]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeAlerts = useMemo(
    () =>
      alerts.filter((a) => a.severity === "critical" || a.severity === "warning")
        .length,
    [alerts],
  );

  const healthyCount = useMemo(
    () => Array.from(statuses.values()).filter((s) => s.health === "ok").length,
    [statuses],
  );

  if (baseNodes.length === 0) {
    return <NoNodesView />;
  }

  if (controllerHealth.loaded && !controllerHealth.anyReachable) {
    return (
      <ControllersOfflineView
        total={controllerHealth.total}
        hasAny={controllerHealth.total > 0}
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <TopBar
        totalNodes={nodes.length}
        statuses={statuses}
        nodesWithoutKey={nodes.filter((n) => !n.apiKey).length}
        activeAlerts={activeAlerts}
        onOpenApiKeys={() => setKeysPanelOpen(true)}
        onOpenAudit={() => setAuditOpen(true)}
        mapVisible={mapVisible}
        onToggleMap={() => setMapVisible((v) => !v)}
      />

      <KpiStrip
        totalNodes={nodes.length}
        healthyNodes={healthyCount}
        pollIntervalSec={3}
      />

      <main className="flex-1 overflow-hidden" style={{ background: "#000" }}>
        <div className="h-full w-full grid grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_300px] lg:grid-rows-[1fr] overflow-hidden">
          <div
            className="relative min-w-0 h-full overflow-hidden"
            style={{ background: "#000", padding: "12px 16px" }}
          >
            <NetworkGraph
              nodes={nodes}
              statuses={statuses}
              collapsingNodeIds={EMPTY_SET}
              now={now}
              isLoadingKeys={!keysLoaded}
              history={history}
            />
          </div>

          <div
            className="flex w-full flex-col border-t border-[#1a1a1a] lg:w-[300px] lg:h-full lg:border-t-0 lg:border-l"
            style={{ background: "#0a0a0a" }}
          >
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <NetworkStatusPanel nodes={nodes} statuses={statuses} />
            </div>

            {mapVisible ? (
              <div
                style={{
                  flex: "0 0 38%",
                  minHeight: 200,
                  borderTop: "1px solid #1a1a1a",
                  background: "#000",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 10,
                    fontSize: 9,
                    color: "#333",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    zIndex: 10,
                    pointerEvents: "none",
                    fontWeight: 600,
                  }}
                >
                  Supply Map
                </span>
                <button
                  type="button"
                  onClick={() => setMapExpanded(true)}
                  aria-label="Expand map"
                  title="Expand map"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.7)",
                    border: "1px solid #1e1e1e",
                    color: "#888",
                    cursor: "pointer",
                    zIndex: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 2h5v5" />
                    <path d="M14 2L8 8" />
                    <path d="M7 14H2v-5" />
                    <path d="M2 14l6-6" />
                  </svg>
                </button>
                <FactoryMap
                  nodes={nodes.map((n) => {
                    const s = statuses.get(n.id);
                    const status =
                      s?.health === "ok"
                        ? "healthy"
                        : s?.health === "degraded"
                          ? "degraded"
                          : s?.health === "unreachable"
                            ? "critical"
                            : "unknown";
                    return {
                      name: n.label,
                      status,
                      uptime_pct:
                        s?.health === "ok"
                          ? 100
                          : s?.health === "degraded"
                            ? 70
                            : 0,
                    };
                  })}
                  history={history}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <NexusApiKeysPanel
        open={keysPanelOpen}
        onClose={() => setKeysPanelOpen(false)}
        nodes={baseNodes}
        overrides={overrides}
        onSetOverride={setOverride}
        onClearOverride={clearOverride}
      />

      <AuditTimeline
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        events={auditEvents}
        incident={{
          scenarioLabel: null,
          triggeredAt: null,
          resolvedAt: null,
          affectedNodes: [],
          productionLoss: 0,
          emergencyLabor: 0,
          expeditedShipping: 0,
        }}
        instanceName={
          process.env.NEXT_PUBLIC_INSTANCE_NAME ?? "openprem-nexus"
        }
      />

      {mapExpanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded supply map"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMapExpanded(false);
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(1100px, 100%)",
              height: "min(720px, 90vh)",
              background: "#000",
              border: "1px solid #1a1a1a",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
          >
            <header
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 40,
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #1a1a1a",
                background: "rgba(0,0,0,0.6)",
                zIndex: 11,
              }}
            >
              <span style={{ fontSize: 10, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
                Supply Map · OpenPrem
              </span>
              <button
                type="button"
                onClick={() => setMapExpanded(false)}
                aria-label="Close expanded map"
                style={{
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  color: "#888",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </header>
            <div style={{ position: "absolute", inset: 0, paddingTop: 40 }}>
              <FactoryMap
                nodes={nodes.map((n) => {
                  const s = statuses.get(n.id);
                  const status =
                    s?.health === "ok"
                      ? "healthy"
                      : s?.health === "degraded"
                        ? "degraded"
                        : s?.health === "unreachable"
                          ? "critical"
                          : "unknown";
                  return {
                    name: n.label,
                    status,
                    uptime_pct:
                      s?.health === "ok"
                        ? 100
                        : s?.health === "degraded"
                          ? 70
                          : 0,
                  };
                })}
                history={history}
                showLabels
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NetworkStatusPanel({
  nodes,
  statuses,
}: {
  nodes: NodeConfig[];
  statuses: Map<string, NodeStatus>;
}) {
  const counts = useMemo(() => {
    let ok = 0;
    let degraded = 0;
    let down = 0;
    for (const s of statuses.values()) {
      if (s.health === "ok") ok += 1;
      else if (s.health === "degraded") degraded += 1;
      else if (s.health === "unreachable") down += 1;
    }
    return { ok, degraded, down };
  }, [statuses]);

  return (
    <div style={{ padding: "16px 16px 8px" }}>
      <div
        style={{
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        Network Status
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <Stat color="#22c55e" label="Online" value={counts.ok} />
        <Stat color="#f59e0b" label="Degraded" value={counts.degraded} />
        <Stat color="#ef4444" label="Down" value={counts.down} />
        <Stat color="#666" label="Total" value={nodes.length} />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {nodes.map((n) => {
          const s = statuses.get(n.id);
          const color =
            s?.health === "ok" ? "#22c55e"
            : s?.health === "degraded" ? "#f59e0b"
            : s?.health === "unreachable" ? "#ef4444"
            : "#333";
          return (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 0",
                borderBottom: "1px solid #111",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#ddd", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {n.label}
              </span>
              <span style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap" }}>
                {n.location}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

function ControllersOfflineView({ total, hasAny }: { total: number; hasAny: boolean }) {
  return (
    <div
      style={{
        height: "100dvh",
        background: "#000",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 10,
          padding: 28,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#ef4444",
            boxShadow: "0 0 12px #ef444499",
            margin: "0 auto 18px",
          }}
        />
        <div
          style={{
            fontSize: 12,
            color: "#ef4444",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Mesh Offline
        </div>
        <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.6, marginBottom: 12 }}>
          {hasAny
            ? `None of the ${total} registered controller${total === 1 ? "" : "s"} are reachable.`
            : "No OpenPrem controllers configured."}
        </div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 22 }}>
          The mesh requires at least one live controller. Start a controller locally
          {hasAny ? " or check that its port is open." : ", or register one from the Controllers page."}
        </div>
        <a
          href="/controllers"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "0.04em",
          }}
        >
          Open Controllers →
        </a>
      </div>
    </div>
  );
}
