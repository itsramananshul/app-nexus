// Materials Shortage scenario: every raw-materials node drained to 5–15%.
// Stage 1: drain ALL raw_materials nodes to 5–15% of current quantity
// Stage 2: spike 6 URGENT orders for critical materials
// Stage 3: regress 4 IN_PRODUCTION orders back to PENDING
// Stage 4: open 5 support tickets — Production halted, materials shortage
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
  drainMaterialsNode,
  emptyResult,
  fetchWithTimeout,
  isoDateOffset,
  pad,
  randBetween,
  sleep,
} from "./shared";

const STEP_GAP_MS = 1500;

export const MATERIALS_SHORTAGE_STAGE_LABELS: readonly string[] = [
  "Drain all raw materials nodes",
  "Spike URGENT orders for critical materials",
  "Regress in-production orders to pending",
  "Open production-halt support tickets",
] as const;

const URGENT_MATERIALS = [
  "EXPEDITE: Steel coil — Critical material shortage",
  "EXPEDITE: Aluminum sheet — Production halt",
  "EXPEDITE: Resin pellets — Line blocked",
  "EXPEDITE: Wire harness loom — Shortage",
  "EXPEDITE: Glass laminate — Critical pull",
  "EXPEDITE: Brake fluid (bulk) — Restock",
];

export async function runMaterialsShortage(
  nodes: NodeConfig[],
  urls: CollapseUrls,
  keys: CollapseApiKeys,
  cb: CollapseCallbacks,
): Promise<void> {
  const result: CollapseResult = emptyResult();

  // Every raw_materials node across all factories.
  const materialsNodes = nodes.filter((n) => n.type === "raw_materials");

  // ── Stage 1: drain all materials to 5–15% remaining ───────────────────
  cb.onStepStart(0, MATERIALS_SHORTAGE_STAGE_LABELS[0]);
  for (const node of materialsNodes) {
    if (!node.url) continue;
    try {
      const drained = await drainMaterialsNode(node.url, node.apiKey, 0.05, 0.15);
      result.drainedMaterials.push(...drained);
    } catch {
      // continue
    }
  }
  cb.onStepDone(0, MATERIALS_SHORTAGE_STAGE_LABELS[0]);
  await sleep(STEP_GAP_MS);

  // ── Stage 2: 6 URGENT orders for critical materials ───────────────────
  cb.onStepStart(1, MATERIALS_SHORTAGE_STAGE_LABELS[1]);
  if (urls.ord) {
    const headers = authHeaders(keys.ordKey);
    const stamp = Date.now().toString(36).toUpperCase();
    for (let i = 0; i < URGENT_MATERIALS.length; i++) {
      const body = {
        order_number: `MTL-${stamp}-${pad(i + 1, 3)}`,
        customer: "URGENT — Production line restart",
        product_sku: `RAW-${pad(i + 1, 4)}`,
        product_name: URGENT_MATERIALS[i],
        quantity: Math.floor(randBetween(500, 1500)),
        unit_price: Math.round(randBetween(40, 220)),
        status: "PENDING",
        priority: "URGENT",
        due_date: isoDateOffset(1),
        notes: "Materials shortage scenario · production line at risk",
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
  cb.onStepDone(1, MATERIALS_SHORTAGE_STAGE_LABELS[1]);
  await sleep(STEP_GAP_MS);

  // ── Stage 3: regress 4 IN_PRODUCTION orders to PENDING ────────────────
  cb.onStepStart(2, MATERIALS_SHORTAGE_STAGE_LABELS[2]);
  if (urls.ord) {
    const headers = authHeaders(keys.ordKey);
    try {
      const listRes = await fetchWithTimeout(`${urls.ord}/api/orders`, { headers });
      if (listRes.ok) {
        const all = (await listRes.json()) as Array<{ id: string; status: string }>;
        const targets = all.filter((o) => o.status === "IN_PRODUCTION").slice(0, 4);
        for (const o of targets) {
          try {
            const r = await fetchWithTimeout(`${urls.ord}/api/orders/${o.id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ status: "PENDING" }),
            });
            if (r.ok) result.regressedOrderIds.push(o.id);
          } catch {
            // continue
          }
        }
      }
    } catch {
      // continue
    }
  }
  cb.onStepDone(2, MATERIALS_SHORTAGE_STAGE_LABELS[2]);
  await sleep(STEP_GAP_MS);

  // ── Stage 4: 5 support tickets ────────────────────────────────────────
  cb.onStepStart(3, MATERIALS_SHORTAGE_STAGE_LABELS[3]);
  if (urls.sup) {
    const headers = authHeaders(keys.supKey);
    const stamp = Date.now().toString(36).toUpperCase();
    const tickets = [
      {
        title: "CRITICAL: Production halted — raw materials shortage",
        severity: "CRITICAL" as const,
        category: "EQUIPMENT" as const,
      },
      {
        title: "CRITICAL: Factory 1 line down — steel & aluminum at 8%",
        severity: "CRITICAL" as const,
        category: "EQUIPMENT" as const,
      },
      {
        title: "HIGH: Factories 2–4 at material-shortage threshold",
        severity: "HIGH" as const,
        category: "EQUIPMENT" as const,
      },
      {
        title: "HIGH: 4 in-production orders rolled back to pending",
        severity: "HIGH" as const,
        category: "GENERAL" as const,
      },
      {
        title: "MEDIUM: Customer notifications required — schedule slip",
        severity: "MEDIUM" as const,
        category: "GENERAL" as const,
      },
    ];
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const body = {
        ticket_number: `MTL-${stamp}-${pad(i + 1, 3)}`,
        title: t.title,
        description:
          "Auto-generated by Nexus Reality Engine · Materials Shortage scenario.",
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
  cb.onStepDone(3, MATERIALS_SHORTAGE_STAGE_LABELS[3]);

  cb.onComplete(result);
}
