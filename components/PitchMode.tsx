"use client";

import { useEffect, useState } from "react";
import type { CollapseStep } from "@/lib/types";
import type { ScenarioState } from "./ScenarioController";

interface PitchModeProps {
  active: boolean;
  onClose: () => void;
  partsTracked: number;
  peakExposure: number;
  scenarioState: ScenarioState;
  scenarioSteps: CollapseStep[];
  onTriggerCollapse: () => void;
  onTriggerRecovery: () => void;
}

type PitchStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS = 7;

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatBigNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function PitchMode({
  active,
  onClose,
  partsTracked,
  peakExposure,
  scenarioState,
  scenarioSteps,
  onTriggerCollapse,
  onTriggerRecovery,
}: PitchModeProps) {
  const [step, setStep] = useState<PitchStep>(1);

  // Reset to step 1 every time pitch mode opens
  useEffect(() => {
    if (active) setStep(1);
  }, [active]);

  // ESC exits at any time
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);

  // Step 4 auto-advance: after cascade completes, hold 3s then go to step 5
  useEffect(() => {
    if (!active) return;
    if (step !== 4) return;
    if (scenarioState !== "complete") return;
    const id = setTimeout(() => setStep(5), 3000);
    return () => clearTimeout(id);
  }, [active, step, scenarioState]);

  // Step 6 auto-advance: when recovery has completed (state → nominal)
  useEffect(() => {
    if (!active) return;
    if (step !== 6) return;
    if (scenarioState !== "nominal") return;
    const id = setTimeout(() => setStep(7), 1500);
    return () => clearTimeout(id);
  }, [active, step, scenarioState]);

  if (!active) return null;

  const fullScreen = step === 1 || step === 7;

  const triggerScenarioAndAdvance = () => {
    onTriggerCollapse();
    setStep(4);
  };

  const triggerRecoveryAndStay = () => {
    onTriggerRecovery();
    // stay on step 6 — auto-advance to 7 once state becomes 'nominal'
  };

  return (
    <>
      {/* Block underlying UI interaction except for our panel area */}
      <div
        className="fixed inset-0 z-40 cursor-default"
        aria-hidden
        onClick={(e) => e.stopPropagation()}
      />
      {fullScreen ? (
        <FullScreenOverlay
          step={step}
          setStep={setStep}
          onClose={onClose}
        />
      ) : (
        <SidePanel
          step={step}
          setStep={setStep}
          onClose={onClose}
          partsTracked={partsTracked}
          peakExposure={peakExposure}
          scenarioSteps={scenarioSteps}
          scenarioState={scenarioState}
          onTriggerCollapse={triggerScenarioAndAdvance}
          onTriggerRecovery={triggerRecoveryAndStay}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Full-screen overlay — steps 1 and 7
// ─────────────────────────────────────────────────────────────────────────
function FullScreenOverlay({
  step,
  setStep,
  onClose,
}: {
  step: PitchStep;
  setStep: (s: PitchStep) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020409]/95 backdrop-blur-sm">
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <ProgressDots current={step} />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit pitch mode"
        className="absolute top-6 right-6 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Esc · Exit
      </button>

      <div className="max-w-3xl px-8 text-center alert-enter">
        {step === 1 ? (
          <>
            <p className="mb-4 text-[11px] uppercase tracking-[0.35em] text-cyan-400/80">
              Chapter 01 · The Problem
            </p>
            <h1 className="glow-cyan text-5xl font-bold leading-tight text-cyan-200">
              Ford operates 47 manufacturing sites across 12 countries
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-300">
              Each site runs its own systems. Nothing talks to each other.
              When something breaks, you find out via a phone call —{" "}
              <span className="text-rose-300">hours later</span>.
            </p>
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="glow-cyan-box inline-flex items-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Next
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </>
        ) : null}

        {step === 7 ? (
          <>
            <p className="mb-4 text-[11px] uppercase tracking-[0.35em] text-emerald-400/80">
              Chapter 07 · The Result
            </p>
            <h1 className="glow-cyan text-5xl font-bold leading-tight text-cyan-200">
              From detection to recovery:{" "}
              <span className="text-emerald-300">2 minutes 34 seconds</span>
            </h1>
            <div className="mt-10 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300/80">
                  Without OpenPrem
                </p>
                <p className="mt-2 text-2xl font-bold text-rose-200">
                  4-hour delay
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  $2.8M uncontained exposure
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
                  With OpenPrem
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-200">
                  4-second detection
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Contained · recovered · documented
                </p>
              </div>
            </div>
            <p className="mt-8 text-xl text-slate-300">
              One platform. Every system.{" "}
              <span className="text-cyan-300">Real-time.</span>
            </p>
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                End Presentation
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Side panel — steps 2–6
// ─────────────────────────────────────────────────────────────────────────
function SidePanel({
  step,
  setStep,
  onClose,
  partsTracked,
  peakExposure,
  scenarioSteps,
  scenarioState,
  onTriggerCollapse,
  onTriggerRecovery,
}: {
  step: PitchStep;
  setStep: (s: PitchStep) => void;
  onClose: () => void;
  partsTracked: number;
  peakExposure: number;
  scenarioSteps: CollapseStep[];
  scenarioState: ScenarioState;
  onTriggerCollapse: () => void;
  onTriggerRecovery: () => void;
}) {
  return (
    <>
      {/* Block clicks on the underlying network graph area */}
      <div
        className="fixed inset-y-0 left-0 right-[30%] z-40 bg-transparent"
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Pitch mode"
        className="panel-enter fixed inset-y-0 right-0 z-50 flex w-[30%] min-w-[380px] max-w-[480px] flex-col border-l border-cyan-500/30 bg-[#070b16]/98 shadow-2xl backdrop-blur-md"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80">
              Pitch Mode · Chapter {String(step).padStart(2, "0")}/07
            </p>
            <ProgressDots current={step} compact />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit pitch mode"
            className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            title="Esc"
          >
            Esc
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          {step === 2 ? (
            <Step2 partsTracked={partsTracked} onNext={() => setStep(3)} />
          ) : null}
          {step === 3 ? (
            <Step3 onTriggerCollapse={onTriggerCollapse} />
          ) : null}
          {step === 4 ? (
            <Step4
              scenarioSteps={scenarioSteps}
              peakExposure={peakExposure}
              scenarioState={scenarioState}
            />
          ) : null}
          {step === 5 ? (
            <Step5
              peakExposure={peakExposure}
              onNext={() => setStep(6)}
            />
          ) : null}
          {step === 6 ? (
            <Step6
              scenarioState={scenarioState}
              onTriggerRecovery={onTriggerRecovery}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function ProgressDots({
  current,
  compact = false,
}: {
  current: PitchStep;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "mt-1.5" : ""}`}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <span
            key={n}
            className={`h-1.5 rounded-full transition-all ${
              active
                ? "w-5 bg-cyan-300"
                : done
                  ? "w-1.5 bg-cyan-500/40"
                  : "w-1.5 bg-slate-700"
            }`}
            aria-hidden
          />
        );
      })}
      {!compact ? (
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {current} / {TOTAL_STEPS}
        </span>
      ) : null}
    </div>
  );
}

function NextButton({
  onClick,
  label = "Next",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glow-cyan-box inline-flex items-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      {label}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step content
// ─────────────────────────────────────────────────────────────────────────
function Step2({
  partsTracked,
  onNext,
}: {
  partsTracked: number;
  onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-cyan-200">
        This is your supply chain. Every node.{" "}
        <span className="text-cyan-300">Live.</span>
      </h2>
      <ul className="mt-6 space-y-3 text-sm text-slate-300">
        <li className="flex items-start gap-2">
          <span className="mt-1 text-cyan-400">→</span>
          14 systems monitored in real-time
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 text-cyan-400">→</span>
          Data refreshed every 5 seconds
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 text-cyan-400">→</span>
          Zero integration middleware — direct API connections
        </li>
      </ul>
      <div className="mt-6 rounded-md border border-cyan-500/30 bg-cyan-500/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
          Live count
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-cyan-200">
          {formatBigNumber(partsTracked)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          parts tracked across 4 factories
        </p>
      </div>
      <div className="mt-auto pt-8">
        <NextButton onClick={onNext} />
      </div>
    </div>
  );
}

function Step3({ onTriggerCollapse }: { onTriggerCollapse: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-cyan-200">
        It&apos;s Q4. Peak production.{" "}
        <span className="text-amber-300">Factory 2 is running at capacity.</span>
      </h2>
      <p className="mt-6 text-sm leading-relaxed text-slate-300">
        Watch what our system detects{" "}
        <span className="text-cyan-300">before your team even knows</span> there&apos;s a problem.
      </p>
      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onTriggerCollapse}
          className="glow-amber-box inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-400/40 bg-amber-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <span aria-hidden>⚡</span>
          Initiate Scenario
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const STAGE_BULLETS = [
  { icon: "⚠", text: "Anomaly detected — 4 seconds ago" },
  { icon: "🔴", text: "Production halt confirmed — Factory 2" },
  { icon: "📦", text: "47 orders now at risk" },
  { icon: "🚚", text: "12 shipments delayed" },
  { icon: "🎧", text: "Support tickets flooding in" },
];

function Step4({
  scenarioSteps,
  peakExposure,
  scenarioState,
}: {
  scenarioSteps: CollapseStep[];
  peakExposure: number;
  scenarioState: ScenarioState;
}) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-rose-200">
        The cascade is{" "}
        <span className="text-rose-300">propagating</span>
      </h2>
      <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">
        Real-time detection · Stage{" "}
        {Math.max(
          1,
          scenarioSteps.filter((s) => s.status !== "pending").length,
        )}{" "}
        of 5
      </p>

      <ul className="mt-5 space-y-2.5">
        {STAGE_BULLETS.map((b, i) => {
          const stepState = scenarioSteps[i]?.status ?? "pending";
          const active = stepState === "running";
          const done = stepState === "done";
          const errored = stepState === "error";
          return (
            <li
              key={i}
              className={`flex items-center gap-2.5 rounded-md border px-3 py-2 transition-all ${
                done
                  ? "border-rose-500/30 bg-rose-500/5 opacity-95"
                  : active
                    ? "border-amber-400/40 bg-amber-500/10 pulse-live"
                    : errored
                      ? "border-rose-500/60 bg-rose-500/10"
                      : "border-slate-800 bg-slate-900/40 opacity-40"
              }`}
            >
              <span aria-hidden className="text-base">
                {b.icon}
              </span>
              <span
                className={`flex-1 text-[12px] ${
                  done || active || errored
                    ? "text-slate-100"
                    : "text-slate-500"
                }`}
              >
                {b.text}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-md border border-rose-500/30 bg-rose-500/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300/80">
          Financial exposure
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-rose-300 pulse-live">
          {formatCurrency(peakExposure)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {scenarioState === "complete"
            ? "Cascade contained · advancing in 3s…"
            : "Tracking real-time impact"}
        </p>
      </div>

      <p className="mt-auto pt-6 text-center text-[10px] uppercase tracking-wider text-slate-500">
        Auto-advance when cascade completes
      </p>
    </div>
  );
}

function Step5({
  peakExposure,
  onNext,
}: {
  peakExposure: number;
  onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-cyan-200">
        The intelligence layer
      </h2>
      <div className="mt-5 space-y-3 text-sm text-slate-300">
        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300/80">
            Traditional approach
          </p>
          <p className="mt-1 text-slate-200">
            Operations finds out in <strong>4 hours</strong> via phone.
          </p>
        </div>
        <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            OpenPrem
          </p>
          <p className="mt-1 text-slate-200">
            Detected in <strong>4 seconds</strong>. Blast radius calculated{" "}
            <span className="text-cyan-300">instantly</span>.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-rose-500/30 bg-rose-500/5 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300/80">
          Financial exposure
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-rose-300">
          {formatCurrency(peakExposure)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Visible in real-time as the cascade propagates
        </p>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-slate-300">
        Recommended actions generated{" "}
        <span className="text-cyan-300">automatically</span> — already visible
        on screen.
      </p>

      <div className="mt-auto pt-8">
        <NextButton onClick={onNext} />
      </div>
    </div>
  );
}

function Step6({
  scenarioState,
  onTriggerRecovery,
}: {
  scenarioState: ScenarioState;
  onTriggerRecovery: () => void;
}) {
  const recovering = scenarioState === "recovering";
  const nominal = scenarioState === "nominal";

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-cyan-200">
        Now watch the system{" "}
        <span className="text-emerald-300">help you recover</span>.
      </h2>
      <p className="mt-3 text-sm text-slate-300">
        One click. The platform reverses the cascade across every affected
        system — automatically.
      </p>

      {nominal ? (
        <div className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            System nominal
          </p>
          <p className="mt-1 text-base font-semibold text-emerald-200">
            All affected nodes restored · standing by
          </p>
          <p className="mt-1 text-xs text-slate-400">Advancing in 1.5s…</p>
        </div>
      ) : recovering ? (
        <div className="mt-6 rounded-md border border-cyan-500/40 bg-cyan-500/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            Recovery in progress
          </p>
          <p className="mt-1 text-base font-semibold text-cyan-200 pulse-live">
            Reversing cascade · 3 stages
          </p>
        </div>
      ) : null}

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onTriggerRecovery}
          disabled={recovering || nominal}
          className="glow-cyan-box inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden>🔄</span>
          {recovering ? "Recovery running…" : nominal ? "Recovered" : "Initiate Recovery"}
          {!recovering && !nominal ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          ) : null}
        </button>
      </div>
    </div>
  );
}
