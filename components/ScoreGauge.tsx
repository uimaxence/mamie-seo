'use client';

import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  red: '#C03030',
  orange: '#E05A2B',
  yellow: '#E05A2B',
  green: '#2D8A5E',
};

function getCategory(score: number): { key: string; label: string } {
  if (score < 40) return { key: 'red', label: 'À retravailler' };
  if (score < 65) return { key: 'orange', label: 'Améliorable' };
  if (score < 85) return { key: 'yellow', label: 'Bon niveau' };
  return { key: 'green', label: 'Excellent' };
}

export default function ScoreGauge({ score, size = 180, label }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const category = getCategory(score);
  const color = CATEGORY_COLORS[category.key];

  // Circle dimensions
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={strokeWidth}
          />
          {/* Score circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.2s ease-out',
            }}
          />
        </svg>
        {/* Score value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-[#171717]"
            style={{ fontSize: size * 0.28 }}
          >
            {animatedScore}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#a3a3a3]">
            / 100
          </span>
        </div>
      </div>
      {/* Label */}
      <div className="text-center">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
          style={{
            backgroundColor: `${color}18`,
            color: color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label || category.label}
        </span>
      </div>
    </div>
  );
}
