'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgressEvent, OnboardingAnswers } from '@/lib/types';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { IconArrowRight, IconCheck } from '@/components/Icons';

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

const TIPS = [
  "Un bon H1 contient votre mot-clé principal et fait moins de 60 caractères.",
  "Les sites en HTTPS sont favorisés par Google dans les résultats de recherche.",
  "Un sitemap aide Google à découvrir toutes vos pages plus rapidement.",
  "Les images sans balise alt sont invisibles pour Google et les lecteurs d'écran.",
  "Un maillage interne solide aide Google à comprendre la structure de votre site.",
  "La meta description n'influence pas le classement mais augmente le taux de clic.",
  "Google favorise les sites qui se chargent en moins de 3 secondes.",
];

export default function AnalyzingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('connecting');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [luckyDay, setLuckyDay] = useState(false);
  const startedRef = useRef(false);

  // Account creation state (shown after analysis completes)
  const [reportId, setReportId] = useState<string | null>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [error]);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 8000);
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
        if (data.upgrade) {
          setError('upgrade');
        } else {
          setError(data.error || 'Erreur serveur.');
        }
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

            // Lucky day message
            if (event.detail === 'lucky_day') {
              setLuckyDay(true);
            }

            if (event.step === 'done') {
              setCompletedSteps(new Set(STEPS.map((s) => s.key)));
              setReportId(event.message);
              // Show account creation prompt instead of redirecting
              setTimeout(() => setShowAccountPrompt(true), 600);
              return;
            }

            const stepIndex = STEPS.findIndex((s) => s.key === event.step);
            if (stepIndex >= 0) {
              setCompletedSteps((prev) => {
                const next = new Set(prev);
                for (let i = 0; i < stepIndex; i++) next.add(STEPS[i].key);
                return next;
              });
            }
            setCurrentStep(event.step);
          } catch { /* skip */ }
        }
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    });
  }, [router]);

  const handleCreateAccount = async () => {
    const email = sessionStorage.getItem('mamie_email');
    if (!email || password.length < 6) {
      setAccountError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setAccountLoading(true);
    setAccountError('');

    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          // User already has an account — try login
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
          if (loginErr) {
            setAccountError('Ce compte existe déjà. Mot de passe incorrect ?');
            setAccountLoading(false);
            return;
          }
        } else {
          setAccountError(error.message);
          setAccountLoading(false);
          return;
        }
      }

      setAccountCreated(true);
      // Link reports to the new user
      try {
        await fetch('/api/link-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch { /* non-blocking */ }

      setTimeout(() => router.push(`/report/${reportId}`), 1200);
    } catch {
      setAccountError('Erreur de connexion.');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSkip = () => {
    if (reportId) router.push(`/report/${reportId}`);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}min ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
  };

  const progressPercent = Math.max(5, ((completedSteps.size + 0.5) / STEPS.length) * 100);
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // ─── Account creation prompt (after analysis) ───
  if (showAccountPrompt && reportId) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-6 py-4">
          <span className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</span>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm animate-fade-in-up">
            {accountCreated ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto mb-4">
                  <IconCheck size={24} className="text-[#22A168]" />
                </div>
                <h2 className="text-[18px] font-medium text-[#1A1A18] mb-2">Compte créé !</h2>
                <p className="text-[15px] text-[#504F4A]">Redirection vers votre rapport...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto mb-4">
                  <IconCheck size={24} className="text-[#22A168]" />
                </div>
                <h2 className="text-[18px] font-medium text-[#1A1A18] mb-2 text-center">
                  Votre rapport est prêt !
                </h2>
                <p className="text-[15px] text-[#504F4A] text-center mb-6 leading-relaxed">
                  Créez un mot de passe pour retrouver vos rapports et vos crédits plus tard.
                </p>

                <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 mb-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1">Email</p>
                    <p className="text-[15px] text-[#1A1A18]">{sessionStorage.getItem('mamie_email')}</p>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choisir un mot de passe (6+ car.)"
                    className="w-full px-4 py-3 bg-[#F8F8F7] border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                  />
                  {accountError && <p className="text-[11px] text-[#E05252] mt-2">{accountError}</p>}
                </div>

                <button
                  onClick={handleCreateAccount}
                  disabled={accountLoading || password.length < 6}
                  className="w-full py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 flex items-center justify-center gap-2 mb-3"
                >
                  {accountLoading ? 'Création...' : 'Créer mon compte et voir le rapport'}
                  {!accountLoading && <IconArrowRight size={14} />}
                </button>

                <button
                  onClick={handleSkip}
                  className="w-full text-center text-[12px] text-[#9C9A91] hover:text-[#504F4A] transition-colors"
                >
                  Passer et voir le rapport directement
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Upgrade message (3+ analyses) ───
  if (error === 'upgrade') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-6 py-4">
          <span className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</span>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-full bg-[#FAEEDA] flex items-center justify-center mx-auto mb-4">
              <IconArrowRight size={24} className="text-[#F27A2A]" />
            </div>
            <h2 className="text-[18px] font-medium text-[#1A1A18] mb-2">
              Vous avez utilisé vos analyses gratuites
            </h2>
            <p className="text-[15px] text-[#504F4A] mb-6 leading-relaxed">
              Passez en Pro pour continuer à analyser vos sites avec des analyses approfondies UI, copywriting et conversion.
            </p>
            <a
              href="/#pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
            >
              Voir les offres Pro <IconArrowRight size={14} />
            </a>
            <button
              onClick={() => router.push('/dashboard')}
              className="block w-full text-center text-[12px] text-[#9C9A91] hover:text-[#504F4A] transition-colors mt-4"
            >
              Voir mes rapports existants
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── Normal loading state ───
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</span>
        <span className="tabular-nums text-[12px] text-[#9C9A91]">{formatTime(elapsed)}</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Lucky day banner */}
          {luckyDay && (
            <div className="w-full bg-[#EAF3DE] border border-[#22A168]/20 rounded-[12px] p-4 mb-6 text-center animate-fade-in-up">
              <p className="text-[13px] font-medium text-[#3B6D11]">
                C&apos;est votre jour de chance !
              </p>
              <p className="text-[12px] text-[#3B6D11]/80">
                Vous avez droit à une seconde analyse gratuite.
              </p>
            </div>
          )}

          {/* Ring */}
          <div className="relative w-28 h-28 mb-8">
            <svg width="112" height="112" className="-rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#EEEDEB" strokeWidth="5" />
              <circle cx="56" cy="56" r="48" fill="none" stroke="#1A1A18" strokeWidth="5"
                strokeDasharray={301.6} strokeDashoffset={301.6 - (progressPercent / 100) * 301.6}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular-nums text-[24px] font-medium text-[#1A1A18]">{completedSteps.size}</span>
              <span className="text-[10px] text-[#504F4A]">/ {STEPS.length}</span>
            </div>
          </div>

          <h2 className="text-[18px] font-medium text-[#1A1A18] mb-1 text-center">Analyse en cours</h2>
          <p className="text-[15px] text-[#504F4A] mb-8 text-center">
            {error ? "Une erreur est survenue" : STEPS[currentStepIndex]?.label || 'Initialisation...'}
          </p>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#EEEDEB] rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-[#1A1A18] rounded-full transition-all duration-700 ease-out relative" style={{ width: `${progressPercent}%` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>

          {/* Steps */}
          <div className="w-full bg-white border border-[#EEEDEB] rounded-[12px] p-5 mb-6">
            <div className="space-y-3">
              {STEPS.map((step) => {
                const isCompleted = completedSteps.has(step.key);
                const isCurrent = currentStep === step.key && !isCompleted;
                return (
                  <div key={step.key} className={`flex items-center gap-3 transition-opacity duration-300 ${!isCompleted && !isCurrent ? 'opacity-40' : 'opacity-100'}`}>
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
                    <span className={`text-[13px] ${isCompleted ? 'text-[#1A1A18]' : isCurrent ? 'text-[#1A1A18] font-medium' : 'text-[#9C9A91]'}`}>
                      {isCompleted ? (step.doneLabel || step.label) : step.label}
                    </span>
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

          {/* Tip */}
          {!error && (
            <div className="w-full bg-[#F8F8F7] border border-[#EEEDEB] rounded-[12px] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-2">Le saviez-vous ?</p>
              <p key={tipIndex} className="text-[14px] text-[#504F4A] leading-relaxed animate-fade-in-up">{TIPS[tipIndex]}</p>
            </div>
          )}

          {/* Error (non-upgrade) */}
          {error && error !== 'upgrade' && (
            <div className="w-full bg-white border border-[#E05252]/20 rounded-[12px] p-5 text-center">
              <p className="text-[13px] text-[#E05252] mb-4">{error}</p>
              <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
                Réessayer
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
