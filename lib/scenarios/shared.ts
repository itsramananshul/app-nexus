// Shared helpers for the alternate scenario libraries. Mirrors the patterns
// in lib/collapse.ts but kept self-contained so each scenario lib doesn't
// depend on internals of the main collapse cascade.

import type { CollapseResult, DrainedItem } from "../types";
import type { NodeConfig } from "../nodes";

const REQUEST_TIMEOUT_MS = 2000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function authHeaders(apiKey: string | null): Record<string, string> {
  return apiKey ? { "x-api-key": apiKey } : {};
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pad(n: number, width = 5): string {
  return String(n).padStart(width, "0");
}

export function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function emptyResult(): CollapseResult {
  return {
    drainedMaterials: [],
    drainedProducts: [],
    createdOrderIds: [],
    regressedOrderIds: [],
    delayedShipmentIds: [],
    createdShipmentIds: [],
    createdTicketIds: [],
  };
}

interface MaterialRow {
  id: string;
  on_hand: number;
}
interface ProductRow {
  id: string;
  on_hand?: number;
  onHand?: number;
}

// Drain a single materials endpoint to a per-item ratio of its current
// quantity. Returns DrainedItem records so recovery can restore them.
export async function drainMaterialsNode(
  url: string,
  apiKey: string | null,
  ratioMin: number,
  ratioMax: number,
): Promise<DrainedItem[]> {
  const headers = authHeaders(apiKey);
  let list: MaterialRow[] = [];
  try {
    const res = await fetchWithTimeout(`${url}/api/materials`, { headers });
    if (!res.ok) return [];
    list = (await res.json()) as MaterialRow[];
  } catch {
    return [];
  }
  const drained: DrainedItem[] = [];
  for (const m of list) {
    const original = Number(m.on_hand) || 0;
    const newQty = Math.max(0, Math.floor(original * randBetween(ratioMin, ratioMax)));
    try {
      await fetchWithTimeout(`${url}/api/materials/${m.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: newQty }),
      });
      drained.push({ id: m.id, originalOnHand: original, newOnHand: newQty });
    } catch {
      // best-effort
    }
  }
  return drained;
}

export async function drainProductsNode(
  url: string,
  apiKey: string | null,
  ratioMin: number,
  ratioMax: number,
): Promise<DrainedItem[]> {
  const headers = authHeaders(apiKey);
  let list: ProductRow[] = [];
  try {
    const res = await fetchWithTimeout(`${url}/api/inventory`, { headers });
    if (!res.ok) return [];
    list = (await res.json()) as ProductRow[];
  } catch {
    return [];
  }
  const drained: DrainedItem[] = [];
  for (const p of list) {
    const original = Number(p.on_hand ?? p.onHand ?? 0) || 0;
    const newQty = Math.max(0, Math.floor(original * randBetween(ratioMin, ratioMax)));
    try {
      await fetchWithTimeout(`${url}/api/inventory/${p.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: newQty }),
      });
      drained.push({ id: p.id, originalOnHand: original, newOnHand: newQty });
    } catch {
      // best-effort
    }
  }
  return drained;
}

export function findNode(
  nodes: NodeConfig[],
  id: string,
): NodeConfig | null {
  return nodes.find((n) => n.id === id) ?? null;
}
