import type {
  AppInfo,
  CapabilitiesResponse,
  LedgerEntry,
  LogEntry,
  PeerInfo,
  Session,
  WorkflowDetail,
  WorkflowSummary,
} from "./controller-types";

const TIMEOUT_MS = 5000;

// The Rust controller returns errors as a plain string body (e.g. the parser
// message from /validate or /workflow). Surface that instead of just the status.
async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = (await res.text()).trim();
    if (!text) return `HTTP ${res.status}`;
    return `HTTP ${res.status}: ${text}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function get<T>(url: string): Promise<T> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(await readErrorBody(res));
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(await readErrorBody(res));
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── Controller endpoints ──────────────────────────────────────────────────

export function getCapabilities(baseUrl: string) {
  return get<CapabilitiesResponse>(`${baseUrl}/capabilities`);
}

export function getApps(baseUrl: string) {
  return get<AppInfo[]>(`${baseUrl}/apps`);
}

export function getLedger(baseUrl: string) {
  return get<{ entries: LedgerEntry[] }>(`${baseUrl}/ledger`);
}

export function getWorkflows(baseUrl: string) {
  return get<{ workflows: WorkflowSummary[] }>(`${baseUrl}/workflows`);
}

export function getWorkflow(baseUrl: string, id: string) {
  return get<WorkflowDetail>(`${baseUrl}/workflow/${id}`);
}

export function submitWorkflow(baseUrl: string, source: string, workflow: string) {
  return post<{ ok: boolean; workflow_id: string; status: string }>(
    `${baseUrl}/workflow`,
    { source, workflow },
  );
}

export function cancelWorkflow(baseUrl: string, id: string) {
  return post<{ ok: boolean; status: string }>(
    `${baseUrl}/workflow/${id}/cancel`,
    {},
  );
}

export function validateWorkflow(baseUrl: string, source: string) {
  return post<{ valid: boolean; capabilities: string[]; error: string | null }>(
    `${baseUrl}/validate`,
    { source },
  );
}

export function invokeCapability(
  baseUrl: string,
  capability: string,
  params: Record<string, unknown> = {},
) {
  return post<{ ok: boolean; result: unknown; error?: string }>(
    `${baseUrl}/invoke`,
    { capability, params },
  );
}

// ── Router-only endpoints ─────────────────────────────────────────────────

export function getNetworkSummary(baseUrl: string) {
  return get<Record<string, unknown>>(`${baseUrl}/network/summary`);
}

export function getNetworkPeers(baseUrl: string) {
  return get<PeerInfo[]>(`${baseUrl}/network/peers`);
}

export function getSessions(baseUrl: string) {
  return get<Session[]>(`${baseUrl}/sessions`);
}

export function getSession(baseUrl: string, workflowId: string) {
  return get<Session>(`${baseUrl}/sessions/${workflowId}`);
}

// ── Peer log (shared between controller and router) ───────────────────────

export function getPeerLog(baseUrl: string) {
  return get<{ entries: LogEntry[] }>(`${baseUrl}/peers/log`);
}
