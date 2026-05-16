"use client";

import { useEffect, useState } from "react";

/**
 * AFTER — OpenPrem's Open Intelligence Interconnect Model (OIIM).
 *
 * Left column: SVG diagram of a central Authority Plane with 6 systems in a
 * peer-to-peer mesh ring. All connections animate. Stats below count from
 * the BEFORE numbers (23 → 0, 4.2h → 4s) on mount.
 *
 * Right column: 7 scenario cards covering OpenPrem's pitch points.
 */

const NODES = [
  "Factory ERP",
  "Warehouse WMS",
  "Corporate SAP",
  "Analytics",
  "Orders",
  "Support",
];

export type AfterLiveStatus =
  | "idle"
  | "executing"
  | "recovering"
  | "nominal";

interface AfterSimulationProps {
  liveStatus?: AfterLiveStatus;
  // When supplied, the right column renders the actual live network graph
  // (or any preview React node) — the audience sees OIIM concept on the
  // left and the real running network on the right, side by side.
  livePreview?: React.ReactNode;
}

export function AfterSimulation({
  liveStatus = "idle",
  livePreview,
}: AfterSimulationProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]"
      style={{ background: "transparent", color: "#e5e7eb" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <OIIMDiagram liveStatus={liveStatus} />
        {livePreview ? <AfterValueProps /> : null}
      </div>
      {livePreview ? (
        <div
          style={{
            background: "#000",
            border: "1px solid #1a1a1a",
            borderRadius: 10,
            overflow: "hidden",
            position: "relative",
            minHeight: 360,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 12,
              fontSize: 9,
              color: "#444",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            Live network · OpenPrem
          </div>
          <div style={{ position: "absolute", inset: 0 }}>{livePreview}</div>
        </div>
      ) : (
        <AfterScenarios />
      )}
    </div>
  );
}

// Compact value-prop list shown beneath the OIIM diagram when the live
// network is being displayed on the right (replaces the long scenario list).
function AfterValueProps() {
  const props = [
    "Peer-to-peer · no broker in the critical path",
    "One universal data format · no per-system mapping",
    "Legacy systems wrapped with adapters · migrate at your pace",
    "Programs reusable across departments via a new address",
    "Nested authority · corporate policies inherit into every team",
    "Security is structural · every link explicit and audited",
    "AI + human share the same control plane",
  ];
  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 10,
        padding: 12,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        What this unlocks
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {props.map((p, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              color: "#cccccc",
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                background: "#22c55e",
                borderRadius: "50%",
                marginTop: 7,
                flexShrink: 0,
              }}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── LEFT: OIIM diagram ─────────────────────────────────────────────────

function OIIMDiagram({ liveStatus = "idle" }: { liveStatus?: AfterLiveStatus }) {
  const W = 480;
  const H = 360;
  const cx = W / 2;
  const cy = 180;
  const ringR = 130;

  const ringPositions = NODES.map((_, i) => {
    // Distribute nodes evenly on a circle, starting at the top.
    const angle = -Math.PI / 2 + (i / NODES.length) * Math.PI * 2;
    return {
      x: cx + Math.cos(angle) * ringR,
      y: cy + Math.sin(angle) * ringR,
    };
  });

  const boxW = 100;
  const boxH = 32;

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        <span>Open Intelligence Interconnect Model</span>
        <LiveStatusPill status={liveStatus} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Peer-to-peer mesh — connect every node to every other */}
        {ringPositions.map((p, i) =>
          ringPositions.slice(i + 1).map((q, j) => (
            <line
              key={`mesh-${i}-${j}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke="#14b8a6"
              strokeWidth={0.8}
              strokeOpacity={0.18}
              strokeDasharray="3 3"
              className="op-flow"
            />
          )),
        )}

        {/* Authority plane connections — thicker blue */}
        {ringPositions.map((p, i) => (
          <line
            key={`auth-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#0070f3"
            strokeWidth={1.2}
            strokeOpacity={0.6}
          />
        ))}

        {/* Authority plane hexagon */}
        <g>
          <polygon
            points={hexPoints(cx, cy, 36)}
            fill="#0a1d3a"
            stroke="#0070f3"
            strokeWidth={1.5}
          />
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize="9"
            fill="#0070f3"
            fontWeight="600"
            letterSpacing="0.08em"
          >
            OPENPREM
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize="8"
            fill="#888"
          >
            authority plane
          </text>
        </g>

        {/* Ring node boxes */}
        {ringPositions.map((p, i) => (
          <g key={`node-${NODES[i]}`}>
            <rect
              x={p.x - boxW / 2}
              y={p.y - boxH / 2}
              width={boxW}
              height={boxH}
              rx={6}
              fill="#0f0f0f"
              stroke="#2a2a2a"
            />
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              fontSize="10"
              fill="#fff"
              fontWeight="500"
            >
              {NODES[i]}
            </text>
          </g>
        ))}
      </svg>

      <div className="grid grid-cols-1 gap-2 mt-4 sm:grid-cols-3">
        <CountStat from={23} to={0} suffix="" label="middleware dependencies" />
        <CountStat from={252} to={4} suffix="s" label="detection time" />
        <Stat value="Universal" label="data format" valueColor="#14b8a6" />
      </div>

      <style jsx>{`
        @keyframes op-dash-flow {
          to {
            stroke-dashoffset: -18;
          }
        }
        :global(.op-flow) {
          animation: op-dash-flow 2.4s linear infinite;
        }
      `}</style>
    </div>
  );
}

function LiveStatusPill({ status }: { status: AfterLiveStatus }) {
  if (status === "idle") return null;
  const cfg = {
    executing: { label: "Cascade in progress on live network", color: "#ef4444" },
    recovering: { label: "Recovery in progress on live network", color: "#14b8a6" },
    nominal: { label: "Recovery complete on live network", color: "#22c55e" },
  }[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${cfg.color}1a`,
        color: cfg.color,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "none",
        border: `1px solid ${cfg.color}55`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.color,
        }}
      />
      {cfg.label}
    </span>
  );
}

function hexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return points.join(" ");
}

function Stat({
  value,
  label,
  valueColor = "#fff",
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1a1a1a",
        borderRadius: 6,
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CountStat({
  from,
  to,
  suffix,
  label,
}: {
  from: number;
  to: number;
  suffix: string;
  label: string;
}) {
  const [v, setV] = useState(from);
  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return (
    <Stat value={`${v}${suffix}`} label={label} valueColor="#14b8a6" />
  );
}

// ─── RIGHT: After scenarios ─────────────────────────────────────────────

interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
  detail: React.ReactNode;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    id: "p2p",
    title: "Peer-to-peer — no middleman to fail",
    description:
      "Systems connect directly. No broker to go dark. No silent failures. A lost connection is detected in 4 seconds, not 4 hours.",
    detail: <P2PDetail />,
  },
  {
    id: "universal",
    title: "One language, every system",
    description:
      "Data is formalized into OpenPrem's universal format. Systems speak the same language — any system can read any other system's data instantly.",
    detail: <UniversalDetail />,
  },
  {
    id: "bridge",
    title: "Your legacy systems get 10 more years",
    description:
      "Wrap existing systems with OpenPrem adapters. Migrate at your pace. Technical debt becomes a controlled backlog, not an emergency.",
    detail: <LegacyBridgeDetail />,
  },
  {
    id: "reuse",
    title: "Build once, run everywhere",
    description:
      "Applications built by one department are instantly available to others. Replicate with a new network address. No rebuilding.",
    detail: <ReuseDetail />,
  },
  {
    id: "visibility",
    title: "See everything, always",
    description:
      "One central plane shows your entire network — operations, policy, programming. Nested authority: Corporate sets global policies, departments inherit and extend.",
    detail: <VisibilityDetail />,
  },
  {
    id: "security",
    title: "Granular security — who talks to who, and how",
    description:
      "Define exactly which applications can communicate, what data they can exchange, and under what conditions. Security is architecture, not an afterthought.",
    detail: <SecurityDetail />,
  },
  {
    id: "ai",
    title: "AI and humans share the same control plane",
    description:
      "Both AI agents and human operators use the same interface to interact with the network. Full granularity, full accountability, full audit trail.",
    detail: <AIDetail />,
  },
];

function AfterScenarios() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
      <div
        style={{
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
        }}
      >
        After · What this unlocks
      </div>
      {SCENARIOS.map((s) => {
        const isOpen = openId === s.id;
        return (
          <div
            key={s.id}
            style={{
              background: "#111",
              border: `1px solid ${isOpen ? "#0070f3" : "#1e1e1e"}`,
              borderRadius: 8,
              padding: 14,
              cursor: "pointer",
              transition: "border-color 120ms ease",
            }}
            onClick={() => setOpenId(isOpen ? null : s.id)}
            onMouseEnter={(e) => {
              if (!isOpen) e.currentTarget.style.borderColor = "#2a2a2a";
            }}
            onMouseLeave={(e) => {
              if (!isOpen) e.currentTarget.style.borderColor = "#1e1e1e";
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, lineHeight: 1.5 }}>
                  {s.description}
                </div>
              </div>
              <span style={{ color: "#444", fontSize: 12 }}>{isOpen ? "−" : "+"}</span>
            </div>
            {isOpen ? (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid #1a1a1a",
                }}
              >
                {s.detail}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail content ─────────────────────────────────────────────────────

function P2PDetail() {
  return (
    <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
      Direct connection: <strong style={{ color: "#fff" }}>Factory 2 ⇆ Orders</strong>.
      No middleware in the path. A lost connection fires a real-time alert in
      ~4 seconds via the authority plane — not 4 hours later when an operator
      notices stale numbers.
    </div>
  );
}

function UniversalDetail() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          fontSize: 11,
        }}
      >
        <Pill>JSON</Pill>
        <Pill>XML</Pill>
        <Pill>Proprietary</Pill>
        <span style={{ color: "#666" }}>→</span>
        <Pill color="#0070f3">OpenPrem format</Pill>
        <span style={{ color: "#666" }}>→</span>
        <Pill color="#14b8a6">Any consumer</Pill>
      </div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 10 }}>
        Time to integrate a new system:{" "}
        <strong style={{ color: "#fff" }}>2 hours</strong> vs 6 weeks.
      </div>
    </div>
  );
}

function LegacyBridgeDetail() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 0",
        }}
      >
        <div
          style={{
            border: "2px solid #0070f3",
            borderRadius: 999,
            padding: 6,
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 11,
              color: "#fff",
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            Legacy ERP v4.2
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
        Adapter deployment: <strong style={{ color: "#fff" }}>4 hours</strong>.
        Legacy system retirement: <strong style={{ color: "#fff" }}>your timeline</strong>.
      </div>
    </div>
  );
}

function ReuseDetail() {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
        Department A builds an analytics module → publishes an OpenPrem
        address → Departments B, C, D consume it instantly.
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 18,
          fontWeight: 700,
          color: "#14b8a6",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ~$180K
      </div>
      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
        Saved per reused application (est.)
      </div>
    </div>
  );
}

function VisibilityDetail() {
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {[
          "Corporate authority → sets global policies",
          "Department authority → inherits + extends",
          "Environment authority → inherits + extends",
        ].map((line, i) => (
          <li
            key={line}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "#888",
              padding: "4px 0",
              paddingLeft: i * 12,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                background: "#0070f3",
                borderRadius: "50%",
              }}
            />
            {line}
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
        Policy changes propagate in real-time to all inherited systems.
      </div>
    </div>
  );
}

function SecurityDetail() {
  return (
    <div>
      <table
        style={{
          width: "100%",
          fontSize: 11,
          borderCollapse: "collapse",
          color: "#888",
        }}
      >
        <tbody>
          <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
            <td style={{ padding: "6px 0" }}>App A ↔ App B</td>
            <td style={{ padding: "6px 0", textAlign: "right", color: "#22c55e" }}>
              ALLOWED · read-only inventory
            </td>
          </tr>
          <tr>
            <td style={{ padding: "6px 0" }}>App A ↔ App C</td>
            <td style={{ padding: "6px 0", textAlign: "right", color: "#ef4444" }}>
              DENIED
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: "#666", marginTop: 8 }}>
        Full audit trail of every inter-system communication.
      </div>
    </div>
  );
}

function AIDetail() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <ActorCard label="AI Agent" sub="permissions: scoped" />
        <ActorCard label="Human Operator" sub="permissions: scoped" />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#888",
        }}
      >
        ↓ same control plane ↓
      </div>
      <div
        style={{
          background: "#0a1d3a",
          border: "1px solid #0070f3",
          borderRadius: 8,
          padding: 10,
          textAlign: "center",
          fontSize: 12,
          color: "#fff",
          fontWeight: 500,
        }}
      >
        OpenPrem authority plane
      </div>
    </div>
  );
}

function ActorCard({ label, sub }: { label: string; sub: string }) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        padding: 10,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Pill({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        background: "#0a0a0a",
        border: `1px solid ${color ?? "#1e1e1e"}`,
        color: color ?? "#888",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
