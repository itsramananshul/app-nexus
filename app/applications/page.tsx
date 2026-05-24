"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Play,
  Square,
  Workflow,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Save as SaveIcon,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  cancelWorkflow,
  getCapabilities,
  getSession,
  getSessions,
  getWorkflows,
  submitWorkflow,
  validateWorkflow,
} from "@/lib/controller-api";
import { loadControllers } from "@/lib/store";
import { loadSettings } from "@/lib/settings";
import {
  addSavedWorkflow,
  loadSavedWorkflows,
  removeSavedWorkflow,
  type SavedWorkflow,
} from "@/lib/savedWorkflows";
import type {
  ControllerEntry,
  Session,
  WorkflowSummary,
} from "@/lib/controller-types";
import { elapsed, msAgo, tsToMs } from "@/lib/util";

interface AppRow {
  controller: ControllerEntry;
  workflows: WorkflowSummary[];
}

interface ValidationView {
  valid: boolean;
  capabilities: string[];
  error: string | null;
  availability: Map<string, boolean>; // capability → exists somewhere on the network
}

export default function ApplicationsPage() {
  const [controllers, setControllers] = useState<ControllerEntry[]>([]);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  // Build & Run state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [bTarget, setBTarget] = useState("");
  const [bName, setBName] = useState("");
  const [bSource, setBSource] = useState("");
  const [bDescription, setBDescription] = useState("");
  const [bValidation, setBValidation] = useState<ValidationView | null>(null);
  const [bValidating, setBValidating] = useState(false);
  const [bRunning, setBRunning] = useState(false);
  const [bRunMsg, setBRunMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [bSaveMsg, setBSaveMsg] = useState<string | null>(null);

  // Saved workflows
  const [saved, setSaved] = useState<SavedWorkflow[]>([]);

  // Solflow availability per-row state
  const [solflowMsg, setSolflowMsg] = useState<Record<string, string>>({});

  // Session trace
  const [traceId, setTraceId] = useState<string | null>(null);
  const [trace, setTrace] = useState<Session | null>(null);
  const [traceTick, setTraceTick] = useState(0);
  const traceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const settings = useMemo(() => loadSettings(), []);

  const routerNode = controllers.find((c) => c.role === "router");

  const refresh = async (list: ControllerEntry[]) => {
    setLoading(true);
    const results = await Promise.allSettled(
      list
        .filter((c) => c.role === "controller")
        .map(async (c) => {
          const wf = await getWorkflows(c.url);
          return { controller: c, workflows: wf.workflows } as AppRow;
        }),
    );
    setRows(
      results
        .filter((r): r is PromiseFulfilledResult<AppRow> => r.status === "fulfilled")
        .map((r) => r.value),
    );
    const router = list.find((c) => c.role === "router");
    if (router) {
      try {
        setSessions(await getSessions(router.url));
      } catch {
        setSessions([]);
      }
    } else {
      setSessions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const list = loadControllers();
    setControllers(list);
    setSaved(loadSavedWorkflows());
    void refresh(list);
  }, []);

  // Deep session trace polling
  useEffect(() => {
    if (!traceId || !routerNode) {
      if (traceTimer.current) {
        clearInterval(traceTimer.current);
        traceTimer.current = null;
      }
      setTrace(null);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const s = await getSession(routerNode.url, traceId);
        if (!cancelled) {
          setTrace(s);
          setTraceTick((t) => t + 1);
          if (s.status !== "running" && traceTimer.current) {
            clearInterval(traceTimer.current);
            traceTimer.current = null;
          }
        }
      } catch {
        if (!cancelled) {
          setTrace(null);
        }
      }
    };
    void poll();
    traceTimer.current = setInterval(poll, settings.sessionTraceIntervalMs);
    return () => {
      cancelled = true;
      if (traceTimer.current) clearInterval(traceTimer.current);
      traceTimer.current = null;
    };
  }, [traceId, routerNode, settings.sessionTraceIntervalMs]);

  // Elapsed-time re-render while trace is running
  useEffect(() => {
    if (!trace || trace.status !== "running") return;
    const id = setInterval(() => setTraceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [trace?.status]);

  const handleCancel = async (controllerUrl: string, id: string) => {
    try {
      await cancelWorkflow(controllerUrl, id);
      void refresh(controllers);
    } catch {
      // ignore
    }
  };

  // ── Build & Run handlers ────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!bTarget || !bSource.trim()) return;
    setBValidating(true);
    setBValidation(null);
    setBRunMsg(null);
    try {
      const result = await validateWorkflow(bTarget, bSource);
      // Cross-check each required capability against the live network
      const networkResults = await Promise.allSettled(
        controllers.map((c) => getCapabilities(c.url)),
      );
      const allCaps = new Set<string>();
      for (const r of networkResults) {
        if (r.status === "fulfilled") {
          r.value.local.forEach((c) => allCaps.add(c));
        }
      }
      const availability = new Map<string, boolean>();
      for (const cap of result.capabilities) {
        availability.set(cap, allCaps.has(cap));
      }
      setBValidation({
        valid: result.valid,
        capabilities: result.capabilities,
        error: result.error,
        availability,
      });
    } catch (e) {
      setBValidation({
        valid: false,
        capabilities: [],
        error: e instanceof Error ? e.message : "Validation failed",
        availability: new Map(),
      });
    } finally {
      setBValidating(false);
    }
  };

  const handleRun = async () => {
    if (!bTarget || !bSource.trim() || !bName.trim()) return;
    setBRunning(true);
    setBRunMsg(null);
    try {
      const res = await submitWorkflow(bTarget, bSource, bName.trim());
      setBRunMsg({ kind: "ok", text: `Started — workflow ID: ${res.workflow_id}` });
      void refresh(controllers);
    } catch (e) {
      setBRunMsg({ kind: "err", text: e instanceof Error ? e.message : "Submit failed" });
    } finally {
      setBRunning(false);
    }
  };

  const handleSave = () => {
    if (!bName.trim() || !bSource.trim()) {
      setBSaveMsg("Name and source required");
      setTimeout(() => setBSaveMsg(null), 2000);
      return;
    }
    const next = addSavedWorkflow(saved, {
      name: bName,
      description: bDescription,
      source: bSource,
      workflow: bName,
    });
    setSaved(next);
    setBSaveMsg("Saved");
    setTimeout(() => setBSaveMsg(null), 1500);
  };

  const loadSavedIntoBuilder = (s: SavedWorkflow) => {
    setBName(s.name);
    setBDescription(s.description);
    setBSource(s.source);
    setBValidation(null);
    setBRunMsg(null);
    setBuilderOpen(true);
  };

  const handleDeleteSaved = (id: string) => {
    setSaved(removeSavedWorkflow(saved, id));
  };

  const runSaved = async (s: SavedWorkflow) => {
    if (!bTarget) {
      setBRunMsg({ kind: "err", text: "Pick a target controller in Build & Run first" });
      setBuilderOpen(true);
      return;
    }
    try {
      const res = await submitWorkflow(bTarget, s.source, s.workflow || s.name);
      setBRunMsg({ kind: "ok", text: `Started "${s.name}" — workflow ID: ${res.workflow_id}` });
      void refresh(controllers);
    } catch (e) {
      setBRunMsg({ kind: "err", text: e instanceof Error ? e.message : "Submit failed" });
    }
  };

  // ── Open in SolFlow ──────────────────────────────────────────────────────
  const openInSolflow = async (rowKey: string, wf: WorkflowSummary) => {
    setSolflowMsg((s) => ({ ...s, [rowKey]: "" }));
    const url = settings.solflowUrl.trim();
    if (!url) {
      setSolflowMsg((s) => ({
        ...s,
        [rowKey]: "SolFlow URL not configured — set it in Settings",
      }));
      return;
    }
    // Quick reachability test
    try {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 3000);
      try {
        await fetch(url, { method: "GET", mode: "no-cors", signal: abort.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      setSolflowMsg((s) => ({ ...s, [rowKey]: "SolFlow appears unreachable" }));
      return;
    }
    const sep = url.includes("?") ? "&" : "?";
    const target = `${url}${sep}workflow=${encodeURIComponent(wf.workflow_name)}&id=${encodeURIComponent(wf.id)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Workflow size={18} color="#0070f3" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#ffffff" }}>Applications</h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#444444" }}>SOL workflows and active sessions</p>
        </div>
        <button onClick={() => void refresh(controllers)} disabled={loading} style={btnSecondaryStyle}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Build & Run panel */}
      <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
        <button
          onClick={() => setBuilderOpen((p) => !p)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            background: "#000000",
            border: "none",
            borderBottom: builderOpen ? "1px solid #1a1a1a" : "none",
            color: "#ffffff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {builderOpen ? <ChevronDown size={14} color="#0070f3" /> : <ChevronRight size={14} color="#0070f3" />}
          <span style={{ fontWeight: 700, fontSize: 13, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Build &amp; Run
          </span>
        </button>
        {builderOpen && (
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select
                value={bTarget}
                onChange={(e) => setBTarget(e.target.value)}
                style={{ ...inputStyle, flex: "0 0 220px" }}
              >
                <option value="">Target controller…</option>
                {controllers.map((c) => (
                  <option key={c.id} value={c.url}>{c.name}</option>
                ))}
              </select>
              <input
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                placeholder="Workflow name"
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              />
              <input
                value={bDescription}
                onChange={(e) => setBDescription(e.target.value)}
                placeholder="Description (optional, for saving)"
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
            </div>
            <textarea
              value={bSource}
              onChange={(e) => { setBSource(e.target.value); setBValidation(null); }}
              placeholder="SOL workflow source…"
              rows={8}
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: "monospace",
              }}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => void handleValidate()}
                disabled={bValidating || !bTarget || !bSource.trim()}
                style={btnSecondaryStyle}
              >
                {bValidating ? "Validating…" : "Validate"}
              </button>
              <button
                onClick={() => void handleRun()}
                disabled={bRunning || !bTarget || !bSource.trim() || !bName.trim() || (bValidation && !bValidation.valid) || false}
                style={btnPrimaryStyle}
              >
                <Play size={12} />
                {bRunning ? "Running…" : "Run"}
              </button>
              <button onClick={handleSave} style={btnSecondaryStyle}>
                <SaveIcon size={12} />
                Save
              </button>
              {bSaveMsg && (
                <span style={{ alignSelf: "center", fontSize: 11, color: bSaveMsg === "Saved" ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                  {bSaveMsg}
                </span>
              )}
            </div>

            {bValidation && <ValidationPanel v={bValidation} />}

            {bRunMsg && (
              <div style={{ fontSize: 12, color: bRunMsg.kind === "ok" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                {bRunMsg.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved workflows */}
      {saved.length > 0 && (
        <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Saved Workflows ({saved.length})
            </span>
          </div>
          {saved.map((s) => (
            <div key={s.id} style={{ ...rowStyle, borderBottom: "1px solid #111111" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{s.name}</div>
                {s.description && (
                  <div style={{ fontSize: 11, color: "#666666", marginTop: 2 }}>{s.description}</div>
                )}
                <div style={{ fontSize: 10, color: "#444444", marginTop: 4 }}>
                  Saved {msAgo(new Date(s.savedAt).getTime())}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => loadSavedIntoBuilder(s)} style={smallBtnStyle} title="Load into builder">
                  Load
                </button>
                <button onClick={() => void runSaved(s)} style={smallPrimaryBtnStyle} title="Run">
                  <Play size={11} />
                </button>
                <button onClick={() => handleDeleteSaved(s.id)} style={cancelBtnStyle} title="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Router sessions */}
      {sessions.length > 0 && (
        <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Router Sessions ({sessions.length})
            </span>
          </div>
          {sessions.map((s) => (
            <div
              key={s.workflow_id}
              onClick={() => setTraceId(s.workflow_id)}
              style={{ ...rowStyle, borderBottom: "1px solid #111111", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{s.workflow_name}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "#444444", marginTop: 2 }}>
                  {s.workflow_id}
                </div>
                <div style={{ fontSize: 11, color: "#666666", marginTop: 4 }}>
                  Route: {s.route.length > 0 ? s.route.join(" → ") : s.source_peer}
                  {s.capabilities_used.length > 0 && ` · ${s.capabilities_used.length} caps`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <StatusBadge status={s.status} />
                <div style={{ fontSize: 10, color: "#444444", marginTop: 4 }}>{msAgo(s.started_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-controller workflows */}
      {rows.map(({ controller, workflows }) =>
        workflows.length > 0 && (
          <div key={controller.id} style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#888888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {controller.name} — {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
              </span>
            </div>
            {workflows.map((wf) => {
              const rowKey = `${controller.id}:${wf.id}`;
              const msg = solflowMsg[rowKey];
              return (
                <div key={wf.id} style={{ padding: "12px 16px", borderBottom: "1px solid #111111" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>{wf.workflow_name}</div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", color: "#444444", marginTop: 2 }}>{wf.id}</div>
                      {wf.progress && (
                        <div style={{ fontSize: 11, color: "#666666", marginTop: 3 }}>Step {wf.progress}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusBadge status={wf.status} />
                      <button
                        onClick={() => void openInSolflow(rowKey, wf)}
                        style={solflowBtnStyle}
                        title="Open in SolFlow"
                      >
                        <ExternalLink size={11} />
                        SolFlow
                      </button>
                      {wf.status === "running" && (
                        <button
                          onClick={() => void handleCancel(controller.url, wf.id)}
                          style={cancelBtnStyle}
                          title="Cancel"
                        >
                          <Square size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  {msg && (
                    <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                      {msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ),
      )}

      {rows.every((r) => r.workflows.length === 0) && sessions.length === 0 && !loading && (
        <div style={{ textAlign: "center", color: "#444444", fontSize: 13, padding: "40px 0" }}>
          No active workflows or sessions
        </div>
      )}

      {/* Deep session trace overlay */}
      {traceId && (
        <SessionTrace
          trace={trace}
          id={traceId}
          tick={traceTick}
          onClose={() => setTraceId(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ValidationPanel({ v }: { v: ValidationView }) {
  return (
    <div
      style={{
        background: "#000000",
        border: `1px solid ${v.valid ? "#1d4030" : "#3a1010"}`,
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {v.valid
          ? <CheckCircle2 size={14} color="#22c55e" />
          : <XCircle size={14} color="#ef4444" />}
        <span style={{ color: v.valid ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
          {v.valid ? "Valid" : "Invalid"}
        </span>
        {v.error && (
          <span style={{ color: "#ef4444", marginLeft: 8, fontFamily: "monospace", fontSize: 11 }}>{v.error}</span>
        )}
      </div>
      {v.capabilities.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#666666", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Required capabilities ({v.capabilities.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {v.capabilities.map((c) => {
              const ok = v.availability.get(c) === true;
              return (
                <span
                  key={c}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: ok ? "#0d1f15" : "#1a0808",
                    color: ok ? "#22c55e" : "#ef4444",
                    border: `1px solid ${ok ? "#1d4030" : "#3a1010"}`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title={ok ? "Available on network" : "No controller exposes this capability"}
                >
                  {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {c}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SessionTrace({
  trace,
  id,
  tick,
  onClose,
}: {
  trace: Session | null;
  id: string;
  tick: number;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
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
          width: 640,
          maxWidth: "92vw",
          overflow: "hidden",
        }}
      >
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
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff" }}>
              {trace?.workflow_name ?? "Session"}
            </div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#444444", marginTop: 2 }}>
              {id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #1a1a1a",
              cursor: "pointer",
              padding: "5px 7px",
              color: "#666666",
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {!trace && (
            <div style={{ fontSize: 13, color: "#444444" }}>Loading session…</div>
          )}
          {trace && (
            <>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                <Meta label="Status">
                  <StatusBadge status={trace.status} />
                </Meta>
                <Meta label="Source peer">
                  <span style={{ fontFamily: "monospace", color: "#ffffff", fontSize: 12 }}>{trace.source_peer}</span>
                </Meta>
                <Meta label="Started">
                  <span style={{ color: "#ffffff", fontSize: 12 }}>{new Date(tsToMs(trace.started_at)).toLocaleTimeString()}</span>
                </Meta>
                <Meta label="Elapsed">
                  <span style={{ color: "#ffffff", fontSize: 12, fontFamily: "monospace" }}>{elapsed(trace.started_at)}</span>
                </Meta>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Route ({trace.route.length} hops)
                </div>
                {trace.route.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#444444" }}>No route data yet</div>
                ) : (
                  <RouteBreadcrumb route={trace.route} status={trace.status} />
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Capabilities used ({trace.capabilities_used.length})
                </div>
                {trace.capabilities_used.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#444444" }}>None yet</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {trace.capabilities_used.map((c, i) => (
                      <span
                        key={`${c}-${i}`}
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "#111111",
                          color: "#ffffff",
                          border: "1px solid #2a2a2a",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {trace.result != null && (
                <div>
                  <div style={{ fontSize: 11, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Result
                  </div>
                  <pre
                    style={{
                      background: "#000000",
                      border: "1px solid #1a1a1a",
                      borderRadius: 6,
                      padding: "10px 12px",
                      color: "#ffffff",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxHeight: 200,
                      overflow: "auto",
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(trace.result, null, 2)}
                  </pre>
                </div>
              )}

              <div style={{ fontSize: 10, color: "#444444" }}>
                {trace.status === "running" ? `Polling every tick · updates: ${tick}` : "Polling stopped"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteBreadcrumb({ route, status }: { route: string[]; status: string }) {
  // Active hop = last hop while running; otherwise everything is past
  const activeIdx = status === "running" ? route.length - 1 : -1;
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
      {route.map((hop, i) => {
        const active = i === activeIdx;
        return (
          <span key={`${hop}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                padding: "4px 9px",
                borderRadius: 5,
                background: active ? "#1a1f40" : "#111111",
                color: active ? "#ffffff" : "#888888",
                border: `1px solid ${active ? "#0070f3" : "#1a1a1a"}`,
                fontWeight: active ? 700 : 500,
                boxShadow: active ? "0 0 8px rgba(79,110,247,0.4)" : "none",
              }}
            >
              {hop}
            </span>
            {i < route.length - 1 && (
              <span style={{ color: "#444444", fontSize: 12 }}>→</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#666666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "running" ? "#f59e0b" : status === "completed" ? "#22c55e" : "#ef4444";
  return <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: "capitalize" }}>{status}</span>;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "12px 16px",
};

const inputStyle: React.CSSProperties = {
  background: "#000000",
  border: "1px solid #1a1a1a",
  borderRadius: 6,
  padding: "8px 12px",
  color: "#ffffff",
  fontSize: 12,
  fontFamily: "monospace",
  outline: "none",
};

const btnSecondaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#0a0a0a",
  border: "1px solid #1a1a1a",
  borderRadius: 7,
  padding: "8px 14px",
  color: "#888888",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#0070f3",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const cancelBtnStyle: React.CSSProperties = {
  background: "#1a0c0c",
  border: "1px solid #3a1010",
  borderRadius: 5,
  padding: "5px 7px",
  color: "#ef4444",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const solflowBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: 5,
  padding: "5px 9px",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const smallBtnStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #1a1a1a",
  borderRadius: 5,
  padding: "5px 9px",
  color: "#888888",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const smallPrimaryBtnStyle: React.CSSProperties = {
  background: "#0070f3",
  border: "none",
  borderRadius: 5,
  padding: "5px 9px",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};
