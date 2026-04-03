'use client';

import { useRef } from 'react';
import type { PageAnnotation } from '@/lib/types';

interface AnnotatedScreenshotProps {
  screenshot: string; // base64
  annotations: PageAnnotation[];
  activeAnnotation: number | null;
  onAnnotationClick: (id: number | null) => void;
  isMobile?: boolean;
}

const PIN_COLORS: Record<string, string> = {
  critique: '#E05252',
  avertissement: '#F27A2A',
  positif: '#22A168',
  info: '#3B82F6',
};

export default function AnnotatedScreenshot({
  screenshot,
  annotations,
  activeAnnotation,
  onAnnotationClick,
  isMobile = false,
}: AnnotatedScreenshotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={`relative border border-[#EEEDEB] rounded-[8px] overflow-hidden bg-[#F8F8F7] ${
        isMobile ? 'max-w-[200px]' : ''
      }`}
    >
      {/* Screenshot */}
      <img
        src={`data:image/png;base64,${screenshot}`}
        alt={isMobile ? 'Capture mobile' : 'Capture desktop'}
        className="w-full block"
        draggable={false}
      />

      {/* Annotation pins */}
      {annotations.map((ann) => {
        const isActive = activeAnnotation === ann.id;
        const color = PIN_COLORS[ann.type] || '#73726C';

        return (
          <button
            key={ann.id}
            className="absolute z-10 group"
            style={{
              left: `${ann.x_percent}%`,
              top: `${ann.y_percent}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => onAnnotationClick(isActive ? null : ann.id)}
          >
            {/* Pin */}
            <span
              className={`flex items-center justify-center rounded-full text-white text-[11px] font-bold shadow-md transition-transform duration-200 ${
                isActive ? 'scale-130 shadow-lg' : 'group-hover:scale-110'
              }`}
              style={{
                width: isActive ? '32px' : '26px',
                height: isActive ? '32px' : '26px',
                backgroundColor: color,
                boxShadow: isActive
                  ? `0 4px 16px ${color}44`
                  : `0 2px 8px rgba(0,0,0,0.3)`,
              }}
            >
              {ann.id}
            </span>

            {/* Tooltip on hover (desktop only) */}
            {!isMobile && (
              <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-white border border-[#EEEDEB] rounded-[8px] px-3 py-2 text-left shadow-sm w-52 z-20 pointer-events-none">
                <span className="text-[11px] font-medium text-[#1A1A18] block mb-0.5">{ann.titre}</span>
                <span className="text-[10px] text-[#73726C] line-clamp-2">{ann.observation}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
