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
import { ArrowRight, CreditCard, Search } from 'lucide-react';

const EDITORIAL_TITLES: Record<string, string> = {
  comprehension_activite: "Compréhension de l'activité",
  coherence_offres: 'Cohérence des offres',
  signaux_confiance: 'Signaux de confiance',
  call_to_action: 'Appels à l\'action',
  coherence_tonale: 'Cohérence tonale',
};

type SeoSection = 'overview' | 'technical' | 'editorial' | 'actions';

const SEO_SECTIONS: { key: SeoSection; label: string }[] = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'technical', label: 'Technique' },
  { key: 'editorial', label: 'Éditorial' },
  { key: 'actions', label: 'Actions' },
];

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { email: authEmail, user } = useAuth();
  const isAuthenticated = !!user;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'seo' | 'page'>('seo');
  const [activeSection, setActiveSection] = useState<SeoSection>('overview');

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
        if (data.editorialAnalysis?.page_recommandee?.url) {
          setCustomUrl(data.editorialAnalysis.page_recommandee.url);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Rapport introuvable.');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (searchParams.get('paid') === 'true') setActiveTab('page');
  }, [searchParams]);

  const handleDeepAnalysis = async (url: string) => {
    const email = authEmail || sessionStorage.getItem('mamie_email');
    if (!email) { setDeepError('Session expirée.'); return; }
    setDeepLoading(true); setDeepError(''); setDeepResult(null);
    try {
      const res = await fetch('/api/deep-analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id, email, pageUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsPayment) {
          const cr = await fetch('/api/create-checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, reportId: id }),
          });
          const cd = await cr.json();
          if (cd.url) { window.location.href = cd.url; return; }
          setDeepError(cd.error || 'Erreur Stripe.');
        } else { setDeepError(data.error); }
        return;
      }
      setDeepResult({ analysis: data.analysis, desktopScreenshot: data.desktopScreenshot, mobileScreenshot: data.mobileScreenshot, desktopWidth: data.desktopWidth, desktopHeight: data.desktopHeight, remainingCredits: data.remainingCredits });
      setCredits(data.remainingCredits);
    } catch { setDeepError('Erreur de connexion.'); }
    finally { setDeepLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-[15px] text-[#525252]">Chargement du rapport...</p></div>;
  if (error || !report) return <div className="min-h-screen flex items-center justify-center px-6"><div className="text-center"><p className="text-[13px] text-[#E05252] mb-4">{error || 'Rapport introuvable.'}</p><button onClick={() => router.push('/')} className="px-6 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[10px] hover:bg-[#333] transition-colors">Nouvelle analyse</button></div></div>;

  const { crawlResult, technicalScore, editorialAnalysis } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis ? Math.round((technicalScore.total + editorialScore) / 2) : technicalScore.total;
  const suggestedPage = editorialAnalysis?.page_recommandee;

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader showNewAnalysis />

      {/* ═══════════ REPORT HEADER ═══════════ */}
      <div className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-0">

          {/* URL + date + PDF */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Rapport d&apos;analyse</p>
              <h1 className="text-[20px] lg:text-[24px] font-medium text-[#171717]">{report.url}</h1>
              <p className="text-[12px] text-[#a3a3a3] mt-1">
                {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' · '}{crawlResult.totalUrlsCrawled} pages crawlées
              </p>
            </div>
            <button
              onClick={() => generateSeoReportPdf(report)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e5e5] rounded-[10px] text-[12px] font-medium text-[#525252] hover:text-[#171717] hover:border-[#a3a3a3] transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              PDF
            </button>
          </div>

          {/* ═══ Score dashboard cards ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {/* Global score */}
            <div className="card-elevated p-4 flex flex-col items-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3">Score global</p>
              <ScoreGauge score={combinedScore} size={90} />
            </div>
            {/* Tech score */}
            <div className="card p-4 flex flex-col">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-2">Technique</p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[28px] text-[#171717] leading-none">{technicalScore.total}</span>
                <span className="text-[11px] text-[#a3a3a3]">/100</span>
              </div>
              <div className="mt-auto pt-3 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${technicalScore.total}%`, backgroundColor: technicalScore.total < 40 ? '#E05252' : technicalScore.total < 65 ? '#E05A2B' : technicalScore.total < 85 ? '#F0C744' : '#22A168' }} />
              </div>
            </div>
            {/* Editorial score */}
            <div className="card p-4 flex flex-col">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-2">Éditorial</p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[28px] text-[#171717] leading-none">{editorialAnalysis ? editorialScore : '—'}</span>
                <span className="text-[11px] text-[#a3a3a3]">{editorialAnalysis ? '/100' : ''}</span>
              </div>
              {editorialAnalysis ? (
                <div className="mt-auto pt-3 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${editorialScore}%`, backgroundColor: editorialScore < 40 ? '#E05252' : editorialScore < 65 ? '#E05A2B' : editorialScore < 85 ? '#F0C744' : '#22A168' }} />
                </div>
              ) : (
                <p className="text-[10px] text-[#a3a3a3] mt-1">Non disponible</p>
              )}
            </div>
            {/* Tech detection */}
            <div className="card p-4 flex flex-col">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-2">Détecté</p>
              <div className="flex flex-wrap gap-1.5">
                {crawlResult.isHttps && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">HTTPS</span>}
                {crawlResult.sitemapFound && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">Sitemap</span>}
                {crawlResult.technologies.filter(t => t.category === 'cms').map(t => (
                  <span key={t.name} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EEEDFE] text-[#3C3489]">{t.name}</span>
                ))}
                {crawlResult.technologies.filter(t => t.category === 'analytics').map(t => (
                  <span key={t.name} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">{t.name}</span>
                ))}
              </div>
              <p className="text-[10px] text-[#a3a3a3] mt-auto pt-2">{(crawlResult.homepageResponseTimeMs / 1000).toFixed(1)}s de chargement</p>
            </div>
          </div>

          {/* ═══ Centered main tabs ═══ */}
          <div className="flex justify-center border-b border-transparent -mb-px">
            <button
              onClick={() => setActiveTab('seo')}
              className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'seo' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'}`}
            >
              Audit SEO
            </button>
            <button
              onClick={() => setActiveTab('page')}
              className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'page' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'}`}
            >
              Analyse de page
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E05A2B]/10 text-[#E05A2B]">Pro</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ CONTENT ═══════════ */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-8">

        {/* ════════ TAB: AUDIT SEO ════════ */}
        {activeTab === 'seo' && (
          <div className="animate-fade-in-up">

            {/* Section navigation */}
            <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-px border-b border-[#e5e5e5]">
              {SEO_SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`section-tab ${activeSection === s.key ? 'section-tab-active' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* ──── SECTION: Vue d'ensemble ──── */}
            {activeSection === 'overview' && (
              <div className="animate-fade-in-up space-y-6">
                {/* Top 3 critical + editorial summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-3">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] px-1">
                      Points critiques
                    </h2>
                    {[...technicalScore.criteria]
                      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
                      .slice(0, 3)
                      .map((c, i) => <CriteriaCard key={c.key} criterion={c} index={i} />)}
                  </div>

                  {editorialAnalysis && (
                    <div className="card p-6 self-start">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3">Résumé éditorial</h3>
                      <p className="text-[15px] text-[#171717] leading-relaxed mb-3">{editorialAnalysis.comprehension_activite.resume}</p>
                      <p className="text-[14px] text-[#525252] leading-relaxed">{editorialAnalysis.coherence_offres?.resume}</p>
                      {suggestedPage && (
                        <div className="mt-4 pt-4 border-t border-dashed border-[#e5e5e5]">
                          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#E05A2B] mb-1">Page recommandée</p>
                          <p className="text-[13px] text-[#525252] leading-relaxed">{suggestedPage.raison}</p>
                          <button onClick={() => { setActiveTab('page'); setCustomUrl(suggestedPage.url); }} className="mt-2 text-[11px] text-[#E05A2B] font-medium hover:underline flex items-center gap-1">
                            Analyser cette page <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tech metrics */}
                <TechBlock crawl={crawlResult} />

                {/* Quick-win action items (top 3) */}
                {(editorialAnalysis?.plan_action_prioritaire?.length ?? 0) > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Quick wins</h3>
                      <button onClick={() => setActiveSection('actions')} className="text-[11px] text-[#E05A2B] font-medium hover:underline">
                        Voir tout le plan
                      </button>
                    </div>
                    {editorialAnalysis!.plan_action_prioritaire.slice(0, 3).map((action, i) => (
                      <div key={i} className={`flex items-start gap-4 py-3 ${i > 0 ? 'border-t border-dashed border-[#e5e5e5]' : ''}`}>
                        <span className="w-7 h-7 shrink-0 rounded-full bg-white flex items-center justify-center text-[13px] font-medium text-[#171717]">{action.priorite}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#171717] mb-1">{action.titre}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white text-[#525252] border border-[#e5e5e5]">Impact {action.impact}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white text-[#525252] border border-[#e5e5e5]">{action.difficulte}</span>
                            {action.temps_estime && <span className="text-[10px] text-[#a3a3a3]">~{action.temps_estime}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──── SECTION: Technique ──── */}
            {activeSection === 'technical' && (
              <div className="animate-fade-in-up space-y-6">
                {!isAuthenticated ? (
                  <BlurGate id={id} />
                ) : (<>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {technicalScore.criteria.map((c, i) => <CriteriaCard key={c.key} criterion={c} index={i} />)}
                  </div>
                  {crawlResult.pages.some((p) => p.h1Count !== 1 || !p.title || !p.metaDescription) && (
                    <div className="card p-6">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">Pages à corriger</h3>
                      {crawlResult.pages.filter((p) => p.h1Count !== 1 || !p.title || !p.metaDescription).slice(0, 10).map((page, i) => {
                        const issues: string[] = [];
                        if (!page.title) issues.push('Titre manquant');
                        if (!page.metaDescription) issues.push('Description manquante');
                        if (page.h1Count === 0) issues.push('Pas de H1');
                        if (page.h1Count > 1) issues.push(`${page.h1Count} H1`);
                        return (
                          <div key={page.url} className={`py-3 ${i > 0 ? 'border-t border-dashed border-[#e5e5e5]' : ''}`}>
                            <p className="text-[14px] text-[#171717] truncate mb-1">{new URL(page.url).pathname || '/'}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {issues.map((issue, j) => <span key={j} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">{issue}</span>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>)}
              </div>
            )}

            {/* ──── SECTION: Éditorial ──── */}
            {activeSection === 'editorial' && (
              <div className="animate-fade-in-up space-y-6">
                {!isAuthenticated ? (
                  <BlurGate id={id} />
                ) : editorialAnalysis ? (<>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.keys(EDITORIAL_TITLES) as string[]).map((key, i) => {
                      const dim = editorialAnalysis[key as keyof typeof editorialAnalysis];
                      if (!dim || typeof dim !== 'object' || !('score' in dim)) return null;
                      return <EditorialSection key={key} title={EDITORIAL_TITLES[key]} dimension={dim as { score: number; resume: string; point_fort: string; point_amelioration: string; exemple_concret?: string }} index={i} />;
                    })}
                  </div>
                  {editorialAnalysis.mots_cles_metier && <KeywordsSection keywords={editorialAnalysis.mots_cles_metier} />}
                </>) : (
                  <div className="card p-12 text-center">
                    <p className="text-[14px] text-[#525252]">Analyse éditoriale non disponible pour ce rapport.</p>
                  </div>
                )}
              </div>
            )}

            {/* ──── SECTION: Actions ──── */}
            {activeSection === 'actions' && (
              <div className="animate-fade-in-up space-y-6">
                {!isAuthenticated ? (
                  <BlurGate id={id} />
                ) : (<>
                  {(editorialAnalysis?.plan_action_prioritaire?.length ?? 0) > 0 && <ActionPlan actions={editorialAnalysis!.plan_action_prioritaire} />}
                  {editorialAnalysis?.mots_cles_metier && <KeywordsSection keywords={editorialAnalysis!.mots_cles_metier} />}
                  {!editorialAnalysis?.plan_action_prioritaire?.length && (
                    <div className="card p-12 text-center">
                      <p className="text-[14px] text-[#525252]">Plan d&apos;action non disponible pour ce rapport.</p>
                    </div>
                  )}
                </>)}
              </div>
            )}

            {/* ═══ CTA CONTACT — personal, prominent ═══ */}
            <div className="mt-12 border-2 border-[#E05A2B] rounded-2xl overflow-hidden">
              <div className="bg-neutral-900 px-8 py-6 text-white">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-[#E05A2B] flex items-center justify-center text-white text-[16px] font-bold shrink-0">M</div>
                  <div>
                    <p className="text-[15px] font-medium">Maxence</p>
                    <p className="text-[12px] text-neutral-400">Développeur & UI/UX Designer</p>
                  </div>
                </div>
                <p className="text-[15px] text-neutral-300 leading-relaxed">
                  Je conçois des sites qui convertissent. Si ces résultats vous semblent complexes à corriger seul, je peux vous proposer une feuille de route claire — ou m&apos;en occuper directement.
                </p>
              </div>
              <div className="bg-white px-8 py-5 flex flex-col sm:flex-row items-center gap-3">
                {process.env.NEXT_PUBLIC_CAL_LINK ? (
                  <a href={process.env.NEXT_PUBLIC_CAL_LINK} target="_blank" rel="noopener noreferrer"
                    className="cta-accent px-7 py-3.5 text-[14px] inline-flex items-center gap-2 w-full sm:w-auto justify-center">
                    Réserver un appel gratuit de 30 min <ArrowRight size={14} />
                  </a>
                ) : (
                  <a href={`/contact?report=${id}&url=${encodeURIComponent(report.url)}&score=${combinedScore}`}
                    className="cta-accent px-7 py-3.5 text-[14px] inline-flex items-center gap-2 w-full sm:w-auto justify-center">
                    Discuter de mon projet <ArrowRight size={14} />
                  </a>
                )}
                <a href={`/contact?report=${id}&url=${encodeURIComponent(report.url)}&score=${combinedScore}`}
                  className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors">
                  Ou m&apos;écrire directement
                </a>
              </div>
            </div>

            {/* ═══ UPSELL — Analyse UI Pro ═══ */}
            <div className="card border-2 border-[#E05A2B]/20 p-8 mt-6">
              <div className="max-w-xl mx-auto text-center">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[#E05A2B]/10 text-[#E05A2B] mb-3">Aller plus loin</span>
                <h3 className="text-[18px] font-medium text-[#171717] mb-2">Analyse UI avancée — votre page en détail</h3>
                <p className="text-[14px] text-[#525252] leading-relaxed mb-5">
                  Screenshot annoté, analyse design & UX, copywriting section par section, recommandations mobile.
                </p>
                <button onClick={() => setActiveTab('page')} className="cta-accent px-7 py-3 text-[13px] inline-flex items-center gap-2">
                  Analyser ma homepage — 1 crédit <ArrowRight size={14} />
                </button>
                <p className="text-[11px] text-[#a3a3a3] mt-3">1 crédit = 1 page &middot; 3 crédits pour 4,90 EUR</p>
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB: ANALYSE DE PAGE (Pro) ════════ */}
        {activeTab === 'page' && (
          <div className="animate-fade-in-up max-w-3xl mx-auto">
            {/* Page selector */}
            {!deepResult && !deepLoading && (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <h2 className="text-[20px] font-medium text-[#171717] mb-2">Analyse approfondie d&apos;une page</h2>
                  <p className="text-[15px] text-[#525252]">Analyse UI, copywriting et conversion. Chaque analyse utilise 1 crédit.</p>
                </div>
                {suggestedPage && (
                  <div className="card p-6">
                    <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#E05A2B] mb-2">Page recommandée par l&apos;analyse SEO</p>
                    <p className="text-[14px] font-medium text-[#171717] mb-1 truncate">{(() => { try { return new URL(suggestedPage.url).pathname; } catch { return suggestedPage.url; } })()}</p>
                    <p className="text-[13px] text-[#525252] mb-4 leading-relaxed">{suggestedPage.raison}</p>
                    <button onClick={() => handleDeepAnalysis(suggestedPage.url)} className="w-full cta-accent py-3 text-[13px] flex items-center justify-center gap-2">
                      Analyser cette page <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3"><div className="flex-1 h-px bg-[#e5e5e5]" /><span className="text-[12px] text-[#a3a3a3]">ou</span><div className="flex-1 h-px bg-[#e5e5e5]" /></div>
                <div className="card p-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#525252] mb-3">Analyser une page de votre choix</p>
                  <div className="flex gap-2">
                    <input type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://monsite.fr/ma-page" className="flex-1 px-4 py-3 bg-white border border-[#e5e5e5] rounded-[10px] text-[14px] text-[#171717] placeholder:text-[#a3a3a3] outline-none focus:border-[#171717] transition-colors" />
                    <button onClick={() => customUrl && handleDeepAnalysis(customUrl)} disabled={!customUrl} className="px-5 py-3 bg-[#171717] text-white text-[13px] font-medium rounded-[10px] hover:bg-[#333] transition-colors disabled:opacity-30 shrink-0">Analyser</button>
                  </div>
                </div>
                {/* Pricing + Promo */}
                <div className="card bg-white p-6">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CreditCard size={16} className="text-[#525252]" />
                      <span className="text-[14px] font-medium text-[#171717]">3 analyses pour 4,90 EUR</span>
                    </div>
                    <p className="text-[13px] text-[#525252]">Analyse UI, copywriting, conversion et recommandations par IA.</p>
                    {credits !== null && credits > 0 && <p className="text-[11px] text-[#22A168] mt-2 font-medium">{credits} crédit{credits > 1 ? 's' : ''} restant{credits > 1 ? 's' : ''}</p>}
                  </div>
                  <div className="pt-4 border-t border-dashed border-[#e5e5e5]">
                    <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-2 text-center">Code promo</p>
                    <div className="flex gap-2">
                      <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoMessage(''); }} placeholder="VOTRECODE" className="flex-1 px-3 py-2.5 bg-white border border-[#e5e5e5] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#a3a3a3] outline-none focus:border-[#171717] transition-colors text-center uppercase tracking-wider" />
                      <button
                        onClick={async () => {
                          if (!promoCode.trim()) return;
                          const email = authEmail || sessionStorage.getItem('mamie_email');
                          if (!email) { setPromoError('Session expirée.'); return; }
                          setPromoLoading(true); setPromoError(''); setPromoMessage('');
                          try {
                            const res = await fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoCode.trim(), email }) });
                            const data = await res.json();
                            if (res.ok) { setPromoMessage(data.message); setCredits((prev) => (prev ?? 0) + data.credits); setPromoCode(''); }
                            else { setPromoError(data.error); }
                          } catch { setPromoError('Erreur de connexion.'); }
                          finally { setPromoLoading(false); }
                        }}
                        disabled={promoLoading || !promoCode.trim()}
                        className="px-4 py-2.5 bg-[#171717] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 shrink-0"
                      >{promoLoading ? '...' : 'Appliquer'}</button>
                    </div>
                    {promoError && <p className="text-[11px] text-[#E05252] mt-2 text-center">{promoError}</p>}
                    {promoMessage && <p className="text-[11px] text-[#22A168] mt-2 text-center font-medium">{promoMessage}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Deep loading */}
            {deepLoading && (
              <div className="py-12 text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-[3px] border-[#e5e5e5] rounded-full" />
                  <div className="absolute inset-0 border-[3px] border-t-[#171717] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                  <div className="absolute inset-2 border-[2px] border-[#e5e5e5] rounded-full" />
                  <div className="absolute inset-2 border-[2px] border-t-transparent border-r-[#E05A2B] border-b-transparent border-l-transparent rounded-full animate-spin-slow" />
                  <div className="absolute inset-0 flex items-center justify-center"><Search size={20} /></div>
                </div>
                <h3 className="text-[18px] font-medium text-[#171717] mb-2">Analyse en cours</h3>
                <p className="text-[14px] text-[#525252] max-w-sm mx-auto">Claude examine votre page section par section.</p>
              </div>
            )}

            {/* Deep error */}
            {deepError && !deepLoading && (
              <div className="card border-[#E05252]/20 p-6 text-center my-8">
                <p className="text-[13px] text-[#E05252] mb-4">{deepError}</p>
                <button onClick={() => setDeepError('')} className="px-6 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[10px] hover:bg-[#333] transition-colors">Réessayer</button>
              </div>
            )}

            {/* Deep results */}
            {deepResult && (
              <div className="space-y-6 max-w-none" style={{ maxWidth: '100%' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-medium text-[#171717]">Analyse approfondie</h2>
                  <button onClick={() => { setDeepResult(null); setDeepError(''); setActiveAnnotation(null); }} className="text-[13px] text-[#525252] hover:text-[#171717]">Autre page</button>
                </div>
                {/* Score + Radar + Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="card p-6 flex flex-col items-center justify-center"><ScoreGauge score={deepResult.analysis.score_global} size={140} label="Score page" /></div>
                  <div className="card p-5 flex items-center justify-center"><ScoreRadar scores={deepResult.analysis.scores_par_dimension} /></div>
                  <div className="card p-5">
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3">Diagnostic</h3>
                    <p className="text-[14px] text-[#171717] leading-relaxed">{deepResult.analysis.resume_executif}</p>
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-dashed border-[#e5e5e5]">
                      {[{ color: '#E05252', label: 'Critique' }, { color: '#E05A2B', label: 'Avertissement' }, { color: '#22A168', label: 'Positif' }, { color: '#3B82F6', label: 'Info' }].map((l) => (
                        <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-[#525252]"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />{l.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Screenshot */}
                {deepResult.desktopScreenshot && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Capture annotée</h3>
                      {deepResult.mobileScreenshot && (
                        <div className="flex bg-white rounded-[8px] p-0.5">
                          <button onClick={() => setScreenshotView('desktop')} className={`px-3 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${screenshotView === 'desktop' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#525252]'}`}>Desktop</button>
                          <button onClick={() => setScreenshotView('mobile')} className={`px-3 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${screenshotView === 'mobile' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#525252]'}`}>Mobile</button>
                        </div>
                      )}
                    </div>
                    <div className={screenshotView === 'mobile' ? 'max-w-[240px] mx-auto' : ''}>
                      <AnnotatedScreenshot screenshot={screenshotView === 'mobile' && deepResult.mobileScreenshot ? deepResult.mobileScreenshot : deepResult.desktopScreenshot} annotations={deepResult.analysis.annotations} activeAnnotation={activeAnnotation} onAnnotationClick={(anId) => { setActiveAnnotation(anId); if (anId !== null) document.getElementById(`annotation-card-${anId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} isMobile={screenshotView === 'mobile'} />
                    </div>
                  </div>
                )}
                {/* Annotations */}
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3 px-1">Annotations ({deepResult.analysis.annotations.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deepResult.analysis.annotations.map((ann) => <AnnotationCard key={ann.id} annotation={ann} isActive={activeAnnotation === ann.id} onMouseEnter={() => setActiveAnnotation(ann.id)} onMouseLeave={() => setActiveAnnotation(null)} onClick={() => setActiveAnnotation(activeAnnotation === ann.id ? null : ann.id)} />)}
                  </div>
                </div>
                {/* Mobile + Coherence */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Expérience mobile</h3>
                      <span className="font-display text-[22px]" style={{ color: deepResult.analysis.analyse_mobile.score < 40 ? '#E05252' : deepResult.analysis.analyse_mobile.score < 65 ? '#E05A2B' : '#22A168' }}>{deepResult.analysis.analyse_mobile.score}</span>
                    </div>
                    {deepResult.analysis.analyse_mobile.problemes_critiques.length > 0 && <div className="mb-3"><p className="text-[10px] font-medium text-[#E05252] uppercase tracking-wider mb-1">Problèmes</p><ul className="space-y-1">{deepResult.analysis.analyse_mobile.problemes_critiques.map((p, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-[#525252]"><span className="w-1 h-1 rounded-full bg-[#E05252] mt-1.5 shrink-0" />{p}</li>)}</ul></div>}
                    {deepResult.analysis.analyse_mobile.points_positifs.length > 0 && <div><p className="text-[10px] font-medium text-[#22A168] uppercase tracking-wider mb-1">Points positifs</p><ul className="space-y-1">{deepResult.analysis.analyse_mobile.points_positifs.map((p, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-[#525252]"><span className="w-1 h-1 rounded-full bg-[#22A168] mt-1.5 shrink-0" />{p}</li>)}</ul></div>}
                  </div>
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Cohérence visuelle</h3>
                      <span className="font-display text-[22px]" style={{ color: deepResult.analysis.analyse_coherence_visuelle.score < 40 ? '#E05252' : deepResult.analysis.analyse_coherence_visuelle.score < 65 ? '#E05A2B' : '#22A168' }}>{deepResult.analysis.analyse_coherence_visuelle.score}</span>
                    </div>
                    <div className="space-y-2 text-[13px] text-[#525252]">
                      <p><span className="text-[#171717] font-medium">Palette :</span> {deepResult.analysis.analyse_coherence_visuelle.palette_detectee}</p>
                      <p><span className="text-[#171717] font-medium">Couleurs :</span> {deepResult.analysis.analyse_coherence_visuelle.coherence_couleurs}</p>
                      <p><span className="text-[#171717] font-medium">Typo :</span> {deepResult.analysis.analyse_coherence_visuelle.coherence_typographie}</p>
                    </div>
                  </div>
                </div>
                {/* Action plan */}
                {deepResult.analysis.plan_action?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">Plan d&apos;action</h3>
                    {deepResult.analysis.plan_action.map((action, i) => (
                      <div key={i} className={`flex items-start gap-4 py-4 ${i > 0 ? 'border-t border-dashed border-[#e5e5e5]' : ''}`}>
                        <span className="w-7 h-7 shrink-0 rounded-full bg-white flex items-center justify-center text-[13px] font-medium text-[#171717]">{action.priorite}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#171717] mb-1">{action.action}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white text-[#525252] border border-[#e5e5e5]">{action.categorie}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white text-[#525252] border border-[#e5e5e5]">Impact {action.impact}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Verdict */}
                <div className="card p-6">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-3">Verdict</h3>
                  <p className="text-[15px] text-[#171717] leading-relaxed">{deepResult.analysis.verdict_final}</p>
                </div>
                <div className="flex justify-center">
                  <button onClick={() => generateDeepAnalysisPdf(deepResult.analysis, customUrl || '', report.url)} className="flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white text-[12px] font-medium rounded-[10px] hover:bg-[#333] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Télécharger en PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 mt-6 border-t border-[#e5e5e5]">
          <button onClick={() => router.push('/')} className="text-[13px] text-[#525252] hover:text-[#171717] transition-colors">
            Analyser un autre site
          </button>
        </div>
      </main>
    </div>
  );
}

/* ═══ Blur Gate Component ═══ */
function BlurGate({ id }: { id: string }) {
  return (
    <div className="relative">
      <div className="blur-gate pointer-events-none select-none" aria-hidden="true">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card p-6 h-36" />)}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="card-elevated p-8 max-w-md mx-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#7F77DD" strokeWidth="1.5" />
              <path d="M5 7V5a3 3 0 016 0v2" stroke="#7F77DD" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-[18px] font-medium text-[#171717] mb-2">Voir le rapport complet</h3>
          <p className="text-[13px] text-[#525252] leading-relaxed mb-6">
            Créez un compte gratuit pour accéder à l&apos;analyse complète, les mots-clés manquants et le plan d&apos;action.
          </p>
          <button onClick={() => { sessionStorage.setItem('mamie_pending_report', id); window.location.href = '/signup'; }} className="cta-accent w-full py-3 text-[13px] flex items-center justify-center gap-2 mb-3">
            Créer mon compte gratuit <ArrowRight size={14} />
          </button>
          <button onClick={() => { sessionStorage.setItem('mamie_pending_report', id); window.location.href = '/login'; }} className="block w-full text-[12px] text-[#a3a3a3] hover:text-[#525252] transition-colors">
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
