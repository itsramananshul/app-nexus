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

const MANUAL_HOURS = 4.5;

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${String(s).padStart(2, "0")}s`;
}

function fmtSavedTime(downtimeMs: number): string {
  const manualMs = MANUAL_HOURS * 60 * 60 * 1000;
  const saved = Math.max(0, manualMs - downtimeMs);
  const total = Math.floor(saved / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
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
          background: "#0f172a",
          border: "1px solid rgba(77,217,172,0.3)",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
        className="rounded-t-xl sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {data.scenarioLabel}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-white">
              💰 OpenPrem Recovery Report
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 250);
            }}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="my-3 h-px bg-white/10" />

        <dl className="space-y-1.5 text-[11px]">
          <Row label="Downtime detected" value={fmtDuration(data.downtimeMs)} />
          <Row label="Manual resolution" value="~4.5 hours" mute />
          <Row
            label="Time saved"
            value={fmtSavedTime(data.downtimeMs)}
            highlight
          />
        </dl>

        <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-slate-500">
          Estimated cost avoided
        </div>
        <dl className="mt-1.5 space-y-1 text-[11px]">
          <Row label="Lost production" value={fmtMoney(data.productionLoss)} mute />
          <Row label="Emergency labor" value={fmtMoney(data.emergencyLabor)} mute />
          <Row label="Expedited shipping" value={fmtMoney(data.expeditedShipping)} mute />
        </dl>

        <div className="my-3 h-px bg-white/10" />

        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white font-semibold">
            Total Saved
          </span>
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: "#4dd9ac" }}
          >
            {fmtMoney(total)}
          </span>
        </div>

        <div className="mt-3 text-[9px] uppercase tracking-[0.18em] text-slate-600">
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
      <dt className={mute ? "text-slate-500" : "text-slate-300"}>{label}</dt>
      <dd
        className="font-mono tabular-nums"
        style={{
          color: highlight ? "#4dd9ac" : mute ? "#94a3b8" : "#ffffff",
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
