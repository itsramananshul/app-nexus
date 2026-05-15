"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ScenarioKey = "cascade" | "warehouse" | "materials";

export interface ScenarioOption {
  key: ScenarioKey;
  label: string;
  short: string;
}

export const SCENARIO_OPTIONS: ScenarioOption[] = [
  { key: "cascade", label: "Cascade Failure — Full Supply Chain", short: "Cascade Failure" },
  { key: "warehouse", label: "Warehouse Outage — W1 + W2 Down", short: "Warehouse Outage" },
  { key: "materials", label: "Materials Shortage — All Factories", short: "Materials Shortage" },
];

interface TopBarProps {
  // The props that page.tsx still passes — most are no longer rendered after
  // the dark redesign, but we keep them in the interface so the call site
  // doesn't have to change wholesale.
  totalNodes: number;
  statuses: Map<string, unknown>;
  nodesWithoutKey: number;
  collapsingNodeIds: Set<string>;
  activeAlerts: number;
  eraMode: "before" | "after";
  onChangeEra: (era: "before" | "after") => void;
  onOpenApiKeys: () => void;
  onStartPitch: () => void;
  onResetDemo: () => void;
  onRunScenario: (key: ScenarioKey) => void;
  onOpenAudit: () => void;
  activeScenario: ScenarioKey | null;
  scenarioBusy: boolean;
  // New: Map toggle controls visibility of the FactoryMap column.
  mapVisible: boolean;
  onToggleMap: () => void;
}

export function TopBar({
  eraMode,
  onChangeEra,
  onOpenApiKeys,
  onResetDemo,
  onRunScenario,
  onOpenAudit,
  activeScenario,
  scenarioBusy,
  mapVisible,
  onToggleMap,
}: TopBarProps) {
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number } | null>(null);
  const scenariosButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!scenariosOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setScenariosOpen(false);
    };
    const onResize = () => recomputeMenuPosition();
    window.addEventListener("keydown", onEsc);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", onResize);
    };
  }, [scenariosOpen]);

  const recomputeMenuPosition = () => {
    if (!scenariosButtonRef.current) return;
    const rect = scenariosButtonRef.current.getBoundingClientRect();
    // Open UPWARD per the redesign spec — dropdown's bottom aligns to the
    // top of the button. The button now sits in a non-blurred TopBar, so
    // there's no stacking-context drama: this works via portal.
    const width = 280;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );
    setMenuPos({
      bottom: Math.max(8, window.innerHeight - rect.top + 8),
      left,
    });
  };

  return (
    <header
      style={{
        height: 48,
        background: "#000",
        borderBottom: "1px solid #1a1a1a",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
      }}
    >
      <div
        style={{
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.15em",
        }}
        aria-label="NEXUS"
      >
        NEXUS
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <EraToggle eraMode={eraMode} onChange={onChangeEra} />

        <GhostButton onClick={onOpenApiKeys} title="API Keys">
          API Keys
        </GhostButton>

        <GhostButton
          buttonRef={scenariosButtonRef}
          onClick={() => {
            if (scenariosOpen) setScenariosOpen(false);
            else {
              recomputeMenuPosition();
              setScenariosOpen(true);
            }
          }}
          disabled={scenarioBusy}
          title="Run a scenario"
        >
          Scenarios
          <span style={{ marginLeft: 6, color: "#666" }}>▾</span>
          {activeScenario ? (
            <span style={{ marginLeft: 6, color: "#14b8a6" }}>· active</span>
          ) : null}
        </GhostButton>

        <GhostButton onClick={onOpenAudit} title="Open audit timeline">
          Audit
        </GhostButton>

        <GhostButton
          onClick={onToggleMap}
          active={mapVisible}
          title="Toggle map"
        >
          Map
        </GhostButton>

        <GhostButton onClick={onResetDemo} title="Reset demo data">
          Reset
        </GhostButton>
      </div>

      <ScenariosMenu
        open={scenariosOpen}
        pos={menuPos}
        active={activeScenario}
        busy={scenarioBusy}
        onClose={() => setScenariosOpen(false)}
        onPick={(key) => {
          setScenariosOpen(false);
          onRunScenario(key);
        }}
      />
    </header>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
  active,
  title,
  buttonRef,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: 32,
        padding: "0 12px",
        background: active ? "#111" : "transparent",
        color: active ? "#fff" : "#888",
        border: `1px solid ${active ? "#444" : "#2a2a2a"}`,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "border-color 120ms ease, color 120ms ease, background 120ms ease",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        if (disabled || active) return;
        e.currentTarget.style.borderColor = "#444";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        if (disabled || active) return;
        e.currentTarget.style.borderColor = "#2a2a2a";
        e.currentTarget.style.color = "#888";
      }}
    >
      {children}
    </button>
  );
}

function EraToggle({
  eraMode,
  onChange,
}: {
  eraMode: "before" | "after";
  onChange: (e: "before" | "after") => void;
}) {
  const pill = (label: string, value: "before" | "after") => {
    const active = eraMode === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={active}
        style={{
          height: 30,
          padding: "0 10px",
          background: active ? "#111" : "transparent",
          color: active ? "#fff" : "#666",
          border: "none",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.06em",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      role="group"
      aria-label="View era"
      style={{
        height: 32,
        display: "inline-flex",
        border: "1px solid #2a2a2a",
        borderRadius: 6,
        overflow: "hidden",
        marginRight: 4,
      }}
    >
      {pill("Before", "before")}
      <span style={{ width: 1, background: "#2a2a2a" }} />
      {pill("After", "after")}
    </div>
  );
}

function ScenariosMenu({
  open,
  pos,
  active,
  busy,
  onClose,
  onPick,
}: {
  open: boolean;
  pos: { bottom: number; left: number } | null;
  active: ScenarioKey | null;
  busy: boolean;
  onClose: () => void;
  onPick: (k: ScenarioKey) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const body = (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 9998,
        }}
        aria-hidden
      />
      <div
        role="menu"
        aria-label="Scenarios"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: pos?.bottom ?? 64,
          left: pos?.left ?? 16,
          width: 280,
          maxHeight: 320,
          overflowY: "auto",
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          zIndex: 9999,
        }}
      >
        {SCENARIO_OPTIONS.map((opt) => {
          const isActive = active === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onPick(opt.key)}
              disabled={busy}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.4 : 1,
                color: isActive ? "#fff" : "#ccc",
                fontSize: 14,
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1a1a1a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span>
                <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.2 }}>
                  {opt.short}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  {opt.label}
                </div>
              </span>
              {isActive ? (
                <span style={{ color: "#14b8a6", fontSize: 14 }}>✓</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );

  return createPortal(body, document.body);
}
