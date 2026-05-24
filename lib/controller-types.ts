// ── Controller registry (stored in localStorage) ─────────────────────────

export type ControllerRole = "controller" | "router";

export interface ControllerEntry {
  id: string;
  name: string;
  url: string;         // e.g. http://localhost:8081
  role: ControllerRole;
  addedAt: string;     // ISO timestamp
}

// ── Live data fetched from the controller API ─────────────────────────────

export interface CapabilitiesResponse {
  local: string[];
  remote: string[];
}

export interface AppInfo {
  name: string;
  endpoint: string;
}

export interface WorkflowSummary {
  id: string;
  workflow_name: string;
  status: "running" | "completed" | "error";
  progress: string | null;
}

export interface WorkflowDetail {
  status: string;
  workflow_name: string | null;
  result: unknown;
  progress: string | null;
  error: string | null;
}

// ── Router-only types ─────────────────────────────────────────────────────

export interface PeerInfo {
  url: string;
  name: string | null;
  capabilities: string[];
  last_heartbeat: number;   // unix ms
  healthy: boolean;
}

export interface Session {
  workflow_id: string;
  source_peer: string;
  workflow_name: string;
  capabilities_used: string[];
  route: string[];
  status: string;
  started_at: number;       // unix ms
  updated_at: number;
  result: unknown;
}

// ── Ledger ────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  seq: number;
  controller_id: string;
  variable: string;
  value: unknown;
}

// ── Log ───────────────────────────────────────────────────────────────────

export interface LogEntry {
  timestamp: number;    // unix ms
  source: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  workflow_id: string | null;
}

// ── Live controller snapshot (assembled from multiple endpoints) ───────────

export type ControllerHealth = "online" | "offline" | "loading";

export interface ControllerSnapshot {
  entry: ControllerEntry;
  health: ControllerHealth;
  capabilities: CapabilitiesResponse | null;
  apps: AppInfo[];
  error: string | null;
}
