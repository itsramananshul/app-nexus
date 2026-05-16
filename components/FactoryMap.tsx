'use client';
import dynamic from 'next/dynamic';

export type FactoryMapNode = {
  name?: string;
  status?: string;
  uptime_pct?: number;
};

const FactoryMapInner = dynamic(() => import('./FactoryMapInner'), { ssr: false });

export default function FactoryMap({
  nodes,
  history,
  showLabels = false,
}: {
  nodes: FactoryMapNode[];
  history: Map<string, number[]>;
  // When true, the globe renders persistent city labels (used in the
  // expanded modal). False (default) keeps the small inline globe clean —
  // tooltips on hover only.
  showLabels?: boolean;
}) {
  return <FactoryMapInner nodes={nodes} history={history} showLabels={showLabels} />;
}
