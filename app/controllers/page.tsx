"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { ControllerCard } from "@/components/toolkit/controllers/ControllerCard";
import { ControllerDetail } from "@/components/toolkit/controllers/ControllerDetail";
import { AddControllerModal } from "@/components/toolkit/controllers/AddControllerModal";
import { getCapabilities, getApps } from "@/lib/controller-api";
import {
  addController,
  loadControllers,
  removeController,
  seedDefaults,
  updateController,
} from "@/lib/store";
import type { ControllerEntry, ControllerRole, ControllerSnapshot } from "@/lib/controller-types";

async function fetchSnapshot(entry: ControllerEntry): Promise<ControllerSnapshot> {
  try {
    const [caps, apps] = await Promise.all([
      getCapabilities(entry.url),
      getApps(entry.url),
    ]);
    return { entry, health: "online", capabilities: caps, apps, error: null };
  } catch (e) {
    return {
      entry,
      health: "offline",
      capabilities: null,
      apps: [],
      error: e instanceof Error ? e.message : "Unreachable",
    };
  }
}

export default function ControllersPage() {
  const [controllers, setControllers] = useState<ControllerEntry[]>([]);
  const [snapshots, setSnapshots] = useState<Map<string, ControllerSnapshot>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load from localStorage on mount, seed defaults if empty
  useEffect(() => {
    const list = seedDefaults(loadControllers());
    setControllers(list);
    // Mark all as loading
    setSnapshots(
      new Map(list.map((c) => [c.id, { entry: c, health: "loading", capabilities: null, apps: [], error: null }])),
    );
    void refreshAll(list);

    // Pick up #highlight=<id> from URL (used by router topology map)
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const hl = params.get("highlight");
      if (hl && list.find((c) => c.id === hl)) {
        setSelectedId(hl);
      }
    }
  }, []);

  const refreshAll = useCallback(async (list: ControllerEntry[]) => {
    setRefreshing(true);
    const results = await Promise.all(list.map(fetchSnapshot));
    setSnapshots(new Map(results.map((s) => [s.entry.id, s])));
    setRefreshing(false);
  }, []);

  const handleAdd = (name: string, url: string, role: ControllerRole) => {
    const next = addController(controllers, name, url, role);
    setControllers(next);
    const newEntry = next[next.length - 1];
    setSnapshots((prev) => {
      const m = new Map(prev);
      m.set(newEntry.id, { entry: newEntry, health: "loading", capabilities: null, apps: [], error: null });
      return m;
    });
    void fetchSnapshot(newEntry).then((s) =>
      setSnapshots((prev) => new Map(prev).set(s.entry.id, s)),
    );
  };

  const handleRemove = (id: string) => {
    const next = removeController(controllers, id);
    setControllers(next);
    setSnapshots((prev) => { const m = new Map(prev); m.delete(id); return m; });
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdateUrl = (id: string, newUrl: string) => {
    const next = updateController(controllers, id, { url: newUrl });
    setControllers(next);
    const updated = next.find((c) => c.id === id);
    if (!updated) return;
    setSnapshots((prev) => {
      const m = new Map(prev);
      m.set(id, { entry: updated, health: "loading", capabilities: null, apps: [], error: null });
      return m;
    });
    void fetchSnapshot(updated).then((s) =>
      setSnapshots((prev) => new Map(prev).set(s.entry.id, s)),
    );
  };

  const selectedSnapshot = selectedId ? (snapshots.get(selectedId) ?? null) : null;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#dde1f5" }}>Controllers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#3a4570" }}>
            {controllers.length} node{controllers.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => void refreshAll(controllers)}
            disabled={refreshing}
            style={btnSecondaryStyle}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button onClick={() => setShowAdd(true)} style={btnPrimaryStyle}>
            <Plus size={14} />
            Add Controller
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: selectedSnapshot ? 20 : 0,
        }}
      >
        {controllers.map((entry) => {
          const snap = snapshots.get(entry.id) ?? {
            entry,
            health: "loading" as const,
            capabilities: null,
            apps: [],
            error: null,
          };
          return (
            <ControllerCard
              key={entry.id}
              snapshot={snap}
              selected={selectedId === entry.id}
              onSelect={() => setSelectedId((id) => (id === entry.id ? null : entry.id))}
              onRemove={() => handleRemove(entry.id)}
            />
          );
        })}

        {controllers.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "48px 0",
              textAlign: "center",
              color: "#2e3560",
              fontSize: 13,
            }}
          >
            No controllers configured. Add one to get started.
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedSnapshot && (
        <ControllerDetail
          snapshot={selectedSnapshot}
          onClose={() => setSelectedId(null)}
          onUpdateUrl={handleUpdateUrl}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <AddControllerModal
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

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
  borderRadius: 7,
  padding: "8px 14px",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
