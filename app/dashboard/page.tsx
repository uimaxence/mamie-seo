'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { BarChart2, CreditCard, ArrowRight, Target, Check } from 'lucide-react';
const IconBarChart = BarChart2; const IconCreditCard = CreditCard; const IconArrowRight = ArrowRight; const IconTarget = Target; const IconCheck = Check;
import type { User } from '@supabase/supabase-js';

interface ReportSummary {
  id: string;
  url: string;
  score: number;
  createdAt: string;
}

function getScoreColor(score: number): string {
  if (score < 40) return '#C03030';
  if (score < 65) return '#E05A2B';
  if (score < 85) return '#E05A2B';
  return '#2D8A5E';
}

// Group reports by domain and find score evolution
function getScoreEvolution(reports: ReportSummary[]): Map<string, { latest: number; previous: number | null; diff: number | null }> {
  const byDomain = new Map<string, ReportSummary[]>();

  for (const r of reports) {
    try {
      const domain = new URL(r.url).hostname;
      const existing = byDomain.get(domain) || [];
      existing.push(r);
      byDomain.set(domain, existing);
    } catch { /* skip invalid URLs */ }
  }

  const evolution = new Map<string, { latest: number; previous: number | null; diff: number | null }>();
  for (const [domain, domainReports] of byDomain) {
    const sorted = domainReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = sorted[0].score;
    const previous = sorted.length > 1 ? sorted[1].score : null;
    evolution.set(domain, {
      latest,
      previous,
      diff: previous !== null ? latest - previous : null,
    });
  }

  return evolution;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'profile'>('reports');

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
        return;
      }
      setUser(data.user);

      fetch(`/api/reports?userId=${data.user.id}`)
        .then((r) => r.json())
        .then((d) => {
          setReports(d.reports || []);
          setCredits(d.credits || 0);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleReanalyze = (url: string) => {
    sessionStorage.setItem('mamie_url', url);
    if (user?.email) sessionStorage.setItem('mamie_email', user.email);
    router.push('/analyzing');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[#525252]">Chargement...</p>
      </div>
    );
  }

  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)
    : 0;

  const scoreEvolution = getScoreEvolution(reports);

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#e5e5e5] bg-white">
        <a href="/" className="text-[14px] font-medium text-[#171717]">Mamie SEO</a>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="text-[12px] text-[#a3a3a3] hover:text-[#171717] transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-medium text-[#171717]">Mon espace</h1>
            <p className="text-[14px] text-[#525252] mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#171717] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors flex items-center gap-1.5"
          >
            Nouvelle analyse <IconArrowRight size={12} />
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><IconBarChart size={16} /></div>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Analyses SEO</p>
            <p className="font-display text-[28px] text-[#171717]">{reports.length}</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><IconCreditCard size={16} /></div>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Crédits Pro</p>
            <p className="font-display text-[28px] text-[#171717]">{credits}</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><IconTarget size={16} /></div>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Score moyen</p>
            <p className="font-display text-[28px]" style={{
              color: reports.length > 0 ? getScoreColor(avgScore) : '#a3a3a3'
            }}>
              {reports.length > 0 ? avgScore : '—'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e5e5e5] mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === 'reports' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'
            }`}
          >
            Mes rapports
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === 'profile' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'
            }`}
          >
            Profil
          </button>
        </div>

        {/* Reports tab */}
        {activeTab === 'reports' && (
          <>
            {reports.length === 0 ? (
              <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-12 text-center">
                <IconBarChart size={32} className="text-[#a3a3a3] mx-auto mb-4" />
                <p className="text-[14px] font-medium text-[#171717] mb-2">Aucun rapport</p>
                <p className="text-[15px] text-[#525252] mb-6">Lancez votre première analyse SEO.</p>
                <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
                  Analyser un site
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  let domain = report.url;
                  try { domain = new URL(report.url).hostname; } catch {}
                  const evo = scoreEvolution.get(domain);

                  return (
                    <div
                      key={report.id}
                      className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 hover:border-[#a3a3a3] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <a href={`/report/${report.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="tabular-nums text-[24px] font-medium shrink-0 w-14 text-center" style={{ color: getScoreColor(report.score) }}>
                            {report.score}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#171717] truncate">{report.url}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[12px] text-[#a3a3a3]">
                                {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {/* Score evolution badge */}
                              {evo?.diff !== null && evo?.diff !== undefined && evo.diff !== 0 && (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    evo.diff > 0
                                      ? 'bg-[#EAF3DE] text-[#3B6D11]'
                                      : 'bg-[#FAEEDA] text-[#854F0B]'
                                  }`}
                                >
                                  {evo.diff > 0 ? '+' : ''}{evo.diff} pts
                                </span>
                              )}
                            </div>
                          </div>
                          <IconArrowRight size={16} className="text-[#a3a3a3] group-hover:text-[#171717] transition-colors shrink-0" />
                        </a>
                      </div>

                      {/* Re-analyze button */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-[#e5e5e5]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReanalyze(report.url);
                          }}
                          className="text-[11px] text-[#525252] hover:text-[#171717] transition-colors flex items-center gap-1"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8a6 6 0 0110.89-3.48M14 8a6 6 0 01-10.89 3.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Relancer l&apos;analyse
                        </button>
                        <a
                          href={`/report/${report.id}`}
                          className="text-[11px] text-[#525252] hover:text-[#171717] transition-colors ml-auto"
                        >
                          Voir le rapport
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buy credits CTA */}
            {credits === 0 && reports.length > 0 && (
              <div className="mt-6 bg-[#fafafa] border border-[#e5e5e5] rounded-[12px] p-5 text-center">
                <p className="text-[15px] text-[#525252] mb-3">
                  Allez plus loin avec l&apos;analyse de page approfondie
                </p>
                <a href="/#pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
                  <IconCreditCard size={14} /> Obtenir des crédits
                </a>
              </div>
            )}
          </>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">Informations</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-[#a3a3a3] mb-0.5">Email</p>
                  <p className="text-[14px] text-[#171717]">{user?.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#a3a3a3] mb-0.5">Membre depuis</p>
                  <p className="text-[14px] text-[#171717]">
                    {user?.created_at && new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">Crédits d&apos;analyse Pro</h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] text-[#171717]">Solde actuel</span>
                <span className="tabular-nums text-[18px] font-medium text-[#171717]">{credits}</span>
              </div>
              <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[#171717] rounded-full" style={{ width: `${Math.min(100, (credits / 3) * 100)}%` }} />
              </div>
              <a href="/#pricing" className="text-[14px] text-[#525252] hover:text-[#171717] transition-colors flex items-center gap-1">
                Acheter plus de crédits <IconArrowRight size={12} />
              </a>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 text-[13px] text-[#C03030] font-medium rounded-[8px] border border-[#C03030]/20 hover:bg-[#C03030]/5 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
