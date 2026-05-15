// Warehouse Outage scenario: takes both warehouses (w1, w2) offline.
// Stage 1: drain warehouse product inventory ~70%
// Stage 2: spike 5 URGENT orders destined for warehouses
// Stage 3: create 3 DELAYED shipments from warehouse origins
// Stage 4: create 4 support tickets in category "Warehouse Down"
//
// Returns a CollapseResult so the existing recovery flow can roll it back.

import type {
  CollapseApiKeys,
  CollapseCallbacks,
  CollapseResult,
  CollapseUrls,
} from "../types";
import type { NodeConfig } from "../nodes";
import {
  authHeaders,
  drainProductsNode,
  emptyResult,
  fetchWithTimeout,
  findNode,
  isoDateOffset,
  pad,
  randBetween,
  sleep,
} from "./shared";

const STEP_GAP_MS = 400;

export const WAREHOUSE_OUTAGE_STAGE_LABELS: readonly string[] = [
  "Drain warehouse product inventory",
  "Spike URGENT orders to warehouses",
  "Create delayed inbound shipments",
  "Open Warehouse Down support tickets",
] as const;

const URGENT_PRODUCTS = [
  "EXPEDITE: Replenishment — Warehouse 1",
  "EXPEDITE: Door Assembly LH — W1 Pull",
  "EXPEDITE: Seat Assembly Driver — W2 Restock",
  "EXPEDITE: Hood Assembly — Warehouse Coverage",
  "EXPEDITE: Bumper Cover Front — Restock W1/W2",
];

interface OrderRow {
  id: string;
  status: string;
}

export async function runWarehouseOutage(
  nodes: NodeConfig[],
  urls: CollapseUrls,
  keys: CollapseApiKeys,
  cb: CollapseCallbacks,
): Promise<void> {
  const result: CollapseResult = emptyResult();
  const w1 = findNode(nodes, "w1-product");
  const w2 = findNode(nodes, "w2-product");

  // ── Stage 1: drain warehouse product inventory ────────────────────────
  cb.onStepStart(0, WAREHOUSE_OUTAGE_STAGE_LABELS[0]);
  try {
    if (w1?.url) {
      const drained = await drainProductsNode(w1.url, w1.apiKey, 0.25, 0.35);
      result.drainedProducts.push(...drained);
    }
    if (w2?.url) {
      const drained = await drainProductsNode(w2.url, w2.apiKey, 0.25, 0.35);
      result.drainedProducts.push(...drained);
    }
    cb.onStepDone(0, WAREHOUSE_OUTAGE_STAGE_LABELS[0]);
  } catch (e) {
    cb.onStepError(0, WAREHOUSE_OUTAGE_STAGE_LABELS[0], errMsg(e));
  }
  await sleep(STEP_GAP_MS);

  // ── Stage 2: spike URGENT orders ──────────────────────────────────────
  cb.onStepStart(1, WAREHOUSE_OUTAGE_STAGE_LABELS[1]);
  if (urls.ord) {
    const headers = authHeaders(keys.ordKey);
    const stamp = Date.now().toString(36).toUpperCase();
    for (let i = 0; i < 5; i++) {
      const dest = i % 2 === 0 ? "Warehouse 1" : "Warehouse 2";
      const body = {
        order_number: `WHS-${stamp}-${pad(i + 1, 3)}`,
        customer: `URGENT — ${dest} replenishment`,
        product_sku: `FMC-WHS-${pad(i + 1, 4)}`,
        product_name: URGENT_PRODUCTS[i],
        quantity: Math.floor(randBetween(100, 350)),
        unit_price: Math.round(randBetween(80, 260)),
        status: "PENDING",
        priority: "URGENT",
        due_date: isoDateOffset(2),
        notes: `Warehouse outage scenario · ${dest} inventory critical`,
      };
      try {
        const res = await fetchWithTimeout(`${urls.ord}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = (await res.json()) as { order?: { id?: string } };
          if (json.order?.id) result.createdOrderIds.push(json.order.id);
        }
      } catch {
        // continue
      }
    }
  }
  cb.onStepDone(1, WAREHOUSE_OUTAGE_STAGE_LABELS[1]);
  await sleep(STEP_GAP_MS);

  // ── Stage 3: delay/create 3 shipments routed FROM warehouses ──────────
  cb.onStepStart(2, WAREHOUSE_OUTAGE_STAGE_LABELS[2]);
  if (urls.shp) {
    const headers = authHeaders(keys.shpKey);
    // Delay up to 3 IN_TRANSIT shipments where origin is a warehouse
    try {
      const listRes = await fetchWithTimeout(`${urls.shp}/api/shipments`, { headers });
      if (listRes.ok) {
        const all = (await listRes.json()) as Array<{ id: string; status: string; origin?: string }>;
        const targets = all
          .filter((s) => s.status === "IN_TRANSIT" && typeof s.origin === "string" && /warehouse/i.test(s.origin))
          .slice(0, 3);
        for (const s of targets) {
          try {
            const r = await fetchWithTimeout(`${urls.shp}/api/shipments/${s.id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({
                status: "DELAYED",
                delayReason: "Warehouse outage scenario · outbound shipment paused",
              }),
            });
            if (r.ok) result.delayedShipmentIds.push(s.id);
          } catch {
            // continue
          }
        }
      }
    } catch {
      // continue
    }
    // Also POST 3 fresh shipments from warehouses
    const stamp = Date.now().toString(36).toUpperCase();
    for (let i = 0; i < 3; i++) {
      const origin = i % 2 === 0 ? "Warehouse 1" : "Warehouse 2";
      const body = {
        tracking_number: `WHS-${stamp}-${pad(i + 1, 3)}`,
        carrier: "XPO Logistics",
        origin,
        destination: "Factory 2",
        customer: `Emergency outbound from ${origin}`,
        order_ref: `WHS-${stamp}`,
        items_count: Math.floor(randBetween(40, 180)),
        weight_kg: Math.round(randBetween(700, 3200) * 10) / 10,
        estimated_arrival: isoDateOffset(2),
        notes: "Warehouse outage scenario · expedited dispatch",
      };
      try {
        const res = await fetchWithTimeout(`${urls.shp}/api/shipments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = (await res.json()) as { shipment?: { id?: string } };
          if (json.shipment?.id) result.createdShipmentIds.push(json.shipment.id);
        }
      } catch {
        // continue
      }
    }
  }
  cb.onStepDone(2, WAREHOUSE_OUTAGE_STAGE_LABELS[2]);
  await sleep(STEP_GAP_MS);

  // ── Stage 4: support tickets ──────────────────────────────────────────
  cb.onStepStart(3, WAREHOUSE_OUTAGE_STAGE_LABELS[3]);
  if (urls.sup) {
    const headers = authHeaders(keys.supKey);
    const stamp = Date.now().toString(36).toUpperCase();
    const tickets = [
      {
        title: "CRITICAL: Warehouse 1 inventory at 25% — restock blocked",
        severity: "CRITICAL" as const,
        category: "EQUIPMENT" as const,
      },
      {
        title: "CRITICAL: Warehouse 2 outage — distribution paused",
        severity: "CRITICAL" as const,
        category: "EQUIPMENT" as const,
      },
      {
        title: "HIGH: Outbound shipments from W1/W2 delayed",
        severity: "HIGH" as const,
        category: "GENERAL" as const,
      },
      {
        title: "HIGH: Customer ETAs slipping · 5 urgent orders blocked",
        severity: "HIGH" as const,
        category: "GENERAL" as const,
      },
    ];
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const body = {
        ticket_number: `WHS-${stamp}-${pad(i + 1, 3)}`,
        title: t.title,
        description:
          "Auto-generated by Nexus Reality Engine · Warehouse Outage scenario.",
        category: t.category,
        severity: t.severity,
        status: "OPEN",
        assigned_to: "Unassigned",
        reported_by: "Nexus Automated Alert System",
      };
      try {
        const res = await fetchWithTimeout(`${urls.sup}/api/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = (await res.json()) as { ticket?: { id?: string } };
          if (json.ticket?.id) result.createdTicketIds.push(json.ticket.id);
        }
      } catch {
        // continue
      }
    }
  }
  cb.onStepDone(3, WAREHOUSE_OUTAGE_STAGE_LABELS[3]);

  // Light type-only access so the imported OrderRow type doesn't show as
  // unused under strict TS configs.
  const _typed: OrderRow | null = null;
  void _typed;

  cb.onComplete(result);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
