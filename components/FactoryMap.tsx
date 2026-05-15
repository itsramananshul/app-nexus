'use client';
import dynamic from 'next/dynamic';

export type FactoryMapNode = {
  name?: string;
  status?: string;
  uptime_pct?: number;
};

const FactoryMapInner = dynamic(() => import('./FactoryMapInner'), { ssr: false });

export default function FactoryMap({ nodes, history }: { nodes: FactoryMapNode[]; history: Map<string, number[]> }) {
  return <FactoryMapInner nodes={nodes} history={history} />;
}
