"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, X, ChevronDown, ChevronRight, Save } from "lucide-react";
import { getCapabilities, getApps, getWorkflows } from "@/lib/controller-api";
import { loadControllers } from "@/lib/store";
import type { ControllerSnapshot, WorkflowSummary } from "@/lib/controller-types";

interface Props {
  snapshot: ControllerSnapshot;
  onClose: () => void;
  onUpdateUrl: (id: string, newUrl: string) => void;
}

type Tab = "overview" | "addressing" | "config";

function parsePort(rawUrl: string): { host: string; port: string } | null {
  try {
    const u = new URL(rawUrl.trim());
    return { host: u.hostname, port: u.port || (u.protocol === "https:" ? "443" : "80") };
  } catch {
    return null;
  }
}

export function ControllerDetail({ snapshot, onClose, onUpdateUrl }: Props) {
  const { entry } = snapshot;
  const [tab, setTab] = useState<Tab>("overview");
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [capsOpen, setCapsOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(true);
  const [wfOpen, setWfOpen] = useState(false);

  // Addressing edit
  const [editUrl, setEditUrl] = useState(entry.url);
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);

  useEffect(() => {
    setEditUrl(entry.url);
    setEditMsg(null);
  }, [entry.url]);

  const refresh = async () => {
    setLoading(true);
    try {
      const wf = await getWorkflows(entry.url);
      setWorkflows(wf.workflows);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [entry.url]);

  const port = useMemo(() => parsePort(entry.url)?.port ?? "—", [entry.url]);

  const handleSaveUrl = async () => {
    const trimmed = editUrl.trim().replace(/\/$/, "");
    if (!trimmed || trimmed === entry.url) return;
    setEditMsg(null);
    setSaving(true);
    try {
      // Port conflict check against current registry
      const list = loadControllers();
      const target = parsePort(trimmed);
      if (!target) {
        setEditMsg({ kind: "err", text: "Invalid URL" });
        return;
      }
      const conflict = list.find((c) => {
        if (c.id === entry.id) return false;
        const cur = parsePort(c.url);
        return cur && cur.host === target.host && cur.port === target.port;
      });
      if (conflict) {
        setEditMsg({ kind: "warn", text: `Port already in use by "${conflict.name}"` });
        return;
      }
      // Probe new URL
      try {
        await getCapabilities(trimmed);
      } catch (e) {
        setEditMsg({
          kind: "err",
          text: `Cannot reach new address: ${e instanceof Error ? e.message : "unreachable"}`,
        });
        return;
      }
      onUpdateUrl(entry.id, trimmed);
      setEditMsg({ kind: "ok", text: "Address updated" });
    } finally {
      setSaving(false);
    }
  };

  const local = snapshot.capabilities?.local ?? [];
  const remote = snapshot.capabilities?.remote ?? [];

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          borderBottom: "1px solid #1a1a1a",
          background: "#000000",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
          {entry.name}
          <span style={{ fontSize: 11, color: "#444444", fontFamily: "monospace", marginLeft: 10 }}>
            {entry.url}
          </span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={iconBtnStyle}
            title="Refresh"
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button onClick={onClose} style={iconBtnStyle} title="Close">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", background: "#000000" }}>
        {(["overview", "addressing", "config"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === t ? "#0070f3" : "transparent"}`,
              color: tab === t ? "#ffffff" : "#666666",
              fontWeight: tab === t ? 700 : 500,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Section
            title={`Local Capabilities (${local.length})`}
            open={capsOpen}
            onToggle={() => setCapsOpen((p) => !p)}
          >
            {local.length === 0
              ? <Empty text="No local capabilities" />
              : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {local.map((c) => <Cap key={c} label={c} />)}
                </div>
              )}
            {remote.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "#444444", marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Remote ({remote.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {remote.map((c) => <Cap key={c} label={c} dim />)}
                </div>
              </>
            )}
          </Section>

          <Section
            title={`Registered Apps (${snapshot.apps.length})`}
            open={appsOpen}
            onToggle={() => setAppsOpen((p) => !p)}
          >
            {snapshot.apps.length === 0
              ? <Empty text="No apps registered" />
              : snapshot.apps.map((app) => (
                <div key={app.name} style={rowStyle}>
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>{app.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#444444" }}>{app.endpoint}</span>
                </div>
              ))}
          </Section>

          <Section
            title={`Active Workflows (${workflows.length})`}
            open={wfOpen}
            onToggle={() => setWfOpen((p) => !p)}
          >
            {workflows.length === 0
              ? <Empty text="No workflows" />
              : workflows.map((wf) => (
                <div key={wf.id} style={rowStyle}>
                  <div>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>{wf.workflow_name}</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#444444", marginLeft: 8 }}>{wf.id.slice(0, 8)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={wf.status} />
                    {wf.progress && (
                      <span style={{ fontSize: 11, color: "#666666" }}>{wf.progress}</span>
                    )}
                  </div>
                </div>
              ))}
          </Section>
        </div>
      )}

      {tab === "addressing" && (
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Current URL
            </div>
            <div style={{ fontFamily: "monospace", color: "#ffffff", fontSize: 13 }}>{entry.url}</div>
          </div>

          <div style={{ display: "flex", gap: 18 }}>
            <Labeled label="Port">{port}</Labeled>
            <Labeled label="Role">{entry.role}</Labeled>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Edit URL
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={editUrl}
                onChange={(e) => { setEditUrl(e.target.value); setEditMsg(null); }}
                placeholder="http://host:port"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => void handleSaveUrl()}
                disabled={saving || editUrl.trim() === entry.url}
                style={{
                  ...btnPrimaryStyle,
                  opacity: saving || editUrl.trim() === entry.url ? 0.5 : 1,
                  cursor: saving || editUrl.trim() === entry.url ? "not-allowed" : "pointer",
                }}
              >
                <Save size={12} />
                {saving ? "Verifying…" : "Save"}
              </button>
            </div>
            {editMsg && (
              <div
                style={{
                  fontSize: 11,
                  marginTop: 8,
                  color:
                    editMsg.kind === "ok" ? "#22c55e"
                    : editMsg.kind === "warn" ? "#f59e0b"
                    : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {editMsg.text}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#444444", marginTop: 8, lineHeight: 1.5 }}>
              The new address is probed via GET /capabilities before saving. Port collisions with other registered controllers block the save.
            </div>
          </div>
        </div>
      )}

      {tab === "config" && (
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <ConfigRow label="Name" value={entry.name} />
          <ConfigRow label="URL" value={entry.url} mono />
          <ConfigRow label="Port" value={port} mono />
          <ConfigRow label="Role" value={entry.role} />
          <ConfigRow label="Added" value={new Date(entry.addedAt).toLocaleString()} />

          <div>
            <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Registered Apps ({snapshot.apps.length})
            </div>
            {snapshot.apps.length === 0 ? (
              <Empty text="No apps registered" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {snapshot.apps.map((app) => (
                  <div key={app.name} style={rowStyle}>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>{app.name}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#444444" }}>{app.endpoint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Local Capabilities ({local.length})
            </div>
            {local.length === 0 ? (
              <Empty text="None" />
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {local.map((c) => <Cap key={c} label={c} />)}
              </div>
            )}
          </div>

          {snapshot.error && (
            <div
              style={{
                fontSize: 12,
                color: "#ef4444",
                background: "#1a0808",
                border: "1px solid #3a1010",
                padding: "10px 12px",
                borderRadius: 6,
              }}
            >
              Error: {snapshot.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 0 8px",
          color: "#888888",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>}
    </div>
  );
}

function ConfigRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ color: "#ffffff", fontSize: 13, fontFamily: mono ? "monospace" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ color: "#ffffff", fontFamily: "monospace", fontSize: 13 }}>{children}</div>
    </div>
  );
}

function Cap({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 4,
        fontFamily: "monospace",
        background: dim ? "#111111" : "#111111",
        color: dim ? "#444444" : "#ffffff",
        border: `1px solid ${dim ? "#1a1a1a" : "#2a2a2a"}`,
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "running" ? "#f59e0b" : status === "completed" ? "#22c55e" : "#ef4444";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: "#444444", padding: "4px 0" }}>{text}</div>;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "7px 10px",
  borderRadius: 6,
  background: "#000000",
  fontSize: 12,
};

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #1a1a1a",
  cursor: "pointer",
  padding: "5px 7px",
  color: "#666666",
  borderRadius: 5,
  display: "flex",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  background: "#000000",
  border: "1px solid #1a1a1a",
  borderRadius: 6,
  padding: "9px 12px",
  color: "#ffffff",
  fontSize: 13,
  fontFamily: "monospace",
  outline: "none",
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#0070f3",
  border: "none",
  borderRadius: 6,
  padding: "9px 14px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
