import type { EditorialDimension } from '@/lib/types';

interface EditorialSectionProps {
  title: string;
  dimension: EditorialDimension;
  index: number;
}

function getScoreColor(score: number): string {
  if (score < 40) return '#C03030';
  if (score < 65) return '#E05A2B';
  if (score < 85) return '#E05A2B';
  return '#2D8A5E';
}

export default function EditorialSection({ title, dimension, index }: EditorialSectionProps) {
  const color = getScoreColor(dimension.score);

  return (
    <div
      className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-[15px] font-medium text-[#171717]">{title}</h4>
        <span className="font-display text-[22px] shrink-0 ml-3" style={{ color }}>
          {dimension.score}
        </span>
      </div>

      {/* Summary */}
      <p className="text-[15px] text-[#171717] mb-4 leading-relaxed">
        {dimension.resume}
      </p>

      {/* Point fort */}
      <div className="mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#2D8A5E] block mb-1">
          Point fort
        </span>
        <p className="text-[15px] text-[#525252] leading-relaxed">
          {dimension.point_fort}
        </p>
      </div>

      {/* Point d'amélioration */}
      <div className="mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#E05A2B] block mb-1">
          À améliorer
        </span>
        <p className="text-[15px] text-[#525252] leading-relaxed">
          {dimension.point_amelioration}
        </p>
      </div>

      {/* Exemple concret */}
      {dimension.exemple_concret && (
        <div className="bg-[#fafafa] rounded-[8px] p-4 mt-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#525252] block mb-1">
            Exemple concret
          </span>
          <p className="text-[15px] text-[#171717] leading-relaxed italic">
            {dimension.exemple_concret}
          </p>
        </div>
      )}
    </div>
  );
}
