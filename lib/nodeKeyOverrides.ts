"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIX = "nexus:apiKey:";

function storageKey(nodeId: string): string {
  return `${PREFIX}${nodeId}`;
}

export interface NodeKeyOverrides {
  overrides: Record<string, string>;
  isLoaded: boolean;
  setOverride: (nodeId: string, key: string) => void;
  clearOverride: (nodeId: string) => void;
}

/**
 * Per-node API-key overrides for Nexus, persisted in localStorage. These
 * take precedence over the NEXT_PUBLIC_*_KEY env vars baked into the build,
 * so users can update keys without redeploying.
 */
export function useNodeKeyOverrides(): NodeKeyOverrides {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const out: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          const v = window.localStorage.getItem(k);
          if (v && v.trim() !== "") {
            out[k.slice(PREFIX.length)] = v.trim();
          }
        }
      }
      setOverrides(out);
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  const setOverride = useCallback((nodeId: string, key: string) => {
    const trimmed = key.trim();
    if (trimmed === "") return;
    try {
      window.localStorage.setItem(storageKey(nodeId), trimmed);
    } catch {
      // ignore
    }
    setOverrides((prev) => ({ ...prev, [nodeId]: trimmed }));
  }, []);

  const clearOverride = useCallback((nodeId: string) => {
    try {
      window.localStorage.removeItem(storageKey(nodeId));
    } catch {
      // ignore
    }
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
  }, []);

  return { overrides, isLoaded, setOverride, clearOverride };
}
