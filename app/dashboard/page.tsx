'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { IconBarChart, IconCreditCard, IconArrowRight, IconTarget } from '@/components/Icons';
import type { User } from '@supabase/supabase-js';

interface ReportSummary {
  id: string;
  url: string;
  score: number;
  createdAt: string;
}

function getScoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[#504F4A]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#EEEDEB] bg-white">
        <a href="/" className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</a>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="text-[12px] text-[#9C9A91] hover:text-[#1A1A18] transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-medium text-[#1A1A18]">Mon espace</h1>
            <p className="text-[14px] text-[#504F4A] mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#1A1A18] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors flex items-center gap-1.5"
          >
            Nouvelle analyse <IconArrowRight size={12} />
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-4">
            <div className="text-[#9C9A91] mb-2"><IconBarChart size={16} /></div>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1">Analyses SEO</p>
            <p className="text-[24px] font-medium text-[#1A1A18] tabular-nums">{reports.length}</p>
          </div>
          <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-4">
            <div className="text-[#9C9A91] mb-2"><IconCreditCard size={16} /></div>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1">Crédits Pro</p>
            <p className="text-[24px] font-medium text-[#1A1A18] tabular-nums">{credits}</p>
          </div>
          <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-4">
            <div className="text-[#9C9A91] mb-2"><IconTarget size={16} /></div>
            <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1">Score moyen</p>
            <p className="text-[24px] font-medium tabular-nums" style={{
              color: reports.length > 0 ? getScoreColor(Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)) : '#9C9A91'
            }}>
              {reports.length > 0 ? Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length) : '—'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#EEEDEB] mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === 'reports' ? 'border-[#1A1A18] text-[#1A1A18]' : 'border-transparent text-[#9C9A91] hover:text-[#504F4A]'
            }`}
          >
            Mes rapports
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === 'profile' ? 'border-[#1A1A18] text-[#1A1A18]' : 'border-transparent text-[#9C9A91] hover:text-[#504F4A]'
            }`}
          >
            Profil
          </button>
        </div>

        {/* Reports tab */}
        {activeTab === 'reports' && (
          <>
            {reports.length === 0 ? (
              <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-12 text-center">
                <IconBarChart size={32} className="text-[#9C9A91] mx-auto mb-4" />
                <p className="text-[14px] font-medium text-[#1A1A18] mb-2">Aucun rapport</p>
                <p className="text-[15px] text-[#504F4A] mb-6">Lancez votre première analyse SEO.</p>
                <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
                  Analyser un site
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <a key={report.id} href={`/report/${report.id}`}
                    className="flex items-center gap-4 bg-white border border-[#EEEDEB] rounded-[12px] p-5 hover:border-[#9C9A91] transition-colors group">
                    <span className="tabular-nums text-[24px] font-medium shrink-0 w-14 text-center" style={{ color: getScoreColor(report.score) }}>
                      {report.score}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#1A1A18] truncate">{report.url}</p>
                      <p className="text-[12px] text-[#9C9A91]">
                        {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <IconArrowRight size={16} className="text-[#9C9A91] group-hover:text-[#1A1A18] transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {/* Buy credits CTA */}
            {credits === 0 && reports.length > 0 && (
              <div className="mt-6 bg-[#F8F8F7] border border-[#EEEDEB] rounded-[12px] p-5 text-center">
                <p className="text-[15px] text-[#504F4A] mb-3">
                  Allez plus loin avec l&apos;analyse de page approfondie
                </p>
                <a href="/#pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A1A18] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
                  <IconCreditCard size={14} /> Obtenir des crédits
                </a>
              </div>
            )}
          </>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-4">Informations</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-[#9C9A91] mb-0.5">Email</p>
                  <p className="text-[14px] text-[#1A1A18]">{user?.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9C9A91] mb-0.5">Membre depuis</p>
                  <p className="text-[14px] text-[#1A1A18]">
                    {user?.created_at && new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-4">Abonnement</h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] text-[#1A1A18]">Crédits d&apos;analyse Pro</span>
                <span className="tabular-nums text-[18px] font-medium text-[#1A1A18]">{credits}</span>
              </div>
              <div className="h-2 bg-[#EEEDEB] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[#1A1A18] rounded-full" style={{ width: `${Math.min(100, (credits / 3) * 100)}%` }} />
              </div>
              <a href="/#pricing" className="text-[14px] text-[#504F4A] hover:text-[#1A1A18] transition-colors flex items-center gap-1">
                Acheter plus de crédits <IconArrowRight size={12} />
              </a>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 text-[13px] text-[#E05252] font-medium rounded-[8px] border border-[#E05252]/20 hover:bg-[#E05252]/5 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
