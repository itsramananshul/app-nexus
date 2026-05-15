import type {
  CollapseApiKeys,
  CollapseResult,
  CollapseUrls,
  RecoveryCallbacks,
} from "./types";

const STEP_GAP_MS = 400;
const REQUEST_TIMEOUT_MS = 2000;

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

// ─────────────────────────────────────────────────────────────────────────
// Stage 1 — restock Factory 2 materials + inventory back to ~80% of original
// ─────────────────────────────────────────────────────────────────────────
async function restockMaterials(
  url: string,
  apiKey: string | null,
  drained: CollapseResult["drainedMaterials"],
): Promise<void> {
  const headers = authHeaders(apiKey);
  for (const item of drained) {
    const target = Math.round(item.originalOnHand * 0.8);
    const delta = Math.max(0, target - item.newOnHand);
    if (delta <= 0) continue;
    try {
      await fetchWithTimeout(`${url}/api/materials/${item.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: delta }),
      });
    } catch {
      // continue
    }
  }
}

async function restockProducts(
  url: string,
  apiKey: string | null,
  drained: CollapseResult["drainedProducts"],
): Promise<void> {
  const headers = authHeaders(apiKey);
  for (const item of drained) {
    const target = Math.round(item.originalOnHand * 0.8);
    const delta = Math.max(0, target - item.newOnHand);
    if (delta <= 0) continue;
    try {
      await fetchWithTimeout(`${url}/api/inventory/${item.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ quantity: delta }),
      });
    } catch {
      // continue
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 2 — move URGENT orders to IN_PRODUCTION + undo regressed orders +
// resume DELAYED shipments → IN_TRANSIT
// ─────────────────────────────────────────────────────────────────────────
async function promoteOrders(
  url: string,
  apiKey: string | null,
  ids: string[],
): Promise<void> {
  const headers = authHeaders(apiKey);
  for (const id of ids) {
    try {
      await fetchWithTimeout(`${url}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: "IN_PRODUCTION" }),
      });
    } catch {
      // continue
    }
  }
}

async function resumeShipments(
  url: string,
  apiKey: string | null,
  ids: string[],
): Promise<void> {
  const headers = authHeaders(apiKey);
  for (const id of ids) {
    try {
      await fetchWithTimeout(`${url}/api/shipments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status: "IN_TRANSIT" }),
      });
    } catch {
      // continue
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 3 — resolve the 6 auto-created cascade tickets
// ─────────────────────────────────────────────────────────────────────────
async function resolveTickets(
  url: string,
  apiKey: string | null,
  ids: string[],
): Promise<void> {
  const headers = authHeaders(apiKey);
  for (const id of ids) {
    try {
      await fetchWithTimeout(`${url}/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          status: "RESOLVED",
          resolution: `Auto-resolved by Nexus recovery protocol at ${new Date().toISOString()} — supply disruption mitigated.`,
        }),
      });
    } catch {
      // continue
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Orchestrator — 3 recovery stages
// ─────────────────────────────────────────────────────────────────────────
export const RECOVERY_STEP_LABELS: readonly string[] = [
  "Replenishing Factory 2 materials and inventory",
  "Promoting urgent orders · resuming delayed shipments",
  "Resolving cascade incident tickets",
];

export async function runRecovery(
  urls: CollapseUrls,
  apiKeys: CollapseApiKeys,
  result: CollapseResult,
  callbacks: RecoveryCallbacks,
): Promise<void> {
  const steps: { label: string; run: () => Promise<void> }[] = [
    {
      label: RECOVERY_STEP_LABELS[0],
      run: async () => {
        if (urls.matF2 && result.drainedMaterials.length > 0) {
          await restockMaterials(urls.matF2, apiKeys.matF2Key, result.drainedMaterials);
        }
        if (urls.invF2 && result.drainedProducts.length > 0) {
          await restockProducts(urls.invF2, apiKeys.invF2Key, result.drainedProducts);
        }
      },
    },
    {
      label: RECOVERY_STEP_LABELS[1],
      run: async () => {
        if (urls.ord) {
          if (result.createdOrderIds.length > 0) {
            await promoteOrders(urls.ord, apiKeys.ordKey, result.createdOrderIds);
          }
          if (result.regressedOrderIds.length > 0) {
            // Originals were IN_PRODUCTION → became PENDING → put back to IN_PRODUCTION
            await promoteOrders(urls.ord, apiKeys.ordKey, result.regressedOrderIds);
          }
        }
        if (urls.shp && result.delayedShipmentIds.length > 0) {
          await resumeShipments(urls.shp, apiKeys.shpKey, result.delayedShipmentIds);
        }
      },
    },
    {
      label: RECOVERY_STEP_LABELS[2],
      run: async () => {
        if (urls.sup && result.createdTicketIds.length > 0) {
          await resolveTickets(urls.sup, apiKeys.supKey, result.createdTicketIds);
        }
      },
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    callbacks.onStepStart(i, step.label);
    try {
      await step.run();
      callbacks.onStepDone(i, step.label);
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
