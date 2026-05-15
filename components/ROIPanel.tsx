"use client";

import { useEffect, useState } from "react";

export interface ROIData {
  scenarioLabel: string;
  downtimeMs: number;
  productionLoss: number;
  emergencyLabor: number;
  expeditedShipping: number;
}

interface ROIPanelProps {
  data: ROIData | null;
  onClose: () => void;
}

const MANUAL_MINUTES = 45;

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${String(s).padStart(2, "0")}s`;
}

function fmtSavedTime(downtimeMs: number): string {
  const manualMs = MANUAL_MINUTES * 60 * 1000;
  const saved = Math.max(0, manualMs - downtimeMs);
  const total = Math.floor(saved / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ROIPanel({ data, onClose }: ROIPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) {
      setVisible(false);
      return;
    }
    // Trigger slide-in on next frame
    const t = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 30s
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 250);
    }, 30000);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(dismiss);
    };
  }, [data, onClose]);

  if (!data) return null;

  const total =
    data.productionLoss + data.emergencyLabor + data.expeditedShipping;

  return (
    <div
      role="dialog"
      aria-label="Recovery report"
      className="fixed z-40 sm:bottom-6 sm:right-6 sm:w-[320px] bottom-0 right-0 left-0 sm:left-auto"
      style={{
        transform: visible
          ? "translateY(0)"
          : "translateY(20px)",
        opacity: visible ? 1 : 0,
        transition: "transform 250ms ease, opacity 250ms ease",
      }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        className="rounded-t-xl sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.12em]"
              style={{ color: "#444" }}
            >
              {data.scenarioLabel}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm" style={{ color: "#fff", fontWeight: 600 }}>
              <span style={{ color: "#22c55e" }}>✓</span>
              Recovery complete
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 250);
            }}
            aria-label="Close"
            style={{ color: "#444" }}
            className="hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div
          style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 12, letterSpacing: "-0.01em" }}
        >
          {fmtMoney(total)} saved
        </div>
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
          vs. ~45-minute manual recovery
        </div>

        <div style={{ height: 1, background: "#1a1a1a", margin: "16px 0" }} />

        <dl className="space-y-1.5 text-[12px]">
          <Row label="Downtime detected" value={fmtDuration(data.downtimeMs)} />
          <Row label="Manual estimate" value="~45 min" mute />
          <Row label="Time saved" value={fmtSavedTime(data.downtimeMs)} highlight />
        </dl>

        <div style={{ height: 1, background: "#1a1a1a", margin: "14px 0" }} />

        <div className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "#444" }}>
          Cost breakdown
        </div>
        <dl className="mt-2 space-y-1 text-[12px]">
          <Row label="Lost production" value={fmtMoney(data.productionLoss)} mute />
          <Row label="Emergency labor" value={fmtMoney(data.emergencyLabor)} mute />
          <Row label="Expedited shipping" value={fmtMoney(data.expeditedShipping)} mute />
        </dl>

        <div className="mt-4 text-[11px]" style={{ color: "#444" }}>
          Powered by OpenPrem AI Operations
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  mute,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mute?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt style={{ color: mute ? "#555" : "#888" }}>{label}</dt>
      <dd
        className="font-mono tabular-nums"
        style={{
          color: highlight ? "#14b8a6" : mute ? "#888" : "#ffffff",
          fontWeight: highlight ? 600 : 500,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
