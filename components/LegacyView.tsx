"use client";

import { useEffect, useState } from "react";

// "Before OpenPrem" view — a deliberately ugly grid of 6 fake legacy systems.
// Each panel is a different era of enterprise UI pain (terminal, 90s gray UI,
// Excel grid, error state, helpdesk, batch report). All share the same red
// stale-data banner.

const STALE_BANNER = "⚠ NO REAL-TIME CONNECTION · MANUAL SYNC REQUIRED · LAST UPDATED 4h 23m AGO";

export function LegacyView() {
  return (
    <div className="h-full overflow-auto bg-[#1a1a1a] p-4 scrollbar-thin">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SapMm />
        <OracleWms />
        <LegacyOms />
        <TmsTimeout />
        <RemedyItsm />
        <ErpFinance />
      </div>
      <p className="mx-auto mt-6 max-w-[1600px] text-center text-[10px] uppercase tracking-[0.3em] text-slate-500">
        Six disconnected systems · Phone, email, fax · Reports run overnight ·
        IT ticket to add a column
      </p>
    </div>
  );
}

function PanelChrome({
  title,
  brand,
  brandColor,
  children,
}: {
  title: string;
  brand: string;
  brandColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#5a5a5a] bg-[#c3c3c3] text-[#1a1a1a] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#5a5a5a] bg-gradient-to-b from-[#3b59c2] to-[#1f3a8a] px-2 py-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#c3c3c3]" />
          <p className="font-mono text-[11px] font-bold text-white">{title}</p>
        </div>
        <div className="flex gap-0.5">
          <span className="h-3 w-3 rounded-sm border border-[#1a1a1a] bg-[#c3c3c3] text-[8px] leading-3 text-center text-[#1a1a1a]">_</span>
          <span className="h-3 w-3 rounded-sm border border-[#1a1a1a] bg-[#c3c3c3] text-[8px] leading-3 text-center text-[#1a1a1a]">□</span>
          <span className="h-3 w-3 rounded-sm border border-[#1a1a1a] bg-[#c3c3c3] text-[8px] leading-3 text-center text-[#1a1a1a]">×</span>
        </div>
      </div>
      <p
        className="border-b border-[#9a9a9a] bg-[#b30000] px-2 py-0.5 text-[9px] font-bold tracking-wider text-white"
        title="Stale data — manual sync required"
      >
        {STALE_BANNER}
      </p>
      <div className="px-2 py-1">
        <p className="font-mono text-[9px] text-[#3a3a3a]">{brand}</p>
        <div className="mt-1 h-[1px] bg-[#5a5a5a]" />
      </div>
      <div className="px-2 pb-2" style={{ color: brandColor }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Panel 1 — SAP MM — terminal style
// ─────────────────────────────────────────────────────────────────────────
function SapMm() {
  const [cursor, setCursor] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setCursor((c) => !c), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelChrome
      title="SAP MM — MATERIAL MANAGEMENT (R/3 4.6C)"
      brand="System Sync: 14:33:07 GMT · Manual refresh required"
      brandColor="#0a0a0a"
    >
      <div className="h-56 overflow-auto bg-[#0a0a0a] p-2 font-mono text-[10px] leading-tight text-[#33ff33]">
        <p>SAP R/3 MM02 · CHANGE MATERIAL MASTER</p>
        <p>{">"} TRANSACTION CODE: MM02_______</p>
        <p>{">"} PLANT: FAC02 KENTUCKY TRUCK</p>
        <p className="mt-1.5">MATERIAL  DESCRIPTION______________  STOCK_____UoM</p>
        <p>STC-1101  Steel Coil CR 1.2mm           65,420____KG</p>
        <p>ALU-2034  Aluminum Billet 6061          18,720____KG</p>
        <p>CPR-3015  Copper Wire Harness Base      11,250____M_</p>
        <p>PPR-4082  Polypropylene Resin A         32,180____KG</p>
        <p>GLS-5012  Float Glass Sheet 4mm          4,720____PCS</p>
        <p>EPD-6041  EPDM Rubber Seal Strip        19,840____M_</p>
        <p>PNT-7011  Paint Base Coat                5,925____L_</p>
        <p>PNT-7012  Paint Clear Coat               5,180____L_</p>
        <p>FST-8001  Fastener M8 High-Strength    270,500____PC</p>
        <p>FST-8002  Fastener M10 High-Strength   202,800____PC</p>
        <p>FOM-9011  Polyurethane Foam              9,140____KG</p>
        <p>ADH-0021  Adhesive Structural Epoxy      3,210____KG</p>
        <p className="mt-2 text-[#33aa33]">12 OF 1,247 RECORDS · F8=NEXT_PAGE  F3=BACK  F7=REFRESH</p>
        <p>{">"} INPUT: {cursor ? "█" : " "}</p>
      </div>
    </PanelChrome>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Panel 2 — Oracle WMS — 90s gray UI
// ─────────────────────────────────────────────────────────────────────────
function OracleWms() {
  return (
    <PanelChrome
      title="ORACLE WMS — WAREHOUSE MANAGEMENT (11.5.10)"
      brand="Forms 6i runtime · Java 1.4.2_05 required"
      brandColor="#0a0a0a"
    >
      <div className="h-56 bg-[#c3c3c3] p-1.5 font-sans text-[10px] text-[#1a1a1a]">
        <div className="flex gap-1">
          <FakeButton>File</FakeButton>
          <FakeButton>Edit</FakeButton>
          <FakeButton>View</FakeButton>
          <FakeButton>Tools</FakeButton>
          <FakeButton>Window</FakeButton>
          <FakeButton>Help</FakeButton>
        </div>
        <div className="mt-1 flex gap-0.5 border-y border-[#5a5a5a] bg-[#d4d0c8] py-0.5">
          <SmallBtn>Save</SmallBtn>
          <SmallBtn>Open</SmallBtn>
          <SmallBtn>New</SmallBtn>
          <SmallBtn>Print</SmallBtn>
          <SmallBtn>Query</SmallBtn>
          <SmallBtn>Refresh</SmallBtn>
        </div>
        <p className="mt-2 text-[9px] font-bold">INVENTORY ON HAND · WAREHOUSE 1 (DETROIT)</p>
        <table className="mt-1 w-full border-collapse border border-[#5a5a5a] bg-white font-mono text-[9px]">
          <thead>
            <tr className="bg-[#3b59c2] text-white">
              <th className="border border-[#5a5a5a] px-1 text-left">SKU</th>
              <th className="border border-[#5a5a5a] px-1 text-left">DESC</th>
              <th className="border border-[#5a5a5a] px-1 text-right">QTY</th>
              <th className="border border-[#5a5a5a] px-1 text-right">RSV</th>
            </tr>
          </thead>
          <tbody>
            <WmsRow sku="FMC-1043" desc="Door Asm LH" qty="6,420" rsv="240" />
            <WmsRow sku="FMC-1044" desc="Door Asm RH" qty="6,380" rsv="225" />
            <WmsRow sku="FMC-1045" desc="Hood Asm" qty="4,810" rsv="110" />
            <WmsRow sku="FMC-1046" desc="Inst Panel" qty="3,940" rsv="190" />
            <WmsRow sku="FMC-1047" desc="Bumper FR" qty="5,780" rsv="180" />
            <WmsRow sku="FMC-1048" desc="Bumper RR" qty="5,620" rsv="170" />
            <WmsRow sku="FMC-1049" desc="Fender LH" qty="4,210" rsv="95" />
          </tbody>
        </table>
        <p className="mt-1.5 text-[9px] text-[#9a0000]">
          7 of 25 records · Last query at 10:00 AM (manual)
        </p>
      </div>
    </PanelChrome>
  );
}

function FakeButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="border border-[#5a5a5a] bg-[#d4d0c8] px-1.5 py-0.5 text-[9px] hover:bg-[#bfbfbf]"
    >
      <u>{String(children).slice(0, 1)}</u>
      {String(children).slice(1)}
    </button>
  );
}

function SmallBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="border border-[#5a5a5a] bg-[#d4d0c8] px-1.5 py-0 text-[8px] hover:bg-[#bfbfbf]"
    >
      {children}
    </button>
  );
}

function WmsRow({
  sku,
  desc,
  qty,
  rsv,
}: {
  sku: string;
  desc: string;
  qty: string;
  rsv: string;
}) {
  return (
    <tr className="even:bg-[#f4f4f4]">
      <td className="border border-[#5a5a5a] px-1">{sku}</td>
      <td className="border border-[#5a5a5a] px-1">{desc}</td>
      <td className="border border-[#5a5a5a] px-1 text-right">{qty}</td>
      <td className="border border-[#5a5a5a] px-1 text-right">{rsv}</td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Panel 3 — Legacy OMS — Excel-looking grid
// ─────────────────────────────────────────────────────────────────────────
function LegacyOms() {
  const cells = [
    ["A1", "FD-2024-00041", "Ford of Detroit", "PENDING", "240", "$120,400"],
    ["A2", "FD-2024-00042", "Galpin Ford", "PROCESSING", "180", "$95,200"],
    ["A3", "FD-2024-00043", "Carman Ford", "PENDING", "320", "$176,800"],
    ["A4", "FD-2024-00044", "AutoNation Fort Worth", "COMPLETED", "150", "$84,500"],
    ["A5", "FD-2024-00045", "Fairfax Ford Virginia", "PROCESSING", "210", "$108,300"],
    ["A6", "FD-2024-00046", "Brandon Ford Tampa", "PENDING", "275", "$148,600"],
    ["A7", "FD-2024-00047", "Westgate Ford", "PROCESSING", "190", "$98,800"],
    ["A8", "FD-2024-00048", "Carriage Ford Indiana", "PENDING", "240", "$125,300"],
  ];
  return (
    <PanelChrome
      title="LEGACY OMS — ORDER MANAGEMENT (DOS PORT)"
      brand="oms_export_20241128_1033.xls (last save)"
      brandColor="#0a0a0a"
    >
      <div className="h-56 bg-[#f9f9f9] font-mono text-[9px] text-[#1a1a1a]">
        <div className="flex border-b border-[#9a9a9a] bg-[#217346] px-2 py-0.5 text-white">
          <span className="font-bold">X</span>
          <span className="ml-2 italic">Microsoft Excel — orders.xls [Read-Only]</span>
        </div>
        <div className="flex gap-1 border-b border-[#9a9a9a] bg-[#e1e1e1] px-1 py-0.5 text-[8px]">
          <span>File</span><span>Edit</span><span>View</span><span>Insert</span>
          <span>Format</span><span>Tools</span><span>Data</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#dfdfdf] text-[8px]">
              <th className="w-6 border border-[#9a9a9a]" />
              <th className="border border-[#9a9a9a]">A</th>
              <th className="border border-[#9a9a9a]">B</th>
              <th className="border border-[#9a9a9a]">C</th>
              <th className="border border-[#9a9a9a]">D</th>
              <th className="border border-[#9a9a9a]">E</th>
              <th className="border border-[#9a9a9a]">F</th>
            </tr>
            <tr className="bg-[#fffec0] font-bold text-[8.5px]">
              <th className="border border-[#9a9a9a]">1</th>
              <th className="border border-[#9a9a9a]">ROW</th>
              <th className="border border-[#9a9a9a]">ORDER#</th>
              <th className="border border-[#9a9a9a]">DEALER</th>
              <th className="border border-[#9a9a9a]">STATUS</th>
              <th className="border border-[#9a9a9a]">QTY</th>
              <th className="border border-[#9a9a9a]">VALUE</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((row, i) => (
              <tr key={i} className="text-[8.5px]">
                <td className="border border-[#9a9a9a] bg-[#dfdfdf] px-0.5 text-center">
                  {i + 2}
                </td>
                {row.map((c, j) => (
                  <td
                    key={j}
                    className={`border border-[#9a9a9a] px-1 ${
                      c === "PENDING"
                        ? "bg-[#fff4b8]"
                        : c === "PROCESSING"
                          ? "bg-[#d4e4ff]"
                          : c === "COMPLETED"
                            ? "bg-[#c8e6c0]"
                            : ""
                    }`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#9a9a9a] bg-[#e1e1e1] px-2 py-0.5 text-[8px]">
          Sheet 1 of 12 · Ready · CAPS NUM
        </p>
      </div>
    </PanelChrome>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Panel 4 — TMS — Connection timeout error
// ─────────────────────────────────────────────────────────────────────────
function TmsTimeout() {
  return (
    <PanelChrome
      title="TMS — TRANSPORTATION MGMT (TRANSCORE 8.2.1)"
      brand="Connection: Carrier API · Timeout 60s"
      brandColor="#0a0a0a"
    >
      <div className="flex h-56 flex-col items-center justify-center bg-[#f0f0f0] p-4 text-[#1a1a1a]">
        <div className="w-full max-w-sm rounded-sm border-2 border-[#a00000] bg-white p-4 shadow-xl">
          <div className="flex items-start gap-2">
            <span className="text-2xl">⚠</span>
            <div>
              <p className="font-bold text-[11px] text-[#a00000]">
                Error 504: Connection Timeout
              </p>
              <p className="mt-1 text-[10px]">
                Unable to retrieve shipment status from carrier endpoint.
              </p>
              <p className="mt-2 font-mono text-[8.5px] text-[#5a5a5a]">
                ERR_CARRIER_API_TIMEOUT (0x80004005)
              </p>
              <p className="mt-2 text-[10px]">
                Last successful sync: <strong>04:18:22 GMT</strong>
              </p>
              <p className="mt-1 text-[10px]">
                Retry attempts: <strong>14</strong> · Next retry: <strong>00:04:12</strong>
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-1">
            <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-2 py-0.5 text-[9px] hover:bg-[#bfbfbf]">
              Retry
            </button>
            <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-2 py-0.5 text-[9px] hover:bg-[#bfbfbf]">
              Cancel
            </button>
            <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-2 py-0.5 text-[9px] hover:bg-[#bfbfbf]">
              Help
            </button>
          </div>
        </div>
        <p className="mt-3 text-[9px] text-[#5a5a5a]">
          Contact IT helpdesk x4127 if issue persists
        </p>
      </div>
    </PanelChrome>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Panel 5 — Remedy ITSM — old helpdesk
// ─────────────────────────────────────────────────────────────────────────
function RemedyItsm() {
  return (
    <PanelChrome
      title="BMC REMEDY ITSM — INCIDENT MANAGEMENT (7.6.04)"
      brand="ARSystem · Logged in: WS\\j.thompson · 11/28 14:21"
      brandColor="#0a0a0a"
    >
      <div className="h-56 bg-[#dde6f0] p-2 font-sans text-[10px] text-[#1a1a1a]">
        <div className="border border-[#5a5a5a] bg-white p-2">
          <p className="text-[10px] font-bold text-[#0a4a7a]">Incident Query Results</p>
          <table className="mt-1 w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-[#0a4a7a] text-white">
                <th className="border border-[#5a5a5a] px-1 text-left">INC#</th>
                <th className="border border-[#5a5a5a] px-1 text-left">Summary</th>
                <th className="border border-[#5a5a5a] px-1">Sev</th>
                <th className="border border-[#5a5a5a] px-1">Status</th>
              </tr>
            </thead>
            <tbody>
              <RemedyRow inc="INC-009381" sum="Paint booth temp variance" sev="3" status="OPEN" />
              <RemedyRow inc="INC-009382" sum="Press calibration drift #7" sev="2" status="WIP" />
              <RemedyRow inc="INC-009383" sum="Conveyor belt fault line 2" sev="2" status="OPEN" />
              <RemedyRow inc="INC-009384" sum="Welding station 3 error" sev="3" status="OPEN" />
              <RemedyRow inc="INC-009385" sum="Material cert missing 8847" sev="1" status="ESC" />
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[9px] text-[#5a5a5a]">
          Filter: Severity ≤ 3 · Status: Open or WIP · Sort: Date desc
        </p>
        <p className="mt-0.5 text-[9px] text-[#9a0000]">
          5 of 47 incidents · DB cache expired — click Refresh to reload
        </p>
        <div className="mt-2 flex gap-1">
          <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-1.5 py-0.5 text-[9px]">
            New
          </button>
          <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-1.5 py-0.5 text-[9px]">
            Modify
          </button>
          <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-1.5 py-0.5 text-[9px]">
            Search
          </button>
          <button className="border border-[#5a5a5a] bg-[#d4d0c8] px-1.5 py-0.5 text-[9px]">
            Refresh
          </button>
        </div>
      </div>
    </PanelChrome>
  );
}

function RemedyRow({
  inc,
  sum,
  sev,
  status,
}: {
  inc: string;
  sum: string;
  sev: string;
  status: string;
}) {
  const sevColor =
    sev === "1" ? "bg-[#ffd4d4]" : sev === "2" ? "bg-[#fff4b8]" : "bg-white";
  return (
    <tr>
      <td className="border border-[#5a5a5a] px-1 font-mono">{inc}</td>
      <td className="border border-[#5a5a5a] px-1">{sum}</td>
      <td className={`border border-[#5a5a5a] text-center ${sevColor}`}>{sev}</td>
      <td className="border border-[#5a5a5a] text-center">{status}</td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Panel 6 — ERP Finance — batch report
// ─────────────────────────────────────────────────────────────────────────
function ErpFinance() {
  const [eta, setEta] = useState(47);
  const [progress, setProgress] = useState(38);
  useEffect(() => {
    const id = setInterval(() => {
      setEta((e) => Math.max(1, e - (Math.random() > 0.7 ? 1 : 0)));
      setProgress((p) => Math.min(100, p + Math.random() * 0.2));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelChrome
      title="JD EDWARDS — ERP FINANCE (9.1) "
      brand="Job 478921 · Batch · Submitted 13:14 GMT"
      brandColor="#0a0a0a"
    >
      <div className="h-56 bg-[#0a3a8a] p-3 font-mono text-[10px] text-white">
        <p className="text-[10px] font-bold">REPORT R0905101 — GENERAL LEDGER · Q4 FY24</p>
        <p className="text-[9px] text-[#a0c0ff]">
          User: J.OLSEN · Environment: PRD9 · Server: erp-prd-01
        </p>

        <div className="mt-4 rounded-sm border border-[#a0c0ff] bg-[#0a2a6a] p-3">
          <p className="text-[10px]">REPORT GENERATION IN PROGRESS…</p>
          <p className="mt-1 text-[9px] text-[#a0c0ff]">
            Aggregating ledger entries · 12 of 31 cost centers processed
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-sm border border-[#a0c0ff] bg-[#020a2a]">
            <div
              className="h-full bg-gradient-to-r from-[#4a8aef] to-[#80a8ff] transition-all"
              style={{ width: `${progress.toFixed(1)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[9px]">
            Progress: <span className="font-bold">{progress.toFixed(1)}%</span>{" "}
            · ETA <span className="font-bold text-[#fff4b8]">{eta} minutes</span> remaining
          </p>
        </div>

        <p className="mt-3 text-[9px] text-[#a0c0ff]">
          Note: report will be emailed when complete · Do not close window
        </p>
        <p className="mt-1 text-[9px] text-[#ff8080]">
          Real-time view: unavailable · Re-run nightly batch for current data
        </p>
      </div>
    </PanelChrome>
  );
}
