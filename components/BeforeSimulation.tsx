"use client";

import { useEffect, useState } from "react";

/**
 * Fake legacy ERP — intentionally ugly Win98-styled SAP-circa-2009 dashboard
 * used in pitch mode to make the audience FEEL the pain of the old system
 * before the Nexus demo flips on.
 *
 * Self-contained: no real data, no real endpoints — all timers and modals
 * are local state. Renders fine on a black page because every surface here
 * uses an explicit non-black background.
 */

interface Row {
  node: string;
  status: "ONLINE" | "OFFLINE" | "UNKNOWN";
  ageMs: number;
}

const INITIAL_ROWS: Row[] = [
  { node: "Dearborn F1", status: "ONLINE", ageMs: 4 * 3600_000 },
  { node: "Detroit F2", status: "OFFLINE", ageMs: 3 * 3600_000 + 48 * 60_000 },
  { node: "Toledo W1", status: "UNKNOWN", ageMs: 6 * 3600_000 },
  { node: "Flint W2", status: "ONLINE", ageMs: 4 * 3600_000 },
];

function fmtAge(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s ago`;
}

function fmtAgeShort(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const RAISED_BORDER: React.CSSProperties = {
  border: "2px solid",
  borderColor: "#fff #808080 #808080 #fff",
};
const SUNKEN_BORDER: React.CSSProperties = {
  border: "2px solid",
  borderColor: "#808080 #fff #fff #808080",
};

export function BeforeSimulation() {
  const [rows, setRows] = useState<Row[]>(() =>
    INITIAL_ROWS.map((r) => ({ ...r })),
  );
  const [active, setActive] = useState<"dashboard" | "inventory" | "production" | "shipments" | "it">(
    "dashboard",
  );
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneStage, setPhoneStage] = useState<"calling" | "hold">("calling");
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [steps, setSteps] = useState<number>(0);

  // Timers count up every second — the "Last Updated" never gets fresher.
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => prev.map((r) => ({ ...r, ageMs: r.ageMs + 1000 })));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Step-by-step "what happens next" panel animates in steps 1..5.
  useEffect(() => {
    const id = setInterval(() => {
      setSteps((s) => (s < 5 ? s + 1 : s));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Phone modal: calling → hold after 2s.
  useEffect(() => {
    if (!phoneOpen) return;
    setPhoneStage("calling");
    const id = setTimeout(() => setPhoneStage("hold"), 2000);
    return () => clearTimeout(id);
  }, [phoneOpen]);

  const onClickIT = () => {
    setActive("it");
    setPhoneOpen(true);
  };
  const onRefreshToledo = () => {
    setRefreshError(null);
    setRefreshingId("Toledo W1");
    setTimeout(() => {
      setRefreshingId(null);
      setRefreshError("Connection timeout. Please try again.");
    }, 3000);
  };
  const onOpenTicket = () => {
    setTicketOpen(true);
    setTicketSubmitted(null);
  };
  const onSubmitTicket = () => {
    setTicketSubmitted(
      "Ticket #INC-2848 created. Assigned to: unassigned. ETA: Unknown.",
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 240px",
        gap: 12,
        background: "#c0c0c0",
        color: "#000",
        fontFamily: '"Courier New", "Lucida Console", monospace',
        padding: 12,
        borderRadius: 4,
        ...RAISED_BORDER,
      }}
    >
      {/* Left — fake ERP */}
      <div style={{ background: "#c0c0c0", ...SUNKEN_BORDER }}>
        {/* Title bar */}
        <div
          style={{
            background: "#000080",
            color: "#fff",
            padding: "4px 8px",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
          }}
        >
          <span>Ford Manufacturing ERP v4.2 — Plant Operations Console</span>
          <span style={{ color: "#ff8080", fontSize: 10 }}>
            ⚠ Last sync: 4h 12m ago
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 0 }}>
          {/* Left nav */}
          <nav
            style={{
              background: "#c0c0c0",
              padding: 6,
              ...SUNKEN_BORDER,
              borderRight: "2px solid #808080",
            }}
          >
            <NavItem
              label="Dashboard"
              active={active === "dashboard"}
              onClick={() => setActive("dashboard")}
            />
            <NavItem
              label="Inventory"
              active={active === "inventory"}
              onClick={() => setActive("inventory")}
            />
            <NavItem
              label="Production"
              active={active === "production"}
              onClick={() => setActive("production")}
            />
            <NavItem
              label="Shipments"
              active={active === "shipments"}
              onClick={() => setActive("shipments")}
            />
            <NavItem label="IT Support" active={active === "it"} onClick={onClickIT} />
          </nav>

          {/* Main area */}
          <main
            style={{
              background: "#ffffff",
              padding: 10,
              fontSize: 11,
              color: "#000",
              fontFamily: '"Courier New", monospace',
              minHeight: 300,
              maxHeight: 360,
              overflowY: "auto",
            }}
          >
            {/* Alert banner */}
            <div
              style={{
                background: "#ffff80",
                border: "2px solid #c00",
                padding: 8,
                marginBottom: 10,
                color: "#900",
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              ⚠ CRITICAL: Detroit Assembly Line 3 — OFFLINE. Contact IT
              ext. 4821. Ticket #INC-2847 opened 3h 47m ago. Status:
              PENDING ASSIGNMENT
            </div>

            {/* Data table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#e0e0e0" }}>
                  <Th>Node</Th>
                  <Th>Status</Th>
                  <Th>Last Updated</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.node} style={{ borderTop: "1px solid #c0c0c0" }}>
                    <Td>{r.node}</Td>
                    <Td>
                      <span
                        style={{
                          color:
                            r.status === "ONLINE"
                              ? "#008000"
                              : r.status === "OFFLINE"
                                ? "#c00"
                                : "#a07000",
                        }}
                      >
                        ● {r.status}
                      </span>
                    </Td>
                    <Td>{fmtAge(r.ageMs)}</Td>
                    <Td>
                      {r.node === "Toledo W1" ? (
                        <BtnSmall onClick={onRefreshToledo} disabled={refreshingId === "Toledo W1"}>
                          {refreshingId === "Toledo W1" ? "⏳ …" : "Refresh"}
                        </BtnSmall>
                      ) : r.node === "Detroit F2" ? (
                        <BtnSmall onClick={onOpenTicket}>Ticket</BtnSmall>
                      ) : (
                        <span style={{ color: "#808080" }}>—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>

            {refreshError ? (
              <div
                style={{
                  marginTop: 8,
                  color: "#c00",
                  fontSize: 10,
                }}
              >
                {refreshError}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 14,
                color: "#444",
                fontSize: 10,
                fontStyle: "italic",
              }}
            >
              ⏳ Loading production data… please wait (this may take several
              minutes)
            </div>
          </main>
        </div>

        {/* Footer bar */}
        <div
          style={{
            background: "#c0c0c0",
            ...RAISED_BORDER,
            padding: "4px 8px",
            fontSize: 10,
            color: "#333",
            fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
          }}
        >
          Ford ERP v4.2.1 © 2009 SAP AG | Session expires: 08:32 | IT Helpdesk:
          ext. 4821
        </div>
      </div>

      {/* Right — what manual recovery looks like */}
      <aside
        style={{
          background: "#fff",
          color: "#000",
          padding: 12,
          fontSize: 11,
          border: "2px solid",
          borderColor: "#808080 #fff #fff #808080",
        }}
      >
        <div style={{ fontSize: 12, color: "#333", fontWeight: 700, marginBottom: 8 }}>
          What happens next
        </div>
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            { label: "Operator notices alarm", t: "+12 min" },
            { label: "Calls IT Helpdesk", t: "+18 min" },
            { label: "On hold / ticket queued", t: "+32 min" },
            { label: "Manager paged", t: "+38 min" },
            { label: "Manual reroute begins", t: "+45 min" },
          ].map((step, i) => {
            const visible = steps > i;
            const isLast = i === 4;
            return (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(4px)",
                  transition: "opacity 300ms ease, transform 300ms ease",
                  borderTop: i === 0 ? "none" : "1px dashed #ccc",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    background: "#c00",
                    color: "#fff",
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: "#333", fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
                  {step.label}
                  {isLast && visible ? (
                    <div style={{ color: "#c00", fontSize: 10, marginTop: 2 }}>
                      System restored. 847 orders delayed. ~$284,000 in losses.
                    </div>
                  ) : null}
                </span>
                <span style={{ fontSize: 10, color: "#666" }}>{step.t}</span>
              </li>
            );
          })}
        </ol>
        {steps >= 5 ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 700,
              color: "#c00",
              textAlign: "center",
              animation: "before-pulse 1.6s ease-in-out infinite",
            }}
          >
            $284K
          </div>
        ) : null}
        <style jsx>{`
          @keyframes before-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
        `}</style>
      </aside>

      {/* IT Support phone modal */}
      {phoneOpen ? (
        <Modal onClose={() => setPhoneOpen(false)} title="IT Helpdesk · ext. 4821">
          {phoneStage === "calling" ? (
            <div style={{ padding: 12, fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>📞</div>
              <div style={{ fontSize: 12, color: "#000" }}>
                Calling IT Helpdesk ext. 4821…
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                On hold. Estimated wait: <strong>14 minutes.</strong>
              </div>
              <div style={{ color: "#666", fontSize: 11, marginBottom: 8 }}>
                Please remain on the line. Your call is important to us.
              </div>
              <HoldDots />
            </div>
          )}
        </Modal>
      ) : null}

      {/* Ticket modal */}
      {ticketOpen ? (
        <Modal onClose={() => setTicketOpen(false)} title="Create Incident Ticket">
          {!ticketSubmitted ? (
            <div style={{ padding: 12, fontFamily: '"MS Sans Serif", Tahoma, sans-serif', fontSize: 11 }}>
              <Field label="Priority">
                <select style={selectStyle}>
                  <option>P1 — Critical</option>
                  <option>P2 — High</option>
                  <option>P3 — Medium</option>
                  <option>P4 — Low</option>
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  rows={4}
                  defaultValue="Detroit Assembly Line 3 reporting OFFLINE. Production halted across station 11–15. Multiple downstream orders affected. Please dispatch."
                  style={{
                    ...selectStyle,
                    width: "100%",
                    fontFamily: '"Courier New", monospace',
                  }}
                />
              </Field>
              <button
                type="button"
                onClick={onSubmitTicket}
                style={{
                  marginTop: 8,
                  ...RAISED_BORDER,
                  background: "#c0c0c0",
                  padding: "4px 14px",
                  cursor: "pointer",
                  fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                  fontSize: 11,
                }}
              >
                Submit
              </button>
            </div>
          ) : (
            <div style={{ padding: 14, fontFamily: '"MS Sans Serif", Tahoma, sans-serif', fontSize: 12 }}>
              {ticketSubmitted}
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );

  // Marker for fmtAgeShort so it's not flagged unused in editor lints.
  void fmtAgeShort;
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "4px 6px",
        textAlign: "left",
        background: active ? "#000080" : "transparent",
        color: active ? "#fff" : "#000",
        border: "none",
        fontSize: 11,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "4px 6px",
        fontSize: 10,
        fontWeight: 700,
        borderBottom: "1px solid #808080",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "4px 6px", fontSize: 11 }}>
      {children}
    </td>
  );
}
function BtnSmall({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...RAISED_BORDER,
        background: "#c0c0c0",
        padding: "2px 8px",
        fontSize: 10,
        cursor: disabled ? "wait" : "pointer",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
      }}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#c0c0c0",
          ...RAISED_BORDER,
          minWidth: 320,
          color: "#000",
        }}
      >
        <div
          style={{
            background: "#000080",
            color: "#fff",
            padding: "3px 8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
          }}
        >
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...RAISED_BORDER,
              background: "#c0c0c0",
              color: "#000",
              padding: "0 6px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: "#000", marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  );
}

function HoldDots() {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#000080",
            animation: `hold-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes hold-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
  fontSize: 11,
  padding: "2px 4px",
  border: "1px solid",
  borderColor: "#808080 #fff #fff #808080",
  background: "#fff",
  color: "#000",
};
