"use client";

import { useEffect, useState } from "react";

interface ControllerEntry {
  id: string;
  name: string;
  url: string;
  role: "controller" | "router";
}

export interface ControllerHealthState {
  loaded: boolean;
  controllers: ControllerEntry[];
  reachable: number;
  total: number;
  anyReachable: boolean;
}

const CHECK_INTERVAL_MS = 10_000;
const PROBE_TIMEOUT_MS = 4_000;

function readControllers(): ControllerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("openprem:controllers");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ControllerEntry[]) : [];
  } catch {
    return [];
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "0.0.0.0") u.hostname = "localhost";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}

async function probe(url: string): Promise<boolean> {
  const abort = new AbortController();
  const t = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${normalizeUrl(url)}/capabilities`, {
      cache: "no-store",
      signal: abort.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export function useControllerHealth(): ControllerHealthState {
  const [state, setState] = useState<ControllerHealthState>({
    loaded: false,
    controllers: [],
    reachable: 0,
    total: 0,
    anyReachable: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const list = readControllers();
      if (list.length === 0) {
        if (!cancelled) {
          setState({
            loaded: true,
            controllers: [],
            reachable: 0,
            total: 0,
            anyReachable: false,
          });
        }
        return;
      }
      const results = await Promise.all(list.map((c) => probe(c.url)));
      const reachable = results.filter(Boolean).length;
      if (!cancelled) {
        setState({
          loaded: true,
          controllers: list,
          reachable,
          total: list.length,
          anyReachable: reachable > 0,
        });
      }
    }

    void check();
    const id = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}
