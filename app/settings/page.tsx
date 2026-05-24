"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, RotateCcw } from "lucide-react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from "@/lib/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSavedMsg(null);
  };

  const persist = () => {
    saveSettings(settings);
    setSavedMsg("Saved");
    setTimeout(() => setSavedMsg(null), 1500);
  };

  const resetDefaults = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveSettings({ ...DEFAULT_SETTINGS });
    setSavedMsg("Reset to defaults");
    setTimeout(() => setSavedMsg(null), 1500);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <SettingsIcon size={18} color="#4f6ef7" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#dde1f5" }}>Settings</h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#3a4570" }}>
            Application-level configuration stored locally
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={resetDefaults} style={btnSecondaryStyle}>
            <RotateCcw size={13} />
            Reset
          </button>
          <button onClick={persist} style={btnPrimaryStyle}>
            <Save size={13} />
            Save
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#0d0f1a",
          border: "1px solid #1e2240",
          borderRadius: 10,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <Field
          label="SolFlow URL"
          help="Base URL of the SolFlow editor. Required for the 'Open in SolFlow' workflow action."
        >
          <input
            type="text"
            value={settings.solflowUrl}
            onChange={(e) => update("solflowUrl", e.target.value)}
            onBlur={persist}
            placeholder="https://solflow.example.com"
            style={inputStyle}
          />
        </Field>

        <Field
          label="Poll interval (ms)"
          help="How often list/refresh pollers refresh data."
        >
          <input
            type="number"
            min={250}
            value={settings.pollIntervalMs}
            onChange={(e) => update("pollIntervalMs", Number(e.target.value) || 0)}
            onBlur={persist}
            style={inputStyle}
          />
        </Field>

        <Field
          label="Session trace interval (ms)"
          help="How often the deep session-trace panel polls /sessions/:id while a workflow is running."
        >
          <input
            type="number"
            min={250}
            value={settings.sessionTraceIntervalMs}
            onChange={(e) => update("sessionTraceIntervalMs", Number(e.target.value) || 0)}
            onBlur={persist}
            style={inputStyle}
          />
        </Field>

        <Field
          label="Peer timeout (ms)"
          help="Per-peer latency probe timeout on the Router page."
        >
          <input
            type="number"
            min={250}
            value={settings.peerTimeoutMs}
            onChange={(e) => update("peerTimeoutMs", Number(e.target.value) || 0)}
            onBlur={persist}
            style={inputStyle}
          />
        </Field>

        {savedMsg && (
          <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>{savedMsg}</div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#3a4570", marginTop: 14, lineHeight: 1.6 }}>
        All settings are stored in <code style={{ color: "#7b8fff" }}>localStorage</code> under{" "}
        <code style={{ color: "#7b8fff" }}>openprem:settings</code>. Values save on blur or via the Save button.
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#8090c0",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
      {help && (
        <div style={{ fontSize: 11, color: "#3a4570", marginTop: 6, lineHeight: 1.5 }}>{help}</div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#080a12",
  border: "1px solid #1e2240",
  borderRadius: 6,
  padding: "9px 12px",
  color: "#dde1f5",
  fontSize: 13,
  fontFamily: "monospace",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const btnSecondaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#0d0f1a",
  border: "1px solid #1e2240",
  borderRadius: 7,
  padding: "8px 14px",
  color: "#8090c0",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#4f6ef7",
  border: "none",
  borderRadius: 7,
  padding: "8px 14px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
