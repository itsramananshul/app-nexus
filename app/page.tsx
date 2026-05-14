"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertFeed } from "@/components/AlertFeed";
import {
  BlastRadiusPanel,
  type AffectedNode,
} from "@/components/BlastRadiusPanel";
import { NetworkGraph } from "@/components/NetworkGraph";
import { NexusApiKeysPanel } from "@/components/NexusApiKeysPanel";
import { NoNodesView } from "@/components/NoNodesView";
import { PitchMode } from "@/components/PitchMode";
import { RecoveryPanel } from "@/components/RecoveryPanel";
import {
  ScenarioController,
  SCENARIO_STAGE_LABELS,
  type ScenarioState,
} from "@/components/ScenarioController";
import { TopBar } from "@/components/TopBar";
import type { IncidentReport } from "@/components/IncidentReportModal";
import { runFactoryCollapse } from "@/lib/collapse";
import { runRecovery, RECOVERY_STEP_LABELS } from "@/lib/recovery";
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

const ALERT_MAX = 200;

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

  const { overrides, setOverride, clearOverride } = useNodeKeyOverrides();

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
  const [recoveryLabel, setRecoveryLabel] = useState<string | null>(null);
  const [pitchActive, setPitchActive] = useState(false);

  // Track when the scenario ended so we can hold the exposure ticker
  const completedAtRef = useRef<number | null>(null);

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
  }, []);

  const statuses = usePoller(nodes, handleAlert);

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
    setScenarioState("nominal");
    setTimeout(() => {
      setScenarioState("idle");
      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
      setCurrentStage(-1);
      setElapsedMs(0);
      setPeakExposure(0);
    }, 10_000);
  }, []);

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
  const triggerCollapse = useCallback(() => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setCurrentStage(0);
    setScenarioStartedAt(Date.now());
    setElapsedMs(0);
    setPeakExposure(0);
    setCollapseResult(null);
    completedAtRef.current = null;
    setScenarioState("executing");
    void runFactoryCollapse(collapseUrls, collapseApiKeys, {
      onStepStart,
      onStepDone,
      onStepError,
      onComplete,
    });
  }, [
    collapseUrls,
    collapseApiKeys,
    onStepStart,
    onStepDone,
    onStepError,
    onComplete,
  ]);

  const triggerRecovery = useCallback(() => {
    if (!collapseResult) return;
    handleRecoveryStart();
    setRecovering(true);
    setRecoveryLabel(null);
    void runRecovery(collapseUrls, collapseApiKeys, collapseResult, {
      onStepStart: (i, label) => {
        setRecoveryLabel(label);
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
    <div className="flex h-screen flex-col">
      <TopBar
        totalNodes={nodes.length}
        statuses={statuses}
        activeAlerts={activeAlerts}
        onOpenApiKeys={() => setKeysPanelOpen(true)}
        onStartPitch={() => setPitchActive(true)}
      />

      <main className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-[1600px] gap-3 px-4 py-3">
          <div className="grid h-full flex-1 grid-cols-1 gap-3 lg:grid-cols-[62fr_38fr]">
            <NetworkGraph
              nodes={nodes}
              statuses={statuses}
              collapsingNodeIds={collapsingNodeIds}
              now={now}
            />
            <AlertFeed alerts={alerts} />
          </div>
          {blastOpen ? (
            <BlastRadiusPanel
              open={blastOpen}
              currentStage={Math.max(0, currentStage)}
              totalStages={steps.length}
              affected={SCENARIO_AFFECTED}
              recommended={SCENARIO_RECOMMENDED}
              freezeExposure={
                scenarioState === "complete" || scenarioState === "recovering"
                  ? peakExposure
                  : null
              }
            />
          ) : null}
        </div>
      </main>

      {(scenarioState === "complete" || scenarioState === "recovering" || scenarioState === "nominal") && incidentReport ? (
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
      )}

      <NexusApiKeysPanel
        open={keysPanelOpen}
        onClose={() => setKeysPanelOpen(false)}
        nodes={baseNodes}
        overrides={overrides}
        onSetOverride={setOverride}
        onClearOverride={clearOverride}
      />

      <PitchMode
        active={pitchActive}
        onClose={() => setPitchActive(false)}
        partsTracked={partsTracked}
        peakExposure={peakExposure}
        scenarioState={scenarioState}
        scenarioSteps={steps}
        onTriggerCollapse={triggerCollapse}
        onTriggerRecovery={triggerRecovery}
      />
    </div>
  );
}
