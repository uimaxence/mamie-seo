'use client';

import type { PageAnnotation } from '@/lib/types';
import { uiGlossary } from '@/lib/ui-glossary';

interface AnnotationCardProps {
  annotation: PageAnnotation;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  critique: { bg: '#FEE2E2', text: '#E05252', label: 'Critique' },
  avertissement: { bg: '#FAEEDA', text: '#F27A2A', label: 'Avertissement' },
  positif: { bg: '#EAF3DE', text: '#22A168', label: 'Positif' },
  info: { bg: '#DBEAFE', text: '#3B82F6', label: 'Info' },
};

const PIN_COLORS: Record<string, string> = {
  critique: '#E05252',
  avertissement: '#F27A2A',
  positif: '#22A168',
  info: '#3B82F6',
};

export default function AnnotationCard({
  annotation: ann,
  isActive,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: AnnotationCardProps) {
  const typeConfig = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
  const pinColor = PIN_COLORS[ann.type] || '#504F4A';
  const glossaryDef = ann.glossaire_terme ? uiGlossary[ann.glossaire_terme] : null;

  return (
    <div
      id={`annotation-card-${ann.id}`}
      className={`bg-white border rounded-[12px] p-5 transition-all cursor-pointer ${
        isActive
          ? 'border-[#1A1A18] shadow-[0_1px_4px_rgba(0,0,0,.06)]'
          : 'border-[#EEEDEB] hover:border-[#9C9A91]'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
          style={{ backgroundColor: pinColor }}
        >
          {ann.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider"
              style={{ backgroundColor: typeConfig.bg, color: typeConfig.text }}
            >
              {typeConfig.label}
            </span>
            <span className="text-[10px] text-[#9C9A91]">{ann.zone}</span>
          </div>
          <h4 className="text-[14px] font-medium text-[#1A1A18]">{ann.titre}</h4>
        </div>
      </div>

      {/* Observation */}
      <p className="text-[15px] text-[#504F4A] leading-relaxed mb-3">
        {ann.observation}
      </p>

      {/* Recommendation */}
      <div className="bg-[#F8F8F7] rounded-[8px] p-4 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1">
          Recommandation
        </p>
        <p className="text-[15px] text-[#1A1A18] leading-relaxed">
          {ann.recommandation}
        </p>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#F8F8F7] text-[#504F4A] border border-[#EEEDEB]">
          Impact {ann.impact}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#F8F8F7] text-[#504F4A] border border-[#EEEDEB]">
          {ann.difficulte}
        </span>
      </div>

      {/* Glossary term */}
      {glossaryDef && (
        <div className="mt-3 pt-3 border-t border-dashed border-[#EEEDEB]">
          <p className="text-[10px] font-medium text-[#9C9A91] mb-0.5">
            {ann.glossaire_terme}
          </p>
          <p className="text-[13px] text-[#504F4A] leading-relaxed italic">
            {glossaryDef}
          </p>
        </div>
      )}
    </div>
  );
}
