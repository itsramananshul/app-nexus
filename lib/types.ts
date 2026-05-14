export type NodeHealth = "ok" | "degraded" | "unreachable";

export interface NodeStatus {
  nodeId: string;
  health: NodeHealth;
  lastChecked: Date;
  details: Record<string, number | string>;
  error?: string;
}

export type AlertType =
  | "health_degraded"
  | "health_recovered"
  | "unreachable"
  | "collapse_triggered"
  | "collapse_step"
  | "collapse_error"
  | "collapse_complete";

export type AlertSeverity = "info" | "warning" | "critical";

export interface SentinelAlert {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeLabel: string;
  location: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
}

export interface CollapseStep {
  index: number;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

// Tracks the IDs of records mutated/created during a collapse so the recovery
// run can clean them up precisely.
export interface DrainedItem {
  id: string;
  originalOnHand: number;
  newOnHand: number;
}

export interface CollapseResult {
  drainedMaterials: DrainedItem[];
  drainedProducts: DrainedItem[];
  createdOrderIds: string[];
  regressedOrderIds: string[];
  delayedShipmentIds: string[];
  createdShipmentIds: string[];
  createdTicketIds: string[];
}

export interface CollapseCallbacks {
  onStepStart: (index: number, label: string) => void;
  onStepDone: (index: number, label: string) => void;
  onStepError: (index: number, label: string, error: string) => void;
  onComplete: (result: CollapseResult) => void;
}

export interface RecoveryCallbacks {
  onStepStart: (index: number, label: string) => void;
  onStepDone: (index: number, label: string) => void;
  onStepError: (index: number, label: string, error: string) => void;
  onComplete: () => void;
}

// URL + API-key wiring used by both collapse and recovery cascades.
// Field names align with the underlying app role (inv = product inventory at F2,
// mat = raw materials at F2, ord/shp/sup = corporate orders/shipments/support).
export interface CollapseUrls {
  invF2: string | null;
  matF2: string | null;
  ord: string | null;
  shp: string | null;
  sup: string | null;
}

export interface CollapseApiKeys {
  invF2Key: string | null;
  matF2Key: string | null;
  ordKey: string | null;
  shpKey: string | null;
  supKey: string | null;
}
