"use client";

import { useEffect, useMemo, useState } from "react";
import { LOCATION_ORDER, NODE_TYPE_EMOJI, type NodeConfig } from "@/lib/nodes";

interface NexusApiKeysPanelProps {
  open: boolean;
  onClose: () => void;
  nodes: NodeConfig[];
  overrides: Record<string, string>;
  onSetOverride: (nodeId: string, key: string) => void;
  onClearOverride: (nodeId: string) => void;
}

function previewKey(raw: string): string {
  return raw.length > 16 ? `${raw.slice(0, 16)}…` : raw;
}

interface RowState {
  editing: boolean;
  value: string;
}

export function NexusApiKeysPanel({
  open,
  onClose,
  nodes,
  overrides,
  onSetOverride,
  onClearOverride,
}: NexusApiKeysPanelProps) {
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const map = new Map<string, NodeConfig[]>();
    for (const n of nodes) {
      const list = map.get(n.location) ?? [];
      list.push(n);
      map.set(n.location, list);
    }
    return LOCATION_ORDER.filter((loc) => map.has(loc)).map((loc) => ({
      location: loc,
      members: map.get(loc) ?? [],
    }));
  }, [nodes]);

  function patch(nodeId: string, p: Partial<RowState>): void {
    setRowState((prev) => {
      const defaults: RowState = { editing: false, value: "" };
      return {
        ...prev,
        [nodeId]: { ...defaults, ...prev[nodeId], ...p },
      };
    });
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="API keys"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col"
        style={{
          background: "#0a0a0a",
          borderLeft: "1px solid #1a1a1a",
        }}
      >
        <header
          className="flex items-start justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1a1a1a" }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.005em",
            }}
          >
            API Keys
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close API keys panel"
            style={{ color: "#555" }}
            className="leading-none text-2xl hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {grouped.map(({ location, members }) => (
            <section key={location} className="mb-5 last:mb-0">
              <h3
                className="mb-2"
                style={{
                  fontSize: 11,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 500,
                }}
              >
                {location}
              </h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {members.map((node) => {
                  const savedKey = overrides[node.id] ?? null;
                  const state: RowState = rowState[node.id] ?? {
                    editing: false,
                    value: "",
                  };
                  return (
                    <li
                      key={node.id}
                      style={{
                        background: "#111",
                        border: "1px solid #1e1e1e",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: savedKey ? "#22c55e" : "#444",
                              flexShrink: 0,
                            }}
                            aria-hidden
                          />
                          <span
                            className="truncate"
                            style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}
                          >
                            {node.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!state.editing ? (
                            <button
                              type="button"
                              onClick={() =>
                                patch(node.id, { editing: true, value: "" })
                              }
                              style={{
                                background: "transparent",
                                border: "1px solid #2a2a2a",
                                color: "#888",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              {savedKey ? "Edit" : "Set"}
                            </button>
                          ) : null}
                          {overrides[node.id] ? (
                            <button
                              type="button"
                              onClick={() => onClearOverride(node.id)}
                              style={{
                                background: "transparent",
                                border: "1px solid #2a2a2a",
                                color: "#ef4444",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className="mt-2 truncate font-mono"
                        style={{ fontSize: 11, color: "#666" }}
                      >
                        {savedKey ? previewKey(savedKey) : "—"}
                      </div>

                      {state.editing ? (
                        <form
                          className="mt-2 flex items-stretch gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const trimmed = state.value.trim();
                            if (!trimmed) return;
                            onSetOverride(node.id, trimmed);
                            patch(node.id, { editing: false, value: "" });
                          }}
                        >
                          <input
                            type="text"
                            value={state.value}
                            onChange={(e) =>
                              patch(node.id, { value: e.target.value })
                            }
                            placeholder="Paste an API key…"
                            autoFocus
                            className="flex-1 font-mono"
                            style={{
                              background: "#0a0a0a",
                              border: "1px solid #1e1e1e",
                              borderRadius: 6,
                              padding: "6px 10px",
                              fontSize: 12,
                              color: "#fff",
                              outline: "none",
                            }}
                          />
                          <button
                            type="submit"
                            disabled={!state.value.trim()}
                            style={{
                              background: state.value.trim() ? "#0070f3" : "#1a1a1a",
                              color: state.value.trim() ? "#fff" : "#444",
                              border: "none",
                              borderRadius: 6,
                              padding: "6px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: state.value.trim() ? "pointer" : "not-allowed",
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patch(node.id, { editing: false, value: "" })
                            }
                            style={{
                              background: "transparent",
                              border: "1px solid #2a2a2a",
                              color: "#888",
                              borderRadius: 6,
                              padding: "6px 10px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
