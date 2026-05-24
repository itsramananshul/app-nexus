// Shared formatting + URL helpers.

// The controller emits unix-second timestamps; some pages assumed ms.
// Normalize either to ms so date math is correct.
export function tsToMs(n: number): number {
  return n > 1e12 ? n : n * 1000;
}

export function msAgo(ts: number): string {
  const ms = tsToMs(ts);
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function elapsed(startTs: number): string {
  const startMs = tsToMs(startTs);
  const total = Math.max(0, Date.now() - startMs);
  const s = Math.floor(total / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Controllers bind to 0.0.0.0; browsers cannot fetch that host. Rewrite to
// localhost when contacting from the UI (display + probes).
export function clientUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "0.0.0.0") {
      u.hostname = "localhost";
      return u.toString().replace(/\/$/, "");
    }
    return url;
  } catch {
    return url.replace("0.0.0.0", "localhost");
  }
}

// Pretty-format a summary value for the router summary cards.
// Returns null when the value should be hidden (non-scalar, or already
// surfaced elsewhere in the UI).
export function formatSummaryValue(key: string, value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object") return null;
  if (key.endsWith("_time") || key === "current_time") {
    const ms = tsToMs(Number(value));
    if (!Number.isNaN(ms)) return new Date(ms).toLocaleTimeString();
  }
  if (key.endsWith("_secs")) {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      if (n < 60) return `${n}s`;
      if (n < 3600) return `${Math.round(n / 60)}m`;
      return `${Math.round(n / 3600)}h`;
    }
  }
  return String(value);
}
