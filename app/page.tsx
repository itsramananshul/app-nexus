"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AffectedNode } from "@/components/BlastRadiusPanel";
import { IncidentPanel } from "@/components/IncidentPanel";
import { KpiStrip } from "@/components/KpiStrip";
import FactoryMap from "@/components/FactoryMap";
import { LegacyView } from "@/components/LegacyView";
import { NetworkGraph } from "@/components/NetworkGraph";
import { NexusApiKeysPanel } from "@/components/NexusApiKeysPanel";
import { NoNodesView } from "@/components/NoNodesView";
import { PitchOverlay } from "@/components/PitchOverlay";
import { RecoveryPanel } from "@/components/RecoveryPanel";
import {
  ScenarioController,
  SCENARIO_STAGE_LABELS,
  type ScenarioState,
} from "@/components/ScenarioController";
import { TopBar, SCENARIO_OPTIONS, type ScenarioKey } from "@/components/TopBar";
import type { IncidentReport } from "@/components/IncidentReportModal";
import { ROIPanel, type ROIData } from "@/components/ROIPanel";
import {
  AuditTimeline,
  type AuditEvent,
  type AuditSeverity,
  type AuditIncidentMeta,
} from "@/components/AuditTimeline";
import { runFactoryCollapse } from "@/lib/collapse";
import { runRecovery, RECOVERY_STEP_LABELS } from "@/lib/recovery";
import { runWarehouseOutage } from "@/lib/scenarios/warehouse-outage";
import { runMaterialsShortage } from "@/lib/scenarios/materials-shortage";
import { getNodes, primaryMetricFor, type NodeConfig } from "@/lib/nodes";
import { useNodeKeyOverrides } from "@/lib/nodeKeyOverrides";
import type {
  CollapseApiKeys,
  CollapseResult,
  CollapseStep,
  CollapseUrls,
  SentinelAlert,
} from "@/lib/types";
import { usePoller } from "@/lib/usePoller";
import {
  alertBeep,
  cascadeChime,
  recoveryChime,
} from "@/lib/sounds";
import { notify, requestPermissionOnce } from "@/lib/notifications";

const ALERT_MAX = 200;
const SPARKLINE_HISTORY_MAX = 20;

const INITIAL_STEPS: CollapseStep[] = SCENARIO_STAGE_LABELS.map((label, i) => ({
  index: i,
  label,
  status: "pending",
}));

const STEP_TO_NODE: Record<number, { id: string; label: string; location: string }> = {
  0: { id: "f2-materials", label: "Raw Materials", location: "Factory 2" },
  1: { id: "f2-product", label: "Product Inventory", location: "Factory 2" },
  2: { id: "corp-orders", label: "Orders", location: "Corporate" },
  3: { id: "corp-shipments", label: "Shipments", location: "Corporate" },
  4: { id: "corp-support", label: "Support Tickets", location: "Corporate" },
};

const SCENARIO_AFFECTED: AffectedNode[] = [
  { id: "f2-materials", label: "Raw Materials", location: "Factory 2", severity: "critical" },
  { id: "f2-product", label: "Product Inventory", location: "Factory 2", severity: "critical" },
  { id: "w1-product", label: "Warehouse 1 · Product Inventory", location: "Warehouse 1", severity: "degraded" },
  { id: "w2-product", label: "Warehouse 2 · Product Inventory", location: "Warehouse 2", severity: "at_risk" },
  { id: "corp-orders", label: "Orders", location: "Corporate", severity: "at_risk" },
  { id: "corp-shipments", label: "Shipments", location: "Corporate", severity: "at_risk" },
  { id: "corp-support", label: "Support Tickets", location: "Corporate", severity: "monitoring" },
  { id: "corp-erp", label: "ERP Compliance", location: "Corporate", severity: "monitoring" },
];

const SCENARIO_RECOMMENDED: string[] = [
  "Redirect Factory 3 surplus capacity to Warehouse 1",
  "Expedite material order #F2-2024-847",
  "Notify logistics — 47 shipments at risk",
  "Escalate critical support tickets",
];

function newAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function Page() {
  const baseNodes = useMemo(() => getNodes(), []);
  const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [keysPanelOpen, setKeysPanelOpen] = useState(false);

  const { overrides, setOverride, clearOverride, isLoaded: keysLoaded } =
    useNodeKeyOverrides();

  // Scenario state machine
  const [scenarioState, setScenarioState] = useState<ScenarioState>("idle");
  const [steps, setSteps] = useState<CollapseStep[]>(INITIAL_STEPS);
  const [currentStage, setCurrentStage] = useState<number>(-1);
  const [collapsingNodeId, setCollapsingNodeId] = useState<string | null>(null);
  const [scenarioStartedAt, setScenarioStartedAt] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [peakExposure, setPeakExposure] = useState<number>(0);
  const [collapseResult, setCollapseResult] = useState<CollapseResult | null>(null);
  const [recovering, setRecovering] = useState(false);
  // Latch: nodes explicitly degraded by scenario stay red even if poller briefly returns ok
  const [latchedDegradedNodes, setLatchedDegradedNodes] = useState<Set<string>>(new Set());
  // A node enters `failedNodeIds` ~2s after it's latched as degraded —
  // visualising the progression: normal → red blink (warning) → gray (failed).
  const [failedNodeIds, setFailedNodeIds] = useState<Set<string>>(new Set());
  const [recoveryLabel, setRecoveryLabel] = useState<string | null>(null);
  const [pitchActive, setPitchActive] = useState(false);
  const [history, setHistory] = useState<Map<string, number[]>>(new Map());
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "map">("graph");
  void viewMode;
  void setViewMode;
  const [mapVisible, setMapVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("nexus_map_visible");
    if (stored === "false") return false;
    return true;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("nexus_map_visible", String(mapVisible));
  }, [mapVisible]);
  const [eraMode, setEraMode] = useState<"after" | "before">("after");
  const [transitionToast, setTransitionToast] = useState<string | null>(null);

  // Scenarios + ROI + Audit
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>(null);
  const [roiData, setROIData] = useState<ROIData | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [scenarioToast, setScenarioToast] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const lastPollLogAtRef = useRef<number>(0);
  const incidentMetaRef = useRef<AuditIncidentMeta>({
    scenarioLabel: null,
    triggeredAt: null,
    resolvedAt: null,
    affectedNodes: [],
    productionLoss: 0,
    emergencyLabor: 0,
    expeditedShipping: 0,
  });

  // Track when the scenario ended so we can hold the exposure ticker
  const completedAtRef = useRef<number | null>(null);

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

  // Merge localStorage overrides on top of any baseline keys
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
    // Fire a desktop notification when a node transitions to a bad state.
    // notify() handles its own focus + cooldown checks.
    if (
      alert.type === "health_degraded" ||
      alert.type === "unreachable" ||
      alert.type === "collapse_triggered"
    ) {
      const severity =
        alert.severity === "critical" ? "CRITICAL" : "DEGRADED";
      notify(
        alert.nodeId,
        `OpenPrem Alert · ${severity}`,
        `${alert.location} · ${alert.nodeLabel} — ${alert.message}`,
      );
    }
  }, []);

  // Don't start polling until the per-node keys finish loading from Supabase —
  // this prevents the 401 flicker on first load while keys are still hydrating.
  const pollingNodes = keysLoaded ? nodes : [];
  const statuses = usePoller(pollingNodes, handleAlert);

  // Merge poller statuses with scenario latch — once a node goes red via
  // scenario, keep it red until recovery clears the latch.
  const displayStatuses = useMemo(() => {
    if (latchedDegradedNodes.size === 0) return statuses;
    const merged = new Map(statuses);
    for (const nodeId of latchedDegradedNodes) {
      const existing = merged.get(nodeId);
      if (existing) {
        merged.set(nodeId, { ...existing, health: "degraded" });
      } else {
        // Node not yet polled — create a placeholder so display shows red
        merged.set(nodeId, {
          nodeId,
          health: "degraded",
          lastChecked: new Date(),
          details: {},
        });
      }
    }
    return merged;
  }, [statuses, latchedDegradedNodes]);

  // Ask for Notification permission once on first load (no-op if already
  // decided). Wrapped so this runs only after hydration on the client.
  useEffect(() => {
    void requestPermissionOnce();
  }, []);

  // First-load audit event (one-shot once nodes are loaded)
  const initLoggedRef = useRef(false);
  useEffect(() => {
    if (initLoggedRef.current) return;
    if (!keysLoaded || nodes.length === 0) return;
    initLoggedRef.current = true;
    logEvent("info", "loaded", `OpenPrem initialized · ${nodes.length} nodes connected`);
  }, [keysLoaded, nodes.length, logEvent]);

  // Throttled poll-success heartbeat (every ~60s)
  useEffect(() => {
    if (statuses.size === 0) return;
    const now = Date.now();
    if (now - lastPollLogAtRef.current < 60_000) return;
    lastPollLogAtRef.current = now;
    let anomalies = 0;
    for (const s of statuses.values()) {
      if (s.health !== "ok") anomalies += 1;
    }
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

  // Track the last 20 primary-metric values per node for sparklines. Runs on
  // every poll tick — appends the new value if changed (or just keeps last).
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
        // Skip if value is identical to last to avoid flat-line noise from
        // multiple re-renders within the same poll cycle.
        if (arr.length > 0 && arr[arr.length - 1] === value) continue;
        const updated = [...arr, value].slice(-SPARKLINE_HISTORY_MAX);
        next.set(node.id, updated);
      }
      return next;
    });
  }, [statuses, nodes]);

  // 1Hz tick for clock, "Xs ago" labels, scenario elapsed counter
  useEffect(() => {
    const id = setInterval(() => {
      const t = new Date();
      setNow(t);
      if (scenarioState === "executing" || scenarioState === "recovering") {
        const elapsed = t.getTime() - scenarioStartedAt;
        setElapsedMs(elapsed);
        if (scenarioState === "executing") {
          // Simulate growing financial exposure (matched to BlastRadiusPanel ticker)
          setPeakExposure((prev) => prev + Math.floor(500 + Math.random() * 1500));
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [scenarioState, scenarioStartedAt]);

  // Collapse step handlers — fed into the ScenarioController
  const onStepStart = useCallback(
    (index: number, label: string) => {
      setCurrentStage(index);
      setSteps((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, status: "running", error: undefined } : s,
        ),
      );
      const target = STEP_TO_NODE[index];
      if (target) setCollapsingNodeId(target.id);
      cascadeChime(index);
      handleAlert({
        id: newAlertId(),
        timestamp: new Date(),
        nodeId: target?.id ?? "nexus",
        nodeLabel: target?.label ?? "Nexus",
        location: target?.location ?? "Factory 2",
        type: "collapse_step",
        message: SCENARIO_STAGE_LABELS[index] ?? label,
        severity: index >= 3 ? "critical" : "warning",
      });
    },
    [handleAlert],
  );

  const onStepDone = useCallback(
    (index: number, label: string) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status: "done" } : s)),
      );
      setCollapsingNodeId(null);
      const target = STEP_TO_NODE[index];
      // onStepStart already pushed this node into warning (red blink).
      // onStepDone confirms the outage — promote to FAILED (gray) immediately.
      // latchedDegradedNodes also stays set so polling never flips it back to
      // green.
      if (target) {
        setLatchedDegradedNodes((prev) => new Set([...prev, target.id]));
        setFailedNodeIds((prev) => new Set([...prev, target.id]));
      }
      handleAlert({
        id: newAlertId(),
        timestamp: new Date(),
        nodeId: target?.id ?? "nexus",
        nodeLabel: target?.label ?? "Nexus",
        location: target?.location ?? "Factory 2",
        type: "collapse_step",
        message: `Stage ${index + 1} confirmed · ${label}`,
        severity: "warning",
      });
    },
    [handleAlert],
  );

  const onStepError = useCallback(
    (index: number, label: string, error: string) => {
      setSteps((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, status: "error", error } : s,
        ),
      );
      setCollapsingNodeId(null);
      const target = STEP_TO_NODE[index];
      handleAlert({
        id: newAlertId(),
        timestamp: new Date(),
        nodeId: target?.id ?? "nexus",
        nodeLabel: target?.label ?? "Nexus",
        location: target?.location ?? "Factory 2",
        type: "collapse_error",
        message: `Stage ${index + 1} failed · ${label} — ${error}`,
        severity: "critical",
      });
    },
    [handleAlert],
  );

  const onComplete = useCallback(
    (result: CollapseResult) => {
      setCollapsingNodeId(null);
      completedAtRef.current = Date.now();
      setCollapseResult(result);
      setScenarioState("complete");
      handleAlert({
        id: newAlertId(),
        timestamp: new Date(),
        nodeId: "corporate",
        nodeLabel: "Reality Engine",
        location: "Nexus",
        type: "collapse_complete",
        message: `CASCADE COMPLETE · ${result.drainedMaterials.length} materials · ${result.drainedProducts.length} SKUs · ${result.createdOrderIds.length} new orders · ${result.delayedShipmentIds.length} shipments delayed · ${result.createdTicketIds.length} incidents opened`,
        severity: "critical",
      });
    },
    [handleAlert],
  );

  const handleStateChange = useCallback((next: ScenarioState) => {
    if (next === "executing") {
      // Reset scenario state on fresh execution
      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
      setCurrentStage(0);
      setScenarioStartedAt(Date.now());
      setElapsedMs(0);
      setPeakExposure(0);
      setCollapseResult(null);
      completedAtRef.current = null;
    }
    setScenarioState(next);
  }, []);

  const handleReset = useCallback(() => {
    setLatchedDegradedNodes(new Set()); // clear latch on reset
    setFailedNodeIds(new Set());
    setScenarioState("idle");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setCurrentStage(-1);
    setElapsedMs(0);
    setPeakExposure(0);
    setCollapsingNodeId(null);
    setCollapseResult(null);
  }, []);

  const handleRecoveryStart = useCallback(() => {
    setScenarioState("recovering");
    setScenarioStartedAt(Date.now());
  }, []);

  const handleRecoveryComplete = useCallback(() => {
    setLatchedDegradedNodes(new Set()); // clear latch — recovery restored all nodes
    setFailedNodeIds(new Set());
    setScenarioState("nominal");
    setTimeout(() => {
      setScenarioState("idle");
      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
      setCurrentStage(-1);
      setElapsedMs(0);
      setPeakExposure(0);
    }, 10_000);
  }, []);

  // ── Reset Demo ──
  const handleResetDemo = useCallback(() => {
    setResetConfirmOpen(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    setResetBusy(true);
    try {
      const res = await fetch("/api/reset-demo", { method: "POST" });
      const body = (await res.json().catch(() => null)) as
        | { success?: boolean; rowsInserted?: number; error?: string }
        | null;
      if (!res.ok || body?.success !== true) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setResetToast(
        `Demo reset · ${body.rowsInserted ?? 0} rows seeded · Ready for presentation`,
      );
      setResetConfirmOpen(false);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Reset failed";
      setResetToast(`Reset failed · ${m}`);
    } finally {
      setResetBusy(false);
    }
  }, []);

  // Auto-dismiss the toast after 4s
  useEffect(() => {
    if (!resetToast) return;
    const id = setTimeout(() => setResetToast(null), 4000);
    return () => clearTimeout(id);
  }, [resetToast]);

  useEffect(() => {
    if (!scenarioToast) return;
    const id = setTimeout(() => setScenarioToast(null), 4000);
    return () => clearTimeout(id);
  }, [scenarioToast]);

  // Auto-dismiss the era-transition reveal after 2.5s
  useEffect(() => {
    if (!transitionToast) return;
    const id = setTimeout(() => setTransitionToast(null), 2500);
    return () => clearTimeout(id);
  }, [transitionToast]);

  const collapseUrls = useMemo<CollapseUrls>(() => {
    function find(id: string): string | null {
      const n = nodes.find((x) => x.id === id);
      return n ? n.url : null;
    }
    return {
      invF2: find("f2-product"),
      matF2: find("f2-materials"),
      ord: find("corp-orders"),
      shp: find("corp-shipments"),
      sup: find("corp-support"),
    };
  }, [nodes]);

  const collapseApiKeys = useMemo<CollapseApiKeys>(() => {
    function findKey(id: string): string | null {
      const n = nodes.find((x) => x.id === id);
      return n ? n.apiKey : null;
    }
    return {
      invF2Key: findKey("f2-product"),
      matF2Key: findKey("f2-materials"),
      ordKey: findKey("corp-orders"),
      shpKey: findKey("corp-shipments"),
      supKey: findKey("corp-support"),
    };
  }, [nodes]);

  const collapsingNodeIds = useMemo(() => {
    return new Set(collapsingNodeId ? [collapsingNodeId] : []);
  }, [collapsingNodeId]);

  const activeAlerts = useMemo(() => {
    return alerts.filter(
      (a) => a.severity === "critical" || a.severity === "warning",
    ).length;
  }, [alerts]);

  const blastOpen =
    scenarioState === "executing" ||
    scenarioState === "complete" ||
    scenarioState === "recovering";

  // Sum of primary metric values across the 4 factories (raw materials +
  // product inventory at each factory) — what the pitch deck calls "parts
  // tracked across 4 factories".
  const partsTracked = useMemo(() => {
    let total = 0;
    for (const node of nodes) {
      if (!node.location.startsWith("Factory ")) continue;
      const status = statuses.get(node.id);
      if (!status?.details) continue;
      const { value } = primaryMetricFor(node.type, status.details);
      if (typeof value === "number") total += value;
    }
    return total;
  }, [nodes, statuses]);

  // Trigger functions — lifted out of ScenarioController / RecoveryPanel so
  // PitchMode can fire them too.
  const triggerScenario = useCallback(
    (key: ScenarioKey) => {
      // Count targeted nodes lacking an API key so we can surface a single
      // summary toast and skip them silently inside the scenario libs.
      const targetIds: string[] =
        key === "warehouse"
          ? ["w1-product", "w2-product", "corp-orders", "corp-shipments", "corp-support"]
          : key === "materials"
            ? [
                ...nodes.filter((n) => n.type === "raw_materials").map((n) => n.id),
                "corp-orders",
                "corp-support",
              ]
            : ["f2-product", "f2-materials", "corp-orders", "corp-shipments", "corp-support"];
      const skipped = targetIds.filter((id) => {
        const n = nodes.find((x) => x.id === id);
        return !n || !n.apiKey;
      }).length;
      if (skipped > 0) {
        setScenarioToast(
          `${skipped} ${skipped === 1 ? "node" : "nodes"} skipped — no API key configured`,
        );
      }

      setActiveScenario(key);
      setROIData(null);
      const opt = SCENARIO_OPTIONS.find((o) => o.key === key);
      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
      setCurrentStage(0);
      const startedAt = Date.now();
      setScenarioStartedAt(startedAt);
      setElapsedMs(0);
      setPeakExposure(0);
      setCollapseResult(null);
      completedAtRef.current = null;
      setScenarioState("executing");
      alertBeep();
      logEvent(
        "critical",
        "collapse_triggered",
        `⚠ Cascade triggered · Scenario: ${opt?.short ?? key}`,
      );
      incidentMetaRef.current = {
        scenarioLabel: opt?.short ?? key,
        triggeredAt: new Date(startedAt),
        resolvedAt: null,
        affectedNodes: SCENARIO_AFFECTED.map((a) => ({
          id: a.id,
          label: a.label,
          location: a.location,
        })),
        productionLoss: 0,
        emergencyLabor: 0,
        expeditedShipping: 0,
      };

      const stageCallbacks = {
        onStepStart,
        onStepDone: (i: number, label: string) => {
          onStepDone(i, label);
          logEvent("info", "collapse_stage", `Stage ${i + 1} complete · ${label}`);
        },
        onStepError,
        onComplete,
      };

      if (key === "warehouse") {
        void runWarehouseOutage(nodes, collapseUrls, collapseApiKeys, stageCallbacks);
      } else if (key === "materials") {
        void runMaterialsShortage(nodes, collapseUrls, collapseApiKeys, stageCallbacks);
      } else {
        void runFactoryCollapse(collapseUrls, collapseApiKeys, stageCallbacks);
      }
    },
    [
      nodes,
      collapseUrls,
      collapseApiKeys,
      onStepStart,
      onStepDone,
      onStepError,
      onComplete,
      logEvent,
    ],
  );

  // Backwards-compat alias for components that still call triggerCollapse
  const triggerCollapse = useCallback(() => triggerScenario("cascade"), [triggerScenario]);

  const triggerRecovery = useCallback(() => {
    if (!collapseResult) return;
    handleRecoveryStart();
    logEvent("info", "recovery_started", "↺ Recovery initiated");
    setRecovering(true);
    setRecoveryLabel(null);
    void runRecovery(collapseUrls, collapseApiKeys, collapseResult, {
      onStepStart: (i, label) => {
        setRecoveryLabel(label);
        logEvent(
          "info",
          "recovery_stage",
          `Recovery stage ${i + 1} · ${label}`,
        );
        handleAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: "corporate",
          nodeLabel: "Recovery",
          location: "Nexus",
          type: "collapse_step",
          message: `Recovery ${i + 1}/${RECOVERY_STEP_LABELS.length} · ${label}`,
          severity: "info",
        });
      },
      onStepDone: (_i, label) => {
        handleAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: "corporate",
          nodeLabel: "Recovery",
          location: "Nexus",
          type: "health_recovered",
          message: `Recovered · ${label}`,
          severity: "info",
        });
      },
      onStepError: (_i, label, error) => {
        handleAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: "corporate",
          nodeLabel: "Recovery",
          location: "Nexus",
          type: "collapse_error",
          message: `Recovery degraded · ${label} — ${error}`,
          severity: "warning",
        });
      },
      onComplete: () => {
        setRecovering(false);
        setRecoveryLabel(null);
        recoveryChime();

        // Compute ROI from the actual collapse result.
        const drainedTotal = collapseResult.drainedMaterials.reduce(
          (sum, m) => sum + Math.max(0, m.originalOnHand - m.newOnHand),
          0,
        );
        const productionLoss = Math.round(drainedTotal * 2.4);
        const expeditedShipping = collapseResult.delayedShipmentIds.length * 1500;
        const emergencyLabor = 48000;
        const downtimeMs = Date.now() - scenarioStartedAt;
        const scenarioOpt = activeScenario
          ? SCENARIO_OPTIONS.find((o) => o.key === activeScenario)
          : null;
        const scenarioLabel = scenarioOpt?.short ?? "Cascade Failure";

        setROIData({
          scenarioLabel,
          downtimeMs,
          productionLoss,
          emergencyLabor,
          expeditedShipping,
        });

        incidentMetaRef.current = {
          ...incidentMetaRef.current,
          scenarioLabel,
          resolvedAt: new Date(),
          productionLoss,
          emergencyLabor,
          expeditedShipping,
        };

        logEvent(
          "success",
          "recovery_complete",
          `✓ System restored · ${formatDuration(downtimeMs)}`,
        );

        handleAlert({
          id: newAlertId(),
          timestamp: new Date(),
          nodeId: "corporate",
          nodeLabel: "Recovery Protocol",
          location: "Nexus",
          type: "health_recovered",
          message:
            "SYSTEM NOMINAL · All affected nodes restored · Standing by",
          severity: "info",
        });
        handleRecoveryComplete();
      },
    });
  }, [
    collapseResult,
    collapseUrls,
    collapseApiKeys,
    handleAlert,
    handleRecoveryStart,
    handleRecoveryComplete,
    activeScenario,
    scenarioStartedAt,
    logEvent,
  ]);

  const incidentReport: IncidentReport | null = useMemo(() => {
    if (scenarioState === "idle") return null;
    const endedAt =
      completedAtRef.current !== null
        ? new Date(completedAtRef.current)
        : new Date();
    const startedAt = new Date(scenarioStartedAt);
    return {
      scenarioName: "Factory 2 Supply Disruption",
      startedAt,
      endedAt,
      durationLabel: formatDuration(elapsedMs),
      exposureLabel: formatCurrency(peakExposure),
      affectedCount: SCENARIO_AFFECTED.length,
      totalNodes: nodes.length,
      maxStage:
        steps.filter((s) => s.status === "done" || s.status === "error").length,
      stages: steps.map((s) => ({
        index: s.index,
        label: s.label,
        status: s.status,
      })),
      affectedNodes: SCENARIO_AFFECTED.map((a) => ({
        id: a.id,
        label: a.label,
        location: a.location,
        severity: a.severity.toUpperCase(),
      })),
    };
  }, [
    scenarioState,
    scenarioStartedAt,
    elapsedMs,
    peakExposure,
    nodes.length,
    steps,
  ]);

  if (baseNodes.length === 0) {
    return <NoNodesView />;
  }

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <TopBar
        totalNodes={nodes.length}
        statuses={displayStatuses}
        nodesWithoutKey={nodes.filter((n) => !n.apiKey).length}
        collapsingNodeIds={collapsingNodeIds}
        activeAlerts={activeAlerts}
        eraMode={eraMode}
        onChangeEra={(next) => {
          if (next === "after" && eraMode === "before") {
            setTransitionToast("This is what OpenPrem replaces.");
            logEvent("info", "era_toggle", "OpenPrem mode activated");
          } else if (next === "before" && eraMode === "after") {
            logEvent("info", "era_toggle", "Legacy mode activated");
          }
          setEraMode(next);
        }}
        onOpenApiKeys={() => setKeysPanelOpen(true)}
        onStartPitch={() => setPitchActive(true)}
        onResetDemo={handleResetDemo}
        onRunScenario={triggerScenario}
        onOpenAudit={() => setAuditOpen(true)}
        activeScenario={activeScenario}
        scenarioBusy={
          scenarioState === "executing" || scenarioState === "recovering"
        }
        mapVisible={mapVisible}
        onToggleMap={() => setMapVisible((v) => !v)}
        pitchActive={pitchActive}
        onTogglePitch={() => setPitchActive((v) => !v)}
      />

      {eraMode === "before" ? (
        <main className="flex-1 overflow-hidden" style={{ background: "#000" }}>
          <LegacyView />
        </main>
      ) : (
      <>
        {!pitchActive ? (
          <KpiStrip
            totalNodes={nodes.length}
            healthyNodes={
              Array.from(statuses.values()).filter((s) => s.health === "ok").length
            }
            pollIntervalSec={3}
            scenarioState={
              scenarioState === "confirming" ? "idle" : scenarioState
            }
            peakExposure={peakExposure}
            elapsedMs={elapsedMs}
            costAvoided={
              roiData
                ? roiData.productionLoss +
                  roiData.emergencyLabor +
                  roiData.expeditedShipping
                : null
            }
          />
        ) : null}
        <main
          className="flex-1 overflow-hidden"
          style={{ background: "#000" }}
        >
          <div className="h-full w-full grid grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_300px] lg:grid-rows-[1fr] overflow-hidden">
            <div
              className="relative min-w-0 h-full overflow-hidden"
              style={{ background: "#000", padding: "12px 16px" }}
            >
              <NetworkGraph
                nodes={nodes}
                statuses={displayStatuses}
                collapsingNodeIds={collapsingNodeIds}
                now={now}
                isLoadingKeys={!keysLoaded}
                history={history}
                affectedNodeIds={
                  scenarioState === "executing" ||
                  scenarioState === "complete" ||
                  scenarioState === "recovering"
                    ? new Set(SCENARIO_AFFECTED.map((a) => a.id))
                    : undefined
                }
                scenarioActive={
                  scenarioState === "executing" ||
                  scenarioState === "complete" ||
                  scenarioState === "recovering"
                }
                failedNodeIds={failedNodeIds}
              />
            </div>

            {/* Right column — incident panel on top, globe pinned below.
                On <lg viewports, becomes a full-width strip below the graph
                with a top border instead of a left border. */}
            <div
              className="flex w-full flex-col border-t border-[#1a1a1a] lg:w-[300px] lg:h-full lg:border-t-0 lg:border-l"
              style={{
                background: "#0a0a0a",
              }}
            >
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <IncidentPanel
                  scenarioName={
                    activeScenario
                      ? SCENARIO_OPTIONS.find((o) => o.key === activeScenario)?.short ?? "Cascade Failure"
                      : null
                  }
                  scenarioKey={activeScenario}
                  scenarioState={scenarioState}
                  affected={SCENARIO_AFFECTED}
                  elapsedMs={elapsedMs}
                  peakExposure={peakExposure}
                  delayedShipmentCount={
                    collapseResult?.delayedShipmentIds.length ?? 0
                  }
                  failedNodeCount={failedNodeIds.size}
                  recovering={recovering}
                  recoveryProgressPct={
                    recovering
                      ? Math.round(
                          (steps.filter((s) => s.status === "done" || s.status === "error").length /
                            Math.max(1, steps.length)) *
                            100,
                        )
                      : 0
                  }
                  costAvoided={roiData ? roiData.productionLoss + roiData.emergencyLabor + roiData.expeditedShipping : null}
                  onInitiateRecovery={triggerRecovery}
                />
              </div>

              {mapVisible ? (
                <div
                  style={{
                    // Globe takes a flex share of the right column, not a
                    // fixed pixel height — fills any screen size.
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
                      transition: "color 120ms ease, border-color 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = "#2a2a2a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#888";
                      e.currentTarget.style.borderColor = "#1e1e1e";
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
                      // Failed (confirmed offline) wins over everything.
                      // Collapsing (detection in progress) is the red phase.
                      const isFailed = failedNodeIds.has(n.id);
                      const health = isFailed
                        ? "failed"
                        : collapsingNodeIds.has(n.id)
                          ? "unreachable"
                          : s?.health;
                      const status =
                        health === "failed"
                          ? "failed"
                          : health === "ok"
                            ? "healthy"
                            : health === "degraded"
                              ? "degraded"
                              : health === "unreachable"
                                ? "critical"
                                : "unknown";
                      return {
                        name: n.label,
                        status,
                        uptime_pct:
                          health === "ok" ? 100 : health === "degraded" ? 70 : 0,
                      };
                    })}
                    history={history}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </>
      )}

      {eraMode === "after" ? (
        (scenarioState === "complete" ||
          scenarioState === "recovering" ||
          scenarioState === "nominal") &&
        incidentReport ? (
          <RecoveryPanel
            report={incidentReport}
            recovering={recovering}
            currentLabel={recoveryLabel}
            onTriggerRecovery={triggerRecovery}
          />
        ) : (
          <ScenarioController
            state={scenarioState}
            steps={steps}
            currentStage={Math.max(0, currentStage)}
            elapsedSec={elapsedMs / 1000}
            onAlert={handleAlert}
            onStateChange={handleStateChange}
            onTriggerCollapse={triggerCollapse}
            onReset={handleReset}
          />
        )
      ) : null}

      <NexusApiKeysPanel
        open={keysPanelOpen}
        onClose={() => setKeysPanelOpen(false)}
        nodes={baseNodes}
        overrides={overrides}
        onSetOverride={setOverride}
        onClearOverride={clearOverride}
      />

      <PitchOverlay
        active={pitchActive}
        onClose={() => setPitchActive(false)}
        onTriggerScenario={triggerScenario}
        onTriggerRecovery={triggerRecovery}
        scenarioActive={
          scenarioState === "executing" || scenarioState === "complete"
        }
        recovering={recovering}
        recoveryComplete={scenarioState === "nominal"}
        costAvoided={
          roiData
            ? roiData.productionLoss +
              roiData.emergencyLabor +
              roiData.expeditedShipping
            : null
        }
      />

      {resetConfirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020409]/85 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !resetBusy)
              setResetConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-amber-500/40 bg-[#0a1322] p-6 shadow-2xl">
            <h3 className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-amber-300">
              <span aria-hidden>↺</span>
              Reset demo data?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              This will <strong className="text-amber-200">clear and re-seed</strong>{" "}
              all 6 demo tables across every app instance.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Run before each presentation to get a fresh dataset.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                disabled={resetBusy}
                className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleResetConfirm()}
                disabled={resetBusy}
                className="glow-amber-box rounded-md border border-amber-400/50 bg-amber-500 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 shadow-lg hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetBusy ? "Seeding…" : "Reset & Reseed"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetToast ? (
        <div
          role="status"
          aria-live="polite"
          className="alert-enter fixed bottom-24 right-6 z-[70] max-w-md rounded-md border border-cyan-500/40 bg-[#0a1322]/95 px-4 py-3 shadow-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {resetToast.startsWith("Reset failed") ? "✗ Reset failed" : "✓ Reset complete"}
          </p>
          <p className="mt-1 text-xs text-slate-300">{resetToast}</p>
        </div>
      ) : null}

      {scenarioToast ? (
        <div
          role="status"
          aria-live="polite"
          className="alert-enter fixed bottom-40 right-6 z-[70] max-w-md rounded-md border border-amber-500/40 bg-[#0a1322]/95 px-4 py-3 shadow-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            ⚠ Scenario · partial coverage
          </p>
          <p className="mt-1 text-xs text-slate-300">{scenarioToast}</p>
        </div>
      ) : null}

      {transitionToast ? (
        <div
          role="status"
          aria-live="polite"
          className="alert-enter fixed inset-0 z-[80] flex items-center justify-center bg-[#020409]/60 backdrop-blur-sm pointer-events-none"
        >
          <p className="glow-cyan rounded-lg border border-cyan-400/40 bg-[#0a1322]/95 px-8 py-5 text-center text-xl font-semibold tracking-wide text-cyan-200 shadow-2xl">
            {transitionToast}
          </p>
        </div>
      ) : null}

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
            animation: "alert-in 200ms ease-out",
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
              <span
                style={{
                  fontSize: 10,
                  color: "#888",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
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
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
              >
                ✕ Close
              </button>
            </header>
            <div style={{ position: "absolute", inset: 0, paddingTop: 40 }}>
              <FactoryMap
                nodes={nodes.map((n) => {
                  const s = displayStatuses.get(n.id);
                  const isFailed = failedNodeIds.has(n.id);
                  const health = isFailed
                    ? "failed"
                    : collapsingNodeIds.has(n.id)
                      ? "unreachable"
                      : s?.health;
                  const status =
                    health === "failed"
                      ? "failed"
                      : health === "ok"
                        ? "healthy"
                        : health === "degraded"
                          ? "degraded"
                          : health === "unreachable"
                            ? "critical"
                            : "unknown";
                  return {
                    name: n.label,
                    status,
                    uptime_pct:
                      health === "ok" ? 100 : health === "degraded" ? 70 : 0,
                  };
                })}
                history={history}
                showLabels
              />
            </div>
          </div>
        </div>
      ) : null}

      <ROIPanel data={roiData} onClose={() => setROIData(null)} />

      <AuditTimeline
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        events={auditEvents}
        incident={incidentMetaRef.current}
        instanceName={
          process.env.NEXT_PUBLIC_INSTANCE_NAME ?? "openprem-nexus"
        }
      />
    </div>
  );
}
