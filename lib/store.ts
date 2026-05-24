"use client";

import type { ControllerEntry, ControllerRole } from "./controller-types";

const STORAGE_KEY = "openprem:controllers";
const MIGRATION_KEY = "openprem:controllers:migration";
const CURRENT_MIGRATION = 1; // bump to re-run port-migration on existing entries

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Rewrite stale ports introduced by older seeds (e.g., router 8080→8090,
// factory-1 8081→8091). Preserves any controllers the user added themselves.
function migrateStalePorts(list: ControllerEntry[]): ControllerEntry[] {
  let changed = false;
  const next = list.map((c) => {
    if (c.role === "router" && c.url === "http://localhost:8080") {
      changed = true;
      return { ...c, url: "http://localhost:8090" };
    }
    if (c.name === "Factory 1" && c.url === "http://localhost:8081") {
      changed = true;
      return { ...c, url: "http://localhost:8091" };
    }
    return c;
  });
  if (changed) saveControllers(next);
  return next;
}

export function loadControllers(): ControllerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ControllerEntry[]) : [];
    const ver = Number(localStorage.getItem(MIGRATION_KEY) ?? "0");
    if (ver < CURRENT_MIGRATION) {
      const migrated = migrateStalePorts(parsed);
      localStorage.setItem(MIGRATION_KEY, String(CURRENT_MIGRATION));
      return migrated;
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveControllers(list: ControllerEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addController(
  list: ControllerEntry[],
  name: string,
  url: string,
  role: ControllerRole,
): ControllerEntry[] {
  const entry: ControllerEntry = {
    id: randomId(),
    name: name.trim(),
    url: url.trim().replace(/\/$/, ""),
    role,
    addedAt: new Date().toISOString(),
  };
  const next = [...list, entry];
  saveControllers(next);
  return next;
}

export function removeController(
  list: ControllerEntry[],
  id: string,
): ControllerEntry[] {
  const next = list.filter((c) => c.id !== id);
  saveControllers(next);
  return next;
}

export function updateController(
  list: ControllerEntry[],
  id: string,
  patch: Partial<Pick<ControllerEntry, "name" | "url" | "role">>,
): ControllerEntry[] {
  const next = list.map((c) =>
    c.id === id ? { ...c, ...patch, url: (patch.url ?? c.url).replace(/\/$/, "") } : c,
  );
  saveControllers(next);
  return next;
}

// ── Seed defaults ──────────────────────────────────────────────────────────
// Call once on first load to pre-populate with the standard local network.
export function seedDefaults(list: ControllerEntry[]): ControllerEntry[] {
  if (list.length > 0) return list;
  const defaults: Array<Omit<ControllerEntry, "id" | "addedAt">> = [
    { name: "Router",      url: "http://localhost:8090", role: "router" },
    { name: "Factory 1",   url: "http://localhost:8091", role: "controller" },
    { name: "Factory 2",   url: "http://localhost:8082", role: "controller" },
    { name: "Factory 3",   url: "http://localhost:8083", role: "controller" },
    { name: "Factory 4",   url: "http://localhost:8084", role: "controller" },
    { name: "Warehouse 1", url: "http://localhost:8085", role: "controller" },
    { name: "Warehouse 2", url: "http://localhost:8086", role: "controller" },
    { name: "Corporate",   url: "http://localhost:8087", role: "controller" },
  ];
  const seeded = defaults.map((d) => ({
    ...d,
    id: randomId(),
    addedAt: new Date().toISOString(),
  }));
  saveControllers(seeded);
  return seeded;
}
