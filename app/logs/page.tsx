"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ScrollText, Search } from "lucide-react";
import { getLedger } from "@/lib/controller-api";
import { loadControllers } from "@/lib/store";
import type { ControllerEntry, LedgerEntry } from "@/lib/controller-types";

interface LedgerRow {
  controller: ControllerEntry;
  entries: LedgerEntry[];
}

const LEVEL_COLOR: Record<string, string> = {
  INFO:  "#0070f3",
  WARN:  "#f59e0b",
  ERROR: "#ef4444",
  DEBUG: "#444444",
};

export default function LogsPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedController, setSelectedController] = useState("all");

  const controllers = loadControllers();

  const refresh = async () => {
    setLoading(true);
    const results = await Promise.allSettled(
      controllers.map(async (c) => {
        const data = await getLedger(c.url);
        return { controller: c, entries: data.entries } as LedgerRow;
      }),
    );
    setRows(
      results
        .filter((r): r is PromiseFulfilledResult<LedgerRow> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((r) => r.entries.length > 0),
    );
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  // Flatten + filter
  const allEntries: Array<LedgerEntry & { controllerName: string }> = rows
    .filter((r) => selectedController === "all" || r.controller.id === selectedController)
    .flatMap((r) =>
      r.entries.map((e) => ({ ...e, controllerName: r.controller.name })),
    )
    .sort((a, b) => b.seq - a.seq);

  const filtered = filter.trim()
    ? allEntries.filter(
        (e) =>
          e.variable.toLowerCase().includes(filter.toLowerCase()) ||
          e.controller_id.toLowerCase().includes(filter.toLowerCase()) ||
          JSON.stringify(e.value).toLowerCase().includes(filter.toLowerCase()),
      )
    : allEntries;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <ScrollText size={18} color="#0070f3" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#ffffff" }}>Logs</h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#444444" }}>
            Ledger entries across all controllers
          </p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} style={btnSecondaryStyle}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} color="#444444" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by variable, controller, or value…"
            style={{ ...inputStyle, paddingLeft: 32, width: "100%" }}
          />
        </div>
        <select
          value={selectedController}
          onChange={(e) => setSelectedController(e.target.value)}
          style={{ ...inputStyle, flex: "0 0 160px" }}
        >
          <option value="all">All controllers</option>
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: "#444444", marginBottom: 10 }}>
        {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
      </div>

      {/* Table */}
      <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 140px 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid #1a1a1a", background: "#000000" }}>
          {["Seq", "Controller", "Variable", "Value"].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#444444", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#444444", fontSize: 13 }}>
            No ledger entries found
          </div>
        )}

        {filtered.slice(0, 500).map((e, i) => (
          <div
            key={`${e.controller_id}-${e.seq}`}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 140px 1fr 1fr",
              padding: "9px 16px",
              borderBottom: i < filtered.length - 1 ? "1px solid #111111" : "none",
              fontSize: 12,
              alignItems: "start",
            }}
          >
            <span style={{ color: "#444444", fontFamily: "monospace" }}>{e.seq}</span>
            <span style={{ color: "#888888", fontWeight: 500 }}>{e.controllerName}</span>
            <span style={{ fontFamily: "monospace", color: "#ffffff" }}>{e.variable}</span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#ffffff",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: 60,
                overflow: "hidden",
              }}
            >
              {JSON.stringify(e.value)}
            </span>
          </div>
        ))}

        {filtered.length > 500 && (
          <div style={{ textAlign: "center", padding: "10px", color: "#444444", fontSize: 11 }}>
            Showing first 500 of {filtered.length} entries
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
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
