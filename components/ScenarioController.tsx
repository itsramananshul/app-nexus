"use client";

import { COLLAPSE_STEP_LABELS } from "@/lib/collapse";
import type { CollapseStep, SentinelAlert } from "@/lib/types";

export type ScenarioState =
  | "idle"
  | "confirming"
  | "executing"
  | "complete"
  | "recovering"
  | "nominal";

interface ScenarioControllerProps {
  state: ScenarioState;
  steps: CollapseStep[];
  currentStage: number;
  elapsedSec: number;
  onAlert: (alert: SentinelAlert) => void;
  onStateChange: (state: ScenarioState) => void;
  onTriggerCollapse: () => void;
  onReset: () => void;
}

export const SCENARIO_STAGE_LABELS: readonly string[] = [
  "Anomaly detected — Factory 2 Raw Materials deviation",
  "Production halt — Factory 2 inventory declining",
  "Supply chain impact — Downstream nodes affected",
  "Cascade propagation — Warehouse stock depletion",
  "Critical state — Enterprise-wide impact",
];

export function ScenarioController({
  state,
  steps,
  currentStage,
  elapsedSec,
  onReset,
  // The following props are intentionally accepted but no longer used here.
  // Scenario initiation is now driven entirely by the TopBar Scenarios menu;
  // this footer only renders progress + nominal states. Kept on the
  // interface for backwards compatibility with the page.tsx call site.
  onAlert: _onAlert,
  onStateChange: _onStateChange,
  onTriggerCollapse: _onTriggerCollapse,
}: ScenarioControllerProps) {
  void _onAlert;
  void _onStateChange;
  void _onTriggerCollapse;

  // Nothing to show in idle — the TopBar handles trigger UX now.
  if (state === "idle" || state === "confirming") {
    return null;
  }

  const completedStages = steps.filter(
    (s) => s.status === "done" || s.status === "error",
  ).length;
  const progressPct = Math.round((completedStages / steps.length) * 100);

  return (
    <footer
      style={{
        background: "#0a0a0a",
        borderTop: "1px solid #1a1a1a",
        flexShrink: 0,
      }}
    >
      <div
        className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:gap-5"
      >
        <div className="flex flex-col gap-0.5 lg:min-w-[200px]">
          <h2
            style={{
              fontSize: 10,
              color: "#444",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 600,
            }}
          >
            Scenario console
          </h2>
          <p style={{ fontSize: 11, color: "#666" }}>
            Live cascade telemetry
          </p>
        </div>

        {state === "executing" ? (
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <StatusPill color="#ef4444" label="Scenario in progress" pulse />
              <span style={{ fontSize: 11, color: "#888" }}>
                Stage{" "}
                <span style={{ color: "#fff", fontWeight: 600 }}>
                  {Math.max(1, currentStage + 1)}
                </span>{" "}
                of {steps.length}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#cccccc",
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
                title={SCENARIO_STAGE_LABELS[currentStage] ?? ""}
              >
                {SCENARIO_STAGE_LABELS[currentStage] ?? "—"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#888",
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                T+{elapsedSec.toFixed(1)}s
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "#1a1a1a",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "#ef4444",
                  transition: "width 220ms ease",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {steps.map((s, i) => (
                <span
                  key={i}
                  style={{
                    height: 2,
                    flex: 1,
                    borderRadius: 1,
                    background:
                      s.status === "done"
                        ? "#6b7280" // gray — confirmed offline
                        : s.status === "error"
                          ? "#ef4444"
                          : s.status === "running"
                            ? "#ef4444"
                            : "#1a1a1a",
                    transition: "background 200ms ease",
                  }}
                  className={s.status === "running" ? "pulse-live" : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}

        {state === "recovering" ? (
          <div className="flex flex-1 items-center gap-3">
            <StatusPill color="#14b8a6" label="Recovery in progress" pulse />
            <span style={{ fontSize: 11, color: "#888" }}>
              Reverse cascade · restoring affected nodes
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "#888",
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontVariantNumeric: "tabular-nums",
              }}
            >
              T+{elapsedSec.toFixed(1)}s
            </span>
          </div>
        ) : null}

        {state === "nominal" ? (
          <div className="flex flex-1 items-center gap-3">
            <StatusPill color="#22c55e" label="System nominal" />
            <span style={{ fontSize: 11, color: "#888" }}>
              All nodes restored · standing by
            </span>
            <button
              type="button"
              onClick={onReset}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "1px solid #2a2a2a",
                color: "#888",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>
    </footer>
  );
}

function StatusPill({
  color,
  label,
  pulse,
}: {
  color: string;
  label: string;
  pulse?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${color}1a`,
        color,
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        border: `1px solid ${color}55`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
        }}
        className={pulse ? "pulse-live" : undefined}
      />
      {label}
    </span>
  );
}

export { COLLAPSE_STEP_LABELS };
