'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';

type NodeStatus = {
  name?: string;
  status?: string;
  uptime_pct?: number;
};

const PLANTS = [
  { id: 'dearborn',    name: 'Dearborn, MI',   sub: 'Ford HQ · Rouge Complex', lat: 42.31, lon: -83.18, lx:   0, ly: -38 },
  { id: 'chicago',     name: 'Chicago, IL',     sub: 'Chicago Assembly',        lat: 41.85, lon: -87.75, lx:   0, ly: -38 },
  { id: 'kansas-city', name: 'Kansas City, MO', sub: 'Kansas City Assembly',    lat: 39.10, lon: -94.58, lx:   0, ly: -38 },
  { id: 'louisville',  name: 'Louisville, KY',  sub: 'Louisville Truck Plant',  lat: 38.20, lon: -85.65, lx:   0, ly: -38 },
  { id: 'cleveland',   name: 'Cleveland, OH',   sub: 'Cleveland Engine',        lat: 41.50, lon: -81.70, lx:  42, ly:   0 },
  { id: 'romeo',       name: 'Romeo, MI',       sub: 'Romeo Engine Plant',      lat: 42.80, lon: -83.01, lx: -42, ly: -20 },
  { id: 'flat-rock',   name: 'Flat Rock, MI',   sub: 'Flat Rock Assembly',      lat: 42.10, lon: -83.28, lx: -48, ly:  10 },
  { id: 'nashville',   name: 'Nashville, TN',   sub: 'SE Distribution Hub',     lat: 36.17, lon: -86.78, lx:   0, ly: -38 },
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

export default function FactoryMapInner({
  nodes,
  history: _history,
  showLabels = false,
}: {
  nodes: NodeStatus[];
  history: Map<string, number[]>;
  showLabels?: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const pointSeriesRef = useRef<am5map.MapPointSeries | null>(null);
  const labelSeriesRef = useRef<am5map.MapPointSeries | null>(null);

  // Build the chart EXACTLY ONCE on mount. Recreating it whenever `nodes`
  // changes (every poll tick) is what caused the post-zoom "snap-back": React
  // hands us a new array reference each render, so the effect re-ran,
  // disposed the chart, and rebuilt it at the default rotation/zoom.
  useLayoutEffect(() => {
    const root = am5.Root.new(divRef.current!);

    (root as unknown as { _logo?: { dispose: () => void } })._logo?.dispose();

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoOrthographic(),
        panX: 'rotateX',
        panY: 'rotateY',
        wheelY: 'zoom',
        pinchZoom: true,
        rotationX: 90,
        rotationY: -35,
        animationDuration: 0,
        minZoomLevel: 0.8,
        maxZoomLevel: 4,
      })
    );

    (chart as unknown as { goHome: () => void }).goHome = () => {};

    const containerEl = divRef.current!;
    const onWheel = () => {
      chart.set('homeZoomLevel', chart.get('zoomLevel', 1));
    };
    containerEl.addEventListener('wheel', onWheel, { passive: true });

    chart.chartContainer.set('background', am5.Rectangle.new(root, {
      fill: am5.color(0x000000),
      fillOpacity: 1,
    }));

    const backgroundSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, { exclude: ['AQ'] })
    );
    backgroundSeries.mapPolygons.template.setAll({
      fill: am5.color(0x000000),
      stroke: am5.color(0x000000),
      strokeWidth: 0,
    });

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

    const graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticuleSeries.mapLines.template.setAll({
      stroke: am5.color(0x0a1520),
      strokeWidth: 0.3,
      strokeOpacity: 0.5,
    });

    const lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {
      ...({ lineType: 'curved' } as Record<string, unknown>),
    }));
    lineSeries.mapLines.template.setAll({
      stroke: am5.color(0x38bdf8),
      strokeWidth: 1.5,
      strokeOpacity: 0.5,
      strokeDasharray: [4, 4],
    });
    const arcPairs: [string, string][] = [
      ['dearborn', 'romeo'],
      ['dearborn', 'flat-rock'],
      ['dearborn', 'cleveland'],
      ['dearborn', 'chicago'],
      ['dearborn', 'louisville'],
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

    lineSeries.events.on('datavalidated', () => {
      lineSeries.mapLines.each(line => {
        (line.animate as unknown as (opts: {
          key: string; from: number; to: number; duration: number; loops: number;
        }) => unknown)({
          key: 'strokeDashoffset',
          from: 0,
          to: -20,
          duration: 1000,
          loops: Infinity,
        });
      });
    });

    const sharedTooltip = am5.Tooltip.new(root, {
      getFillFromSprite: false,
      labelText: '[bold #ffffff]{plantName}[/]\n[#64748b]{sub}[/]\n[#94a3b8]Status:[/] [{statusColor}]{nodeStatus}[/]   [#ffffff]{health}%[/]',
    });
    sharedTooltip.set('background', am5.RoundedRectangle.new(root, {
      fill: am5.color(0x0f172a),
      stroke: am5.color(0x334155),
      strokeWidth: 1,
      cornerRadiusTL: 8, cornerRadiusTR: 8,
      cornerRadiusBL: 8, cornerRadiusBR: 8,
    }));

    const pointSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {})
    );
    pointSeries.set('tooltip', sharedTooltip);

    pointSeries.bullets.push((root, _series, dataItem) => {
      const status = (dataItem.dataContext as { nodeStatus?: string } | undefined)?.nodeStatus;
      const color = am5.color(statusColor(status));
      const container = am5.Container.new(root, {});

      const zoomLevel = chart.get('zoomLevel', 1);
      const dotRadius = Math.max(3, Math.min(8, 5 * zoomLevel));
      const ringMin = dotRadius + 3;
      const ringMax = dotRadius + 8;

      const ring = container.children.push(am5.Circle.new(root, {
        radius: ringMax,
        fill: color,
        fillOpacity: 0,
        stroke: color,
        strokeWidth: 1.5,
        strokeOpacity: 0.6,
      }));
      ring.animate({ key: 'radius', from: ringMin, to: ringMax, duration: 1200, loops: Infinity, easing: am5.ease.out(am5.ease.cubic) });
      ring.animate({ key: 'strokeOpacity', from: 0.6, to: 0, duration: 1200, loops: Infinity });

      const dot = container.children.push(am5.Circle.new(root, {
        radius: dotRadius,
        fill: color,
        strokeWidth: 0,
        tooltipText: '[bold #ffffff]{plantName}[/]\n[#64748b]{sub}[/]\nStatus: [{statusColor}]{nodeStatus}[/]   Health: [bold #ffffff]{health}%[/]',
        cursorOverStyle: 'pointer',
      }));
      dot.set('tooltip', sharedTooltip);

      return am5.Bullet.new(root, { sprite: container });
    });

    // Label series — used only when the parent opted in via showLabels
    // (e.g. the expanded modal). In the small inline globe we keep this
    // empty to avoid overlapping city names.
    const labelSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
    if (showLabels) {
      labelSeries.bullets.push((root, _series, dataItem) => {
        const ctx = dataItem.dataContext as { plantName?: string; labelDx?: number; labelDy?: number } | undefined;
        const plantName = ctx?.plantName ?? '';
        const dx = ctx?.labelDx ?? 0;
        const dy = ctx?.labelDy ?? -38;
        const label = am5.Label.new(root, {
          text: plantName,
          fill: am5.color(0xffffff),
          fontSize: 10,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontWeight: '500',
          centerX: am5.p50,
          dx,
          dy,
          background: am5.RoundedRectangle.new(root, {
            fill: am5.color(0x000000),
            fillOpacity: 0.85,
            stroke: am5.color(0x1a1a1a),
            strokeWidth: 1,
            cornerRadiusTL: 3, cornerRadiusTR: 3,
            cornerRadiusBL: 3, cornerRadiusBR: 3,
          }),
          paddingTop: 1, paddingBottom: 1,
          paddingLeft: 5, paddingRight: 5,
          populateText: true,
        });
        return am5.Bullet.new(root, { sprite: label });
      });
    }

    pointSeriesRef.current = pointSeries;
    labelSeriesRef.current = labelSeries;

    return () => {
      containerEl.removeEventListener('wheel', onWheel);
      root.dispose();
      pointSeriesRef.current = null;
      labelSeriesRef.current = null;
    };
  }, []);

  // Push plant data WITHOUT touching the chart. Runs whenever the parent
  // hands us a new `nodes` array — every poll tick — but no zoom/rotation
  // reset because the chart instance is untouched.
  useEffect(() => {
    const pointSeries = pointSeriesRef.current;
    const labelSeries = labelSeriesRef.current;
    if (!pointSeries || !labelSeries) return;

    pointSeries.data.clear();
    labelSeries.data.clear();

    PLANTS.forEach(plant => {
      const node = matchNode(plant.id, nodes);
      const health = node ? Math.round((node.uptime_pct ?? 100)) : 0;
      const nodeStatus = node?.status ?? 'unknown';
      const color = statusColor(nodeStatus);
      const hexColor = '#' + color.toString(16).padStart(6, '0');
      pointSeries.data.push({
        geometry: { type: 'Point' as const, coordinates: [plant.lon, plant.lat] },
        plantName: plant.name,
        sub: plant.sub,
        nodeStatus,
        health,
        statusColor: hexColor,
      });
      labelSeries.data.push({
        geometry: { type: 'Point' as const, coordinates: [plant.lon, plant.lat] },
        plantName: plant.name,
        labelDx: plant.lx,
        labelDy: plant.ly,
      });
    });
  }, [nodes]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: '#000000',
        overflow: 'hidden',
      }}
    >
      <div
        ref={divRef}
        style={{ width: '100%', height: '100%', minHeight: 0 }}
      />
    </div>
  );
}
