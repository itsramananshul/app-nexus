"use client";

import { useMemo } from "react";
import { LOCATION_ORDER, type NodeConfig, type NodeLocation } from "@/lib/nodes";
import type { NodeStatus } from "@/lib/types";
import { NodeCard } from "./NodeCard";

interface NeuralWatchProps {
  nodes: NodeConfig[];
  statuses: Map<string, NodeStatus>;
  collapsingNodeIds: Set<string>;
  now: Date;
}

export function NeuralWatch({
  nodes,
  statuses,
  collapsingNodeIds,
  now,
}: NeuralWatchProps) {
  const grouped = useMemo(() => {
    const map = new Map<NodeLocation, NodeConfig[]>();
    for (const n of nodes) {
      const list = map.get(n.location) ?? [];
      list.push(n);
      map.set(n.location, list);
    }
    return LOCATION_ORDER.filter((loc) => map.has(loc)).map((loc) => ({
      location: loc,
      members: map.get(loc) ?? [],
    }));
  }, [nodes]);

  return (
    <section
      aria-label="Neural watch"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-cyan-300/90">
            NEURAL WATCH
          </h2>
          <p className="text-[11px] text-slate-500">
            Live health across every monitored node, grouped by site.
          </p>
        </div>
        <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
          {nodes.length} nodes
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {grouped.map(({ location, members }) => {
          const anyDegraded = members.some(
            (m) => statuses.get(m.id)?.health === "degraded",
          );
          const anyUnreachable = members.some(
            (m) => statuses.get(m.id)?.health === "unreachable",
          );
          const dot = anyDegraded
            ? "bg-rose-500"
            : anyUnreachable
              ? "bg-slate-500"
              : "bg-emerald-400";
          const dotGlow = anyDegraded ? "glow-red" : "";
          return (
            <div key={location} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${dot} ${dotGlow} ${
                    !anyDegraded && !anyUnreachable ? "pulse-live" : ""
                  }`}
                />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {location}
                </h3>
                <span className="text-[10px] text-slate-500">
                  {members.length} nodes
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {members.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    status={statuses.get(node.id)}
                    collapsing={collapsingNodeIds.has(node.id)}
                    now={now}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
