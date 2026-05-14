"use client";

import { useEffect, useRef, useState } from "react";
import type { NodeConfig } from "./nodes";
import type {
  NodeHealth,
  NodeStatus,
  SentinelAlert,
} from "./types";

const DEFAULT_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 4000;

function newAlertId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function pollNode(node: NodeConfig): Promise<NodeStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
  try {
    const res = await fetch(`${node.url}/api/status`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        nodeId: node.id,
        health: "unreachable",
        lastChecked: new Date(),
        details: {},
        error: `HTTP ${res.status}`,
      };
    }
    const body = (await res.json()) as Record<string, unknown>;
    const rawHealth = body.health;
    const health: NodeHealth =
      rawHealth === "ok"
        ? "ok"
        : rawHealth === "degraded"
          ? "degraded"
          : "unreachable";
    const details: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === "health" || k === "timestamp" || k === "type") continue;
      if (typeof v === "number" || typeof v === "string") {
        details[k] = v;
      }
    }
    return {
      nodeId: node.id,
      health,
      lastChecked: new Date(),
      details,
    };
  } catch (e) {
    const message =
      (e as { name?: string }).name === "AbortError"
        ? "timeout"
        : e instanceof Error
          ? e.message
          : "Unknown error";
    return {
      nodeId: node.id,
      health: "unreachable",
      lastChecked: new Date(),
      details: {},
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function usePoller(
  nodes: NodeConfig[],
  onAlert: (alert: SentinelAlert) => void,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): Map<string, NodeStatus> {
  const [statuses, setStatuses] = useState<Map<string, NodeStatus>>(
    () => new Map(),
  );

  const onAlertRef = useRef(onAlert);
  const prevHealthRef = useRef<Map<string, NodeHealth>>(new Map());

  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    if (nodes.length === 0) {
      setStatuses(new Map());
      prevHealthRef.current = new Map();
      return;
    }
    let active = true;

    async function tick() {
      const results = await Promise.all(nodes.map((n) => pollNode(n)));
      if (!active) return;

      const next = new Map<string, NodeStatus>();
      for (const r of results) next.set(r.nodeId, r);
      setStatuses(next);

      for (const r of results) {
        const node = nodes.find((n) => n.id === r.nodeId);
        if (!node) continue;
        const prev = prevHealthRef.current.get(r.nodeId);
        if (prev !== undefined && prev !== r.health) {
          if (r.health === "degraded") {
            onAlertRef.current({
              id: newAlertId(),
              timestamp: new Date(),
              nodeId: node.id,
              nodeLabel: node.label,
              location: node.location,
              type: "health_degraded",
              message: `${node.location} · ${node.label} health degraded${r.error ? ` (${r.error})` : ""}`,
              severity: "critical",
            });
          } else if (r.health === "ok") {
            onAlertRef.current({
              id: newAlertId(),
              timestamp: new Date(),
              nodeId: node.id,
              nodeLabel: node.label,
              location: node.location,
              type: "health_recovered",
              message: `${node.location} · ${node.label} recovered to healthy`,
              severity: "info",
            });
          } else {
            onAlertRef.current({
              id: newAlertId(),
              timestamp: new Date(),
              nodeId: node.id,
              nodeLabel: node.label,
              location: node.location,
              type: "unreachable",
              message: `${node.location} · ${node.label} unreachable${r.error ? ` (${r.error})` : ""}`,
              severity: "warning",
            });
          }
        }
        prevHealthRef.current.set(r.nodeId, r.health);
      }
    }

    void tick();
    const id = setInterval(() => {
      void tick();
    }, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [nodes, intervalMs]);

  return statuses;
}
