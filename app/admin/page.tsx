'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import {
  BarChart2, Send, Eye, MousePointerClick, UserCheck,
  ChevronLeft, ChevronRight, Plus, ExternalLink, ArrowRight,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'maxence.cailleau1@gmail.com';

interface Stats {
  total: number;
  openRate: number;
  clickRate: number;
  claimed: number;
}

interface OutreachItem {
  id: string;
  report_id: string;
  email: string;
  domain: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  claimed_at: string | null;
  created_at: string;
  report_score: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'En file',
  sent: 'Envoyé',
  opened: 'Ouvert',
  clicked: 'Cliqué',
  claimed: 'Réclamé',
  bounced: 'Bounce',
  unsubscribed: 'Désabonné',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  queued: { bg: '#f5f5f5', text: '#737373' },
  sent: { bg: '#eff6ff', text: '#1d4ed8' },
  opened: { bg: '#fffbeb', text: '#b45309' },
  clicked: { bg: '#fff7ed', text: '#c2410c' },
  claimed: { bg: '#f0fdf4', text: '#15803d' },
  bounced: { bg: '#fef2f2', text: '#dc2626' },
  unsubscribed: { bg: '#f5f5f5', text: '#a3a3a3' },
};

const FILTER_TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'queued', label: 'En attente' },
  { key: 'sent', label: 'Envoyé' },
  { key: 'opened', label: 'Ouvert' },
  { key: 'clicked', label: 'Cliqué' },
  { key: 'claimed', label: 'Réclamé' },
  { key: 'unsubscribed', label: 'Désabonné' },
];

function getScoreColor(score: number): string {
  if (score < 50) return '#dc2626';
  if (score < 70) return '#f97316';
  return '#16a34a';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, openRate: 0, clickRate: 0, claimed: 0 });
  const [items, setItems] = useState<OutreachItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'x-user-email': user?.email || '',
    };
  }, [user]);

  // Auth check
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  }, [router]);

  // Fetch stats
  useEffect(() => {
    if (!user) return;
    fetch('/api/admin/stats', { headers: fetchHeaders() })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(console.error);
  }, [user, fetchHeaders]);

  // Fetch outreach list
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== 'all') params.set('status', statusFilter);

    fetch(`/api/admin/outreach?${params}`, { headers: fetchHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total || 0);
      })
      .catch(console.error);
  }, [user, page, statusFilter, fetchHeaders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[#525252]">Chargement...</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#e5e5e5] bg-white">
        <a href="/" className="text-[14px] font-medium text-[#171717]">Mamie SEO</a>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-[12px] text-[#a3a3a3] hover:text-[#171717] transition-colors">
            Mon espace
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-medium text-[#171717]">Dashboard admin</h1>
            <p className="text-[13px] text-[#a3a3a3] mt-0.5">Connecté en tant que {user?.email}</p>
          </div>
          <button
            onClick={() => router.push('/admin/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
          >
            <Plus size={14} /> Nouvel envoi
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><Send size={16} /></div>
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Total envois</p>
            <p className="font-display text-[24px] text-[#171717]">{stats.total}</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><Eye size={16} /></div>
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Taux d&apos;ouverture</p>
            <p className="font-display text-[24px] text-[#171717]">{stats.openRate}%</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><MousePointerClick size={16} /></div>
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Taux de clic</p>
            <p className="font-display text-[24px] text-[#171717]">{stats.clickRate}%</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4">
            <div className="text-[#a3a3a3] mb-2"><UserCheck size={16} /></div>
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-1">Rapports réclamés</p>
            <p className="font-display text-[24px] text-[#171717]">{stats.claimed}</p>
          </div>
        </div>

        {/* Outreach table */}
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[16px] font-medium text-[#171717] mb-4">Envois récents</h2>

            {/* Filter tabs */}
            <div className="flex gap-1 overflow-x-auto">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-[#171717] text-white'
                      : 'bg-[#f5f5f5] text-[#737373] hover:bg-[#e5e5e5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-[#e5e5e5]">
                  <th className="text-left px-5 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Prospect</th>
                  <th className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Site</th>
                  <th className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Statut</th>
                  <th className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Score</th>
                  <th className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Envoyé le</th>
                  <th className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Ouvert</th>
                  <th className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Cliqué</th>
                  <th className="text-right px-5 py-3 text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-[14px] text-[#a3a3a3]">
                      Aucun envoi pour le moment.
                    </td>
                  </tr>
                )}
                {items.map((item) => {
                  const colors = STATUS_COLORS[item.status] || STATUS_COLORS.queued;
                  return (
                    <tr key={item.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[13px] text-[#171717] font-medium">{item.email}</p>
                        <p className="text-[11px] text-[#a3a3a3]">{item.domain}</p>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={`https://${item.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-[#525252] hover:text-[#171717] flex items-center gap-1 transition-colors"
                        >
                          {item.domain} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {item.report_score !== null ? (
                          <span
                            className="text-[14px] font-medium tabular-nums"
                            style={{ color: getScoreColor(item.report_score) }}
                          >
                            {item.report_score}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#a3a3a3]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-[#525252]">{formatDate(item.sent_at)}</td>
                      <td className="px-3 py-3 text-[12px] text-[#525252]">{formatDate(item.opened_at)}</td>
                      <td className="px-3 py-3 text-[12px] text-[#525252]">{formatDate(item.clicked_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => router.push(`/admin/outreach/${item.id}`)}
                          className="text-[12px] text-[#525252] hover:text-[#171717] font-medium flex items-center gap-1 ml-auto transition-colors"
                        >
                          Voir <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#e5e5e5] flex items-center justify-between">
              <p className="text-[12px] text-[#a3a3a3]">
                Page {page} sur {totalPages} · {total} envoi{total > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-[#e5e5e5] text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md border border-[#e5e5e5] text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
