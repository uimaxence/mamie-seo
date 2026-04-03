'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingAnswers, Metier, ObjectifSite, AudienceCible, NiveauSEO, AncienneteSite } from '@/lib/types';

const METIER_OPTIONS: { value: Metier; label: string }[] = [
  { value: 'developpeur', label: 'Développeur' },
  { value: 'designer', label: 'Designer' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'coach', label: 'Coach' },
  { value: 'therapeute', label: 'Thérapeute' },
  { value: 'formateur', label: 'Formateur' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'autre', label: 'Autre' },
];

const OBJECTIF_OPTIONS: { value: ObjectifSite; label: string }[] = [
  { value: 'leads', label: 'Générer des leads' },
  { value: 'portfolio', label: 'Montrer un portfolio' },
  { value: 'formations', label: 'Vendre des formations' },
  { value: 'rassurer', label: 'Rassurer des prospects' },
  { value: 'local', label: 'Être trouvé localement' },
];

const AUDIENCE_OPTIONS: { value: AudienceCible; label: string }[] = [
  { value: 'particuliers', label: 'Particuliers' },
  { value: 'petites_entreprises', label: 'Petites entreprises' },
  { value: 'grandes_entreprises', label: 'Grandes entreprises' },
  { value: 'niche', label: 'Niche spécifique' },
];

const NIVEAU_OPTIONS: { value: NiveauSEO; label: string }[] = [
  { value: 'jamais', label: 'Jamais' },
  { value: 'autodidacte', label: 'Un peu, en autodidacte' },
  { value: 'avec_pro', label: 'Oui, avec un pro' },
  { value: 'sans_resultats', label: 'Oui, mais sans résultats' },
];

const ANCIENNETE_OPTIONS: { value: AncienneteSite; label: string }[] = [
  { value: 'moins_6_mois', label: 'Moins de 6 mois' },
  { value: '6_mois_2_ans', label: '6 mois à 2 ans' },
  { value: 'plus_2_ans', label: 'Plus de 2 ans' },
];

interface QuestionConfig {
  key: string;
  question: string;
  type: 'select' | 'pills';
  options: { value: string; label: string }[];
  showFreeField?: boolean;
}

const QUESTIONS: QuestionConfig[] = [
  { key: 'metier', question: 'Quel est votre métier ?', type: 'pills', options: METIER_OPTIONS, showFreeField: true },
  { key: 'objectif', question: "Quel est l'objectif principal de votre site ?", type: 'pills', options: OBJECTIF_OPTIONS },
  { key: 'audience', question: 'Qui sont vos clients cibles ?', type: 'pills', options: AUDIENCE_OPTIONS, showFreeField: true },
  { key: 'niveauSEO', question: 'Avez-vous déjà travaillé votre SEO ?', type: 'pills', options: NIVEAU_OPTIONS },
  { key: 'anciennete', question: 'Depuis combien de temps votre site existe-t-il ?', type: 'pills', options: ANCIENNETE_OPTIONS },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeFields, setFreeFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionStorage.getItem('mamie_url') || !sessionStorage.getItem('mamie_email')) {
      router.push('/');
    }
  }, [router]);

  const current = QUESTIONS[step];

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));

    // If this option doesn't need a free field or it's already the last step
    if (current.showFreeField && (value === 'autre' || value === 'niche')) {
      // Stay on step so user can fill free field
      setAnswers((prev) => ({ ...prev, [current.key]: value }));
    } else {
      // Auto-advance
      if (step < QUESTIONS.length - 1) {
        setTimeout(() => setStep(step + 1), 200);
      }
    }
  };

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Save onboarding and navigate
      const onboarding: OnboardingAnswers = {
        metier: (answers.metier || 'autre') as Metier,
        metierAutre: freeFields.metier || undefined,
        objectif: (answers.objectif || 'leads') as ObjectifSite,
        audience: (answers.audience || 'particuliers') as AudienceCible,
        audienceNiche: freeFields.audience || undefined,
        niveauSEO: (answers.niveauSEO || 'jamais') as NiveauSEO,
        anciennete: (answers.anciennete || 'moins_6_mois') as AncienneteSite,
      };
      sessionStorage.setItem('mamie_onboarding', JSON.stringify(onboarding));
      router.push('/analyzing');
    }
  };

  const needsFreeField =
    current.showFreeField &&
    (answers[current.key] === 'autre' || answers[current.key] === 'niche');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6]">
          {step + 1} / {QUESTIONS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="px-6">
        <div className="h-1 bg-[#EEEDEB] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1A18] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md animate-fade-in-up" key={step}>
          <h2 className="text-[18px] font-medium text-[#1A1A18] mb-8 text-center">
            {current.question}
          </h2>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {current.options.map((opt) => {
              const isSelected = answers[current.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-4 py-2.5 rounded-[8px] text-[13px] font-medium transition-all ${
                    isSelected
                      ? 'bg-[#1A1A18] text-white'
                      : 'bg-white border border-[#EEEDEB] text-[#73726C] hover:border-[#C2C0B6] hover:text-[#1A1A18]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Free field */}
          {needsFreeField && (
            <div className="mb-6">
              <input
                type="text"
                value={freeFields[current.key] || ''}
                onChange={(e) =>
                  setFreeFields((prev) => ({ ...prev, [current.key]: e.target.value }))
                }
                placeholder="Précisez..."
                className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[13px] text-[#1A1A18] placeholder:text-[#C2C0B6] outline-none focus:border-[#1A1A18] transition-colors"
                autoFocus
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              className={`text-[13px] text-[#73726C] hover:text-[#1A1A18] transition-colors ${
                step === 0 ? 'invisible' : ''
              }`}
            >
              ← Retour
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[current.key]}
              className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === QUESTIONS.length - 1 ? 'Lancer l\'analyse' : 'Suivant'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
