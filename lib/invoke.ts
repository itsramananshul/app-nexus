const INVOKE_TIMEOUT_MS = 4000;

// Call a capability through a local OpenPrem controller.
// Controller endpoint: POST /invoke  { capability, params: { ...fields } }
export async function invoke<T = unknown>(
  controllerUrl: string,
  capability: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), INVOKE_TIMEOUT_MS);
  try {
    const res = await fetch(`${controllerUrl}/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, params }),
      cache: "no-store",
      signal: abort.signal,
    });
    const body = (await res.json()) as { ok: boolean; result?: T; error?: string };
    if (!body.ok) throw new Error(body.error ?? "invoke failed");
    return body.result as T;
  } finally {
    clearTimeout(timer);
  }
}

// Call a capability directly on a Vercel app's /api/openprem adapter.
// App endpoint: POST /api/openprem  { capability, ...params }  (flat body)
export async function invokeApp<T = unknown>(
  appUrl: string,
  capability: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), INVOKE_TIMEOUT_MS);
  try {
    const res = await fetch(`${appUrl}/api/openprem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, ...params }),
      cache: "no-store",
      signal: abort.signal,
    });
    const body = (await res.json()) as { ok: boolean; result?: T; error?: string };
    if (!body.ok) throw new Error(body.error ?? "invokeApp failed");
    return body.result as T;
  } finally {
    clearTimeout(timer);
  }
}
