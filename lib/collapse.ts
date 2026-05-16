import type {
  CollapseApiKeys,
  CollapseCallbacks,
  CollapseResult,
  CollapseUrls,
  DrainedItem,
} from "./types";

const STEP_GAP_MS = 1200;
const REQUEST_TIMEOUT_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authHeaders(apiKey: string | null): Record<string, string> {
  return apiKey ? { "x-api-key": apiKey } : {};
}

async function fetchWithTimeout(
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

interface MaterialRow {
  id: string;
  on_hand: number;
}
interface ProductRow {
  id: string;
  on_hand?: number;
  onHand?: number;
}
interface OrderRow {
  id: string;
  status: string;
}
interface ShipmentRow {
  id: string;
  status: string;
}

function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
function pad(n: number, width = 5): string {
  return String(n).padStart(width, "0");
}
function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 1 — drain Factory 2 raw materials by 55–70% via /adjust
// ─────────────────────────────────────────────────────────────────────────
async function drainMaterials(
  url: string,
  apiKey: string | null,
): Promise<DrainedItem[]> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/materials`, { headers });
  if (!res.ok) throw new Error(`list materials: HTTP ${res.status}`);
  const list = (await res.json()) as MaterialRow[];
  const drained: DrainedItem[] = [];
  for (const m of list) {
    const original = Number(m.on_hand) || 0;
    // Reduce by 55–70% → keep 30–45%
    const newQty = Math.max(0, Math.floor(original * randBetween(0.3, 0.45)));
    try {
      await fetchWithTimeout(`${url}/api/materials/${m.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: newQty }),
      });
      drained.push({ id: m.id, originalOnHand: original, newOnHand: newQty });
    } catch {
      // continue — best-effort
    }
  }
  return drained;
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 2 — drain Factory 2 product inventory by 40–60% via /adjust
// ─────────────────────────────────────────────────────────────────────────
async function drainProducts(
  url: string,
  apiKey: string | null,
): Promise<DrainedItem[]> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/inventory`, { headers });
  if (!res.ok) throw new Error(`list inventory: HTTP ${res.status}`);
  // Response may use either on_hand (snake) or onHand (view) depending on shape.
  const list = (await res.json()) as ProductRow[];
  const drained: DrainedItem[] = [];
  for (const p of list) {
    const original = Number(p.on_hand ?? p.onHand ?? 0);
    const newQty = Math.max(0, Math.floor(original * randBetween(0.4, 0.6)));
    try {
      await fetchWithTimeout(`${url}/api/inventory/${p.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: newQty }),
      });
      drained.push({ id: p.id, originalOnHand: original, newOnHand: newQty });
    } catch {
      // continue
    }
  }
  return drained;
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 3 — create 8 URGENT orders + regress 5 IN_PRODUCTION → PENDING
// ─────────────────────────────────────────────────────────────────────────
const URGENT_PRODUCTS = [
  "EXPEDITE: Door Assembly LH — Factory 2 Shortage",
  "EXPEDITE: Door Assembly RH — Factory 2 Shortage",
  "EXPEDITE: Instrument Panel — Critical Backorder",
  "EXPEDITE: Seat Assembly Driver — Production Halt",
  "EXPEDITE: Hood Assembly — Reroute Required",
  "EXPEDITE: Bumper Cover Front — Shortage Coverage",
  "EXPEDITE: Tailgate Assembly — Emergency Pull",
  "EXPEDITE: Windshield Laminated Glass — Critical",
];

interface OrderStageResult {
  createdIds: string[];
  regressedIds: string[];
}

async function spikeOrders(
  url: string,
  apiKey: string | null,
): Promise<OrderStageResult> {
  const headers = authHeaders(apiKey);
  const createdIds: string[] = [];
  const stamp = Date.now().toString(36).toUpperCase();

  // POST 8 URGENT orders
  for (let i = 0; i < URGENT_PRODUCTS.length; i++) {
    const body = {
      order_number: `URG-2024-${stamp}-${pad(i + 1, 3)}`,
      customer: "URGENT — Ford Assembly Detroit",
      product_sku: `FMC-EXP-${pad(i + 1, 4)}`,
      product_name: URGENT_PRODUCTS[i],
      quantity: Math.floor(randBetween(200, 401)),
      unit_price: Math.round(randBetween(120, 320)),
      status: "PENDING",
      priority: "HIGH",
      due_date: isoDateOffset(2),
      notes: "Emergency cascade order · Factory 2 supply disruption",
    };
    try {
      const res = await fetchWithTimeout(`${url}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { order?: { id?: string } };
        if (json.order?.id) createdIds.push(json.order.id);
      }
    } catch {
      // continue
    }
  }

  // GET orders, pick up to 5 IN_PRODUCTION ones and regress to PENDING
  const regressedIds: string[] = [];
  try {
    const listRes = await fetchWithTimeout(`${url}/api/orders`, { headers });
    if (listRes.ok) {
      const all = (await listRes.json()) as OrderRow[];
      const targets = all.filter((o) => o.status === "IN_PRODUCTION").slice(0, 5);
      for (const o of targets) {
        try {
          // app-3 uses PATCH on /status; user spec said POST but the actual route is PATCH.
          const r = await fetchWithTimeout(`${url}/api/orders/${o.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ status: "PENDING" }),
          });
          if (r.ok) regressedIds.push(o.id);
        } catch {
          // continue
        }
      }
    }
  } catch {
    // continue
  }

  return { createdIds, regressedIds };
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 4 — delay IN_TRANSIT shipments + create 3 emergency PREPARING
// ─────────────────────────────────────────────────────────────────────────
interface ShipmentStageResult {
  delayedIds: string[];
  createdIds: string[];
}

async function chokeShipments(
  url: string,
  apiKey: string | null,
): Promise<ShipmentStageResult> {
  const headers = authHeaders(apiKey);
  const delayedIds: string[] = [];

  try {
    const listRes = await fetchWithTimeout(`${url}/api/shipments`, { headers });
    if (listRes.ok) {
      const all = (await listRes.json()) as ShipmentRow[];
      const inTransit = all.filter((s) => s.status === "IN_TRANSIT");
      for (const s of inTransit) {
        try {
          const r = await fetchWithTimeout(`${url}/api/shipments/${s.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
              status: "DELAYED",
              delayReason:
                "Factory 2 production halt — outbound shipment held pending reroute",
            }),
          });
          if (r.ok) delayedIds.push(s.id);
        } catch {
          // continue
        }
      }
    }
  } catch {
    // continue
  }

  // POST 3 emergency reroute shipments (server assigns PREPARING; parseNewShipment
  // requires a CARRIERS enum value, so use "XPO Logistics" + signal urgency in notes).
  const createdIds: string[] = [];
  const stamp = Date.now().toString(36).toUpperCase();
  for (let i = 0; i < 3; i++) {
    const body = {
      tracking_number: `EMRG-2024-${stamp}-${pad(i + 1, 3)}`,
      carrier: "XPO Logistics",
      origin: "Factory 3",
      destination: "Warehouse 1",
      customer: "Emergency Reroute — Factory 2 Coverage",
      order_ref: `URG-2024-${stamp}`,
      items_count: Math.floor(randBetween(50, 200)),
      weight_kg: Math.round(randBetween(800, 4500) * 10) / 10,
      estimated_arrival: isoDateOffset(2),
      notes: "EMERGENCY PRIORITY · cover Factory 2 supply disruption",
    };
    try {
      const res = await fetchWithTimeout(`${url}/api/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { shipment?: { id?: string } };
        if (json.shipment?.id) createdIds.push(json.shipment.id);
      }
    } catch {
      // continue
    }
  }

  return { delayedIds, createdIds };
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 5 — 6 specific support tickets describing the cascade
// ─────────────────────────────────────────────────────────────────────────
interface NewTicketSpec {
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "EQUIPMENT" | "QUALITY" | "SAFETY" | "GENERAL" | "IT";
}

const CASCADE_TICKETS: NewTicketSpec[] = [
  {
    title: "CRITICAL: Factory 2 complete production halt",
    severity: "CRITICAL",
    category: "EQUIPMENT",
  },
  {
    title: "HIGH: Raw material shortage — 4h to line stoppage",
    severity: "HIGH",
    category: "EQUIPMENT",
  },
  {
    title: "HIGH: 47 customer orders at risk of delay",
    severity: "HIGH",
    category: "GENERAL",
  },
  {
    title: "CRITICAL: Quality control suspended — no outbound parts",
    severity: "CRITICAL",
    category: "QUALITY",
  },
  {
    title: "HIGH: Emergency reroute required from Factory 3",
    severity: "HIGH",
    category: "GENERAL",
  },
  {
    title: "MEDIUM: Customer notification required — shipment delays",
    severity: "MEDIUM",
    category: "GENERAL",
  },
];

async function floodTickets(
  url: string,
  apiKey: string | null,
): Promise<string[]> {
  const headers = authHeaders(apiKey);
  const createdIds: string[] = [];
  const stamp = Date.now().toString(36).toUpperCase();
  for (let i = 0; i < CASCADE_TICKETS.length; i++) {
    const t = CASCADE_TICKETS[i];
    const body = {
      ticket_number: `CSC-${stamp}-${pad(i + 1, 3)}`,
      title: t.title,
      description:
        "Auto-generated by Nexus Reality Engine during Factory 2 supply disruption scenario. Refer to incident timeline for context.",
      category: t.category,
      severity: t.severity,
      status: "OPEN",
      assigned_to: "Unassigned",
      reported_by: "Nexus Automated Alert System",
    };
    try {
      const res = await fetchWithTimeout(`${url}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { ticket?: { id?: string } };
        if (json.ticket?.id) createdIds.push(json.ticket.id);
      }
    } catch {
      // continue
    }
  }
  return createdIds;
}

// ─────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────
export const COLLAPSE_STEP_LABELS: readonly string[] = [
  "Draining Factory 2 raw materials inventory",
  "Draining Factory 2 product inventory",
  "Spiking urgent order backlog · regressing production orders",
  "Delaying outbound shipments · dispatching emergency reroute",
  "Generating cascade incident tickets",
];

export async function runFactoryCollapse(
  urls: CollapseUrls,
  apiKeys: CollapseApiKeys,
  callbacks: CollapseCallbacks,
): Promise<void> {
  const result: CollapseResult = {
    drainedMaterials: [],
    drainedProducts: [],
    createdOrderIds: [],
    regressedOrderIds: [],
    delayedShipmentIds: [],
    createdShipmentIds: [],
    createdTicketIds: [],
  };

  const steps = [
    {
      label: COLLAPSE_STEP_LABELS[0],
      url: urls.matF2,
      apiKey: apiKeys.matF2Key,
      run: async () => {
        result.drainedMaterials = await drainMaterials(urls.matF2!, apiKeys.matF2Key);
      },
    },
    {
      label: COLLAPSE_STEP_LABELS[1],
      url: urls.invF2,
      apiKey: apiKeys.invF2Key,
      run: async () => {
        result.drainedProducts = await drainProducts(urls.invF2!, apiKeys.invF2Key);
      },
    },
    {
      label: COLLAPSE_STEP_LABELS[2],
      url: urls.ord,
      apiKey: apiKeys.ordKey,
      run: async () => {
        const r = await spikeOrders(urls.ord!, apiKeys.ordKey);
        result.createdOrderIds = r.createdIds;
        result.regressedOrderIds = r.regressedIds;
      },
    },
    {
      label: COLLAPSE_STEP_LABELS[3],
      url: urls.shp,
      apiKey: apiKeys.shpKey,
      run: async () => {
        const r = await chokeShipments(urls.shp!, apiKeys.shpKey);
        result.delayedShipmentIds = r.delayedIds;
        result.createdShipmentIds = r.createdIds;
      },
    },
    {
      label: COLLAPSE_STEP_LABELS[4],
      url: urls.sup,
      apiKey: apiKeys.supKey,
      run: async () => {
        result.createdTicketIds = await floodTickets(urls.sup!, apiKeys.supKey);
      },
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    callbacks.onStepStart(i, step.label);
    try {
      if (!step.url) {
        callbacks.onStepError(i, step.label, "URL not configured — skipped");
      } else {
        await step.run();
        callbacks.onStepDone(i, step.label);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      callbacks.onStepError(i, step.label, message);
    }
    if (i < steps.length - 1) {
      await sleep(STEP_GAP_MS);
    }
  }

  callbacks.onComplete(result);
}
