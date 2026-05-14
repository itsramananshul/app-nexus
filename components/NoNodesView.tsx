"use client";

import { ENV_VAR_NAMES } from "@/lib/nodes";

export function NoNodesView() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="glow-cyan text-3xl font-bold tracking-[0.18em] text-cyan-300">
            NEXUS
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
            Enterprise Reality Engine · Command Center
          </p>
        </div>

        <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-inset ring-amber-500/30">
          <p className="font-semibold">No nodes configured.</p>
          <p className="mt-1 text-amber-200/80">
            Nexus reads URLs from{" "}
            <code className="font-mono text-amber-100">NEXT_PUBLIC_*_URL</code>{" "}
            environment variables. Populate one or more of the variables below
            (in <code className="font-mono">.env.local</code> for local dev, or
            in Vercel project settings for a deployment) and restart the dev
            server. Any node whose URL is empty is silently skipped.
          </p>
        </div>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          Expected environment variables
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-1 font-mono text-xs text-slate-300 sm:grid-cols-2">
          {ENV_VAR_NAMES.map((name) => (
            <li
              key={name}
              className="rounded-sm bg-slate-800/60 px-2 py-1 ring-1 ring-inset ring-slate-700/50"
            >
              {name}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[11px] text-slate-500">
          Each URL should be the base URL of one of the demo apps (e.g.{" "}
          <span className="font-mono">https://&hellip;.vercel.app</span>). Nexus
          will poll its <span className="font-mono">/api/status</span>{" "}
          endpoint every 5 seconds.
        </p>
      </div>
    </main>
  );
}
