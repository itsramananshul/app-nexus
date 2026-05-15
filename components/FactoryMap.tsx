'use client';
import dynamic from 'next/dynamic';
import type { NodeStatus } from '@/lib/types';

const FactoryMapInner = dynamic(() => import('./FactoryMapInner'), { ssr: false });

export default function FactoryMap({ nodes, history }: { nodes: NodeStatus[]; history: Map<string, number[]> }) {
  return <FactoryMapInner nodes={nodes} history={history} />;
}
