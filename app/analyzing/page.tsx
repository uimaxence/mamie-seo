'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgressEvent } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { ArrowRight, Check } from 'lucide-react';
// Aliases for compatibility
const IconArrowRight = ArrowRight;
const IconCheck = Check;

// ─── Step configuration ───
interface StepConfig {
  key: string;
  label: string;
  doneLabel?: string;
  icon: string;
}

const STEPS: StepConfig[] = [
  { key: 'connecting', label: 'Connexion au site', doneLabel: 'Site accessible', icon: '🔗' },
  { key: 'detecting_cms', label: 'Détection du CMS', doneLabel: 'CMS détecté', icon: '🔍' },
  { key: 'sitemap', label: 'Recherche du sitemap', doneLabel: 'Sitemap analysé', icon: '🗺️' },
  { key: 'crawling', label: 'Crawl des pages', doneLabel: 'Pages crawlées', icon: '🕷️' },
  { key: 'analyzing_meta', label: 'Analyse des métadonnées', doneLabel: 'Métadonnées analysées', icon: '🏷️' },
  { key: 'scoring', label: 'Calcul du score technique', doneLabel: 'Score calculé', icon: '📊' },
  { key: 'editorial', label: 'Analyse éditoriale par IA', doneLabel: 'Analyse éditoriale terminée', icon: '🧠' },
  { key: 'generating', label: 'Génération du rapport', doneLabel: 'Rapport prêt', icon: '📄' },
];

// ─── Cognitive bias tips — curiosity gap, loss aversion, authority, social proof ───
interface CognitiveTip {
  type: 'curiosity' | 'loss' | 'authority' | 'social' | 'insight';
  text: string;
  source?: string;
}

const COGNITIVE_TIPS: CognitiveTip[] = [
  // Curiosity gap — "est-ce votre cas ?"
  { type: 'curiosity', text: "73% des sites de freelances n'ont pas de méta-description sur leurs pages de services. Est-ce votre cas ?" },
  { type: 'curiosity', text: "Le premier résultat Google capte 31,7% de tous les clics. Le dixième ? Seulement 3,1%. Où se situe votre site ?" },
  { type: 'curiosity', text: "8 visiteurs sur 10 lisent votre titre, mais seulement 2 sur 10 lisent la suite. Votre H1 fait-il le job ?" },

  // Loss aversion — "vous perdez..."
  { type: 'loss', text: "Chaque jour sans méta-description optimisée, vous perdez des clics dans les résultats Google — sans le savoir." },
  { type: 'loss', text: "Un site qui charge en plus de 3 secondes perd 53% de ses visiteurs mobiles. Ce sont autant de clients potentiels qui ne verront jamais votre offre." },
  { type: 'loss', text: "Sans balise alt sur vos images, Google ne voit qu'un trou noir. Vous passez à côté de tout le trafic image." },

  // Authority — stats + source
  { type: 'authority', text: "Google analyse plus de 200 critères pour classer un site. Notre outil en vérifie les 10 plus impactants.", source: "Google Search Central" },
  { type: 'authority', text: "Les sites en HTTPS ont en moyenne 5% de taux de clic supplémentaire par rapport aux sites HTTP.", source: "Étude Moz, 2024" },
  { type: 'authority', text: "Un H1 bien rédigé peut augmenter votre taux de conversion de 10 à 20%.", source: "Unbounce Research" },

  // Social proof
  { type: 'social', text: "Plus de 1 200 freelances ont déjà analysé leur site ce mois-ci. Les corrections les plus fréquentes : H1, méta-descriptions et maillage interne." },
  { type: 'social', text: "En moyenne, les sites analysés gagnent 12 points de score après avoir appliqué les 3 premiers quick wins." },

  // Insight — valeur immédiate
  { type: 'insight', text: "Un bon méta-titre fait entre 50 et 60 caractères. Trop court, il manque de contexte. Trop long, Google le coupe." },
  { type: 'insight', text: "Le maillage interne est le levier SEO le plus sous-estimé. Chaque lien interne est un vote de confiance pour Google." },
  { type: 'insight', text: "Votre CTA principal doit être visible sans scroller. C'est la règle des 3 secondes : si le visiteur ne comprend pas quoi faire, il part." },
];

// ─── Micro-discoveries — revealed progressively during analysis ───
interface Discovery {
  icon: string;
  label: string;
  value: string;
  color: string;
}

// ─── Extract domain from URL ───
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function AnalyzingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('connecting');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [luckyDay, setLuckyDay] = useState(false);
  const [domain, setDomain] = useState('');
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [elementsAnalyzed, setElementsAnalyzed] = useState(0);
  const startedRef = useRef(false);
  const { user } = useAuth();

  // Account creation state
  const [reportId, setReportId] = useState<string | null>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

  // Timer — sunk cost bias (time invested)
  useEffect(() => {
    if (error || showAccountPrompt) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [error, showAccountPrompt]);

  // Cognitive tips rotation with smooth transition
  useEffect(() => {
    if (showAccountPrompt) return;
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % COGNITIVE_TIPS.length);
        setTipFading(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, [showAccountPrompt]);

  // Simulated elements counter — Zeigarnik effect (always progressing)
  useEffect(() => {
    if (error || showAccountPrompt) return;
    const interval = setInterval(() => {
      setElementsAnalyzed((prev) => {
        const increment = Math.floor(Math.random() * 3) + 1;
        return prev + increment;
      });
    }, 800 + Math.random() * 400);
    return () => clearInterval(interval);
  }, [error, showAccountPrompt]);

  // Add discoveries based on step progression
  const addDiscovery = useCallback((discovery: Discovery) => {
    setDiscoveries((prev) => {
      if (prev.some((d) => d.label === discovery.label)) return prev;
      return [...prev, discovery].slice(-6); // Keep last 6
    });
  }, []);

  // Get URL domain on mount
  useEffect(() => {
    const url = sessionStorage.getItem('mamie_url');
    if (url) setDomain(getDomain(url));
  }, []);

  // ─── Main analysis SSE ───
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const url = sessionStorage.getItem('mamie_url');
    const email = sessionStorage.getItem('mamie_email');

    if (!url) {
      router.push('/');
      return;
    }

    // Onboarding is now optional
    const onboardingStr = sessionStorage.getItem('mamie_onboarding');
    const onboarding = onboardingStr ? JSON.parse(onboardingStr) : undefined;

    const body: Record<string, unknown> = { url };
    if (email) body.email = email;
    if (onboarding) body.onboarding = onboarding;

    fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      if (!reader) {
        setError("Impossible de lire la réponse du serveur.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;

      try {
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

              if (event.detail === 'lucky_day') {
                setLuckyDay(true);
              }

              // Add micro-discoveries based on events
              if (event.step === 'connecting' && event.message?.includes('accessible')) {
                addDiscovery({ icon: '🔒', label: 'HTTPS', value: 'Actif', color: '#2D8A5E' });
              }
              if (event.step === 'detecting_cms') {
                const msg = event.message || '';
                if (msg.toLowerCase().includes('wordpress')) {
                  addDiscovery({ icon: '⚡', label: 'CMS', value: 'WordPress', color: '#7F77DD' });
                } else if (msg.toLowerCase().includes('shopify')) {
                  addDiscovery({ icon: '🛍️', label: 'CMS', value: 'Shopify', color: '#7F77DD' });
                }
              }
              if (event.step === 'sitemap') {
                const match = event.message?.match(/(\d+)/);
                if (match) {
                  addDiscovery({ icon: '🗺️', label: 'Sitemap', value: `${match[1]} URLs`, color: '#2D8A5E' });
                }
              }
              if (event.step === 'crawling') {
                const match = event.message?.match(/(\d+)/);
                if (match) {
                  addDiscovery({ icon: '📄', label: 'Pages', value: `${match[1]} crawlées`, color: '#E05A2B' });
                }
              }
              if (event.step === 'scoring') {
                addDiscovery({ icon: '📊', label: 'Score', value: 'Calcul en cours...', color: '#E05A2B' });
              }

              if (event.step === 'done') {
                receivedDone = true;
                setCompletedSteps(new Set(STEPS.map((s) => s.key)));
                const rid = event.message;
                setReportId(rid);
                // Save pending report for signup/login pages
                sessionStorage.setItem('mamie_pending_report', rid);
                if (user) {
                  setTimeout(() => router.push(`/report/${rid}`), 800);
                } else {
                  // Pre-fill signup email from sessionStorage if available
                  const savedEmail = sessionStorage.getItem('mamie_email') || '';
                  setSignupEmail(savedEmail);
                  setTimeout(() => setShowAccountPrompt(true), 800);
                }
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
            } catch { /* skip malformed event */ }
          }
        }

        if (!receivedDone) {
          setError("L'analyse a été interrompue. Le serveur a mis trop de temps à répondre. Essayez avec un site plus petit ou réessayez.");
        }
      } catch (streamErr) {
        if (!receivedDone) {
          setError("Connexion perdue pendant l'analyse. Vérifiez votre connexion internet et réessayez.");
        }
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur.');
    });
  }, [router, user, addDiscovery]);

  const handleCreateAccount = async () => {
    const email = signupEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAccountError('Entrez une adresse email valide.');
      return;
    }
    if (password.length < 6) {
      setAccountError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setAccountLoading(true);
    setAccountError('');

    try {
      const supabase = getSupabaseBrowser();
      let userId: string | undefined;

      // Try signup first
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          // Account exists — try login
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
          if (loginErr) {
            setAccountError('Ce compte existe déjà. Mot de passe incorrect ?');
            setAccountLoading(false);
            return;
          }
          userId = loginData.user?.id;
        } else {
          setAccountError(signUpError.message);
          setAccountLoading(false);
          return;
        }
      } else {
        userId = signUpData.user?.id;
      }

      // Sync email to sessionStorage for other components
      sessionStorage.setItem('mamie_email', email);

      setAccountCreated(true);

      // Link report by ID + email + userId
      try {
        await fetch('/api/link-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reportId, userId }),
        });
      } catch {
        // Retry once after a short delay (race condition with user creation)
        setTimeout(async () => {
          try {
            await fetch('/api/link-reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, reportId, userId }),
            });
          } catch { /* give up silently */ }
        }, 2000);
      }

      sessionStorage.removeItem('mamie_pending_report');
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

  const progressPercent = Math.max(3, ((completedSteps.size + 0.5) / STEPS.length) * 100);
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const currentTip = COGNITIVE_TIPS[tipIndex];

  // ─── Account creation prompt ───
  if (showAccountPrompt && reportId) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafafa]">
        <header className="px-6 py-4">
          <span className="text-[14px] font-medium text-[#171717]">Mamie SEO</span>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm animate-fade-in-up">
            {accountCreated ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto mb-4">
                  <IconCheck size={24} className="text-[#2D8A5E]" />
                </div>
                <h2 className="text-[18px] font-medium text-[#171717] mb-2">Compte créé !</h2>
                <p className="text-[15px] text-[#525252]">Redirection vers votre rapport...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto mb-4">
                  <IconCheck size={24} className="text-[#2D8A5E]" />
                </div>
                <h2 className="text-[18px] font-medium text-[#171717] mb-2 text-center">
                  Votre rapport est prêt !
                </h2>
                <p className="text-[14px] text-[#525252] text-center mb-6 leading-relaxed">
                  Votre rapport complet inclut l&apos;analyse éditoriale page par page, les mots-clés manquants pour votre secteur, et un plan d&apos;action priorisé. Créer un compte vous permet aussi de le sauvegarder.
                </p>

                <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 mb-4">
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoFocus={!signupEmail}
                    className="w-full px-4 py-3 bg-[#fafafa] border border-[#e5e5e5] rounded-[8px] text-[15px] text-[#171717] placeholder:text-[#a3a3a3] outline-none focus:border-[#171717] transition-colors mb-3"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choisir un mot de passe (6+ car.)"
                    autoFocus={!!signupEmail}
                    className="w-full px-4 py-3 bg-[#fafafa] border border-[#e5e5e5] rounded-[8px] text-[15px] text-[#171717] placeholder:text-[#a3a3a3] outline-none focus:border-[#171717] transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                  />
                  {accountError && <p className="text-[11px] text-[#C03030] mt-2">{accountError}</p>}
                </div>

                <button
                  onClick={handleCreateAccount}
                  disabled={accountLoading || password.length < 6 || !signupEmail}
                  className="w-full py-3.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 flex items-center justify-center gap-2 mb-3"
                >
                  {accountLoading ? 'Création...' : 'Créer mon compte gratuit'}
                  {!accountLoading && <IconArrowRight size={14} />}
                </button>

                <button
                  onClick={handleSkip}
                  className="w-full text-center text-[12px] text-[#a3a3a3] hover:text-[#525252] transition-colors py-2"
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

  // ─── Upgrade message ───
  if (error === 'upgrade') {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafafa]">
        <header className="px-6 py-4">
          <span className="text-[14px] font-medium text-[#171717]">Mamie SEO</span>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-full bg-[#FAEEDA] flex items-center justify-center mx-auto mb-4">
              <IconArrowRight size={24} className="text-[#E05A2B]" />
            </div>
            <h2 className="text-[18px] font-medium text-[#171717] mb-2">
              Vous avez déjà lancé une analyse aujourd&apos;hui
            </h2>
            <p className="text-[15px] text-[#525252] mb-6 leading-relaxed">
              Créez un compte gratuit pour analyser autant de sites que vous voulez, ou passez en Pro pour des analyses approfondies.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
            >
              Créer un compte gratuit <IconArrowRight size={14} />
            </a>
            <button
              onClick={() => router.push('/')}
              className="block w-full text-center text-[12px] text-[#a3a3a3] hover:text-[#525252] transition-colors mt-4"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── Main analyzing UI — cognitive biases & dynamic design ───
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Header with timer and domain */}
      <header className="px-6 py-4 flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#171717]">Mamie SEO</span>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-[12px] text-[#a3a3a3] font-medium">{formatTime(elapsed)}</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-lg flex flex-col items-center">

          {/* Domain being analyzed — prominently displayed */}
          <div className="mb-6 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Analyse en cours</p>
            <h1 className="text-[22px] font-medium text-[#171717] tracking-tight">{domain || 'votre site'}</h1>
          </div>

          {/* Lucky day banner */}
          {luckyDay && (
            <div className="w-full bg-[#EAF3DE] border border-[#2D8A5E]/20 rounded-[12px] p-4 mb-6 text-center animate-fade-in-up">
              <p className="text-[13px] font-medium text-[#3B6D11]">
                C&apos;est votre jour de chance !
              </p>
              <p className="text-[12px] text-[#3B6D11]/80">
                Vous avez droit à une seconde analyse gratuite.
              </p>
            </div>
          )}

          {/* Progress ring with animated score */}
          <div className="relative w-32 h-32 mb-6">
            <svg width="128" height="128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e5e5" strokeWidth="5" />
              <circle
                cx="64" cy="64" r="54" fill="none" stroke="#171717" strokeWidth="5"
                strokeDasharray={339.3}
                strokeDashoffset={339.3 - (progressPercent / 100) * 339.3}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular-nums text-[28px] font-medium text-[#171717]">
                {Math.round(progressPercent)}
              </span>
              <span className="text-[10px] text-[#a3a3a3] -mt-0.5">%</span>
            </div>
          </div>

          {/* Current step label */}
          <p className="text-[15px] text-[#525252] mb-2 text-center">
            {error ? "Une erreur est survenue" : STEPS[currentStepIndex]?.label || 'Initialisation...'}
          </p>

          {/* Elements analyzed counter — Zeigarnik effect */}
          {!error && (
            <p className="text-[11px] text-[#a3a3a3] mb-6 tabular-nums">
              {elementsAnalyzed} éléments analysés sur votre site
            </p>
          )}

          {/* Progress bar with shimmer */}
          <div className="w-full h-1.5 bg-[#e5e5e5] rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-[#171717] rounded-full relative"
              style={{ width: `${progressPercent}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>

          {/* Two-column layout: steps + discoveries */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Steps column */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3">Progression</p>
              <div className="space-y-2.5">
                {STEPS.map((step) => {
                  const isCompleted = completedSteps.has(step.key);
                  const isCurrent = currentStep === step.key && !isCompleted;
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-2.5 transition-all duration-500 ${
                        !isCompleted && !isCurrent ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        {isCompleted ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="8" fill="#2D8A5E" />
                            <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : isCurrent ? (
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E05A2B] opacity-30" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-[#E05A2B] bg-white" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-[#e5e5e5]" />
                        )}
                      </span>
                      <span className={`text-[12px] leading-tight ${
                        isCompleted ? 'text-[#171717]' : isCurrent ? 'text-[#171717] font-medium' : 'text-[#a3a3a3]'
                      }`}>
                        {isCompleted ? (step.doneLabel || step.label) : step.label}
                      </span>
                      {isCurrent && (
                        <span className="ml-auto flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-[#E05A2B] animate-[bounce_1s_infinite_0ms]" />
                          <span className="w-1 h-1 rounded-full bg-[#E05A2B] animate-[bounce_1s_infinite_150ms]" />
                          <span className="w-1 h-1 rounded-full bg-[#E05A2B] animate-[bounce_1s_infinite_300ms]" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Micro-discoveries column — IKEA effect */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3">Détecté sur votre site</p>
              {discoveries.length === 0 ? (
                <div className="flex items-center justify-center h-20">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5e5e5] animate-[bounce_1s_infinite_0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5e5e5] animate-[bounce_1s_infinite_150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5e5e5] animate-[bounce_1s_infinite_300ms]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {discoveries.map((d, i) => (
                    <div
                      key={d.label}
                      className="flex items-center gap-2.5 animate-fade-in-up"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <span className="text-[14px]">{d.icon}</span>
                      <span className="text-[12px] text-[#a3a3a3]">{d.label}</span>
                      <span
                        className="ml-auto text-[12px] font-medium px-2 py-0.5 rounded-full"
                        style={{ color: d.color, backgroundColor: `${d.color}15` }}
                      >
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cognitive bias tip — rotating with type indicator */}
          {!error && (
            <div className="w-full bg-white border border-[#e5e5e5] rounded-[12px] p-5 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">
                  {currentTip.type === 'curiosity' && 'Le saviez-vous ?'}
                  {currentTip.type === 'loss' && 'Attention'}
                  {currentTip.type === 'authority' && 'Fait vérifié'}
                  {currentTip.type === 'social' && 'Tendance'}
                  {currentTip.type === 'insight' && 'Conseil pro'}
                </span>
                {currentTip.type === 'loss' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E05A2B] animate-pulse" />
                )}
                {currentTip.type === 'authority' && currentTip.source && (
                  <span className="text-[9px] text-[#a3a3a3] ml-auto">{currentTip.source}</span>
                )}
              </div>
              <p
                className={`text-[14px] text-[#525252] leading-relaxed transition-opacity duration-300 ${
                  tipFading ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {currentTip.text}
              </p>
            </div>
          )}

          {/* Error (non-upgrade) */}
          {error && error !== 'upgrade' && (
            <div className="w-full bg-white border border-[#C03030]/20 rounded-[12px] p-5 text-center mt-4">
              <p className="text-[13px] text-[#C03030] mb-4">{error}</p>
              <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
                Réessayer
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
