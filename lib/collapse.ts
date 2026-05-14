import type {
  CollapseApiKeys,
  CollapseCallbacks,
  CollapseUrls,
} from "./types";

const STEP_GAP_MS = 3000;
const REQUEST_TIMEOUT_MS = 6000;

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

interface ErpItem extends ListItem {
  compliance_status: string;
}

async function depleteRawMaterials(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/materials`, { headers });
  if (!res.ok) throw new Error(`Failed to list materials: HTTP ${res.status}`);
  const list = (await res.json()) as ListItem[];
  for (const m of list) {
    try {
      await fetchWithTimeout(`${url}/api/materials/${m.id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: 9999 }),
      });
    } catch {
      // continue
    }
  }
}

async function flagOrders(url: string, apiKey: string | null): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/orders`, { headers });
  if (!res.ok) throw new Error(`Failed to list orders: HTTP ${res.status}`);
  const list = (await res.json()) as OrderItem[];
  for (const o of list) {
    if (o.status !== "IN_PRODUCTION" && o.status !== "PENDING") continue;
    try {
      await fetchWithTimeout(`${url}/api/orders/${o.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: "FLAGGED" }),
      });
    } catch {
      // continue
    }
  }
}

async function delayShipments(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/shipments`, { headers });
  if (!res.ok) throw new Error(`Failed to list shipments: HTTP ${res.status}`);
  const list = (await res.json()) as ShipmentItem[];
  for (const s of list) {
    if (s.status !== "IN_TRANSIT" && s.status !== "PREPARING") continue;
    try {
      await fetchWithTimeout(`${url}/api/shipments/${s.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          status: "DELAYED",
          delayReason:
            "Factory 2 raw materials shortage — production halted",
        }),
      });
    } catch {
      // continue
    }
  }
}

async function createSupportTicket(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      ticket_number: "TKT-NEXUS-001",
      title:
        "CRITICAL: Factory 2 Production Halt — Raw Materials Depleted",
      description:
        "Automated alert from Nexus. Factory 2 raw materials have been fully depleted. Production has halted. Orders flagged. Shipments delayed. Immediate intervention required.",
      category: "EQUIPMENT",
      severity: "CRITICAL",
      status: "OPEN",
      assigned_to: "Unassigned",
      reported_by: "Nexus Automated Alert System",
    }),
  });
  if (!res.ok && res.status >= 500) {
    throw new Error(`Failed to create ticket: HTTP ${res.status}`);
  }
}

async function breachErpCompliance(
  url: string,
  apiKey: string | null,
): Promise<void> {
  const headers = authHeaders(apiKey);
  const res = await fetchWithTimeout(`${url}/api/records`, { headers });
  if (!res.ok) throw new Error(`Failed to list records: HTTP ${res.status}`);
  const list = (await res.json()) as ErpItem[];
  for (const r of list) {
    if (r.compliance_status !== "COMPLIANT") continue;
    try {
      await fetchWithTimeout(`${url}/api/records/${r.id}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ complianceStatus: "NON_COMPLIANT" }),
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

export const COLLAPSE_STEP_LABELS: readonly string[] = [
  "Depleting Factory 2 raw materials",
  "Flagging affected production orders",
  "Cascading delay to outbound shipments",
  "Creating critical incident ticket",
  "Recording compliance breach in ERP",
];

export async function runFactoryCollapse(
  urls: CollapseUrls,
  apiKeys: CollapseApiKeys,
  callbacks: CollapseCallbacks,
): Promise<void> {
  const steps: Step[] = [
    {
      label: COLLAPSE_STEP_LABELS[0],
      url: urls.materialsF2,
      apiKey: apiKeys.materialsF2,
      run: depleteRawMaterials,
    },
    {
      label: COLLAPSE_STEP_LABELS[1],
      url: urls.orders,
      apiKey: apiKeys.orders,
      run: flagOrders,
    },
    {
      label: COLLAPSE_STEP_LABELS[2],
      url: urls.shipments,
      apiKey: apiKeys.shipments,
      run: delayShipments,
    },
    {
      label: COLLAPSE_STEP_LABELS[3],
      url: urls.support,
      apiKey: apiKeys.support,
      run: createSupportTicket,
    },
    {
      label: COLLAPSE_STEP_LABELS[4],
      url: urls.erp,
      apiKey: apiKeys.erp,
      run: breachErpCompliance,
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
