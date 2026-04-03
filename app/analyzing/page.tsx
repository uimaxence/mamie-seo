'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgressEvent, OnboardingAnswers } from '@/lib/types';

interface StepConfig {
  key: string;
  label: string;
  doneLabel?: string;
}

const STEPS: StepConfig[] = [
  { key: 'connecting', label: 'Connexion au site', doneLabel: 'Connexion établie' },
  { key: 'detecting_cms', label: 'Détection du CMS', doneLabel: 'CMS détecté' },
  { key: 'sitemap', label: 'Recherche du sitemap', doneLabel: 'Sitemap analysé' },
  { key: 'crawling', label: 'Crawl des pages', doneLabel: 'Pages crawlées' },
  { key: 'analyzing_meta', label: 'Analyse des métadonnées', doneLabel: 'Métadonnées analysées' },
  { key: 'scoring', label: 'Calcul du score technique', doneLabel: 'Score calculé' },
  { key: 'editorial', label: 'Analyse éditoriale par IA', doneLabel: 'Analyse éditoriale terminée' },
  { key: 'generating', label: 'Génération du rapport', doneLabel: 'Rapport prêt' },
];

// Rotating tips shown during long waits
const TIPS = [
  "Un bon H1 contient votre mot-clé principal et fait moins de 60 caractères.",
  "Les sites en HTTPS sont favorisés par Google dans les résultats de recherche.",
  "Un sitemap aide Google à découvrir toutes vos pages plus rapidement.",
  "Les images sans balise alt sont invisibles pour Google et les lecteurs d'écran.",
  "Un maillage interne solide aide Google à comprendre la structure de votre site.",
  "La meta description n'influence pas le classement mais augmente le taux de clic.",
  "Google favorise les sites qui se chargent en moins de 3 secondes.",
  "Une page orpheline est une page qu'aucun lien interne ne référence.",
];

export default function AnalyzingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('connecting');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const startedRef = useRef(false);
  const stepsReachedRef = useRef(0); // track sequential step completion

  // Elapsed timer — always shows activity
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [error]);

  // Rotate tips every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const url = sessionStorage.getItem('mamie_url');
    const email = sessionStorage.getItem('mamie_email');
    const onboardingStr = sessionStorage.getItem('mamie_onboarding');

    if (!url || !email || !onboardingStr) {
      router.push('/');
      return;
    }

    const onboarding: OnboardingAnswers = JSON.parse(onboardingStr);

    fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, email, onboarding }),
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Erreur serveur.');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));

            if (event.step === 'error') {
              setError(event.message);
              return;
            }

            if (event.step === 'done') {
              setCompletedSteps(new Set(STEPS.map((s) => s.key)));
              setTimeout(() => router.push(`/report/${event.message}`), 800);
              return;
            }

            // Mark all steps UP TO the current one as completed (sequential order)
            const stepIndex = STEPS.findIndex((s) => s.key === event.step);
            if (stepIndex >= 0) {
              setCompletedSteps((prev) => {
                const next = new Set(prev);
                for (let i = 0; i < stepIndex; i++) {
                  next.add(STEPS[i].key);
                }
                return next;
              });
              stepsReachedRef.current = Math.max(stepsReachedRef.current, stepIndex);
            }

            setCurrentStep(event.step);
            if (event.detail || event.message) {
              setDetail(event.detail || event.message);
            }
          } catch {
            // skip malformed events
          }
        }
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    });
  }, [router]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}min ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progressPercent = Math.max(
    5,
    ((completedSteps.size + 0.5) / STEPS.length) * 100
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</span>
        <span className="tabular-nums text-[11px] text-[#C2C0B6]">{formatTime(elapsed)}</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Animated ring */}
          <div className="relative w-28 h-28 mb-8">
            <svg width="112" height="112" className="-rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#EEEDEB" strokeWidth="5" />
              <circle
                cx="56" cy="56" r="48" fill="none" stroke="#1A1A18" strokeWidth="5"
                strokeDasharray={301.6}
                strokeDashoffset={301.6 - (progressPercent / 100) * 301.6}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular-nums text-[24px] font-medium text-[#1A1A18]">
                {completedSteps.size}
              </span>
              <span className="text-[10px] text-[#73726C]">/ {STEPS.length}</span>
            </div>
          </div>

          <h2 className="text-[18px] font-medium text-[#1A1A18] mb-1 text-center">
            Analyse en cours
          </h2>
          <p className="text-[13px] text-[#73726C] mb-8 text-center">
            {error ? "Une erreur est survenue" : STEPS[currentStepIndex]?.label || 'Initialisation...'}
          </p>

          {/* Global progress bar */}
          <div className="w-full h-1.5 bg-[#EEEDEB] rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-[#1A1A18] rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Shimmer effect for "still alive" indication */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>

          {/* Steps list */}
          <div className="w-full bg-white border border-[#EEEDEB] rounded-[12px] p-5 mb-6">
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const isCompleted = completedSteps.has(step.key);
                const isCurrent = currentStep === step.key && !isCompleted;

                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 transition-opacity duration-300 ${
                      !isCompleted && !isCurrent ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {/* Icon */}
                    <span className="w-6 h-6 flex items-center justify-center shrink-0">
                      {isCompleted ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="8" fill="#22A168" />
                          <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : isCurrent ? (
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F27A2A] opacity-30" />
                          <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-[#F27A2A] bg-white" />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-[#EEEDEB]" />
                      )}
                    </span>

                    <span
                      className={`text-[13px] ${
                        isCompleted
                          ? 'text-[#1A1A18]'
                          : isCurrent
                          ? 'text-[#1A1A18] font-medium'
                          : 'text-[#C2C0B6]'
                      }`}
                    >
                      {isCompleted ? (step.doneLabel || step.label) : step.label}
                    </span>

                    {/* Active spinner dots */}
                    {isCurrent && (
                      <span className="ml-auto flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#F27A2A] animate-[bounce_1s_infinite_0ms]" />
                        <span className="w-1 h-1 rounded-full bg-[#F27A2A] animate-[bounce_1s_infinite_150ms]" />
                        <span className="w-1 h-1 rounded-full bg-[#F27A2A] animate-[bounce_1s_infinite_300ms]" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tip card — always visible, keeps the page feeling alive */}
          {!error && (
            <div className="w-full bg-[#F8F8F7] border border-[#EEEDEB] rounded-[12px] p-4 transition-all duration-500">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-2">
                Le saviez-vous ?
              </p>
              <p
                key={tipIndex}
                className="text-[12px] text-[#73726C] leading-relaxed animate-fade-in-up"
              >
                {TIPS[tipIndex]}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="w-full bg-white border border-[#E05252]/20 rounded-[12px] p-5 text-center">
              <p className="text-[13px] text-[#E05252] mb-4">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
