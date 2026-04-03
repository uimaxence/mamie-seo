import type { ActionItem } from '@/lib/types';

interface ActionPlanProps {
  actions: ActionItem[];
}

function getImpactBadge(impact: string) {
  switch (impact.toLowerCase()) {
    case 'élevé':
      return { bg: '#EAF3DE', text: '#3B6D11' };
    case 'moyen':
      return { bg: '#FAEEDA', text: '#854F0B' };
    case 'faible':
      return { bg: '#F8F8F7', text: '#73726C' };
    default:
      return { bg: '#F8F8F7', text: '#73726C' };
  }
}

function getDifficulteBadge(difficulte: string) {
  switch (difficulte.toLowerCase()) {
    case 'facile':
      return { bg: '#EAF3DE', text: '#3B6D11' };
    case 'moyen':
      return { bg: '#FAEEDA', text: '#854F0B' };
    case 'difficile':
      return { bg: '#EEEDFE', text: '#3C3489' };
    default:
      return { bg: '#F8F8F7', text: '#73726C' };
  }
}

export default function ActionPlan({ actions }: ActionPlanProps) {
  return (
    <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#73726C] mb-4">
        Plan d&apos;action priorisé
      </h3>
      <div className="space-y-0">
        {actions.map((action, i) => {
          const impactStyle = getImpactBadge(action.impact);
          const difficulteStyle = getDifficulteBadge(action.difficulte);

          return (
            <div
              key={i}
              className={`flex items-start gap-4 py-4 ${
                i > 0 ? 'border-t border-dashed border-[#EEEDEB]' : ''
              }`}
            >
              {/* Priority number */}
              <span className="w-7 h-7 shrink-0 rounded-full bg-[#F8F8F7] flex items-center justify-center text-[13px] font-medium text-[#1A1A18]">
                {action.priorite}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A18] mb-2">
                  {action.titre}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: impactStyle.bg, color: impactStyle.text }}
                  >
                    Impact {action.impact}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: difficulteStyle.bg, color: difficulteStyle.text }}
                  >
                    {action.difficulte}
                  </span>
                  {action.temps_estime && (
                    <span className="text-[10px] text-[#C2C0B6]">
                      ~{action.temps_estime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
