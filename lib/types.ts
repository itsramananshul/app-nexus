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

export interface CollapseCallbacks {
  onStepStart: (index: number, label: string) => void;
  onStepDone: (index: number, label: string) => void;
  onStepError: (index: number, label: string, error: string) => void;
  onComplete: () => void;
}

export interface CollapseUrls {
  materialsF2: string | null;
  orders: string | null;
  shipments: string | null;
  support: string | null;
  erp: string | null;
}

export interface CollapseApiKeys {
  materialsF2: string | null;
  orders: string | null;
  shipments: string | null;
  support: string | null;
  erp: string | null;
}
