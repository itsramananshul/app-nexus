"use client";

import { useEffect, useState } from "react";

/**
 * Main-page BEFORE era — interactive explainer of why traditional middleware
 * architecture is structurally broken. Distinct from the pitch overlay's
 * Win98 ERP simulation: that's the theatrical hook; this is a deeper,
 * darker, denser exploration the audience can poke at.
 *
 * Three panels, each demonstrating a different failure mode:
 *  1. Silent Collapse — interactive broker failure simulation
 *  2. Engineering Maintenance Tax — ops-dashboard data view
 *  3. Operational Blindness — 14-system isolation grid
 */

export function LegacyView() {
  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "#000" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Header />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SilentCollapsePanel />
          <EngineeringTaxPanel />
          <OperationalBlindnessPanel />
        </div>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "#444",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          fontWeight: 600,
        }}
      >
        Before · Traditional middleware era
      </div>
      <h1
        style={{
          fontSize: 24,
          color: "#fff",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginTop: 6,
        }}
      >
        Why middleware breaks at enterprise scale
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#888",
          marginTop: 6,
          maxWidth: 720,
          lineHeight: 1.55,
        }}
      >
        Source systems and consumer systems connect through a middleware
        layer — brokers, gateways, ETL pipelines. The layer that&apos;s supposed
        to be invisible becomes the layer that fails silently, eats engineering
        bandwidth, and hides what&apos;s actually happening across your operations.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        marginTop: 28,
        padding: "16px 18px",
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 10,
        fontSize: 12,
        color: "#888",
        lineHeight: 1.6,
      }}
    >
      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        OpenPrem replaces this layer.
      </div>
      Peer-to-peer service communication, governed by a central authority plane
      that controls policy + observability without bottlenecking data flow.
      Switch to the After era from the top bar to see the live system in action.
    </div>
  );
}

// ─── Panel 1 — Silent Collapse ──────────────────────────────────────────

function SilentCollapsePanel() {
  const [broken, setBroken] = useState(false);
  const [downSince, setDownSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsedSec =
    downSince === null ? 0 : Math.floor((now - downSince) / 1000);
  const lostDollars = elapsedSec * 1200;

  const trigger = () => {
    setBroken(true);
    setDownSince(Date.now());
  };
  const restore = () => {
    setBroken(false);
    setDownSince(null);
  };

  return (
    <Panel
      kicker="Panel 1"
      title="Silent collapse"
      lede="A broker fails. Both sides keep running. Nobody knows."
    >
      <div
        style={{
          position: "relative",
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 14,
          minHeight: 220,
        }}
      >
        <BrokerDiagram broken={broken} />
        {broken ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 6,
              fontSize: 11,
              color: "#fca5a5",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              ⚠ Broker dark · all systems still report healthy
            </div>
            <div style={{ color: "#888" }}>
              No operator alarm. Orders process against stale inventory.
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: "#fff" }}>
                {String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:
                {String(elapsedSec % 60).padStart(2, "0")} elapsed
              </span>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>
                ${lostDollars.toLocaleString()} lost
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#666",
              lineHeight: 1.5,
            }}
          >
            Click the broker to break it. Watch the surrounding systems stay
            green even though data has stopped flowing.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={trigger}
            disabled={broken}
            style={btnStyle(broken ? "ghost" : "primary")}
          >
            Trigger broker failure
          </button>
          {broken ? (
            <button type="button" onClick={restore} style={btnStyle("ghost")}>
              Reset
            </button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function BrokerDiagram({ broken }: { broken: boolean }) {
  return (
    <svg viewBox="0 0 280 160" width="100%" style={{ display: "block" }}>
      {/* connection lines */}
      <line x1="50" y1="30" x2="140" y2="80" stroke={broken ? "#ef4444" : "#1f1f1f"} strokeWidth="1" strokeDasharray={broken ? "4 3" : undefined} />
      <line x1="50" y1="130" x2="140" y2="80" stroke={broken ? "#ef4444" : "#1f1f1f"} strokeWidth="1" strokeDasharray={broken ? "4 3" : undefined} />
      <line x1="140" y1="80" x2="230" y2="30" stroke={broken ? "#ef4444" : "#1f1f1f"} strokeWidth="1" strokeDasharray={broken ? "4 3" : undefined} />
      <line x1="140" y1="80" x2="230" y2="130" stroke={broken ? "#ef4444" : "#1f1f1f"} strokeWidth="1" strokeDasharray={broken ? "4 3" : undefined} />

      {/* source boxes */}
      <DiagramBox x={10} y={14} w={80} h={32} label="Factory ERP" healthy />
      <DiagramBox x={10} y={114} w={80} h={32} label="Warehouse" healthy />

      {/* broker */}
      <DiagramBox
        x={100}
        y={64}
        w={80}
        h={32}
        label={broken ? "⚠ Broker" : "Broker"}
        broken={broken}
      />

      {/* consumer boxes */}
      <DiagramBox x={190} y={14} w={80} h={32} label="Orders" healthy />
      <DiagramBox x={190} y={114} w={80} h={32} label="Analytics" healthy />
    </svg>
  );
}

function DiagramBox({
  x,
  y,
  w,
  h,
  label,
  healthy,
  broken,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  healthy?: boolean;
  broken?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill={broken ? "#3b0d0d" : "#111"}
        stroke={broken ? "#ef4444" : "#1e1e1e"}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize="10"
        fill={broken ? "#fca5a5" : "#cccccc"}
        fontWeight="500"
      >
        {label}
      </text>
      {healthy ? (
        <circle cx={x + 6} cy={y + 6} r={2.5} fill="#22c55e">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
      ) : null}
    </g>
  );
}

// ─── Panel 2 — Engineering Maintenance Tax ─────────────────────────────

function EngineeringTaxPanel() {
  return (
    <Panel
      kicker="Panel 2"
      title="Engineering tax"
      lede="40% of eng bandwidth keeping the lights on."
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 14,
          minHeight: 220,
        }}
      >
        <SplitBar label="Maintaining integrations" pct={40} color="#ef4444" />
        <SplitBar label="Building new product" pct={60} color="#444" />

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <Stat value="38" label="custom connectors" />
          <Stat value="6.4w" label="avg new-integration time" />
          <Stat value="237" label="open broker tickets" tone="warning" />
          <Stat value="$1.2M" label="annual ops spend" tone="critical" />
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "#666",
            lineHeight: 1.55,
          }}
        >
          Every schema bump, every API version, every new system =
          middleware config update. The connector layer never finishes.
        </div>
      </div>
    </Panel>
  );
}

function SplitBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#888",
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#fff", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 8,
          background: "#1a1a1a",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "warning" | "critical";
}) {
  const color =
    tone === "critical" ? "#ef4444" : tone === "warning" ? "#f59e0b" : "#fff";
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1a1a1a",
        borderRadius: 6,
        padding: 8,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ─── Panel 3 — Operational Blindness ───────────────────────────────────

function OperationalBlindnessPanel() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const systems = [
    "Factory 1 ERP", "Factory 2 ERP", "Factory 3 ERP", "Factory 4 ERP",
    "Warehouse 1 WMS", "Warehouse 2 WMS", "Corporate SAP", "Orders DB",
    "Shipments DB", "Support CRM", "Compliance", "Identity",
    "Analytics", "Reporting",
  ];
  return (
    <Panel
      kicker="Panel 3"
      title="Operational blindness"
      lede="14 systems, 14 policies, zero unified view."
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 14,
          minHeight: 220,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 12,
          }}
        >
          {systems.map((sys, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{
                aspectRatio: "1 / 1",
                background: hoverIdx === i ? "#1a0a0a" : "#0a0a0a",
                border: `1px solid ${hoverIdx === i ? "#ef4444" : "#1a1a1a"}`,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#666",
                cursor: "pointer",
                transition: "all 120ms ease",
              }}
              title={`${sys} — local policy, local audit, local everything`}
            >
              🔒
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 11,
            color: hoverIdx === null ? "#666" : "#fca5a5",
            lineHeight: 1.5,
            minHeight: 32,
          }}
        >
          {hoverIdx === null
            ? "Hover any system. Each one has its own access controls, its own data model, its own audit log."
            : `${systems[hoverIdx]} — local policy. No shared audit trail. No cross-system queries. Quarterly compliance scramble.`}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <Stat value="14" label="isolated systems" />
          <Stat value="0" label="unified audit trail" tone="critical" />
        </div>
      </div>
    </Panel>
  );
}

// ─── Shared chrome ─────────────────────────────────────────────────────

function Panel({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <header>
        <div
          style={{
            fontSize: 10,
            color: "#444",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          {kicker}
        </div>
        <h2
          style={{
            fontSize: 16,
            color: "#fff",
            fontWeight: 600,
            marginTop: 4,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.5 }}>
          {lede}
        </p>
      </header>
      {children}
    </section>
  );
}

function btnStyle(kind: "primary" | "ghost"): React.CSSProperties {
  if (kind === "primary") {
    return {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      padding: "6px 12px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer",
    };
  }
  return {
    background: "transparent",
    color: "#888",
    border: "1px solid #2a2a2a",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
  };
}
