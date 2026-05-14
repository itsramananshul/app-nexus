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
  generating: boolean;
  error: string | null;
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
      const defaults: RowState = {
        editing: false,
        value: "",
        generating: false,
        error: null,
      };
      return {
        ...prev,
        [nodeId]: { ...defaults, ...prev[nodeId], ...p },
      };
    });
  }

  async function handleGenerate(node: NodeConfig) {
    patch(node.id, { generating: true, error: null });
    try {
      const res = await fetch(`${node.url}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `nexus-${new Date().toISOString()}` }),
      });
      const body = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; rawKey?: string }
        | null;
      if (!res.ok || body?.success !== true || typeof body.rawKey !== "string") {
        throw new Error(body?.error ?? `Request failed (HTTP ${res.status})`);
      }
      onSetOverride(node.id, body.rawKey);
      patch(node.id, {
        generating: false,
        editing: false,
        value: "",
      });
    } catch (e) {
      patch(node.id, {
        generating: false,
        error: e instanceof Error ? e.message : "Generate failed",
      });
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Nexus API keys"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col border-l border-cyan-500/20 bg-slate-900 shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-cyan-300">
              <span aria-hidden className="mr-2">
                🔑
              </span>
              Nexus API Keys
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              One key per monitored node, sent as{" "}
              <code className="text-slate-300">x-api-key</code> on every poll
              and on every collapse mutation. Generate a key in each
              backend&apos;s 🔑 panel and paste it here — keys live in this
              browser&apos;s localStorage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close API keys panel"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <span aria-hidden className="text-2xl leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {grouped.map(({ location, members }) => (
            <section key={location} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {location}
              </h3>
              <ul className="space-y-2">
                {members.map((node) => {
                  const savedKey = overrides[node.id] ?? null;
                  const state: RowState = rowState[node.id] ?? {
                    editing: false,
                    value: "",
                    generating: false,
                    error: null,
                  };
                  return (
                    <li
                      key={node.id}
                      className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span aria-hidden className="text-base">
                            {NODE_TYPE_EMOJI[node.type]}
                          </span>
                          <span className="text-sm font-medium text-slate-100">
                            {node.label}
                          </span>
                          {savedKey ? (
                            <span className="rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                              Set
                            </span>
                          ) : (
                            <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-500/30">
                              Not set
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!state.editing ? (
                            <button
                              type="button"
                              onClick={() =>
                                patch(node.id, { editing: true, value: "" })
                              }
                              className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-700"
                            >
                              Edit
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={state.generating}
                            onClick={() => void handleGenerate(node)}
                            className="rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Generate a new key on this app and use it"
                          >
                            {state.generating ? "Generating…" : "Generate new"}
                          </button>
                          {overrides[node.id] ? (
                            <button
                              type="button"
                              onClick={() => onClearOverride(node.id)}
                              className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20"
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 truncate font-mono text-[11px] text-slate-400">
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
                            className="flex-1 rounded-md border-0 bg-slate-800 px-3 py-1.5 font-mono text-xs text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <button
                            type="submit"
                            disabled={!state.value.trim()}
                            className="rounded-md bg-sky-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patch(node.id, { editing: false, value: "" })
                            }
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : null}

                      {state.error ? (
                        <div className="mt-2 rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 ring-1 ring-inset ring-rose-500/30">
                          {state.error}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t border-slate-800 bg-slate-950/40 px-5 py-3 text-[11px] text-slate-500">
          Keys live in this browser&apos;s localStorage. A key generated by one
          app only authenticates calls to that app — paste each app&apos;s key
          into its own row.
        </footer>
      </aside>
    </>
  );
}
