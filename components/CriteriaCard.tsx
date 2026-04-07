import type { CriterionScore } from '@/lib/types';
import GlossaryTooltip from './GlossaryTooltip';

interface CriteriaCardProps {
  criterion: CriterionScore;
  index: number;
}

function getBarColor(score: number, max: number): string {
  const percent = (score / max) * 100;
  if (percent < 40) return '#C03030';
  if (percent < 65) return '#E05A2B';
  if (percent < 85) return '#E05A2B';
  return '#2D8A5E';
}

export default function CriteriaCard({ criterion, index }: CriteriaCardProps) {
  const percent = Math.round((criterion.score / criterion.maxScore) * 100);
  const color = getBarColor(criterion.score, criterion.maxScore);

  return (
    <div
      className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <GlossaryTooltip termKey={criterion.key}>
          <h4 className="text-[14px] font-medium text-[#171717]">
            {criterion.name}
          </h4>
        </GlossaryTooltip>
        <span className="shrink-0 ml-3 flex items-baseline gap-1">
          <span className="font-display text-[18px]" style={{ color }}>
            {criterion.score}
          </span>
          <span className="text-[12px] text-[#a3a3a3]">/{criterion.maxScore}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#fafafa] rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <p className="text-[15px] text-[#525252] leading-relaxed">
        {criterion.details}
      </p>
    </div>
  );
}
