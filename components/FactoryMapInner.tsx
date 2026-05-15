'use client';
import { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';
import type { NodeStatus } from '@/lib/types';

const PLANTS = [
  { id: 'dearborn',    name: 'Dearborn, MI',   sub: 'Ford HQ · Rouge Complex', lat: 42.31, lon: -83.18 },
  { id: 'chicago',     name: 'Chicago, IL',     sub: 'Chicago Assembly',        lat: 41.85, lon: -87.75 },
  { id: 'kansas-city', name: 'Kansas City, MO', sub: 'Kansas City Assembly',    lat: 39.10, lon: -94.58 },
  { id: 'louisville',  name: 'Louisville, KY',  sub: 'Louisville Truck Plant',  lat: 38.20, lon: -85.65 },
  { id: 'cleveland',   name: 'Cleveland, OH',   sub: 'Cleveland Engine',        lat: 41.50, lon: -81.70 },
  { id: 'romeo',       name: 'Romeo, MI',       sub: 'Romeo Engine Plant',      lat: 42.80, lon: -83.01 },
  { id: 'flat-rock',   name: 'Flat Rock, MI',   sub: 'Flat Rock Assembly',      lat: 42.10, lon: -83.28 },
  { id: 'nashville',   name: 'Nashville, TN',   sub: 'SE Distribution Hub',     lat: 36.17, lon: -86.78 },
];

function statusColor(status: string | undefined): number {
  if (!status) return 0x475569;
  if (status === 'healthy') return 0x22d3ee;
  if (status === 'degraded') return 0xf59e0b;
  return 0xef4444;
}

function matchNode(plantId: string, nodes: NodeStatus[]): NodeStatus | undefined {
  return nodes.find(n => n.name?.toLowerCase().includes(plantId) || plantId.includes(n.name?.toLowerCase().split(' ')[0] ?? '____'));
}

export default function FactoryMapInner({ nodes, history }: { nodes: NodeStatus[]; history: Map<string, number[]> }) {
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = am5.Root.new(divRef.current!);

    // Remove amCharts logo
    (root as unknown as { _logo?: { dispose: () => void } })._logo?.dispose();

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoOrthographic(),
        panX: 'rotateX',
        panY: 'rotateY',
        wheelY: 'zoom',
        minZoomLevel: 0.8,
        maxZoomLevel: 4,
      })
    );

    // Ocean background — pure black
    chart.chartContainer.set('background', am5.Rectangle.new(root, {
      fill: am5.color(0x000000),
      fillOpacity: 1,
    }));

    // Globe sphere (ocean fill)
    const backgroundSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, { exclude: ['AQ'] })
    );
    backgroundSeries.mapPolygons.template.setAll({
      fill: am5.color(0x000000),
      stroke: am5.color(0x000000),
      strokeWidth: 0,
    });

    // Country fills — very dark, barely visible
    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
        exclude: ['AQ'],
      })
    );
    polygonSeries.mapPolygons.template.setAll({
      fill: am5.color(0x0d1117),
      stroke: am5.color(0x1e3a4a),
      strokeWidth: 0.5,
      fillOpacity: 1,
    });
    polygonSeries.mapPolygons.template.states.create('hover', {
      fill: am5.color(0x162032),
    });

    // Graticule lines (longitude/latitude grid) — very subtle
    const graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticuleSeries.mapLines.template.setAll({
      stroke: am5.color(0x0a1520),
      strokeWidth: 0.3,
      strokeOpacity: 0.5,
    });

    // Supply arc lines: Dearborn ↔ Romeo, Dearborn ↔ Flat Rock, Dearborn ↔ Cleveland, Dearborn ↔ Chicago
    const lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    lineSeries.mapLines.template.setAll({
      stroke: am5.color(0x38bdf8),
      strokeWidth: 1,
      strokeOpacity: 0.35,
      strokeDasharray: [3, 5],
    });
    const arcPairs: [string, string][] = [
      ['dearborn', 'romeo'],
      ['dearborn', 'flat-rock'],
      ['dearborn', 'cleveland'],
      ['dearborn', 'chicago'],
    ];
    arcPairs.forEach(([a, b]) => {
      const pa = PLANTS.find(p => p.id === a)!;
      const pb = PLANTS.find(p => p.id === b)!;
      lineSeries.data.push({
        geometry: {
          type: 'LineString',
          coordinates: [[pa.lon, pa.lat], [pb.lon, pb.lat]],
        },
      });
    });

    // Point markers
    const pointSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {})
    );

    pointSeries.bullets.push((root, _series, dataItem: am5.DataItem<{ nodeStatus?: string }>) => {
      const status = (dataItem.dataContext as { nodeStatus?: string } | undefined)?.nodeStatus;
      const color = am5.color(statusColor(status));
      const container = am5.Container.new(root, {});

      // Outer pulsing ring
      const ring = container.children.push(am5.Circle.new(root, {
        radius: 10,
        fill: color,
        fillOpacity: 0,
        stroke: color,
        strokeWidth: 1.5,
        strokeOpacity: 0.6,
      }));
      ring.animate({ key: 'radius', from: 8, to: 14, duration: 1200, loops: Infinity, easing: am5.ease.out(am5.ease.cubic) });
      ring.animate({ key: 'strokeOpacity', from: 0.6, to: 0, duration: 1200, loops: Infinity });

      // Inner solid dot
      container.children.push(am5.Circle.new(root, {
        radius: 5,
        fill: color,
        strokeWidth: 0,
        tooltipText: '[bold]{plantName}[/]\n[#94a3b8]{sub}[/]\n[{statusColor}]{nodeStatus}[/]  {health}%',
      }));

      return am5.Bullet.new(root, { sprite: container });
    });

    // Tooltip styling
    pointSeries.set('tooltip', am5.Tooltip.new(root, {
      getFillFromSprite: false,
      labelText: '[bold #ffffff]{plantName}[/]\n[#64748b]{sub}[/]\n[#94a3b8]Status:[/] [{statusColor}]{nodeStatus}[/]   [#ffffff]{health}%[/]',
    }));
    pointSeries.get('tooltip')!.set('background', am5.RoundedRectangle.new(root, {
      fill: am5.color(0x0f172a),
      stroke: am5.color(0x334155),
      strokeWidth: 1,
      cornerRadiusTL: 8, cornerRadiusTR: 8,
      cornerRadiusBL: 8, cornerRadiusBR: 8,
    }));

    // Push plant data
    PLANTS.forEach(plant => {
      const node = matchNode(plant.id, nodes);
      const health = node ? Math.round((node.uptime_pct ?? 100)) : 0;
      const nodeStatus = node?.status ?? 'unknown';
      const color = statusColor(nodeStatus);
      const hexColor = '#' + color.toString(16).padStart(6, '0');
      pointSeries.data.push({
        geometry: { type: 'Point', coordinates: [plant.lon, plant.lat] },
        plantName: plant.name,
        sub: plant.sub,
        nodeStatus,
        health,
        statusColor: hexColor,
      });
    });

    // Auto-rotate — stop on user interaction, resume after 3s
    let resumeTimer: ReturnType<typeof setTimeout>;
    const animation = chart.animate({
      key: 'rotationX',
      from: chart.get('rotationX', 0),
      to: chart.get('rotationX', 0) + 360,
      duration: 40000,
      loops: Infinity,
    });
    chart.events.on('pointerdown', () => {
      animation?.stop();
      clearTimeout(resumeTimer);
    });
    chart.events.on('pointerup', () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        chart.animate({
          key: 'rotationX',
          from: chart.get('rotationX', 0),
          to: chart.get('rotationX', 0) + 360,
          duration: 40000,
          loops: Infinity,
        });
      }, 3000);
    });

    return () => {
      clearTimeout(resumeTimer);
      root.dispose();
    };
  }, [nodes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000' }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 10 }}
           className="text-xs tracking-widest text-cyan-400/60 font-mono uppercase">
        Ford North America — Live Operations
      </div>

      {/* Globe */}
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 16, right: 20, zIndex: 10 }}
           className="flex flex-col gap-1.5">
        {[
          { color: '#22d3ee', label: 'Healthy' },
          { color: '#f59e0b', label: 'Degraded' },
          { color: '#ef4444', label: 'Critical' },
          { color: '#475569', label: 'No Signal' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
