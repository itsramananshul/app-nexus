export type NodeType =
  | "product_inventory"
  | "raw_materials"
  | "orders"
  | "shipments"
  | "support_tickets"
  | "erp"
  | "controller";

export type NodeLocation =
  | "Factory 1"
  | "Factory 2"
  | "Factory 3"
  | "Factory 4"
  | "Warehouse 1"
  | "Warehouse 2"
  | "Corporate"
  | "Router"
  | "Network";

export interface NodeConfig {
  id: string;
  label: string;
  type: NodeType;
  location: NodeLocation;
  url: string;
  apiKey: string | null;
}

interface NodeCandidate {
  id: string;
  label: string;
  type: NodeType;
  location: NodeLocation;
  raw: string | undefined;
}

export function getNodes(): NodeConfig[] {
  const all: NodeCandidate[] = [
    {
      id: "f1-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 1",
      raw: process.env.NEXT_PUBLIC_FACTORY1_PRODUCT_URL,
    },
    {
      id: "f1-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 1",
      raw: process.env.NEXT_PUBLIC_FACTORY1_MATERIALS_URL,
    },
    {
      id: "f2-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 2",
      raw: process.env.NEXT_PUBLIC_FACTORY2_PRODUCT_URL,
    },
    {
      id: "f2-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 2",
      raw: process.env.NEXT_PUBLIC_FACTORY2_MATERIALS_URL,
    },
    {
      id: "f3-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 3",
      raw: process.env.NEXT_PUBLIC_FACTORY3_PRODUCT_URL,
    },
    {
      id: "f3-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 3",
      raw: process.env.NEXT_PUBLIC_FACTORY3_MATERIALS_URL,
    },
    {
      id: "f4-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 4",
      raw: process.env.NEXT_PUBLIC_FACTORY4_PRODUCT_URL,
    },
    {
      id: "f4-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 4",
      raw: process.env.NEXT_PUBLIC_FACTORY4_MATERIALS_URL,
    },
    {
      id: "w1-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Warehouse 1",
      raw: process.env.NEXT_PUBLIC_WAREHOUSE1_PRODUCT_URL,
    },
    {
      id: "w2-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Warehouse 2",
      raw: process.env.NEXT_PUBLIC_WAREHOUSE2_PRODUCT_URL,
    },
    {
      id: "corp-orders",
      label: "Orders",
      type: "orders",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_ORDERS_URL,
    },
    {
      id: "corp-shipments",
      label: "Shipments",
      type: "shipments",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_SHIPMENTS_URL,
    },
    {
      id: "corp-support",
      label: "Support Tickets",
      type: "support_tickets",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_SUPPORT_URL,
    },
    {
      id: "corp-erp",
      label: "ERP System",
      type: "erp",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_ERP_URL,
    },
  ];
  const envNodes: NodeConfig[] = all
    .filter((n) => typeof n.raw === "string" && n.raw.trim() !== "")
    .map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      location: n.location,
      url: (n.raw as string).trim().replace(/\/$/, ""),
      apiKey: null,
    }));

  return mergeRegistryControllers(envNodes);
}

// Map a stored controller entry name to one of the existing NodeLocation
// values. Falls back to "Network" so unknown names still render.
function locationForName(name: string): NodeLocation {
  const trimmed = name.trim().toLowerCase();
  if (trimmed === "router") return "Router";
  if (trimmed.startsWith("factory 1") || trimmed === "factory-1") return "Factory 1";
  if (trimmed.startsWith("factory 2") || trimmed === "factory-2") return "Factory 2";
  if (trimmed.startsWith("factory 3") || trimmed === "factory-3") return "Factory 3";
  if (trimmed.startsWith("factory 4") || trimmed === "factory-4") return "Factory 4";
  if (trimmed.startsWith("warehouse 1") || trimmed === "warehouse-1") return "Warehouse 1";
  if (trimmed.startsWith("warehouse 2") || trimmed === "warehouse-2") return "Warehouse 2";
  if (trimmed === "corporate") return "Corporate";
  return "Network";
}

// Append controllers from the toolkit's localStorage registry as additional
// graph nodes — only in the browser (no-op during SSR). Dedupes by URL.
function mergeRegistryControllers(envNodes: NodeConfig[]): NodeConfig[] {
  if (typeof window === "undefined") return envNodes;
  let entries: Array<{ id: string; name: string; url: string; role: "controller" | "router" }>;
  try {
    const raw = window.localStorage.getItem("openprem:controllers");
    if (!raw) return envNodes;
    entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return envNodes;
  } catch {
    return envNodes;
  }
  const seenUrls = new Set(envNodes.map((n) => n.url));
  const extras: NodeConfig[] = [];
  for (const e of entries) {
    if (!e || typeof e.url !== "string") continue;
    const url = e.url.replace(/\/$/, "");
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    extras.push({
      id: `ctrl-${e.id ?? url}`,
      label: e.name || url,
      type: "controller",
      location: locationForName(e.name ?? ""),
      url,
      apiKey: null,
    });
  }
  return [...envNodes, ...extras];
}

export const ENV_VAR_NAMES: readonly string[] = [
  "NEXT_PUBLIC_FACTORY1_PRODUCT_URL",
  "NEXT_PUBLIC_FACTORY1_MATERIALS_URL",
  "NEXT_PUBLIC_FACTORY2_PRODUCT_URL",
  "NEXT_PUBLIC_FACTORY2_MATERIALS_URL",
  "NEXT_PUBLIC_FACTORY3_PRODUCT_URL",
  "NEXT_PUBLIC_FACTORY3_MATERIALS_URL",
  "NEXT_PUBLIC_FACTORY4_PRODUCT_URL",
  "NEXT_PUBLIC_FACTORY4_MATERIALS_URL",
  "NEXT_PUBLIC_WAREHOUSE1_PRODUCT_URL",
  "NEXT_PUBLIC_WAREHOUSE2_PRODUCT_URL",
  "NEXT_PUBLIC_ORDERS_URL",
  "NEXT_PUBLIC_SHIPMENTS_URL",
  "NEXT_PUBLIC_SUPPORT_URL",
  "NEXT_PUBLIC_ERP_URL",
];

export const LOCATION_ORDER: readonly NodeLocation[] = [
  "Factory 1",
  "Factory 2",
  "Factory 3",
  "Factory 4",
  "Warehouse 1",
  "Warehouse 2",
  "Corporate",
  "Router",
  "Network",
];

export const NODE_TYPE_EMOJI: Record<NodeType, string> = {
  product_inventory: "📦",
  raw_materials: "⚙️",
  orders: "📋",
  shipments: "🚚",
  support_tickets: "🎫",
  erp: "🏛️",
  controller: "🧠",
};

const PRIMARY_METRIC_KEY: Record<NodeType, string> = {
  product_inventory: "productCount",
  raw_materials: "materialCount",
  orders: "orderCount",
  shipments: "shipmentCount",
  support_tickets: "ticketCount",
  erp: "recordCount",
  controller: "capabilityCount",
};

const SECONDARY_METRIC_KEY: Record<NodeType, { key: string; label: string } | null> = {
  product_inventory: null,
  raw_materials: null,
  orders: { key: "flaggedCount", label: "flagged" },
  shipments: { key: "delayedCount", label: "delayed" },
  support_tickets: { key: "criticalOpenCount", label: "critical open" },
  erp: { key: "nonCompliantCount", label: "non-compliant" },
  controller: { key: "peerCount", label: "peers" },
};

export function primaryMetricFor(
  type: NodeType,
  details: Record<string, number | string>,
): { value: number | null; key: string } {
  const key = PRIMARY_METRIC_KEY[type];
  const v = details[key];
  return { value: typeof v === "number" ? v : null, key };
}

export function secondaryMetricFor(
  type: NodeType,
  details: Record<string, number | string>,
): { value: number; label: string } | null {
  const meta = SECONDARY_METRIC_KEY[type];
  if (!meta) return null;
  const v = details[meta.key];
  if (typeof v !== "number" || v <= 0) return null;
  return { value: v, label: meta.label };
}
