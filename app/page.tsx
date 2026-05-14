"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CollapseController } from "@/components/CollapseController";
import { NeuralWatch } from "@/components/NeuralWatch";
import { NoNodesView } from "@/components/NoNodesView";
import { SentinelWatch } from "@/components/SentinelWatch";
import { TopBar } from "@/components/TopBar";
import { getNodes } from "@/lib/nodes";
import type {
  CollapseApiKeys,
  CollapseUrls,
  SentinelAlert,
} from "@/lib/types";
import { usePoller } from "@/lib/usePoller";

const ALERT_MAX = 200;

export default function Page() {
  const nodes = useMemo(() => getNodes(), []);
  const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
  const [collapsingNodeId, setCollapsingNodeId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const handleAlert = useCallback((alert: SentinelAlert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, ALERT_MAX));
  }, []);

  const statuses = usePoller(nodes, handleAlert);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const lastPollAt = useMemo<Date | null>(() => {
    let max: Date | null = null;
    for (const s of statuses.values()) {
      if (!max || s.lastChecked.getTime() > max.getTime()) {
        max = s.lastChecked;
      }
    }
    return max;
  }, [statuses]);

  const collapseUrls = useMemo<CollapseUrls>(() => {
    function find(id: string): string | null {
      const n = nodes.find((x) => x.id === id);
      return n ? n.url : null;
    }
    return {
      materialsF2: find("f2-materials"),
      orders: find("corp-orders"),
      shipments: find("corp-shipments"),
      support: find("corp-support"),
      erp: find("corp-erp"),
    };
  }, [nodes]);

  const collapseApiKeys = useMemo<CollapseApiKeys>(() => {
    function findKey(id: string): string | null {
      const n = nodes.find((x) => x.id === id);
      return n ? n.apiKey : null;
    }
    return {
      materialsF2: findKey("f2-materials"),
      orders: findKey("corp-orders"),
      shipments: findKey("corp-shipments"),
      support: findKey("corp-support"),
      erp: findKey("corp-erp"),
    };
  }, [nodes]);

  const collapsingNodeIds = useMemo(() => {
    return new Set(collapsingNodeId ? [collapsingNodeId] : []);
  }, [collapsingNodeId]);

  if (nodes.length === 0) {
    return <NoNodesView />;
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        totalNodes={nodes.length}
        statuses={statuses}
        lastPollAt={lastPollAt}
      />

      <main className="flex-1 overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[62fr_38fr]">
          <NeuralWatch
            nodes={nodes}
            statuses={statuses}
            collapsingNodeIds={collapsingNodeIds}
            now={now}
          />
          <SentinelWatch alerts={alerts} />
        </div>
      </main>

      <CollapseController
        urls={collapseUrls}
        apiKeys={collapseApiKeys}
        onAlert={handleAlert}
        onCollapsingNodeChange={setCollapsingNodeId}
      />
    </div>
  );
}
