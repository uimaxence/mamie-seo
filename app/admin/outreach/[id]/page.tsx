'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import {
  ArrowLeft, Send, Eye, MousePointerClick, UserCheck,
  Copy, ExternalLink, Trash2, RefreshCw, Check,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Report } from '@/lib/types';

const ADMIN_EMAIL = 'maxence.cailleau1@gmail.com';

interface OutreachData {
  id: string;
  report_id: string;
  email: string;
  domain: string;
  status: string;
  brevo_message_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  claimed_at: string | null;
  bounce_type: string | null;
  created_at: string;
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

function getScoreColor(score: number): string {
  if (score < 50) return '#dc2626';
  if (score < 70) return '#f97316';
  return '#16a34a';
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OutreachDetailPage() {
  const router = useRouter();
  const params = useParams();
  const outreachId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [outreach, setOutreach] = useState<OutreachData | null>(null);
  const [reportData, setReportData] = useState<Report | null>(null);
  const [resending, setResending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-user-email': user?.email || '',
  }), [user]);

  // Auth check
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }
      setUser(data.user);
    });
  }, [router]);

  // Fetch outreach data
  useEffect(() => {
    if (!user || !outreachId) return;

    fetch(`/api/admin/outreach/${outreachId}`, { headers: fetchHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.outreach) {
          setOutreach(d.outreach);
          setReportData(d.reportData || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, outreachId, fetchHeaders]);

  const handleResend = async () => {
    if (!outreach) return;
    setResending(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/outreach/${outreachId}/resend`, {
        method: 'POST',
        headers: fetchHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Email renvoyé avec succès.');
        setOutreach((prev) => prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : prev);
      } else {
        setActionMessage(`Erreur : ${data.error}`);
      }
    } catch {
      setActionMessage('Erreur de connexion.');
    } finally {
      setResending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cet envoi ? Le rapport sera marqué comme expiré.')) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/outreach/${outreachId}`, {
        method: 'DELETE',
        headers: fetchHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin');
      } else {
        setActionMessage(`Erreur : ${data.error}`);
      }
    } catch {
      setActionMessage('Erreur de connexion.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = () => {
    if (!outreach) return;
    const url = `${window.location.origin}/report/${outreach.report_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[#525252]">Chargement...</p>
      </div>
    );
  }

  if (!outreach) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[#525252]">Envoi non trouvé.</p>
      </div>
    );
  }

  // Compute combined score from report
  let combinedScore: number | null = null;
  let topIssues: { name: string; score: number; maxScore: number; details: string }[] = [];

  if (reportData) {
    const tech = reportData.technicalScore?.total ?? 0;
    const editorial = reportData.editorialAnalysis?.score_editorial ?? 0;
    combinedScore = reportData.editorialAnalysis
      ? Math.round((tech + editorial) / 2)
      : tech;

    topIssues = [...(reportData.technicalScore?.criteria || [])]
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
      .slice(0, 3);
  }

  const colors = STATUS_COLORS[outreach.status] || STATUS_COLORS.queued;

  // Timeline events
  const timelineEvents = [
    { label: 'Envoyé', date: outreach.sent_at, icon: Send, reached: !!outreach.sent_at },
    { label: 'Ouvert', date: outreach.opened_at, icon: Eye, reached: !!outreach.opened_at },
    { label: 'Lien cliqué', date: outreach.clicked_at, icon: MousePointerClick, reached: !!outreach.clicked_at },
    { label: 'Rapport réclamé', date: outreach.claimed_at, icon: UserCheck, reached: !!outreach.claimed_at },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#e5e5e5] bg-white">
        <a href="/" className="text-[14px] font-medium text-[#171717]">Mamie SEO</a>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1 text-[13px] text-[#a3a3a3] hover:text-[#171717] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Retour au dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — info + timeline */}
          <div className="lg:col-span-3 space-y-5">
            {/* Header card */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[18px] font-medium text-[#171717]">{outreach.email}</p>
                  <p className="text-[13px] text-[#a3a3a3] mt-0.5">{outreach.domain}</p>
                </div>
                <span
                  className="inline-block px-3 py-1 text-[12px] font-medium rounded-full"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {STATUS_LABELS[outreach.status] || outreach.status}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">
                Historique des événements
              </h3>
              <div className="space-y-0">
                {timelineEvents.map((event, i) => {
                  const Icon = event.icon;
                  const isLast = i === timelineEvents.length - 1;
                  return (
                    <div key={i} className="flex gap-3">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${
                            event.reached ? 'bg-[#171717]' : 'border-2 border-[#d4d4d4] bg-white'
                          }`}
                        />
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[24px] ${
                            event.reached ? 'bg-[#171717]' : 'bg-[#e5e5e5]'
                          }`} />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-4 ${!isLast ? '' : ''}`}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={event.reached ? 'text-[#171717]' : 'text-[#a3a3a3]'} />
                          <span className={`text-[13px] font-medium ${
                            event.reached ? 'text-[#171717]' : 'text-[#a3a3a3]'
                          }`}>
                            {event.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#a3a3a3] mt-0.5 ml-[22px]">
                          {formatDateTime(event.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">
                Actions
              </h3>

              {actionMessage && (
                <p className="text-[13px] text-[#525252] mb-3 p-2 bg-[#f5f5f5] rounded-[6px]">
                  {actionMessage}
                </p>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#171717] border border-[#e5e5e5] rounded-[8px] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Renvoi en cours...' : "Renvoyer l'email"}
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#171717] border border-[#e5e5e5] rounded-[8px] hover:bg-[#f5f5f5] transition-colors"
                >
                  {copied ? <Check size={14} className="text-[#16a34a]" /> : <Copy size={14} />}
                  {copied ? 'Lien copié !' : 'Copier le lien du rapport'}
                </button>

                <a
                  href={`/report/${outreach.report_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#171717] border border-[#e5e5e5] rounded-[8px] hover:bg-[#f5f5f5] transition-colors"
                >
                  <ExternalLink size={14} /> Voir le rapport public →
                </a>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#dc2626] border border-[#fecaca] rounded-[8px] hover:bg-[#fef2f2] transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deleting ? 'Suppression...' : 'Supprimer cet envoi'}
                </button>
              </div>
            </div>
          </div>

          {/* Right column — report preview */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 sticky top-6">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3] mb-4">
                Aperçu du rapport
              </h3>

              {combinedScore !== null ? (
                <>
                  {/* Score gauge */}
                  <div className="text-center mb-5">
                    <p
                      className="font-display text-[48px]"
                      style={{ color: getScoreColor(combinedScore) }}
                    >
                      {combinedScore}
                    </p>
                    <p className="text-[12px] text-[#a3a3a3]">/100</p>
                  </div>

                  {/* Top issues */}
                  {topIssues.length > 0 && (
                    <div className="space-y-3 mb-5">
                      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#a3a3a3]">
                        Points critiques
                      </p>
                      {topIssues.map((issue, i) => {
                        const pct = Math.round((issue.score / issue.maxScore) * 100);
                        return (
                          <div key={i} className="p-3 bg-[#fafafa] rounded-[8px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-medium text-[#171717]">{issue.name}</span>
                              <span
                                className="text-[12px] font-medium tabular-nums"
                                style={{ color: getScoreColor(pct) }}
                              >
                                {issue.score}/{issue.maxScore}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#525252] leading-relaxed">{issue.details}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <a
                    href={`/report/${outreach.report_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
                  >
                    Voir le rapport complet →
                  </a>
                </>
              ) : (
                <p className="text-[14px] text-[#a3a3a3] text-center py-8">
                  Rapport non disponible.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
