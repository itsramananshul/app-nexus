"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, GitBranch, Radio, Network } from "lucide-react";
import { getNetworkSummary, getNetworkPeers, getSessions, getCapabilities } from "@/lib/controller-api";
import { loadControllers } from "@/lib/store";
import { loadSettings } from "@/lib/settings";
import { clientUrl, formatSummaryValue, msAgo } from "@/lib/util";
import type { PeerInfo, Session, ControllerEntry, CapabilitiesResponse } from "@/lib/controller-types";

interface LatencyResult {
  ms: number | null;   // null = timeout/error
  error: string | null;
}

async function measureLatency(url: string, timeoutMs: number): Promise<LatencyResult> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const start = performance.now();
  const reachable = clientUrl(url);
  try {
    const res = await fetch(`${reachable}/capabilities`, { cache: "no-store", signal: abort.signal });
    if (!res.ok) {
      return { ms: null, error: `HTTP ${res.status}` };
    }
    return { ms: Math.round(performance.now() - start), error: null };
  } catch (e) {
    return {
      ms: null,
      error: e instanceof Error && e.name === "AbortError" ? "Timeout" : "Unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

interface TopologyNode {
  controller: ControllerEntry;
  caps: CapabilitiesResponse | null;
}

export default function RouterPage() {
  const router = useRouter();
  const [routerNode, setRouterNode] = useState<ControllerEntry | null>(null);
  const [controllers, setControllers] = useState<ControllerEntry[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [latencies, setLatencies] = useState<Map<string, LatencyResult>>(new Map());
  const [topology, setTopology] = useState<TopologyNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = useMemo(() => loadSettings(), []);

  const refresh = async (r: ControllerEntry | null, list: ControllerEntry[]) => {
    if (!r) return;
    setLoading(true);
    setError(null);
    try {
      const [sum, p, sess] = await Promise.all([
        getNetworkSummary(r.url),
        getNetworkPeers(r.url),
        getSessions(r.url),
      ]);
      setSummary(sum);
      setPeers(p);
      setSessions(sess);

      // Measure per-peer latency
      const measured = await Promise.all(
        p.map(async (peer) => [peer.url, await measureLatency(peer.url, settings.peerTimeoutMs)] as const),
      );
      setLatencies(new Map(measured));

      // Topology: fetch caps for every registered controller
      const topoResults = await Promise.allSettled(
        list.map(async (c) => {
          try {
            const caps = await getCapabilities(c.url);
            return { controller: c, caps } as TopologyNode;
          } catch {
            return { controller: c, caps: null } as TopologyNode;
          }
        }),
      );
      setTopology(
        topoResults.map((r, i) =>
          r.status === "fulfilled" ? r.value : { controller: list[i], caps: null },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reach router");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const list = loadControllers();
    setControllers(list);
    const r = list.find((c) => c.role === "router") ?? null;
    setRouterNode(r);
    void refresh(r, list);
  }, []);

  if (!routerNode) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#dde1f5", margin: "0 0 8px" }}>Router</h1>
        <p style={{ color: "#3a4570", fontSize: 13 }}>
          No router configured. Add a node with role &quot;router&quot; in the Controllers page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <GitBranch size={18} color="#4f6ef7" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#dde1f5" }}>Router</h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#3a4570", fontFamily: "monospace" }}>{routerNode.url}</p>
        </div>
        <button
          onClick={() => void refresh(routerNode, controllers)}
          disabled={loading}
          style={btnSecondaryStyle}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#1a0808", border: "1px solid #3a1010", borderRadius: 8, color: "#ef4444", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Summary cards — skip arrays/objects, pretty-print time/duration values */}
      {summary && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {Object.entries(summary)
            .map(([k, v]) => [k, formatSummaryValue(k, v)] as const)
            .filter((pair): pair is readonly [string, string] => pair[1] !== null)
            .map(([k, v]) => (
              <div key={k} style={summaryCardStyle}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#dde1f5" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#3a4570", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{k.replace(/_/g, " ")}</div>
              </div>
            ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Peers — with latency (filter the router out of its own peer list) */}
        <Section
          title={`Peers (${peers.filter((p) => p.name !== routerNode.name).length})`}
          icon={<Radio size={13} color="#4f6ef7" />}
        >
          {(() => {
            const visiblePeers = peers.filter((p) => p.name !== routerNode.name);
            if (visiblePeers.length === 0) return <Empty text="No peers connected" />;
            return visiblePeers.map((p) => {
              const display = clientUrl(p.url);
              const lat = latencies.get(p.url);
              return (
                <div key={p.url} style={rowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#dde1f5", fontSize: 13 }}>
                      {p.name ?? display}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#3a4570", marginTop: 2 }}>{display}</div>
                    <div style={{ fontSize: 11, color: "#4a5080", marginTop: 3 }}>
                      {p.capabilities.length} capabilities
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <HealthDot healthy={p.healthy} />
                    <div style={{ marginTop: 5 }}>
                      <LatencyBadge result={lat} />
                    </div>
                    <div style={{ fontSize: 10, color: "#3a4570", marginTop: 4 }}>
                      {msAgo(p.last_heartbeat)}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </Section>

        {/* Sessions */}
        <Section title={`Sessions (${sessions.length})`} icon={<GitBranch size={13} color="#4f6ef7" />}>
          {sessions.length === 0
            ? <Empty text="No active sessions" />
            : sessions.map((s) => (
              <div key={s.workflow_id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 600, color: "#dde1f5", fontSize: 13 }}>{s.workflow_name}</div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#3a4570", marginTop: 2 }}>
                    {s.workflow_id.slice(0, 12)}…
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5080", marginTop: 3 }}>
                    {s.route.length > 0 ? `Route: ${s.route.join(" → ")}` : `From: ${s.source_peer}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <StatusBadge status={s.status} />
                  <div style={{ fontSize: 10, color: "#3a4570", marginTop: 4 }}>
                    {msAgo(s.started_at)}
                  </div>
                </div>
              </div>
            ))}
        </Section>
      </div>

      {/* Topology */}
      <Section title="Network Topology" icon={<Network size={13} color="#4f6ef7" />}>
        <TopologyMap
          nodes={topology}
          onSelect={(id) => router.push(`/controllers#highlight=${id}`)}
        />
        <div style={{ fontSize: 11, color: "#3a4570", marginTop: 10, lineHeight: 1.5 }}>
          Edges show remote capability relationships derived from each controller&apos;s /capabilities response. Click any node to open it in Controllers.
        </div>
      </Section>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function TopologyMap({
  nodes,
  onSelect,
}: {
  nodes: TopologyNode[];
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) {
    return <div style={{ fontSize: 12, color: "#2e3560", padding: "20px 0" }}>No controllers in registry</div>;
  }

  const width = 880;
  const height = Math.max(280, 80 + nodes.length * 8);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  // Position nodes on a circle
  const positions = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  // Determine edges: for each pair (a, b), edge exists if a's remote contains a cap that b owns locally
  const edges: Array<{ a: number; b: number }> = [];
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    if (!a.caps) continue;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const b = positions[j];
      if (!b.caps) continue;
      const hasLink = a.caps.remote.some((cap) => b.caps!.local.includes(cap));
      if (hasLink && !edges.find((e) => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
        edges.push({ a: i, b: j });
      }
    }
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{
          background: "#080a12",
          border: "1px solid #1a1e38",
          borderRadius: 8,
          display: "block",
        }}
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const a = positions[e.a];
          const b = positions[e.b];
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#252d58"
              strokeWidth={1}
              strokeOpacity={0.7}
            />
          );
        })}

        {/* Nodes */}
        {positions.map((p) => {
          const isRouter = p.controller.role === "router";
          const offline = p.caps === null;
          const fill = isRouter ? "#1a1f40" : "#131830";
          const stroke = offline ? "#3a1010" : isRouter ? "#7b8fff" : "#4f6ef7";
          const port = (() => {
            try { return new URL(p.controller.url).port || "—"; } catch { return "—"; }
          })();
          return (
            <g
              key={p.controller.id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(p.controller.id)}
            >
              <circle cx={p.x} cy={p.y} r={28} fill={fill} stroke={stroke} strokeWidth={2} />
              <text
                x={p.x}
                y={p.y - 2}
                textAnchor="middle"
                fill="#dde1f5"
                fontSize={11}
                fontWeight={700}
                fontFamily="system-ui, sans-serif"
              >
                {p.controller.name.length > 11 ? p.controller.name.slice(0, 10) + "…" : p.controller.name}
              </text>
              <text
                x={p.x}
                y={p.y + 11}
                textAnchor="middle"
                fill={offline ? "#ef4444" : "#5a6aaa"}
                fontSize={9}
                fontFamily="monospace"
              >
                :{port}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LatencyBadge({ result }: { result: LatencyResult | undefined }) {
  if (!result) {
    return <span style={{ fontSize: 10, color: "#3a4570" }}>—</span>;
  }
  if (result.ms === null) {
    return (
      <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>
        {result.error ?? "Failed"}
      </span>
    );
  }
  const color =
    result.ms < 200 ? "#22c55e"
    : result.ms < 800 ? "#f59e0b"
    : "#ef4444";
  return (
    <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: "monospace" }}>
      {result.ms}ms
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0d0f1a", border: "1px solid #1e2240", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1e38", display: "flex", alignItems: "center", gap: 7 }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 13, color: "#8090c0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function HealthDot({ healthy }: { healthy: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: healthy ? "#22c55e" : "#ef4444", display: "inline-block", boxShadow: healthy ? "0 0 5px #22c55e" : "none" }} />
      <span style={{ fontSize: 11, color: healthy ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{healthy ? "Healthy" : "Down"}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "running" ? "#f59e0b" : status === "completed" ? "#22c55e" : "#ef4444";
  return <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: "capitalize" }}>{status}</span>;
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: "#2e3560", padding: "8px 0" }}>{text}</div>;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "10px 12px",
  borderRadius: 7,
  background: "#080a12",
};

const summaryCardStyle: React.CSSProperties = {
  background: "#0d0f1a",
  border: "1px solid #1e2240",
  borderRadius: 8,
  padding: "14px 18px",
  minWidth: 120,
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
