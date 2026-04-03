import type { CriterionScore } from '@/lib/types';
import GlossaryTooltip from './GlossaryTooltip';

interface CriteriaCardProps {
  criterion: CriterionScore;
  index: number;
}

function getBarColor(score: number, max: number): string {
  const percent = (score / max) * 100;
  if (percent < 40) return '#E05252';
  if (percent < 65) return '#F27A2A';
  if (percent < 85) return '#F0C744';
  return '#22A168';
}

export default function CriteriaCard({ criterion, index }: CriteriaCardProps) {
  const percent = Math.round((criterion.score / criterion.maxScore) * 100);
  const color = getBarColor(criterion.score, criterion.maxScore);

  return (
    <div
      className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <GlossaryTooltip termKey={criterion.key}>
          <h4 className="text-[14px] font-medium text-[#1A1A18]">
            {criterion.name}
          </h4>
        </GlossaryTooltip>
        <span
          className="tabular-nums text-[14px] font-medium shrink-0 ml-3"
          style={{ color }}
        >
          {criterion.score}/{criterion.maxScore}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#F8F8F7] rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <p className="text-[13px] text-[#73726C] leading-relaxed">
        {criterion.details}
      </p>
    </div>
  );
}
