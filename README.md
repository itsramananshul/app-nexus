# NEXUS — Enterprise Reality Engine

Cinematic command center for the enterprise demo. Nexus monitors every other
app in real time and can trigger the **Factory 2 Collapse** scenario — a
scripted 5-step cascade that flips every downstream system to a degraded
state by calling each app's REST API directly from the browser.

Nexus has **no database** and **no API routes**. It is a pure client-side
React app that polls each configured node's `/api/status` every 5 seconds
and orchestrates the collapse via direct fetches to the other apps. Every
piece of orchestration you can see in the UI is one or more HTTP calls.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Pure client-side polling and orchestration — no `app/api/*`
- Vercel-ready (no custom port handling)

## Environment

Every app URL is a `NEXT_PUBLIC_*` variable because polling happens in the
browser. Nodes whose URL is empty are silently skipped, so you can run a
partial demo by populating only the apps you care about.

`.env.example` lists all 14 supported variables:

```env
NEXT_PUBLIC_FACTORY1_PRODUCT_URL=
NEXT_PUBLIC_FACTORY1_MATERIALS_URL=
NEXT_PUBLIC_FACTORY2_PRODUCT_URL=
NEXT_PUBLIC_FACTORY2_MATERIALS_URL=
NEXT_PUBLIC_FACTORY3_PRODUCT_URL=
NEXT_PUBLIC_FACTORY3_MATERIALS_URL=
NEXT_PUBLIC_FACTORY4_PRODUCT_URL=
NEXT_PUBLIC_FACTORY4_MATERIALS_URL=
NEXT_PUBLIC_WAREHOUSE1_PRODUCT_URL=
NEXT_PUBLIC_WAREHOUSE2_PRODUCT_URL=
NEXT_PUBLIC_ORDERS_URL=
NEXT_PUBLIC_SHIPMENTS_URL=
NEXT_PUBLIC_SUPPORT_URL=
NEXT_PUBLIC_ERP_URL=
```

For local dev, copy `.env.example` to `.env.local` and fill in the URLs you
want monitored. If you leave them all empty you'll see a setup screen with
the variable names.

For Vercel: set the same variables in the project's Environment Variables
UI (Production and Preview both).

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

## What it does

1. **Polling engine** (`lib/usePoller.ts`)
   - Hits `${url}/api/status` for every configured node every 5 s.
   - 4 s `AbortController` timeout per request.
   - Detects health transitions and fires Sentinel alerts:
     `health_degraded`, `health_recovered`, `unreachable`.
   - On the very first poll (no prior health) no alert is fired — only
     transitions trigger alerts.

2. **Sentinel Watch** — right-side panel
   - Reverse-chronological alert feed, capped at 200 entries.
   - Severity dot (info / warning / critical), event-type chip, location,
     message. Newest row is briefly highlighted.

3. **Neural Watch** — left-side panel
   - Grouped by `location` (Factory 1–4, Warehouse 1–2, Corporate).
   - Each location has a small aggregate health dot.
   - Each node renders as a card with type emoji, location pill, health
     status, primary metric (productCount / materialCount / orderCount /
     shipmentCount / ticketCount / recordCount), secondary metric where
     applicable (flagged / delayed / critical-open / non-compliant), and
     "Xs ago" since last poll.
   - Cards glow green/red and pulse based on health. Cards being targeted
     by the current collapse step briefly shake (`.node-collapse`).

4. **Factory 2 Collapse** — bottom bar (`lib/collapse.ts`)
   - Five orchestrated steps, 3 s gap between each, runs entirely in the
     browser:
     1. **Deplete Factory 2 raw materials** — `GET /api/materials` then
        `POST /api/materials/:id/consume {"quantity":9999}` for every row.
     2. **Flag affected production orders** — `GET /api/orders`, then
        `PATCH /api/orders/:id/status {"status":"FLAGGED"}` for every order
        currently `IN_PRODUCTION` or `PENDING`.
     3. **Cascade delay to outbound shipments** — `GET /api/shipments`,
        then `PATCH /api/shipments/:id/status` with `DELAYED` + a
        `delayReason` for every shipment `IN_TRANSIT` or `PREPARING`.
     4. **Create critical incident ticket** — `POST /api/tickets` (ticket
        number `TKT-NEXUS-001`).
     5. **Record compliance breach in ERP** — `GET /api/records`, then
        `PATCH /api/records/:id/compliance` with `NON_COMPLIANT` for every
        currently-compliant record.
   - Each step catches all errors (network, per-row 4xx/5xx) and **never
     aborts** the sequence. Individual row failures are silent; full-step
     failures land in the Sentinel feed and the step log.
   - If a step's target URL isn't configured, the step is marked errored
     ("URL not configured — skipped") and the sequence continues.
   - The trigger button is disabled while the cascade is running. After
     completion, a "Reset / Run Again" button reactivates the trigger.

## Architecture notes

- No database. No `/api/*` routes. Pure client-side React.
- Every node's URL is normalized (`trim()`, trailing `/` removed) before
  being used.
- `getNodes()` runs at module load — the env vars are baked into the
  client bundle as `process.env.NEXT_PUBLIC_*`, which is exactly how
  Next.js 14 surfaces public env vars to the browser. Restart the dev
  server after editing `.env.local`.
- `usePoller` expects a memoized `nodes` array (we wrap it in `useMemo`
  inside `app/page.tsx`). It returns a `Map<nodeId, NodeStatus>` and
  re-renders whenever a poll finishes.
- The collapse sequence is wholly independent from the polling engine;
  the polling engine just observes the consequences and fires alerts as
  health transitions.

## Deploy to Vercel

1. Push `app-nexus/` to git.
2. Vercel → Add New Project → Root Directory = `app-nexus`.
3. Project Settings → Environment Variables → paste in your real Vercel
   URLs for each populated app. Anything you leave blank is skipped.
4. Deploy. Open the deployment, watch the lights.

## Files

```
app-nexus/
├── .env.example
├── .env.local                       (empty placeholders by default)
├── .eslintrc.json
├── .gitignore
├── README.md
├── next.config.js
├── next-env.d.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── globals.css                  (dark bg + glow / shake animations)
│   ├── layout.tsx
│   └── page.tsx                     (orchestrator)
├── components/
│   ├── CollapseController.tsx       (bottom bar; 5-step sequencer UI)
│   ├── GlobalHealthBar.tsx
│   ├── NeuralWatch.tsx              (left panel; grouped node grid)
│   ├── NodeCard.tsx                 (glowing/shaking node tile)
│   ├── NoNodesView.tsx              (setup screen when no env vars set)
│   ├── SentinelWatch.tsx            (right panel; alert feed)
│   └── TopBar.tsx
└── lib/
    ├── collapse.ts                  (runFactoryCollapse + step impls)
    ├── nodes.ts                     (env-driven node catalog + metric maps)
    ├── types.ts
    └── usePoller.ts                 (custom hook; polling + alerts)
```
