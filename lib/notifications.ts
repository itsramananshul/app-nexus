"use client";

// Web Notifications API — fires desktop notifications when nodes transition
// from healthy to a critical/degraded state. Throttled to one per node per 30s
// and only fires when the tab isn't focused (no spam when the operator is
// actively watching).

const COOLDOWN_MS = 30_000;
const lastFired = new Map<string, number>();

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!supported()) return "unsupported";
  return Notification.permission;
}

/**
 * Ask for permission, but only on first load (when state is "default").
 * Returns the resulting permission state.
 */
export async function requestPermissionOnce(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!supported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Fire a notification for a node. Respects the 30s-per-node cooldown and
 * skips entirely when the tab is focused.
 */
export function notify(nodeId: string, title: string, body: string) {
  if (!supported()) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible")
    return;

  const now = Date.now();
  const last = lastFired.get(nodeId) ?? 0;
  if (now - last < COOLDOWN_MS) return;
  lastFired.set(nodeId, now);

  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: `nexus-${nodeId}`,
    });
  } catch {
    // ignore — some browsers throw on construction
  }
}
