import type { EditorialDimension } from '@/lib/types';

interface EditorialSectionProps {
  title: string;
  dimension: EditorialDimension;
  index: number;
}

function getScoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

export default function EditorialSection({ title, dimension, index }: EditorialSectionProps) {
  const color = getScoreColor(dimension.score);

  return (
    <div
      className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-[14px] font-medium text-[#1A1A18]">{title}</h4>
        <span
          className="tabular-nums text-[18px] font-medium shrink-0 ml-3"
          style={{ color }}
        >
          {dimension.score}
        </span>
      </div>

      {/* Summary */}
      <p className="text-[13px] text-[#1A1A18] mb-4 leading-relaxed">
        {dimension.resume}
      </p>

      {/* Point fort */}
      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#22A168] block mb-1">
          Point fort
        </span>
        <p className="text-[13px] text-[#73726C] leading-relaxed">
          {dimension.point_fort}
        </p>
      </div>

      {/* Point d'amélioration */}
      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#F27A2A] block mb-1">
          À améliorer
        </span>
        <p className="text-[13px] text-[#73726C] leading-relaxed">
          {dimension.point_amelioration}
        </p>
      </div>

      {/* Exemple concret */}
      {dimension.exemple_concret && (
        <div className="bg-[#F8F8F7] rounded-[8px] p-4 mt-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#73726C] block mb-1">
            Exemple concret
          </span>
          <p className="text-[13px] text-[#1A1A18] leading-relaxed italic">
            {dimension.exemple_concret}
          </p>
        </div>
      )}
    </div>
  );
}
