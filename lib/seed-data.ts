// Ford-scale automotive demo seed data, ported from _scripts/seed-automotive.mjs.
// Used by /api/reset-demo to re-seed the shared Supabase project from inside
// the Nexus UI before a presentation.

import type { SupabaseClient } from "@supabase/supabase-js";

// ───── helpers ─────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
function pad(n: number, width = 5): string {
  return String(n).padStart(width, "0");
}
function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ───── name pools ─────
const FACTORY_PARTS = [
  "Door Assembly LH",
  "Door Assembly RH",
  "Hood Assembly",
  "Instrument Panel Complete",
  "Bumper Cover Front",
  "Bumper Cover Rear",
  "Fender Panel LH",
  "Fender Panel RH",
  "Seat Assembly Driver",
  "Seat Assembly Passenger",
  "Rear Quarter Panel LH",
  "Rear Quarter Panel RH",
  "Tailgate Assembly",
  "Roof Panel Assembly",
  "Windshield Laminated Glass",
] as const;

const WAREHOUSE_EXTRA_PARTS = [
  "Trunk Lid Assembly",
  "Floor Carpet Assembly",
  "Headliner Assembly",
  "Door Glass LH",
  "Door Glass RH",
  "Side Mirror LH",
  "Side Mirror RH",
  "Engine Underhood Cover",
  "Spare Tire Cover",
  "License Plate Frame",
  "Wheel Cover 17in (×4 set)",
] as const;

const WAREHOUSE_PARTS = [...FACTORY_PARTS, ...WAREHOUSE_EXTRA_PARTS];

const PART_CATEGORIES: Record<string, string> = {
  "Door Assembly LH": "Body",
  "Door Assembly RH": "Body",
  "Hood Assembly": "Body",
  "Instrument Panel Complete": "Interior",
  "Bumper Cover Front": "Exterior",
  "Bumper Cover Rear": "Exterior",
  "Fender Panel LH": "Body",
  "Fender Panel RH": "Body",
  "Seat Assembly Driver": "Interior",
  "Seat Assembly Passenger": "Interior",
  "Rear Quarter Panel LH": "Body",
  "Rear Quarter Panel RH": "Body",
  "Tailgate Assembly": "Body",
  "Roof Panel Assembly": "Body",
  "Windshield Laminated Glass": "Glass",
  "Trunk Lid Assembly": "Body",
  "Floor Carpet Assembly": "Interior",
  "Headliner Assembly": "Interior",
  "Door Glass LH": "Glass",
  "Door Glass RH": "Glass",
  "Side Mirror LH": "Exterior",
  "Side Mirror RH": "Exterior",
  "Engine Underhood Cover": "Powertrain",
  "Spare Tire Cover": "Interior",
  "License Plate Frame": "Exterior",
  "Wheel Cover 17in (×4 set)": "Wheels",
};

interface RawMaterialSpec {
  name: string;
  unit: string;
  min: number;
  max: number;
  category: string;
  supplier: string;
  lead: number;
  daily: number;
}

const RAW_MATERIALS: readonly RawMaterialSpec[] = [
  { name: "Steel Coil Cold-Rolled 1.2mm", unit: "kg", min: 45000, max: 85000, category: "Metals", supplier: "Nucor Steel", lead: 14, daily: 1200 },
  { name: "Aluminum Billet 6061", unit: "kg", min: 12000, max: 28000, category: "Metals", supplier: "Alcoa Industrial", lead: 21, daily: 400 },
  { name: "Copper Wire Harness Base", unit: "m", min: 8000, max: 15000, category: "Electrical", supplier: "Southwire Co.", lead: 10, daily: 250 },
  { name: "Polypropylene Resin Grade-A", unit: "kg", min: 22000, max: 40000, category: "Polymers", supplier: "ExxonMobil Chemical", lead: 18, daily: 700 },
  { name: "Float Glass Sheet 4mm", unit: "pcs", min: 3000, max: 6000, category: "Glass", supplier: "Pilkington NSG", lead: 28, daily: 90 },
  { name: "EPDM Rubber Seal Strip", unit: "m", min: 15000, max: 25000, category: "Polymers", supplier: "Cooper Standard", lead: 12, daily: 480 },
  { name: "Automotive Paint Base Coat", unit: "L", min: 4000, max: 8000, category: "Coatings", supplier: "PPG Industries", lead: 14, daily: 160 },
  { name: "Automotive Paint Clear Coat", unit: "L", min: 3500, max: 7000, category: "Coatings", supplier: "Axalta", lead: 14, daily: 140 },
  { name: "High-Strength Fastener M8", unit: "pcs", min: 180000, max: 350000, category: "Fasteners", supplier: "Acument Global", lead: 7, daily: 6800 },
  { name: "High-Strength Fastener M10", unit: "pcs", min: 120000, max: 280000, category: "Fasteners", supplier: "Acument Global", lead: 7, daily: 5200 },
  { name: "Polyurethane Foam Padding", unit: "kg", min: 6000, max: 12000, category: "Polymers", supplier: "Lear Corp Foam", lead: 10, daily: 220 },
  { name: "Adhesive Structural Epoxy", unit: "kg", min: 2000, max: 4500, category: "Chemicals", supplier: "Henkel Loctite", lead: 9, daily: 80 },
];

const FORD_DEALERS = [
  "Ford of Detroit",
  "Carman Ford",
  "Fairfax Ford Virginia",
  "AutoNation Ford Fort Worth",
  "Galpin Ford Los Angeles",
  "Sam Pack's Five Star Ford",
  "Ford City Chicago",
  "Town & Country Ford",
  "Westgate Ford",
  "Towne Ford of Northridge",
  "Bayfield Ford",
  "Brandon Ford Tampa",
  "All American Ford Hackensack",
  "Mike Naughton Ford",
  "Brighton Ford Colorado",
  "Carriage Ford Indiana",
  "Conroe Ford Texas",
  "Anderson Ford Nebraska",
] as const;

const SHIP_DESTINATIONS = [
  "Warehouse 1",
  "Warehouse 2",
  "Galpin Ford Los Angeles",
  "AutoNation Fort Worth",
  "Fairfax Ford Virginia",
  "Ford Distribution Center Chicago",
] as const;

const SHIP_ORIGINS = ["Factory 1", "Factory 2", "Factory 3", "Factory 4"] as const;

const CARRIERS = [
  "XPO Logistics",
  "FedEx Freight",
  "UPS Supply Chain",
  "DHL Industrial",
  "J.B. Hunt",
] as const;

const TICKET_SUBJECTS = [
  "Paint booth temperature variance — Line 4",
  "Stamping press calibration drift — Press #7",
  "Quality hold: Door gap measurement out of spec",
  "Conveyor belt tension fault — Assembly Line 2",
  "Robot arm positional error — Welding Station 3",
  "Material certification missing — Steel Coil Lot #8847",
  "Safety guard bypass detected — Station 12",
  "Torque wrench calibration expired — Final Assembly",
  "Water leak in roof panel mold — Tool #224",
  "Part shortage alert — Instrument Panel backorder",
  "HVAC failure in paint booth — Line 1",
  "Hydraulic press oil pressure drop — Press #3",
  "Adhesive viscosity out of spec — Lot AG-2024-119",
  "Lighting failure in QA inspection bay 2",
  "Conveyor sensor misalignment — Body Shop Line A",
  "Cycle time deviation — Welding Station 5",
  "Emergency stop tripped — Final Assembly Line",
  "Fastener supplier rejected — Lot M8-220314",
  "Lockout/tagout audit non-compliance — Press #2",
  "Compressed air leak — Stamping Line 3",
  "Robot grease cartridge depleted — Welding Cell 4",
  "Steam line condensate — Paint Line 2 maintenance",
  "Bin shortage — Door Assembly LH staging",
  "Fork truck battery failure — Logistics Bay 7",
  "PPE supply stockout — Welding Department",
] as const;

const ERP_TITLES = [
  "Q4 Steel Procurement — Factory 1-4",
  "Paint Line Upgrade Capital Expenditure",
  "Assembly Line 2 Maintenance Contract",
  "Workforce Overtime Q4 — Factory 2",
  "Logistics Contract — XPO Annual",
  "Robotics Capex — Welding Cell Refresh",
  "Energy Audit & ISO 50001 Recertification",
  "Tier-1 Supplier Compliance Review",
  "Health & Safety Annual Audit Reserve",
  "EHS Incident Response Fund Q4",
  "Paint Inventory Disposal Reserve",
  "Plant Property Insurance Renewal",
  "OEM Warranty Reserve Adjustment",
  "Tooling Depreciation Q4",
  "Capital Reserve — Factory 3 Expansion",
  "Software License Renewal — MES Platform",
  "R&D Materials Allowance Q4",
  "Trade Compliance Audit — USMCA",
  "Carbon Credit Offset Purchase",
  "Logistics Damage Recovery Reserve",
] as const;

const RECORD_TYPES = [
  "COMPLIANCE",
  "AUDIT",
  "FINANCIAL",
  "REGULATORY",
  "SAFETY_CERTIFICATION",
] as const;

const ERP_DEPARTMENTS = [
  "Procurement",
  "Operations",
  "Maintenance",
  "Quality Assurance",
  "Logistics",
  "Finance",
  "EHS",
] as const;

const RESPONSIBLE_PARTIES = [
  "M. Chen, VP Operations",
  "L. Hernandez, Plant Manager",
  "S. Patel, Quality Director",
  "R. Thompson, Logistics Lead",
  "A. Kim, EHS Manager",
  "J. Sullivan, Procurement Director",
] as const;

const ENGINEERS = [
  "M. Chen",
  "L. Hernandez",
  "S. Patel",
  "R. Thompson",
  "A. Kim",
  "D. Wright",
  "K. Nakamura",
  "P. Olsen",
] as const;

// ───── generators ─────
let skuCounter = 1000;
function nextSku(): string {
  return `FMC-${skuCounter++}`;
}

function statusFromAvailable(available: number, threshold: number): string {
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= threshold) return "LOW_STOCK";
  return "OK";
}

function genProductInventory() {
  const rows: Record<string, unknown>[] = [];
  const factories = ["Factory 1", "Factory 2", "Factory 3", "Factory 4"];
  const warehouses = ["Warehouse 1", "Warehouse 2"];

  for (const inst of factories) {
    for (const part of FACTORY_PARTS) {
      const onHand = randInt(800, 2400);
      rows.push({
        instance_name: inst,
        sku: nextSku(),
        product_name: part,
        category: PART_CATEGORIES[part] ?? "Body",
        on_hand: onHand,
        reserved: randInt(0, Math.floor(onHand * 0.2)),
        reorder_threshold: randInt(200, 500),
      });
    }
  }
  for (const inst of warehouses) {
    for (const part of WAREHOUSE_PARTS.slice(0, 25)) {
      const onHand = randInt(2000, 8000);
      rows.push({
        instance_name: inst,
        sku: nextSku(),
        product_name: part,
        category: PART_CATEGORIES[part] ?? "Body",
        on_hand: onHand,
        reserved: randInt(0, Math.floor(onHand * 0.15)),
        reorder_threshold: randInt(600, 1200),
      });
    }
  }
  return rows;
}

function genRawMaterials() {
  const rows: Record<string, unknown>[] = [];
  const instances = ["Factory 1", "Factory 2", "Factory 3", "Factory 4"];
  for (const inst of instances) {
    for (const m of RAW_MATERIALS) {
      const onHand = randInt(m.min, m.max);
      const reserved = randInt(0, Math.floor(onHand * 0.1));
      const reorder = Math.floor(m.min * 0.4);
      const available = onHand - reserved;
      rows.push({
        instance_name: inst,
        sku: nextSku(),
        name: m.name,
        category: m.category,
        unit: m.unit,
        on_hand: onHand,
        reserved,
        reorder_threshold: reorder,
        supplier: m.supplier,
        lead_time_days: m.lead,
        daily_consumption: m.daily,
        status: statusFromAvailable(available, reorder),
      });
    }
  }
  return rows;
}

function genOrders() {
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i <= 40; i++) {
    const part = pick(FACTORY_PARTS);
    const qty = randInt(50, 500);
    const unit_price = Math.round(randInt(4000, 48000) / 100 * 100) / 100;
    const priority = pickWeighted([
      ["LOW", 50],
      ["NORMAL", 35],
      ["HIGH", 15],
    ] as const);
    const status = pickWeighted([
      ["PENDING", 40],
      ["IN_PRODUCTION", 35],
      ["DELIVERED", 25],
    ] as const);
    const ageDays = randInt(0, 30);
    rows.push({
      instance_name: "Factory 1",
      order_number: `FD-2024-${pad(i, 5)}`,
      customer: pick(FORD_DEALERS),
      product_sku: `FMC-${randInt(1000, 9999)}`,
      product_name: part,
      quantity: qty,
      unit_price,
      status,
      priority,
      due_date: isoDateOffset(randInt(2, 60)),
      notes:
        status === "DELIVERED"
          ? "Fulfilled on schedule"
          : status === "IN_PRODUCTION"
            ? "On production line — Cell B"
            : "Awaiting production slot",
      created_at: isoDaysAgo(ageDays),
    });
  }
  return rows;
}

function genShipments() {
  const rows: Record<string, unknown>[] = [];
  const statuses: string[] = [];
  for (let i = 0; i < 8; i++) statuses.push("PREPARING");
  for (let i = 0; i < 15; i++) statuses.push("IN_TRANSIT");
  for (let i = 0; i < 7; i++) statuses.push("DELIVERED");
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }
  let stolen = 0;
  for (let i = 0; i < statuses.length && stolen < 4; i++) {
    if (statuses[i] === "IN_TRANSIT") {
      statuses[i] = "DELAYED";
      stolen++;
    }
  }

  for (let i = 1; i <= 30; i++) {
    const status = statuses[i - 1];
    const ageDays = randInt(0, 14);
    const eta = isoDateOffset(randInt(1, 7));
    rows.push({
      instance_name: "Factory 1",
      tracking_number: `SHP-2024-${pad(i, 5)}`,
      carrier: pick(CARRIERS),
      origin: pick(SHIP_ORIGINS),
      destination: pick(SHIP_DESTINATIONS),
      customer: pick(FORD_DEALERS),
      order_ref: `FD-2024-${pad(randInt(1, 40), 5)}`,
      items_count: randInt(20, 250),
      weight_kg: Math.round(randInt(800, 9500) / 10 * 10) / 10,
      status,
      estimated_arrival: eta,
      actual_arrival:
        status === "DELIVERED" ? isoDateOffset(-randInt(0, 3)) : null,
      delay_reason:
        status === "DELAYED"
          ? pick([
              "Weather hold — winter storm advisory",
              "Carrier mechanical issue — replacement dispatched",
              "Customs inspection — clearance pending",
              "Driver re-routing — port congestion",
            ] as const)
          : "",
      notes: "",
      created_at: isoDaysAgo(ageDays),
    });
  }
  return rows;
}

function genTickets() {
  const rows: Record<string, unknown>[] = [];
  const severities: string[] = [];
  for (let i = 0; i < 2; i++) severities.push("CRITICAL");
  for (let i = 0; i < 5; i++) severities.push("HIGH");
  for (let i = 0; i < 10; i++) severities.push("MEDIUM");
  for (let i = 0; i < 8; i++) severities.push("LOW");
  for (let i = severities.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [severities[i], severities[j]] = [severities[j], severities[i]];
  }

  const subjectCategory = (s: string): string => {
    if (/paint|booth|valve|cycle|hvac|steam|compressed/i.test(s)) return "EQUIPMENT";
    if (/press|robot|conveyor|sensor|hydraulic|grease|emergency/i.test(s)) return "EQUIPMENT";
    if (/quality|spec|certification|inspection|viscosity/i.test(s)) return "QUALITY";
    if (/safety|guard|lockout|tagout|ppe/i.test(s)) return "SAFETY";
    if (/shortage|supplier|fork|bin|stockout|backorder/i.test(s)) return "GENERAL";
    if (/calibration|maintenance|leak/i.test(s)) return "EQUIPMENT";
    return "GENERAL";
  };

  for (let i = 1; i <= 25; i++) {
    const subject =
      TICKET_SUBJECTS[i - 1] ??
      TICKET_SUBJECTS[randInt(0, TICKET_SUBJECTS.length - 1)];
    const severity = severities[i - 1];
    const status = pickWeighted([
      ["OPEN", 40],
      ["IN_PROGRESS", 35],
      ["RESOLVED", 25],
    ] as const);
    const assigned = status === "OPEN" ? "Unassigned" : pick(ENGINEERS);
    const resolution =
      status === "RESOLVED"
        ? `Root cause identified and remediated by ${assigned}. Verified on shift handover.`
        : "";
    const resolvedAt = status === "RESOLVED" ? isoDaysAgo(randInt(0, 6)) : null;
    rows.push({
      instance_name: "Factory 1",
      ticket_number: `TKT-2024-${pad(i, 5)}`,
      title: subject,
      description: `${subject}. Issue reported during shift inspection. Awaiting triage and engineering review per SOP-Q-2024-12.`,
      category: subjectCategory(subject),
      severity,
      status,
      assigned_to: assigned,
      reported_by: pick(ENGINEERS),
      resolution,
      created_at: isoDaysAgo(randInt(0, 21)),
      resolved_at: resolvedAt,
    });
  }
  return rows;
}

function genErpRecords() {
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i <= 20; i++) {
    const title =
      ERP_TITLES[i - 1] ?? ERP_TITLES[randInt(0, ERP_TITLES.length - 1)];
    const status = pickWeighted([
      ["IN_REVIEW", 40],
      ["PENDING_REVIEW", 30],
      ["APPROVED", 25],
      ["OVERDUE", 5],
    ] as const);
    const compliance = pickWeighted([
      ["COMPLIANT", 75],
      ["UNDER_REVIEW", 20],
      ["NON_COMPLIANT", 5],
    ] as const);
    const amount = randInt(50_000, 2_400_000);
    const ageDays = randInt(0, 60);
    rows.push({
      instance_name: "Factory 1",
      record_number: `ERP-2024-${pad(i, 5)}`,
      record_type: pick(RECORD_TYPES),
      title,
      description: `${title}. Approval workflow per Finance SOP. See accompanying documentation in records archive.`,
      department: pick(ERP_DEPARTMENTS),
      responsible_party: pick(RESPONSIBLE_PARTIES),
      status,
      compliance_status: compliance,
      due_date: isoDateOffset(randInt(7, 90)),
      completed_date: status === "APPROVED" ? isoDateOffset(-randInt(0, 14)) : null,
      financial_impact: amount,
      notes: "",
      created_at: isoDaysAgo(ageDays),
    });
  }
  return rows;
}

// ───── seed orchestrator ─────
async function clearTable(
  supabase: SupabaseClient,
  table: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .not("id", "is", null);
  if (error) throw new Error(`clear ${table}: ${error.message}`);
}

async function batchInsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  chunkSize = 500,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw new Error(
        `insert ${table} chunk ${Math.floor(i / chunkSize)}: ${error.message}`,
      );
    }
    inserted += chunk.length;
  }
  return inserted;
}

export interface SeedResult {
  product_inventory: number;
  raw_materials: number;
  orders: number;
  shipments: number;
  support_tickets: number;
  erp_records: number;
  total: number;
}

export async function seedAll(supabase: SupabaseClient): Promise<SeedResult> {
  skuCounter = 1000; // reset between runs
  const datasets: { table: keyof SeedResult; rows: Record<string, unknown>[] }[] = [
    { table: "product_inventory", rows: genProductInventory() },
    { table: "raw_materials", rows: genRawMaterials() },
    { table: "orders", rows: genOrders() },
    { table: "shipments", rows: genShipments() },
    { table: "support_tickets", rows: genTickets() },
    { table: "erp_records", rows: genErpRecords() },
  ];

  const result = {
    product_inventory: 0,
    raw_materials: 0,
    orders: 0,
    shipments: 0,
    support_tickets: 0,
    erp_records: 0,
    total: 0,
  };

  for (const ds of datasets) {
    await clearTable(supabase, ds.table);
    const n = await batchInsert(supabase, ds.table, ds.rows);
    result[ds.table] = n;
    result.total += n;
  }
  return result;
}
