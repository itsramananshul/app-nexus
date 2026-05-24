"use client";

const STORAGE_KEY = "openprem:settings";

export interface AppSettings {
  solflowUrl: string;
  pollIntervalMs: number;
  sessionTraceIntervalMs: number;
  peerTimeoutMs: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  solflowUrl: "",
  pollIntervalMs: 5000,
  sessionTraceIntervalMs: 2000,
  peerTimeoutMs: 5000,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): AppSettings {
  const current = loadSettings();
  const next = { ...current, [key]: value };
  saveSettings(next);
  return next;
}
