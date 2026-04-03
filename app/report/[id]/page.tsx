'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AuthHeader from '@/components/AuthHeader';
import type { Report, DeepPageAnalysis, DeepAnalysisResult } from '@/lib/types';
import ScoreGauge from '@/components/ScoreGauge';
import TechBlock from '@/components/TechBlock';
import CriteriaCard from '@/components/CriteriaCard';
import EditorialSection from '@/components/EditorialSection';
import ActionPlan from '@/components/ActionPlan';
import KeywordsSection from '@/components/KeywordsSection';
import ScoreRadar from '@/components/ScoreRadar';
import AnnotatedScreenshot from '@/components/AnnotatedScreenshot';
import AnnotationCard from '@/components/AnnotationCard';
import { generateSeoReportPdf, generateDeepAnalysisPdf } from '@/lib/pdf-export';
import { IconSearch, IconTarget, IconBarChart, IconStar, IconArrowRight, IconCreditCard } from '@/components/Icons';

const EDITORIAL_TITLES: Record<string, string> = {
  comprehension_activite: "Compréhension de l'activité",
  coherence_offres: 'Cohérence des offres',
  signaux_confiance: 'Signaux de confiance',
  call_to_action: 'Appels à l\'action',
  coherence_tonale: 'Cohérence tonale',
};

// Deep section titles removed — now using ScoreRadar + AnnotationCard

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { email: authEmail } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'seo' | 'page'>('seo');

  // Deep page analysis state
  const [customUrl, setCustomUrl] = useState('');
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepResult, setDeepResult] = useState<DeepAnalysisResult | null>(null);
  const [deepError, setDeepError] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [screenshotView, setScreenshotView] = useState<'desktop' | 'mobile'>('desktop');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoError, setPromoError] = useState('');

  const id = params.id as string;

  useEffect(() => {
    fetch(`/api/analyze?id=${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        return res.json();
      })
      .then((data: Report) => {
        setReport(data);
        setLoading(false);
        // Pre-fill suggested page URL
        if (data.editorialAnalysis?.page_recommandee?.url) {
          setCustomUrl(data.editorialAnalysis.page_recommandee.url);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Rapport introuvable.');
        setLoading(false);
      });
  }, [id]);

  // Check if returned from Stripe payment
  useEffect(() => {
    if (searchParams.get('paid') === 'true') {
      setActiveTab('page');
    }
  }, [searchParams]);

  const handleDeepAnalysis = async (url: string) => {
    const email = authEmail || sessionStorage.getItem('mamie_email');
    if (!email) {
      setDeepError('Session expirée. Veuillez relancer une analyse.');
      return;
    }

    setDeepLoading(true);
    setDeepError('');
    setDeepResult(null);

    try {
      const res = await fetch('/api/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id, email, pageUrl: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsPayment) {
          // Redirect to Stripe
          const checkoutRes = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, reportId: id }),
          });
          const checkoutData = await checkoutRes.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
          setDeepError(checkoutData.error || 'Erreur Stripe.');
        } else {
          setDeepError(data.error);
        }
        return;
      }

      setDeepResult({
        analysis: data.analysis,
        desktopScreenshot: data.desktopScreenshot,
        mobileScreenshot: data.mobileScreenshot,
        desktopWidth: data.desktopWidth,
        desktopHeight: data.desktopHeight,
        remainingCredits: data.remainingCredits,
      });
      setCredits(data.remainingCredits);
    } catch {
      setDeepError('Erreur de connexion.');
    } finally {
      setDeepLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[13px] text-[#73726C]">Chargement du rapport...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[13px] text-[#E05252] mb-4">{error || 'Rapport introuvable.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
          >
            Nouvelle analyse
          </button>
        </div>
      </div>
    );
  }

  const { crawlResult, technicalScore, editorialAnalysis } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;

  const suggestedPage = editorialAnalysis?.page_recommandee;

  return (
    <div className="min-h-screen">
      <AuthHeader showNewAnalysis />

      {/* Report header */}
      <div className="bg-white border-b border-[#EEEDEB] px-6 pt-6 pb-0">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-1">
              Rapport d&apos;analyse
            </p>
            <h1 className="text-[18px] font-medium text-[#1A1A18]">{report.url}</h1>
            <p className="text-[11px] text-[#C2C0B6] mt-1">
              {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-transparent">
            <button
              onClick={() => setActiveTab('seo')}
              className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === 'seo'
                  ? 'border-[#1A1A18] text-[#1A1A18]'
                  : 'border-transparent text-[#C2C0B6] hover:text-[#73726C]'
              }`}
            >
              Audit SEO
            </button>
            <button
              onClick={() => setActiveTab('page')}
              className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'page'
                  ? 'border-[#1A1A18] text-[#1A1A18]'
                  : 'border-transparent text-[#C2C0B6] hover:text-[#73726C]'
              }`}
            >
              Analyse de page
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#F27A2A]/10 text-[#F27A2A]">
                Pro
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ════════════════════════════ TAB: AUDIT SEO ════════════════════════════ */}
        {activeTab === 'seo' && (
          <div className="animate-fade-in-up">
            {/* Download PDF */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => generateSeoReportPdf(report)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEDEB] rounded-[8px] text-[12px] font-medium text-[#73726C] hover:text-[#1A1A18] hover:border-[#C2C0B6] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Télécharger le PDF
              </button>
            </div>

            {/* Bento row 1: Score + Tech metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Score card — spans 1 col */}
              <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-6 flex flex-col items-center justify-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-4">
                  Score global
                </p>
                <ScoreGauge score={combinedScore} size={140} />
                {editorialAnalysis && (
                  <div className="flex items-center gap-5 mt-5">
                    <div className="text-center">
                      <p className="tabular-nums text-[18px] font-medium text-[#1A1A18]">{technicalScore.total}</p>
                      <p className="text-[10px] text-[#C2C0B6] uppercase tracking-wider">Tech</p>
                    </div>
                    <div className="w-px h-6 bg-[#EEEDEB]" />
                    <div className="text-center">
                      <p className="tabular-nums text-[18px] font-medium text-[#1A1A18]">{editorialScore}</p>
                      <p className="text-[10px] text-[#C2C0B6] uppercase tracking-wider">Éditorial</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tech metrics — spans 2 cols */}
              <div className="lg:col-span-2">
                <TechBlock crawl={crawlResult} />
              </div>
            </div>

            {/* Bento row 2: Top criteria (2 cols) + editorial summary (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Worst 3 criteria */}
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] px-1">
                  Points critiques
                </h2>
                {[...technicalScore.criteria]
                  .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
                  .slice(0, 3)
                  .map((c, i) => (
                    <CriteriaCard key={c.key} criterion={c} index={i} />
                  ))}
              </div>

              {/* Editorial summary */}
              {editorialAnalysis && (
                <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 self-start">
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-3">
                    Résumé éditorial
                  </h3>
                  <p className="text-[13px] text-[#1A1A18] leading-relaxed mb-3">
                    {editorialAnalysis.comprehension_activite.resume}
                  </p>
                  <p className="text-[13px] text-[#73726C] leading-relaxed">
                    {editorialAnalysis.coherence_offres?.resume}
                  </p>
                  {suggestedPage && (
                    <div className="mt-4 pt-4 border-t border-dashed border-[#EEEDEB]">
                      <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#F27A2A] mb-1">
                        Page recommandée
                      </p>
                      <p className="text-[12px] text-[#73726C] leading-relaxed">
                        {suggestedPage.raison}
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab('page');
                          setCustomUrl(suggestedPage.url);
                        }}
                        className="mt-2 text-[11px] text-[#1A1A18] font-medium hover:underline flex items-center gap-1"
                      >
                        Analyser cette page <IconArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Full technical details */}
            <div className="mb-8">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-3 px-1">
                Tous les critères techniques
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {technicalScore.criteria.map((c, i) => (
                  <CriteriaCard key={c.key} criterion={c} index={i} />
                ))}
              </div>
            </div>

            {/* Editorial dimensions */}
            {editorialAnalysis && (
              <div className="mb-8">
                <h2 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-3 px-1">
                  Analyse éditoriale
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(EDITORIAL_TITLES) as string[]).map((key, i) => {
                    const dimension = editorialAnalysis[key as keyof typeof editorialAnalysis];
                    if (!dimension || typeof dimension !== 'object' || !('score' in dimension)) return null;
                    return (
                      <EditorialSection
                        key={key}
                        title={EDITORIAL_TITLES[key]}
                        dimension={dimension as { score: number; resume: string; point_fort: string; point_amelioration: string; exemple_concret?: string }}
                        index={i}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keywords + Action plan — side by side */}
            {editorialAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {editorialAnalysis.mots_cles_metier && (
                  <KeywordsSection keywords={editorialAnalysis.mots_cles_metier} />
                )}
                {editorialAnalysis.plan_action_prioritaire?.length > 0 && (
                  <ActionPlan actions={editorialAnalysis.plan_action_prioritaire} />
                )}
              </div>
            )}

            {/* Pages with warnings */}
            {crawlResult.pages.some((p) => p.h1Count !== 1 || !p.title || !p.metaDescription) && (
              <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 mb-8">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-4">
                  Pages à corriger
                </h3>
                <div className="space-y-0">
                  {crawlResult.pages
                    .filter((p) => p.h1Count !== 1 || !p.title || !p.metaDescription)
                    .slice(0, 10)
                    .map((page, i) => {
                      const issues: string[] = [];
                      if (!page.title) issues.push('Titre manquant');
                      if (!page.metaDescription) issues.push('Description manquante');
                      if (page.h1Count === 0) issues.push('Pas de H1');
                      if (page.h1Count > 1) issues.push(`${page.h1Count} H1`);
                      return (
                        <div key={page.url} className={`py-3 ${i > 0 ? 'border-t border-dashed border-[#EEEDEB]' : ''}`}>
                          <p className="text-[13px] text-[#1A1A18] truncate mb-1">{new URL(page.url).pathname || '/'}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {issues.map((issue, j) => (
                              <span key={j} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">{issue}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════ TAB: ANALYSE DE PAGE ════════════════════════════ */}
        {activeTab === 'page' && (
          <div className="animate-fade-in-up max-w-2xl mx-auto">
            {/* Page selector */}
            {!deepResult && !deepLoading && (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-[18px] font-medium text-[#1A1A18] mb-2">
                    Analyse approfondie d&apos;une page
                  </h2>
                  <p className="text-[13px] text-[#73726C] leading-relaxed">
                    Analyse UI, copywriting et conversion d&apos;une page spécifique.
                    Chaque analyse utilise 1 crédit.
                  </p>
                </div>

                {/* Suggested page */}
                {suggestedPage && (
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#F27A2A] mb-2">
                      Page recommandée par l&apos;analyse SEO
                    </p>
                    <p className="text-[14px] font-medium text-[#1A1A18] mb-1 truncate">
                      {new URL(suggestedPage.url).pathname}
                    </p>
                    <p className="text-[12px] text-[#73726C] mb-4 leading-relaxed">
                      {suggestedPage.raison}
                    </p>
                    <button
                      onClick={() => handleDeepAnalysis(suggestedPage.url)}
                      className="w-full py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                    >
                      Analyser cette page
                      <IconArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#EEEDEB]" />
                  <span className="text-[11px] text-[#C2C0B6]">ou</span>
                  <div className="flex-1 h-px bg-[#EEEDEB]" />
                </div>

                {/* Custom URL */}
                <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#73726C] mb-3">
                    Analyser une page de votre choix
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://monsite.fr/ma-page"
                      className="flex-1 px-4 py-3 bg-[#F8F8F7] border border-[#EEEDEB] rounded-[8px] text-[13px] text-[#1A1A18] placeholder:text-[#C2C0B6] outline-none focus:border-[#1A1A18] transition-colors"
                    />
                    <button
                      onClick={() => customUrl && handleDeepAnalysis(customUrl)}
                      disabled={!customUrl}
                      className="px-5 py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 shrink-0"
                    >
                      Analyser
                    </button>
                  </div>
                </div>

                {/* Pricing + Promo */}
                <div className="bg-[#F8F8F7] border border-[#EEEDEB] rounded-[12px] p-5">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <IconCreditCard size={16} className="text-[#73726C]" />
                      <span className="text-[14px] font-medium text-[#1A1A18]">3 analyses pour 4,90 EUR</span>
                    </div>
                    <p className="text-[12px] text-[#73726C] leading-relaxed">
                      Analyse UI, copywriting, conversion et recommandations actionnables par IA pour chaque page.
                    </p>
                    {credits !== null && credits > 0 && (
                      <p className="text-[11px] text-[#22A168] mt-2 font-medium">
                        Vous avez {credits} crédit{credits > 1 ? 's' : ''} restant{credits > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Promo code */}
                  <div className="pt-4 border-t border-dashed border-[#EEEDEB]">
                    <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-2 text-center">
                      Code promo
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoMessage(''); }}
                        placeholder="VOTRECODE"
                        className="flex-1 px-3 py-2.5 bg-white border border-[#EEEDEB] rounded-[8px] text-[13px] text-[#1A1A18] placeholder:text-[#C2C0B6] outline-none focus:border-[#1A1A18] transition-colors text-center uppercase tracking-wider"
                      />
                      <button
                        onClick={async () => {
                          if (!promoCode.trim()) return;
                          const email = authEmail || sessionStorage.getItem('mamie_email');
                          if (!email) { setPromoError('Session expirée.'); return; }
                          setPromoLoading(true);
                          setPromoError('');
                          setPromoMessage('');
                          try {
                            const res = await fetch('/api/promo', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: promoCode.trim(), email }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setPromoMessage(data.message);
                              setCredits((prev) => (prev ?? 0) + data.credits);
                              setPromoCode('');
                            } else {
                              setPromoError(data.error);
                            }
                          } catch {
                            setPromoError('Erreur de connexion.');
                          } finally {
                            setPromoLoading(false);
                          }
                        }}
                        disabled={promoLoading || !promoCode.trim()}
                        className="px-4 py-2.5 bg-[#1A1A18] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 shrink-0"
                      >
                        {promoLoading ? '...' : 'Appliquer'}
                      </button>
                    </div>
                    {promoError && <p className="text-[11px] text-[#E05252] mt-2 text-center">{promoError}</p>}
                    {promoMessage && <p className="text-[11px] text-[#22A168] mt-2 text-center font-medium">{promoMessage}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {deepLoading && (
              <div className="flex flex-col items-center py-16">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-2 border-[#EEEDEB] rounded-full" />
                  <div className="absolute inset-0 border-2 border-t-[#1A1A18] rounded-full animate-spin" />
                </div>
                <p className="text-[14px] font-medium text-[#1A1A18] mb-1">Analyse en cours...</p>
                <p className="text-[12px] text-[#73726C]">Claude analyse le contenu, la structure et le copywriting de votre page.</p>
              </div>
            )}

            {/* Error */}
            {deepError && !deepLoading && (
              <div className="bg-white border border-[#E05252]/20 rounded-[12px] p-5 text-center my-8">
                <p className="text-[13px] text-[#E05252] mb-4">{deepError}</p>
                <button
                  onClick={() => setDeepError('')}
                  className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Deep analysis results */}
            {deepResult && (
              <div className="space-y-6 max-w-none">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-medium text-[#1A1A18]">Analyse approfondie</h2>
                  <button
                    onClick={() => { setDeepResult(null); setDeepError(''); setActiveAnnotation(null); }}
                    className="text-[11px] text-[#73726C] hover:text-[#1A1A18] transition-colors"
                  >
                    Analyser une autre page
                  </button>
                </div>

                {/* Row 1: Score + Radar + Executive summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-6 flex flex-col items-center justify-center">
                    <ScoreGauge score={deepResult.analysis.score_global} size={140} label="Score page" />
                  </div>
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 flex items-center justify-center">
                    <ScoreRadar scores={deepResult.analysis.scores_par_dimension} />
                  </div>
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-3">Diagnostic</h3>
                    <p className="text-[13px] text-[#1A1A18] leading-relaxed">{deepResult.analysis.resume_executif}</p>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-dashed border-[#EEEDEB]">
                      {[
                        { color: '#E05252', label: 'Critique' },
                        { color: '#F27A2A', label: 'Avertissement' },
                        { color: '#22A168', label: 'Positif' },
                        { color: '#3B82F6', label: 'Info' },
                      ].map((l) => (
                        <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-[#73726C]">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Annotated screenshot (only if screenshot is available) */}
                {deepResult.desktopScreenshot && <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6]">
                      Capture annotée
                    </h3>
                    {deepResult.mobileScreenshot && (
                      <div className="flex bg-[#F8F8F7] rounded-[8px] p-0.5">
                        <button
                          onClick={() => setScreenshotView('desktop')}
                          className={`px-3 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                            screenshotView === 'desktop' ? 'bg-white text-[#1A1A18] shadow-sm' : 'text-[#73726C]'
                          }`}
                        >
                          Desktop
                        </button>
                        <button
                          onClick={() => setScreenshotView('mobile')}
                          className={`px-3 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                            screenshotView === 'mobile' ? 'bg-white text-[#1A1A18] shadow-sm' : 'text-[#73726C]'
                          }`}
                        >
                          Mobile
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={`${screenshotView === 'mobile' ? 'max-w-[240px] mx-auto' : ''}`}>
                    <AnnotatedScreenshot
                      screenshot={screenshotView === 'mobile' && deepResult.mobileScreenshot
                        ? deepResult.mobileScreenshot
                        : deepResult.desktopScreenshot}
                      annotations={deepResult.analysis.annotations}
                      activeAnnotation={activeAnnotation}
                      onAnnotationClick={(id) => {
                        setActiveAnnotation(id);
                        if (id !== null) {
                          document.getElementById(`annotation-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      isMobile={screenshotView === 'mobile'}
                    />
                  </div>
                </div>}

                {/* Row 3: Annotation cards */}
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-3 px-1">
                    Annotations ({deepResult.analysis.annotations.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deepResult.analysis.annotations.map((ann) => (
                      <AnnotationCard
                        key={ann.id}
                        annotation={ann}
                        isActive={activeAnnotation === ann.id}
                        onMouseEnter={() => setActiveAnnotation(ann.id)}
                        onMouseLeave={() => setActiveAnnotation(null)}
                        onClick={() => setActiveAnnotation(activeAnnotation === ann.id ? null : ann.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Row 4: Mobile + Coherence side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Mobile analysis */}
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6]">Expérience mobile</h3>
                      <span className="tabular-nums text-[18px] font-medium" style={{
                        color: deepResult.analysis.analyse_mobile.score < 40 ? '#E05252' : deepResult.analysis.analyse_mobile.score < 65 ? '#F27A2A' : deepResult.analysis.analyse_mobile.score < 85 ? '#F0C744' : '#22A168'
                      }}>{deepResult.analysis.analyse_mobile.score}</span>
                    </div>
                    {deepResult.analysis.analyse_mobile.problemes_critiques.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-medium text-[#E05252] uppercase tracking-wider mb-1">Problèmes</p>
                        <ul className="space-y-1">
                          {deepResult.analysis.analyse_mobile.problemes_critiques.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px] text-[#73726C]">
                              <span className="w-1 h-1 rounded-full bg-[#E05252] mt-1.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {deepResult.analysis.analyse_mobile.points_positifs.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-[#22A168] uppercase tracking-wider mb-1">Points positifs</p>
                        <ul className="space-y-1">
                          {deepResult.analysis.analyse_mobile.points_positifs.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px] text-[#73726C]">
                              <span className="w-1 h-1 rounded-full bg-[#22A168] mt-1.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Visual coherence */}
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6]">Cohérence visuelle</h3>
                      <span className="tabular-nums text-[18px] font-medium" style={{
                        color: deepResult.analysis.analyse_coherence_visuelle.score < 40 ? '#E05252' : deepResult.analysis.analyse_coherence_visuelle.score < 65 ? '#F27A2A' : deepResult.analysis.analyse_coherence_visuelle.score < 85 ? '#F0C744' : '#22A168'
                      }}>{deepResult.analysis.analyse_coherence_visuelle.score}</span>
                    </div>
                    <div className="space-y-2 text-[12px] text-[#73726C]">
                      <p><span className="text-[#1A1A18] font-medium">Palette :</span> {deepResult.analysis.analyse_coherence_visuelle.palette_detectee}</p>
                      <p><span className="text-[#1A1A18] font-medium">Couleurs :</span> {deepResult.analysis.analyse_coherence_visuelle.coherence_couleurs}</p>
                      <p><span className="text-[#1A1A18] font-medium">Typo :</span> {deepResult.analysis.analyse_coherence_visuelle.coherence_typographie}</p>
                      {deepResult.analysis.analyse_coherence_visuelle.problemes_detectes.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {deepResult.analysis.analyse_coherence_visuelle.problemes_detectes.map((p, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-[#F27A2A] mt-1.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 5: Action plan */}
                {deepResult.analysis.plan_action?.length > 0 && (
                  <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-4">
                      Plan d&apos;action priorisé
                    </h3>
                    <div className="space-y-0">
                      {deepResult.analysis.plan_action.map((action, i) => (
                        <div key={i} className={`flex items-start gap-4 py-4 ${i > 0 ? 'border-t border-dashed border-[#EEEDEB]' : ''}`}>
                          <span className="w-7 h-7 shrink-0 rounded-full bg-[#F8F8F7] flex items-center justify-center text-[13px] font-medium text-[#1A1A18]">
                            {action.priorite}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#1A1A18] mb-1">{action.action}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#F8F8F7] text-[#73726C] border border-[#EEEDEB]">{action.categorie}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#F8F8F7] text-[#73726C] border border-[#EEEDEB]">Impact {action.impact}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#F8F8F7] text-[#73726C] border border-[#EEEDEB]">{action.difficulte}</span>
                              {action.temps_estime && <span className="text-[10px] text-[#C2C0B6]">~{action.temps_estime}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#C2C0B6] mb-3">Verdict</h3>
                  <p className="text-[13px] text-[#1A1A18] leading-relaxed">{deepResult.analysis.verdict_final}</p>
                </div>

                {/* Download deep analysis PDF */}
                <div className="flex justify-center">
                  <button
                    onClick={() => generateDeepAnalysisPdf(deepResult.analysis, customUrl || '', report.url)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A18] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Télécharger l&apos;analyse en PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 mt-4 border-t border-[#EEEDEB]">
          <button
            onClick={() => router.push('/')}
            className="text-[11px] text-[#73726C] hover:text-[#1A1A18] transition-colors"
          >
            Analyser un autre site
          </button>
        </div>
      </main>
    </div>
  );
}
