"use client";

const STORAGE_KEY = "openprem:saved-workflows";

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  source: string;
  workflow: string;
  savedAt: string;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function loadSavedWorkflows(): SavedWorkflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedWorkflow[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedWorkflows(list: SavedWorkflow[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addSavedWorkflow(
  list: SavedWorkflow[],
  data: { name: string; description: string; source: string; workflow: string },
): SavedWorkflow[] {
  const entry: SavedWorkflow = {
    id: randomId(),
    name: data.name.trim() || "Untitled",
    description: data.description.trim(),
    source: data.source.trim(),
    workflow: data.workflow,
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...list];
  saveSavedWorkflows(next);
  return next;
}

export function removeSavedWorkflow(
  list: SavedWorkflow[],
  id: string,
): SavedWorkflow[] {
  const next = list.filter((w) => w.id !== id);
  saveSavedWorkflows(next);
  return next;
}
