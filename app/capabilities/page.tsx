"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Zap, Play, ChevronDown, ChevronRight } from "lucide-react";
import { getCapabilities, invokeCapability } from "@/lib/controller-api";
import { loadControllers } from "@/lib/store";
import type { CapabilitiesResponse, ControllerEntry } from "@/lib/controller-types";

interface ControllerCaps {
  controller: ControllerEntry;
  caps: CapabilitiesResponse | null;
  error: string | null;
}

interface CapabilityRow {
  name: string;
  owners: ControllerEntry[];     // controllers reporting it locally
  reachableFrom: ControllerEntry[]; // controllers reporting it remotely
}

interface InvocationLogEntry {
  ts: number;
  capability: string;
  controller: string;
  params: string;
  result: string;
  error: string | null;
  latencyMs: number;
}

export default function CapabilitiesPage() {
  const [controllers, setControllers] = useState<ControllerEntry[]>([]);
  const [data, setData] = useState<ControllerCaps[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [openInvoke, setOpenInvoke] = useState<string | null>(null);
  const [invokeController, setInvokeController] = useState<Record<string, string>>({});
  const [invokeParams, setInvokeParams] = useState<Record<string, string>>({});
  const [invoking, setInvoking] = useState<string | null>(null);
  const [log, setLog] = useState<InvocationLogEntry[]>([]);

  const refresh = async () => {
    const list = loadControllers();
    setControllers(list);
    setLoading(true);
    const results = await Promise.allSettled(
      list.map(async (c) => {
        try {
          const caps = await getCapabilities(c.url);
          return { controller: c, caps, error: null } as ControllerCaps;
        } catch (e) {
          return {
            controller: c,
            caps: null,
            error: e instanceof Error ? e.message : "Unreachable",
          } as ControllerCaps;
        }
      }),
    );
    setData(
      results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { controller: list[i], caps: null, error: "Failed" },
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Aggregate
  const rows = useMemo<CapabilityRow[]>(() => {
    const map = new Map<string, CapabilityRow>();
    for (const { controller, caps } of data) {
      if (!caps) continue;
      for (const name of caps.local) {
        const row = map.get(name) ?? { name, owners: [], reachableFrom: [] };
        if (!row.owners.find((o) => o.id === controller.id)) row.owners.push(controller);
        map.set(name, row);
      }
      for (const name of caps.remote) {
        const row = map.get(name) ?? { name, owners: [], reachableFrom: [] };
        if (!row.reachableFrom.find((o) => o.id === controller.id)) row.reachableFrom.push(controller);
        map.set(name, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filtered = filter.trim()
    ? rows.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()))
    : rows;

  const handleInvoke = async (capName: string) => {
    const targetUrl = invokeController[capName];
    if (!targetUrl) return;
    const targetCtrl = controllers.find((c) => c.url === targetUrl);
    const paramText = (invokeParams[capName] ?? "").trim();
    let params: Record<string, unknown> = {};
    if (paramText) {
      try {
        const parsed = JSON.parse(paramText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          params = parsed as Record<string, unknown>;
        } else {
          appendLog({
            ts: Date.now(),
            capability: capName,
            controller: targetCtrl?.name ?? targetUrl,
            params: paramText,
            result: "",
            error: "Params must be a JSON object",
            latencyMs: 0,
          });
          return;
        }
      } catch (e) {
        appendLog({
          ts: Date.now(),
          capability: capName,
          controller: targetCtrl?.name ?? targetUrl,
          params: paramText,
          result: "",
          error: e instanceof Error ? `Invalid JSON: ${e.message}` : "Invalid JSON",
          latencyMs: 0,
        });
        return;
      }
    }
    setInvoking(capName);
    const start = performance.now();
    try {
      const res = await invokeCapability(targetUrl, capName, params);
      appendLog({
        ts: Date.now(),
        capability: capName,
        controller: targetCtrl?.name ?? targetUrl,
        params: paramText || "{}",
        result: JSON.stringify(res.result ?? res),
        error: res.error ?? null,
        latencyMs: Math.round(performance.now() - start),
      });
    } catch (e) {
      appendLog({
        ts: Date.now(),
        capability: capName,
        controller: targetCtrl?.name ?? targetUrl,
        params: paramText || "{}",
        result: "",
        error: e instanceof Error ? e.message : "Invocation failed",
        latencyMs: Math.round(performance.now() - start),
      });
    } finally {
      setInvoking(null);
    }
  };

  const appendLog = (entry: InvocationLogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, 20));
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Zap size={18} color="#4f6ef7" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#dde1f5" }}>Capabilities</h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#3a4570" }}>
            {rows.length} capabilit{rows.length === 1 ? "y" : "ies"} discovered across {data.length} node{data.length === 1 ? "" : "s"}
          </p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} style={btnSecondaryStyle}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14, position: "relative" }}>
        <Search size={13} color="#3a4570" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by capability name…"
          style={{ ...inputStyle, paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
        />
      </div>

      {/* Offline controllers warning */}
      {data.some((d) => d.error) && (
        <div style={{ padding: "10px 14px", background: "#1a0808", border: "1px solid #3a1010", borderRadius: 8, color: "#ef4444", fontSize: 12, marginBottom: 14 }}>
          Unreachable: {data.filter((d) => d.error).map((d) => d.controller.name).join(", ")}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#0d0f1a", border: "1px solid #1e2240", borderRadius: 10, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1.4fr 1.4fr 100px",
            padding: "10px 16px",
            borderBottom: "1px solid #1a1e38",
            background: "#0a0c18",
          }}
        >
          {["Capability", "Owner", "Reachable From", "Actions"].map((h) => (
            <span
              key={h}
              style={{ fontSize: 10, fontWeight: 700, color: "#3a4570", textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#2e3560", fontSize: 13 }}>
            No capabilities discovered
          </div>
        )}

        {filtered.map((row) => {
          const isOpen = openInvoke === row.name;
          const ownerUrl = invokeController[row.name]
            ?? row.owners[0]?.url
            ?? row.reachableFrom[0]?.url
            ?? "";
          return (
            <div key={row.name} style={{ borderBottom: "1px solid #0f1120" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.4fr 1.4fr 100px",
                  padding: "12px 16px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "monospace", color: "#7b8fff", fontSize: 13, fontWeight: 600 }}>
                  {row.name}
                </span>
                <span style={{ fontSize: 12, color: "#dde1f5" }}>
                  {row.owners.length === 0
                    ? <span style={{ color: "#2e3560" }}>—</span>
                    : row.owners.map((o) => o.name).join(", ")}
                </span>
                <span style={{ fontSize: 12, color: "#5a6aaa" }}>
                  {row.reachableFrom.length === 0
                    ? <span style={{ color: "#2e3560" }}>—</span>
                    : row.reachableFrom.map((o) => o.name).join(", ")}
                </span>
                <button
                  onClick={() => {
                    setOpenInvoke((p) => (p === row.name ? null : row.name));
                    if (!invokeController[row.name] && ownerUrl) {
                      setInvokeController((s) => ({ ...s, [row.name]: ownerUrl }));
                    }
                  }}
                  style={invokeBtnStyle}
                >
                  {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  Invoke
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: "0 16px 14px", background: "#080a12" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, paddingTop: 10 }}>
                    <select
                      value={ownerUrl}
                      onChange={(e) =>
                        setInvokeController((s) => ({ ...s, [row.name]: e.target.value }))
                      }
                      style={{ ...inputStyle, flex: "0 0 200px" }}
                    >
                      {[...row.owners, ...row.reachableFrom].map((c) => (
                        <option key={c.id} value={c.url}>
                          {c.name} ({c.url})
                        </option>
                      ))}
                      {row.owners.length === 0 && row.reachableFrom.length === 0 && (
                        <option value="">No controller available</option>
                      )}
                    </select>
                    <button
                      onClick={() => void handleInvoke(row.name)}
                      disabled={invoking === row.name || !ownerUrl}
                      style={btnPrimaryStyle}
                    >
                      <Play size={11} />
                      {invoking === row.name ? "Invoking…" : "Run"}
                    </button>
                  </div>
                  <textarea
                    value={invokeParams[row.name] ?? ""}
                    onChange={(e) =>
                      setInvokeParams((s) => ({ ...s, [row.name]: e.target.value }))
                    }
                    placeholder='Params JSON object, e.g. { "x": 1 }'
                    rows={4}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      boxSizing: "border-box",
                      resize: "vertical",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invocation log */}
      {log.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#8090c0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Recent Invocations ({log.length}/20)
          </div>
          <div style={{ background: "#0d0f1a", border: "1px solid #1e2240", borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 1fr 60px 1fr",
                padding: "10px 16px",
                borderBottom: "1px solid #1a1e38",
                background: "#0a0c18",
              }}
            >
              {["Time", "Capability", "Controller", "ms", "Result"].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#3a4570", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {h}
                </span>
              ))}
            </div>
            {log.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 1fr 60px 1fr",
                  padding: "9px 16px",
                  borderBottom: i < log.length - 1 ? "1px solid #0f1120" : "none",
                  fontSize: 12,
                  alignItems: "start",
                }}
              >
                <span style={{ color: "#3a4570", fontFamily: "monospace" }}>
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
                <span style={{ fontFamily: "monospace", color: "#7b8fff" }}>{e.capability}</span>
                <span style={{ color: "#5a6aaa" }}>{e.controller}</span>
                <span style={{ color: "#dde1f5", fontFamily: "monospace" }}>{e.latencyMs}</span>
                <span
                  style={{
                    fontFamily: "monospace",
                    color: e.error ? "#ef4444" : "#22c55e",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: 80,
                    overflow: "hidden",
                  }}
                >
                  {e.error ? e.error : e.result || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#080a12",
  border: "1px solid #1e2240",
  borderRadius: 6,
  padding: "8px 12px",
  color: "#dde1f5",
  fontSize: 12,
  fontFamily: "monospace",
  outline: "none",
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
  borderRadius: 6,
  padding: "8px 14px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const invokeBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "#131830",
  border: "1px solid #252d58",
  borderRadius: 5,
  padding: "5px 10px",
  color: "#7b8fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
