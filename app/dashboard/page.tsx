'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { IconBarChart, IconCreditCard, IconArrowRight } from '@/components/Icons';
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

  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
        return;
      }
      setUser(data.user);

      // Fetch reports and credits
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
    await getSupabaseBrowser().auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[13px] text-[#73726C]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#EEEDEB] bg-white">
        <a href="/" className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</a>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[#73726C]">{user?.email}</span>
          <button onClick={handleLogout} className="text-[11px] text-[#C2C0B6] hover:text-[#1A1A18] transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[24px] font-medium text-[#1A1A18]">Mes rapports</h1>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[12px] text-[#73726C]">
              <IconCreditCard size={14} />
              {credits} crédit{credits !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[#1A1A18] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors flex items-center gap-1.5"
            >
              Nouvelle analyse <IconArrowRight size={12} />
            </button>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-12 text-center">
            <IconBarChart size={32} className="text-[#C2C0B6] mx-auto mb-4" />
            <p className="text-[14px] font-medium text-[#1A1A18] mb-2">Aucun rapport</p>
            <p className="text-[13px] text-[#73726C] mb-6">Lancez votre première analyse SEO pour la voir ici.</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
            >
              Analyser un site
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <a
                key={report.id}
                href={`/report/${report.id}`}
                className="flex items-center gap-4 bg-white border border-[#EEEDEB] rounded-[12px] p-5 hover:border-[#C2C0B6] transition-colors group"
              >
                {/* Score */}
                <span
                  className="tabular-nums text-[24px] font-medium shrink-0 w-14 text-center"
                  style={{ color: getScoreColor(report.score) }}
                >
                  {report.score}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1A1A18] truncate">{report.url}</p>
                  <p className="text-[11px] text-[#C2C0B6]">
                    {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>

                <IconArrowRight size={16} className="text-[#C2C0B6] group-hover:text-[#1A1A18] transition-colors shrink-0" />
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
