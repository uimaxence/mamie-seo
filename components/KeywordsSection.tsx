import type { MotsClesAnalysis } from '@/lib/types';

interface KeywordsSectionProps {
  keywords: MotsClesAnalysis;
}

export default function KeywordsSection({ keywords }: KeywordsSectionProps) {
  return (
    <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#73726C]">
          Mots-clés métier
        </h3>
        <span className="tabular-nums text-[18px] font-medium text-[#1A1A18]">
          {keywords.score}
        </span>
      </div>

      {/* Detected keywords */}
      <div className="mb-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#22A168] block mb-2">
          Mots-clés détectés
        </span>
        <div className="flex flex-wrap gap-2">
          {keywords.mots_detectes.map((mot, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#EAF3DE] text-[#3B6D11]"
            >
              {mot}
            </span>
          ))}
        </div>
      </div>

      {/* Missing keywords */}
      <div className="mb-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#F27A2A] block mb-2">
          Mots-clés manquants suggérés
        </span>
        <div className="flex flex-wrap gap-2">
          {keywords.mots_manquants_suggeres.map((mot, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FAEEDA] text-[#854F0B]"
            >
              + {mot}
            </span>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-[13px] text-[#73726C] leading-relaxed mb-3">
        {keywords.explication}
      </p>

      {/* Example */}
      {keywords.exemple_concret && (
        <div className="bg-[#F8F8F7] rounded-[8px] p-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#73726C] block mb-1">
            Exemple concret
          </span>
          <p className="text-[13px] text-[#1A1A18] leading-relaxed italic">
            {keywords.exemple_concret}
          </p>
        </div>
      )}
    </div>
  );
}
