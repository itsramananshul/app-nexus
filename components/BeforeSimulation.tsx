"use client";

import { useEffect, useState } from "react";

/**
 * BEFORE — Traditional middleware integration architecture.
 *
 * Left column: SVG diagram of Sources → Middleware → Consumers, with a
 * silent-failure simulation flashing a random middleware box every 4s.
 * Right column: three failure-mode scenario cards with expanded detail.
 */

const MIDDLEWARE = ["Message Broker", "API Gateway", "ETL Pipeline"];
const SOURCES = ["Factory ERP", "Warehouse WMS", "Corporate SAP"];
const CONSUMERS = ["Analytics", "Orders", "Support"];

export function BeforeSimulation() {
  const [failedIdx, setFailedIdx] = useState<number | null>(null);
  const [failureStartedAt, setFailureStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Middleware fails for ~8s, then recovers for ~2s. Longer fail window so
  // the silent-cost ticker has time to make its point.
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const cycle = () => {
      if (!mounted) return;
      const i = Math.floor(Math.random() * MIDDLEWARE.length);
      setFailedIdx(i);
      setFailureStartedAt(Date.now());
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        setFailedIdx(null);
        setFailureStartedAt(null);
        timeoutId = setTimeout(cycle, 2000);
      }, 8000);
    };
    cycle();
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // 1Hz tick — drives the silent-failure timer + dollar counter.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const failureSec =
    failureStartedAt !== null ? Math.floor((now - failureStartedAt) / 1000) : 0;
  // Roughly $1.2k per second of silent failure — a single broker outage at
  // enterprise scale (orders processed against stale inventory).
  const silentCost = failureSec * 1200;

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]"
      style={{
        background: "transparent",
        color: "#e5e7eb",
      }}
    >
      <ArchitectureDiagram
        failedIdx={failedIdx}
        failureSec={failureSec}
        silentCost={silentCost}
      />
      <BeforeScenarios />
    </div>
  );
}

// ─── LEFT: Architecture diagram ──────────────────────────────────────────

function ArchitectureDiagram({
  failedIdx,
  failureSec,
  silentCost,
}: {
  failedIdx: number | null;
  failureSec: number;
  silentCost: number;
}) {
  const W = 480;
  const H = 320;
  const colW = W / 3;
  const yTop = 40;
  const yMid = 150;
  const yBot = 260;

  const boxW = 110;
  const boxH = 36;

  const pos = (col: number, y: number) => ({
    x: col * colW + (colW - boxW) / 2,
    y,
  });

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
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Traditional Integration Architecture
      </div>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {/* Connections: every source → every middleware → every consumer */}
          {SOURCES.map((_, srcCol) =>
            MIDDLEWARE.map((_, midCol) => {
              const sp = pos(srcCol, yTop);
              const mp = pos(midCol, yMid);
              const failed = failedIdx === midCol;
              return (
                <line
                  key={`s${srcCol}-m${midCol}`}
                  x1={sp.x + boxW / 2}
                  y1={sp.y + boxH}
                  x2={mp.x + boxW / 2}
                  y2={mp.y}
                  stroke={failed ? "#ef4444" : "#1f1f1f"}
                  strokeWidth={1}
                  strokeDasharray={failed ? "4 3" : undefined}
                />
              );
            }),
          )}
          {MIDDLEWARE.map((_, midCol) =>
            CONSUMERS.map((_, conCol) => {
              const mp = pos(midCol, yMid);
              const cp = pos(conCol, yBot);
              const failed = failedIdx === midCol;
              return (
                <line
                  key={`m${midCol}-c${conCol}`}
                  x1={mp.x + boxW / 2}
                  y1={mp.y + boxH}
                  x2={cp.x + boxW / 2}
                  y2={cp.y}
                  stroke={failed ? "#ef4444" : "#1f1f1f"}
                  strokeWidth={1}
                  strokeDasharray={failed ? "4 3" : undefined}
                />
              );
            }),
          )}

          {/* Sources — keep pulsing green dot during failure to dramatise
              the silent-failure point: source systems THINK they're healthy. */}
          {SOURCES.map((label, i) => {
            const p = pos(i, yTop);
            return (
              <g key={`src-${label}`}>
                <Box
                  x={p.x}
                  y={p.y}
                  w={boxW}
                  h={boxH}
                  label={label}
                  bg="#111"
                  stroke="#1e1e1e"
                  color="#888"
                />
                <HealthDot cx={p.x + 8} cy={p.y + 8} />
              </g>
            );
          })}

          {/* Middleware */}
          {MIDDLEWARE.map((label, i) => {
            const p = pos(i, yMid);
            const failed = failedIdx === i;
            return (
              <g key={`mid-${label}`}>
                {failed ? (
                  <rect
                    x={p.x - 4}
                    y={p.y - 4}
                    width={boxW + 8}
                    height={boxH + 8}
                    rx={6}
                    fill="rgba(239,68,68,0.15)"
                  />
                ) : null}
                <Box
                  x={p.x}
                  y={p.y}
                  w={boxW}
                  h={boxH}
                  label={`⚠ ${label}`}
                  bg={failed ? "#3b0d0d" : "#2a1c00"}
                  stroke={failed ? "#ef4444" : "#7a5a00"}
                  color={failed ? "#fecaca" : "#fcd34d"}
                />
                {failed ? (
                  <text
                    x={p.x + boxW / 2}
                    y={p.y + boxH + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#ef4444"
                    fontWeight="700"
                    letterSpacing="0.08em"
                  >
                    FAILED
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Consumers */}
          {CONSUMERS.map((label, i) => {
            const p = pos(i, yBot);
            return (
              <g key={`con-${label}`}>
                <Box
                  x={p.x}
                  y={p.y}
                  w={boxW}
                  h={boxH}
                  label={label}
                  bg="#111"
                  stroke="#1e1e1e"
                  color="#888"
                />
                <HealthDot cx={p.x + 8} cy={p.y + 8} />
              </g>
            );
          })}
        </svg>

        {/* Silent-failure HUD — shows while a middleware box is down. The
            cost ticks up while the surrounding systems keep blinking green:
            the audience sees value bleeding without any operator alarm. */}
        {failedIdx !== null ? (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "8px 12px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 8,
              fontSize: 11,
            }}
          >
            <div style={{ color: "#fca5a5", fontWeight: 600, letterSpacing: "0.04em" }}>
              <span style={{ marginRight: 6 }}>⚠</span>
              Silent failure · all systems still report healthy
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                {String(Math.floor(failureSec / 60)).padStart(2, "0")}:
                {String(failureSec % 60).padStart(2, "0")}
              </span>
              <span
                style={{
                  color: "#ef4444",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                ${silentCost.toLocaleString()}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Failure stats */}
      <div
        className="grid grid-cols-1 gap-2 mt-4 sm:grid-cols-3"
      >
        <Stat value="23" label="middleware dependencies" />
        <Stat value="4.2h" label="avg detection time" />
        <Stat value="$2.8M" label="annual silent-failure cost" valueColor="#ef4444" />
      </div>
    </div>
  );
}

// Tiny green pulse on every source/consumer box. Independent of middleware
// state — that's the whole point: surrounding systems THINK they're healthy.
function HealthDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill="#22c55e">
        <animate
          attributeName="opacity"
          values="1;0.35;1"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

function Box({
  x,
  y,
  w,
  h,
  label,
  bg,
  stroke,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  bg: string;
  stroke: string;
  color: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={bg} stroke={stroke} />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="500"
        fill={color}
      >
        {label}
      </text>
    </g>
  );
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

// ─── RIGHT: Before scenarios ─────────────────────────────────────────────

interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
  detail: React.ReactNode;
}

function BeforeScenarios() {
  const [openId, setOpenId] = useState<string | null>(null);

  const scenarios: ScenarioMeta[] = [
    {
      id: "silent",
      title: "Silent failure — middleware goes dark",
      description:
        "A message broker fails between Factory 2 and the Orders system. Orders keep processing against stale data for 4+ hours.",
      detail: <SilentFailureDetail />,
    },
    {
      id: "burden",
      title: "3 engineers, 40% of sprint, just keeping lights on",
      description:
        "Every system change requires middleware config updates. New integrations take 6–8 weeks. Teams blocked waiting for integration capacity.",
      detail: <EngineeringBurdenDetail />,
    },
    {
      id: "blind",
      title: "You don't know what you don't know",
      description:
        "14 systems, 23 integration points, zero unified view. Security policies live in each system separately. Compliance is a quarterly audit, not real-time.",
      detail: <OperationalBlindnessDetail />,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
        }}
      >
        Before · Failure modes
      </div>
      {scenarios.map((s) => {
        const isOpen = openId === s.id;
        return (
          <div
            key={s.id}
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 8,
              padding: 14,
              cursor: "pointer",
              transition: "border-color 120ms ease",
            }}
            onClick={() => setOpenId(isOpen ? null : s.id)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#2a2a2a")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#1e1e1e")
            }
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#666",
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {s.description}
                </div>
              </div>
              <span style={{ color: "#444", fontSize: 12 }}>{isOpen ? "−" : "+"}</span>
            </div>
            {isOpen ? (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a1a1a" }}>
                {s.detail}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SilentFailureDetail() {
  const steps = [
    "08:00 — Broker fails silently",
    "08:00–12:14 — Orders process stale data",
    "12:14 — Engineer notices anomaly",
    "12:47 — Root cause found",
    "847 affected orders · $284K exposure",
  ];
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 11, color: "#888" }}>
        {steps.map((s, i) => (
          <li
            key={s}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "4px 0",
              borderTop: i === 0 ? "none" : "1px dashed #1a1a1a",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                background: i === steps.length - 1 ? "#ef4444" : "#444",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <div
        style={{
          marginTop: 10,
          fontSize: 24,
          color: "#ef4444",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        $284,000
      </div>
    </div>
  );
}

function EngineeringBurdenDetail() {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <BarRow label="Integration work" pct={40} color="#ef4444" />
        <BarRow label="Feature work" pct={60} color="#444" />
      </div>
      <div style={{ fontSize: 11, color: "#666", marginTop: 10 }}>
        Each new system = 4–6 new middleware configs
      </div>
    </div>
  );
}

function BarRow({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#888",
          marginBottom: 3,
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#fff", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 6,
          background: "#1a1a1a",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function OperationalBlindnessDetail() {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1 / 1",
              background: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              fontSize: 9,
              color: "#666",
            }}
          >
            🔒
            <span style={{ fontSize: 7, marginTop: 2 }}>local</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#ef4444", lineHeight: 1.4 }}>
        Security: reactive · Compliance: periodic · Visibility: none
      </div>
    </div>
  );
}
