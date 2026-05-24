"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getCapabilities } from "@/lib/controller-api";
import { loadControllers } from "@/lib/store";
import type { ControllerEntry, ControllerRole } from "@/lib/controller-types";

interface Props {
  onAdd: (name: string, url: string, role: ControllerRole) => void;
  onClose: () => void;
}

function parsePort(rawUrl: string): { host: string; port: string } | null {
  try {
    const u = new URL(rawUrl.trim());
    return { host: u.hostname, port: u.port || (u.protocol === "https:" ? "443" : "80") };
  } catch {
    return null;
  }
}

function findConflict(
  list: ControllerEntry[],
  url: string,
): ControllerEntry | null {
  const target = parsePort(url);
  if (!target) return null;
  for (const c of list) {
    const cur = parsePort(c.url);
    if (cur && cur.host === target.host && cur.port === target.port) return c;
  }
  return null;
}

export function AddControllerModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("http://localhost:");
  const [role, setRole] = useState<ControllerRole>("controller");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  const existing = useMemo(() => loadControllers(), []);
  const conflict = useMemo(() => findConflict(existing, url), [existing, url]);

  const probe = async () => {
    if (!url.trim()) return;
    setProbing(true);
    setProbeResult(null);
    try {
      const caps = await getCapabilities(url.trim().replace(/\/$/, ""));
      setProbeResult(
        `Reachable — ${caps.local.length} local, ${caps.remote.length} remote capabilities`,
      );
    } catch {
      setProbeResult("Could not reach controller at that address");
    } finally {
      setProbing(false);
    }
  };

  const submit = () => {
    if (!url.trim()) return;
    if (conflict) return;
    const displayName = name.trim() || url.trim();
    onAdd(displayName, url.trim(), role);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 12,
          width: 440,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>Add Controller</span>
          <button onClick={onClose} style={iconBtnStyle}><X size={13} /></button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

          <Field label="Controller URL">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:8081"
                style={inputStyle}
              />
              <button
                onClick={probe}
                disabled={probing}
                style={btnSecondaryStyle}
              >
                {probing ? "Probing…" : "Test"}
              </button>
            </div>
            {probeResult && (
              <div style={{
                fontSize: 11,
                marginTop: 6,
                color: probeResult.startsWith("Reachable") ? "#22c55e" : "#ef4444",
              }}>
                {probeResult}
              </div>
            )}
            {conflict && (
              <div style={{
                fontSize: 11,
                marginTop: 6,
                color: "#f59e0b",
                fontWeight: 600,
              }}>
                Port already in use by &quot;{conflict.name}&quot; ({conflict.url})
              </div>
            )}
          </Field>

          <Field label="Name (optional)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Factory 1"
              style={inputStyle}
            />
          </Field>

          <Field label="Role">
            <div style={{ display: "flex", gap: 8 }}>
              {(["controller", "router"] as ControllerRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    border: `1px solid ${role === r ? "#0070f3" : "#1a1a1a"}`,
                    background: role === r ? "#1a1a1a" : "#000000",
                    color: role === r ? "#ffffff" : "#666666",
                    fontWeight: role === r ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>

          <button
            onClick={submit}
            disabled={!!conflict || !url.trim()}
            style={{
              ...btnPrimaryStyle,
              opacity: conflict || !url.trim() ? 0.5 : 1,
              cursor: conflict || !url.trim() ? "not-allowed" : "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "#000000",
  border: "1px solid #1a1a1a",
  borderRadius: 6,
  padding: "8px 12px",
  color: "#ffffff",
  fontSize: 13,
  fontFamily: "monospace",
  outline: "none",
  width: "100%",
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

const btnSecondaryStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #1a1a1a",
  borderRadius: 6,
  padding: "8px 14px",
  color: "#888888",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "#0070f3",
  border: "none",
  borderRadius: 6,
  padding: "10px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
  marginTop: 4,
};
