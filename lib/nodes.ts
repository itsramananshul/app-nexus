export type NodeType =
  | "product_inventory"
  | "raw_materials"
  | "orders"
  | "shipments"
  | "support_tickets"
  | "erp";

export type NodeLocation =
  | "Factory 1"
  | "Factory 2"
  | "Factory 3"
  | "Factory 4"
  | "Warehouse 1"
  | "Warehouse 2"
  | "Corporate";

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
  rawKey: string | undefined;
}

export function getNodes(): NodeConfig[] {
  const all: NodeCandidate[] = [
    {
      id: "f1-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 1",
      raw: process.env.NEXT_PUBLIC_FACTORY1_PRODUCT_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY1_PRODUCT_KEY,
    },
    {
      id: "f1-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 1",
      raw: process.env.NEXT_PUBLIC_FACTORY1_MATERIALS_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY1_MATERIALS_KEY,
    },
    {
      id: "f2-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 2",
      raw: process.env.NEXT_PUBLIC_FACTORY2_PRODUCT_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY2_PRODUCT_KEY,
    },
    {
      id: "f2-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 2",
      raw: process.env.NEXT_PUBLIC_FACTORY2_MATERIALS_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY2_MATERIALS_KEY,
    },
    {
      id: "f3-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 3",
      raw: process.env.NEXT_PUBLIC_FACTORY3_PRODUCT_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY3_PRODUCT_KEY,
    },
    {
      id: "f3-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 3",
      raw: process.env.NEXT_PUBLIC_FACTORY3_MATERIALS_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY3_MATERIALS_KEY,
    },
    {
      id: "f4-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Factory 4",
      raw: process.env.NEXT_PUBLIC_FACTORY4_PRODUCT_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY4_PRODUCT_KEY,
    },
    {
      id: "f4-materials",
      label: "Raw Materials",
      type: "raw_materials",
      location: "Factory 4",
      raw: process.env.NEXT_PUBLIC_FACTORY4_MATERIALS_URL,
      rawKey: process.env.NEXT_PUBLIC_FACTORY4_MATERIALS_KEY,
    },
    {
      id: "w1-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Warehouse 1",
      raw: process.env.NEXT_PUBLIC_WAREHOUSE1_PRODUCT_URL,
      rawKey: process.env.NEXT_PUBLIC_WAREHOUSE1_PRODUCT_KEY,
    },
    {
      id: "w2-product",
      label: "Product Inventory",
      type: "product_inventory",
      location: "Warehouse 2",
      raw: process.env.NEXT_PUBLIC_WAREHOUSE2_PRODUCT_URL,
      rawKey: process.env.NEXT_PUBLIC_WAREHOUSE2_PRODUCT_KEY,
    },
    {
      id: "corp-orders",
      label: "Orders",
      type: "orders",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_ORDERS_URL,
      rawKey: process.env.NEXT_PUBLIC_ORDERS_KEY,
    },
    {
      id: "corp-shipments",
      label: "Shipments",
      type: "shipments",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_SHIPMENTS_URL,
      rawKey: process.env.NEXT_PUBLIC_SHIPMENTS_KEY,
    },
    {
      id: "corp-support",
      label: "Support Tickets",
      type: "support_tickets",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_SUPPORT_URL,
      rawKey: process.env.NEXT_PUBLIC_SUPPORT_KEY,
    },
    {
      id: "corp-erp",
      label: "ERP System",
      type: "erp",
      location: "Corporate",
      raw: process.env.NEXT_PUBLIC_ERP_URL,
      rawKey: process.env.NEXT_PUBLIC_ERP_KEY,
    },
  ];
  return all
    .filter((n) => typeof n.raw === "string" && n.raw.trim() !== "")
    .map((n) => {
      const key = typeof n.rawKey === "string" ? n.rawKey.trim() : "";
      return {
        id: n.id,
        label: n.label,
        type: n.type,
        location: n.location,
        url: (n.raw as string).trim().replace(/\/$/, ""),
        apiKey: key === "" ? null : key,
      };
    });
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
];

export const NODE_TYPE_EMOJI: Record<NodeType, string> = {
  product_inventory: "📦",
  raw_materials: "⚙️",
  orders: "📋",
  shipments: "🚚",
  support_tickets: "🎫",
  erp: "🏛️",
};

const PRIMARY_METRIC_KEY: Record<NodeType, string> = {
  product_inventory: "productCount",
  raw_materials: "materialCount",
  orders: "orderCount",
  shipments: "shipmentCount",
  support_tickets: "ticketCount",
  erp: "recordCount",
};

const SECONDARY_METRIC_KEY: Record<NodeType, { key: string; label: string } | null> = {
  product_inventory: null,
  raw_materials: null,
  orders: { key: "flaggedCount", label: "flagged" },
  shipments: { key: "delayedCount", label: "delayed" },
  support_tickets: { key: "criticalOpenCount", label: "critical open" },
  erp: { key: "nonCompliantCount", label: "non-compliant" },
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
