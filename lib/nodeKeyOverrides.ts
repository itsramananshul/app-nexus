"use client";

import { useCallback, useEffect, useState } from "react";

export interface NodeKeyOverrides {
  overrides: Record<string, string>;
  isLoaded: boolean;
  setOverride: (nodeId: string, key: string) => Promise<void>;
  clearOverride: (nodeId: string) => Promise<void>;
}

/**
 * Per-node API-key overrides for Nexus, persisted in Supabase via the
 * /api/nexus-keys routes. Replaces the previous localStorage-only store so
 * any browser opening Nexus automatically has the team's saved keys.
 */
export function useNodeKeyOverrides(): NodeKeyOverrides {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/nexus-keys", { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { keys?: Record<string, string> };
          if (!cancelled && body.keys) {
            setOverrides(body.keys);
          }
        }
      } catch {
        // fail soft — keep overrides empty; the panel still works for setting
      }
      if (!cancelled) setIsLoaded(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setOverride = useCallback(
    async (nodeId: string, key: string): Promise<void> => {
      const trimmed = key.trim();
      if (!trimmed) return;
      // Optimistic UI — update local state immediately so the panel reflects
      // the new value while the PUT is in flight.
      setOverrides((prev) => ({ ...prev, [nodeId]: trimmed }));
      try {
        const res = await fetch(
          `/api/nexus-keys/${encodeURIComponent(nodeId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawKey: trimmed }),
          },
        );
        if (!res.ok) {
          // Roll back on failure
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[nodeId];
            return next;
          });
        }
      } catch {
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
      }
    },
    [],
  );

  const clearOverride = useCallback(async (nodeId: string): Promise<void> => {
    const previous = overrides[nodeId];
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    try {
      const res = await fetch(
        `/api/nexus-keys/${encodeURIComponent(nodeId)}`,
        { method: "DELETE" },
      );
      if (!res.ok && previous) {
        setOverrides((prev) => ({ ...prev, [nodeId]: previous }));
      }
    } catch {
      if (previous) {
        setOverrides((prev) => ({ ...prev, [nodeId]: previous }));
      }
    }
  }, [overrides]);

  return { overrides, isLoaded, setOverride, clearOverride };
}
