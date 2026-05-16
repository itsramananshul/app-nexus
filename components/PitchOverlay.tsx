"use client";

import { useEffect, useState } from "react";
import { BeforeSimulation } from "./BeforeSimulation";
import { AfterSimulation } from "./AfterSimulation";
import { SCENARIO_OPTIONS, type ScenarioKey } from "./TopBar";

interface PitchOverlayProps {
  active: boolean;
  onClose: () => void;
  onTriggerScenario: (key: ScenarioKey) => void;
  onTriggerRecovery: () => void;
  scenarioActive: boolean;
  recovering: boolean;
  recoveryComplete: boolean;
  costAvoided: number | null;
}

const STEPS = [
  { id: 0, title: "The Problem", subtitle: "Traditional middleware integration — why it breaks" },
  { id: 1, title: "The Solution", subtitle: "Open Intelligence Interconnect Model — a living network" },
  { id: 2, title: "Live Network", subtitle: "OpenPrem monitoring every node, every 3 seconds" },
  { id: 3, title: "Trigger Incident", subtitle: "Pick a scenario — watch the network respond" },
  { id: 4, title: "AI Recovery", subtitle: "One click. 90 seconds. Fully reversed." },
];

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

// Small Web Audio API "swoosh" played on step transition. Best-effort — fails
// silently if AudioContext is blocked or unavailable.
function playSwoosh() {
  try {
    type WindowWithWebkit = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as unknown as WindowWithWebkit;
    const Ctx = window.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignored
  }
}

export function PitchOverlay({
  active,
  onClose,
  onTriggerScenario,
  onTriggerRecovery,
  scenarioActive,
  recovering,
  recoveryComplete,
  costAvoided,
}: PitchOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) setStep(0);
  }, [active]);

  if (!active) return null;

  const next = () => {
    setStep((s) => {
      const n = Math.min(STEPS.length - 1, s + 1);
      if (n !== s) playSwoosh();
      return n;
    });
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="OpenPrem pitch"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: step === 0 ? "min(1100px, 96vw)" : "min(720px, 100%)",
          maxHeight: "calc(100vh - 40px)",
          overflowY: step === 0 ? "hidden" : "auto",
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 16,
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
          padding: step === 0 ? 16 : 24,
          display: "flex",
          flexDirection: "column",
          gap: step === 0 ? 10 : 16,
        }}
      >
        {/* Header: step dots + close */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: i === step ? "#ffffff" : "#333",
                  transition: "background 200ms ease",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit pitch mode"
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
            ✕ Exit
          </button>
        </header>

        {/* Title block */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "#444",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 500,
            }}
          >
            <span>Step {step + 1} of {STEPS.length}</span>
            {step === 0 ? <EraTag label="Before" color="#ef4444" /> : null}
            {step === 1 ? <EraTag label="After" color="#22c55e" /> : null}
          </div>
          <h2
            style={{
              fontSize: 22,
              color: "#fff",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              marginTop: 4,
            }}
          >
            {STEPS[step].title}
          </h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            {STEPS[step].subtitle}
          </p>
        </div>

        {/* Step content */}
        <div
          style={{
            minHeight: step === 0 || step === 1 ? 0 : 320,
            flex: step === 0 || step === 1 ? 1 : undefined,
          }}
        >
          {step === 0 ? <BeforeSimulation /> : null}
          {step === 1 ? (
            <AfterSimulation
              liveStatus={
                recoveryComplete
                  ? "nominal"
                  : recovering
                    ? "recovering"
                    : scenarioActive
                      ? "executing"
                      : "idle"
              }
            />
          ) : null}

          {step === 2 ? (
            <StepCard>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
                Behind this card, every node in the supply network is being
                polled live every 3 seconds. The orthogonal connectors light
                up red the moment any node degrades or a cascade kicks in.
              </p>
              <ul
                style={{
                  marginTop: 12,
                  paddingLeft: 0,
                  listStyle: "none",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  ["14", "Nodes monitored"],
                  ["3s", "Poll interval"],
                  ["0", "Manual checks needed"],
                  ["100%", "Coverage"],
                ].map(([v, l]) => (
                  <li
                    key={l}
                    style={{
                      background: "#111",
                      border: "1px solid #1a1a1a",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 20, color: "#fff", fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{l}</div>
                  </li>
                ))}
              </ul>
            </StepCard>
          ) : null}

          {step === 3 ? (
            <StepCard>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 12 }}>
                Pick a scenario. The dropdown also lives in the top bar — but
                here&apos;s the quick path:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SCENARIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      onTriggerScenario(opt.key);
                      onClose(); // close so user can watch the graph react
                    }}
                    disabled={scenarioActive || recovering}
                    style={{
                      textAlign: "left",
                      background: "#111",
                      border: "1px solid #1e1e1e",
                      color: "#fff",
                      padding: "12px 14px",
                      borderRadius: 8,
                      cursor: scenarioActive || recovering ? "not-allowed" : "pointer",
                      opacity: scenarioActive || recovering ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!scenarioActive && !recovering)
                        e.currentTarget.style.background = "#1a1a1a";
                    }}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#111")
                    }
                  >
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{opt.short}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
              {scenarioActive ? (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: "#fcd34d",
                    fontWeight: 500,
                  }}
                >
                  Cascade in progress — advance to step 5 to run recovery.
                </div>
              ) : null}
            </StepCard>
          ) : null}

          {step === 4 ? (
            <StepCard>
              {recoveryComplete && costAvoided !== null ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ color: "#22c55e", fontSize: 36, lineHeight: 1, marginBottom: 12 }}>✓</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>
                    {fmtMoney(costAvoided)} saved
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
                    Cascade reversed · stations restored
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 14 }}>
                    Manual recovery from a cascade like this takes ~45 minutes
                    of phone calls, ticket queues, and emergency labor. OpenPrem
                    reverses it in a single API call.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <Comparison label="Manual" value="~45 min" color="#fff" />
                    <Comparison label="AI Recovery" value="~90 sec" color="#14b8a6" />
                  </div>
                  <button
                    type="button"
                    onClick={onTriggerRecovery}
                    disabled={!scenarioActive || recovering}
                    style={{
                      width: "100%",
                      height: 40,
                      background: scenarioActive && !recovering ? "#0070f3" : "#1a1a1a",
                      color: scenarioActive && !recovering ? "#fff" : "#444",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: scenarioActive && !recovering ? "pointer" : "not-allowed",
                    }}
                  >
                    {recovering
                      ? "Reverting cascade…"
                      : scenarioActive
                        ? "Initiate AI Recovery"
                        : "Trigger a scenario first"}
                  </button>
                </>
              )}
            </StepCard>
          ) : null}
        </div>

        {/* Footer nav */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderTop: "1px solid #1a1a1a",
            paddingTop: 16,
          }}
        >
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              color: step === 0 ? "#333" : "#888",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: step === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={step === STEPS.length - 1 ? onClose : next}
            style={{
              background: step === STEPS.length - 1 ? "#22c55e" : "#0070f3",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {step === STEPS.length - 1 ? "Done" : "Next →"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #111",
        borderRadius: 8,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function Comparison({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1a1a1a",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function EraTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: `${color}1a`,
        color,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.14em",
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
      />
      {label}
    </span>
  );
}
