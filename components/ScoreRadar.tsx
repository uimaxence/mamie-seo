'use client';

import type { DimensionScore } from '@/lib/types';

interface ScoreRadarProps {
  scores: Record<string, DimensionScore>;
}

// Simple radar chart using SVG polygons
export default function ScoreRadar({ scores }: ScoreRadarProps) {
  const entries = Object.entries(scores);
  const count = entries.length;
  const cx = 140;
  const cy = 140;
  const maxR = 110;

  const angle = (i: number) => (Math.PI * 2 * i) / count - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  // Grid rings
  const rings = [25, 50, 75, 100];
  const gridPaths = rings.map((pct) => {
    const r = (pct / 100) * maxR;
    const points = entries.map((_, i) => point(i, r));
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  });

  // Data polygon
  const dataPoints = entries.map(([, dim], i) => {
    const r = (dim.score / 100) * maxR;
    return point(i, r);
  });
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Axis lines
  const axisPoints = entries.map((_, i) => point(i, maxR));

  function getColor(score: number): string {
    if (score < 40) return '#E05252';
    if (score < 65) return '#F27A2A';
    if (score < 85) return '#F0C744';
    return '#22A168';
  }

  // Short labels
  const shortLabels: Record<string, string> = {
    premiere_impression: '1re impression',
    hierarchie_visuelle: 'Hiérarchie',
    copywriting: 'Copywriting',
    cta_conversion: 'CTA',
    confiance_credibilite: 'Confiance',
    coherence_design: 'Design',
    mobile_readability: 'Mobile',
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="280" height="280" viewBox="0 0 280 280">
        {/* Grid */}
        {gridPaths.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="#EEEDEB"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        {axisPoints.map((p, i) => (
          <line
            key={i}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="#EEEDEB" strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={dataPath}
          fill="#1A1A18"
          fillOpacity="0.08"
          stroke="#1A1A18"
          strokeWidth="1.5"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r="3.5"
            fill={getColor(entries[i][1].score)}
            stroke="white" strokeWidth="1.5"
          />
        ))}

        {/* Labels */}
        {entries.map(([key, dim], i) => {
          const labelR = maxR + 20;
          const lp = point(i, labelR);
          const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle';
          return (
            <g key={key}>
              <text
                x={lp.x} y={lp.y - 4}
                textAnchor={anchor}
                fontSize="9"
                fontWeight="500"
                fill="#504F4A"
              >
                {shortLabels[key] || key}
              </text>
              <text
                x={lp.x} y={lp.y + 8}
                textAnchor={anchor}
                fontSize="10"
                fontWeight="500"
                fill={getColor(dim.score)}
              >
                {dim.score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
