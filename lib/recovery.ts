import type {
  CollapseApiKeys,
  CollapseCallbacks,
  CollapseUrls,
} from "./types";

const STEP_GAP_MS = 1500;
const REQUEST_TIMEOUT_MS = 6000;
const RESTOCK_UNITS = 1000;

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

interface ListItem {
  id: string;
}
interface OrderItem extends ListItem {
  status: string;
}
interface ShipmentItem extends ListItem {
  status: string;
}
interface TicketItem extends ListItem {
  status: string;
  severity?: string;
  ticket_number?: string;
}
interface ErpItem extends ListItem {
  compliance_status: string;
}

async function restockMaterials(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/materials`, { headers });
  if (!res.ok) throw new Error(`Failed to list materials: HTTP ${res.status}`);
  const list = (await res.json()) as ListItem[];
  for (const m of list) {
    try {
      await fetchWithTimeout(`${url}/api/materials/${m.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: RESTOCK_UNITS }),
      });
    } catch {
      // continue
    }
  }
}

async function unflagOrders(url: string, apiKey: string | null): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/orders`, { headers });
  if (!res.ok) throw new Error(`Failed to list orders: HTTP ${res.status}`);
  const list = (await res.json()) as OrderItem[];
  for (const o of list) {
    if (o.status !== "FLAGGED") continue;
    try {
      await fetchWithTimeout(`${url}/api/orders/${o.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: "IN_PRODUCTION" }),
      });
    } catch {
      // continue
    }
  }
}

async function undelayShipments(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/shipments`, { headers });
  if (!res.ok) throw new Error(`Failed to list shipments: HTTP ${res.status}`);
  const list = (await res.json()) as ShipmentItem[];
  for (const s of list) {
    if (s.status !== "DELAYED") continue;
    try {
      await fetchWithTimeout(`${url}/api/shipments/${s.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: "IN_TRANSIT" }),
      });
    } catch {
      // continue
    }
  }
}

async function resolveCriticalTickets(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/tickets`, { headers });
  if (!res.ok) throw new Error(`Failed to list tickets: HTTP ${res.status}`);
  const list = (await res.json()) as TicketItem[];
  for (const t of list) {
    if (t.status !== "OPEN" && t.status !== "IN_PROGRESS") continue;
    if (t.severity !== "CRITICAL") continue;
    try {
      await fetchWithTimeout(`${url}/api/tickets/${t.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          status: "RESOLVED",
          resolution: `Auto-resolved via Nexus recovery protocol at ${new Date().toISOString()}`,
        }),
      });
    } catch {
      // continue
    }
  }
}

async function restoreErpCompliance(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/records`, { headers });
  if (!res.ok) throw new Error(`Failed to list records: HTTP ${res.status}`);
  const list = (await res.json()) as ErpItem[];
  for (const r of list) {
    if (r.compliance_status !== "NON_COMPLIANT") continue;
    try {
      await fetchWithTimeout(`${url}/api/records/${r.id}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ complianceStatus: "COMPLIANT" }),
      });
    } catch {
      // continue
    }
  }
}

interface Step {
  label: string;
  url: string | null;
  apiKey: string | null;
  run: (url: string, apiKey: string | null) => Promise<void>;
}

export const RECOVERY_STEP_LABELS: readonly string[] = [
  "Restoring ERP compliance records",
  "Resolving critical incidents",
  "Resuming delayed shipments",
  "Releasing flagged production orders",
  "Replenishing Factory 2 raw materials",
];

export async function runRecovery(
  urls: CollapseUrls,
  apiKeys: CollapseApiKeys,
  callbacks: CollapseCallbacks,
): Promise<void> {
  // Recovery order is the REVERSE of the collapse cascade — restore the
  // outermost effects first, work inward to the root cause (materials).
  const steps: Step[] = [
    {
      label: RECOVERY_STEP_LABELS[0],
      url: urls.erp,
      apiKey: apiKeys.erp,
      run: restoreErpCompliance,
    },
    {
      label: RECOVERY_STEP_LABELS[1],
      url: urls.support,
      apiKey: apiKeys.support,
      run: resolveCriticalTickets,
    },
    {
      label: RECOVERY_STEP_LABELS[2],
      url: urls.shipments,
      apiKey: apiKeys.shipments,
      run: undelayShipments,
    },
    {
      label: RECOVERY_STEP_LABELS[3],
      url: urls.orders,
      apiKey: apiKeys.orders,
      run: unflagOrders,
    },
    {
      label: RECOVERY_STEP_LABELS[4],
      url: urls.materialsF2,
      apiKey: apiKeys.materialsF2,
      run: restockMaterials,
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    callbacks.onStepStart(i, step.label);
    try {
      if (!step.url) {
        callbacks.onStepError(i, step.label, "URL not configured — skipped");
      } else {
        await step.run(step.url, step.apiKey);
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

  callbacks.onComplete();
}
