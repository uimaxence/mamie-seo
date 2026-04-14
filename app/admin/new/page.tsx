'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { ArrowLeft, Check, Loader2, AlertCircle, Send, MessageSquare, Mail, Copy, ExternalLink } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'maxence.cailleau1@gmail.com';

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export default function AdminNewOutreach() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [mode, setMode] = useState<'email' | 'linkedin'>('email');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [force, setForce] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ message: string; existingId: string } | null>(null);

  // Progress
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [result, setResult] = useState<{
    outreachId: string;
    reportId: string;
    score: number;
    pagesCrawled: number;
    reportUrl?: string;
    linkedinMessage?: string;
  } | null>(null);

  // Copy feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

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

  const copyToClipboard = async (text: string, type: 'link' | 'msg') => {
    await navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflictInfo(null);
    setResult(null);

    if (mode === 'email' && !email) {
      setError('Email requis pour le mode email.');
      return;
    }
    if (!url) {
      setError('URL requise.');
      return;
    }

    // Validate URL has protocol
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setSending(true);

    // Initialize progress steps
    const emailSteps: ProgressStep[] = [
      { label: 'URL validée', status: 'active' },
      { label: 'Analyse lancée', status: 'pending' },
      { label: 'Crawl du site en cours...', status: 'pending' },
      { label: 'Calcul des scores', status: 'pending' },
      { label: 'Génération du rapport', status: 'pending' },
      { label: "Préparation de l'email", status: 'pending' },
      { label: 'Envoi via Brevo', status: 'pending' },
    ];

    const linkedinSteps: ProgressStep[] = [
      { label: 'URL validée', status: 'active' },
      { label: 'Analyse lancée', status: 'pending' },
      { label: 'Crawl du site en cours...', status: 'pending' },
      { label: 'Calcul des scores', status: 'pending' },
      { label: 'Génération du rapport', status: 'pending' },
      { label: 'Analyse visuelle du site', status: 'pending' },
      { label: 'Génération du message LinkedIn', status: 'pending' },
    ];

    setSteps(mode === 'email' ? emailSteps : linkedinSteps);

    try {
      const res = await fetch('/api/admin/outreach/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({
          ...(email ? { email } : {}),
          url: normalizedUrl,
          force,
          mode,
        }),
      });

      // Handle non-SSE responses (validation errors)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.canForce) {
          setConflictInfo({ message: data.error, existingId: data.existingId });
          setSending(false);
          setSteps([]);
          return;
        }
        setError(data.error || 'Erreur inconnue');
        setSending(false);
        setSteps([]);
        return;
      }

      // SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        setError('Pas de stream reçu.');
        setSending(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const stepMapping: Record<string, number> = mode === 'email'
        ? {
          connecting: 0,
          detecting_cms: 2,
          sitemap: 2,
          crawling: 2,
          analyzing_meta: 2,
          scoring: 3,
          editorial: 3,
          generating: 4,
          done: 6,
          error: -1,
        }
        : {
          connecting: 0,
          detecting_cms: 2,
          sitemap: 2,
          crawling: 2,
          analyzing_meta: 2,
          scoring: 3,
          editorial: 3,
          visual_analysis: 5,
          generating: 6,
          done: 6,
          error: -1,
        };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const stepIndex = stepMapping[event.step] ?? -1;

            if (event.step === 'error') {
              setError(event.message);
              setSteps((prev) =>
                prev.map((s, i) => ({
                  ...s,
                  status: s.status === 'done' ? 'done' : i === prev.findIndex(p => p.status === 'active') ? 'error' : s.status,
                }))
              );
              setSending(false);
              return;
            }

            if (event.step === 'done') {
              try {
                const parsed = JSON.parse(event.message);
                setResult(parsed);
              } catch {
                // message is not JSON
              }
              setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })));
              setSending(false);
              return;
            }

            // Update steps
            if (stepIndex >= 0) {
              setSteps((prev) =>
                prev.map((s, i) => {
                  if (i < stepIndex) return { ...s, status: 'done' };
                  if (i === stepIndex) return { ...s, status: 'active', label: event.message || s.label };
                  return s;
                })
              );
            }
          } catch {
            // Invalid JSON line, skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[#525252]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#e5e5e5] bg-white">
        <a href="/" className="text-[14px] font-medium text-[#171717]">Mamie SEO</a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-12">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1 text-[13px] text-[#a3a3a3] hover:text-[#171717] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Retour au dashboard
        </button>

        <h1 className="text-[24px] font-medium text-[#171717] mb-8">Nouvelle prospection</h1>

        {/* LinkedIn success state */}
        {result && mode === 'linkedin' && (
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-6 space-y-5">
            <div className="text-center mb-2">
              <div className="w-12 h-12 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-[#16a34a]" />
              </div>
              <p className="text-[16px] font-medium text-[#171717]">Rapport prêt</p>
              <p className="text-[14px] text-[#525252] mt-1">
                Score : {result.score}/100 · {result.pagesCrawled} pages analysées
              </p>
            </div>

            {/* Report link */}
            <div>
              <label className="block text-[13px] font-medium text-[#171717] mb-1.5">
                Lien du rapport
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.reportUrl || ''}
                  className="flex-1 px-3 py-2.5 border border-[#e5e5e5] rounded-[8px] text-[13px] text-[#525252] bg-[#fafafa]"
                />
                <button
                  onClick={() => copyToClipboard(result.reportUrl || '', 'link')}
                  className="flex items-center gap-1.5 px-3 py-2.5 border border-[#e5e5e5] rounded-[8px] text-[13px] font-medium hover:bg-[#f5f5f5] transition-colors shrink-0"
                >
                  {copiedLink ? <Check size={14} className="text-[#16a34a]" /> : <Copy size={14} />}
                  {copiedLink ? 'Copié' : 'Copier'}
                </button>
                <a
                  href={result.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-2.5 py-2.5 border border-[#e5e5e5] rounded-[8px] hover:bg-[#f5f5f5] transition-colors shrink-0"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* LinkedIn message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-[#171717]">
                  Message LinkedIn
                </label>
                <button
                  onClick={() => copyToClipboard(result.linkedinMessage || '', 'msg')}
                  className="flex items-center gap-1 text-[12px] font-medium text-[#525252] hover:text-[#171717] transition-colors"
                >
                  {copiedMsg ? <Check size={12} className="text-[#16a34a]" /> : <Copy size={12} />}
                  {copiedMsg ? 'Copié !' : 'Copier le message'}
                </button>
              </div>
              <textarea
                readOnly
                value={result.linkedinMessage || ''}
                rows={12}
                className="w-full px-3 py-2.5 border border-[#e5e5e5] rounded-[8px] text-[13px] text-[#525252] bg-[#fafafa] resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-3 pt-2">
              {result.outreachId && (
                <button
                  onClick={() => router.push(`/admin/outreach/${result.outreachId}`)}
                  className="flex-1 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors text-center"
                >
                  Voir le détail
                </button>
              )}
              <button
                onClick={() => {
                  setResult(null);
                  setEmail('');
                  setUrl('');
                  setSteps([]);
                  setForce(false);
                  setCopiedLink(false);
                  setCopiedMsg(false);
                }}
                className="flex-1 px-4 py-2.5 border border-[#e5e5e5] text-[13px] font-medium rounded-[8px] hover:bg-[#f5f5f5] transition-colors text-center"
              >
                Nouvelle prospection
              </button>
            </div>
          </div>
        )}

        {/* Email success state */}
        {result && mode === 'email' && (
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-[#16a34a]" />
              </div>
              <p className="text-[16px] font-medium text-[#171717]">
                Rapport envoyé à {email}
              </p>
              <p className="text-[14px] text-[#525252] mt-1">
                Score : {result.score}/100 · {result.pagesCrawled} pages analysées
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push(`/admin/outreach/${result.outreachId}`)}
                className="flex-1 py-2.5 bg-[#171717] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors text-center"
              >
                Voir le détail de l&apos;envoi →
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setEmail('');
                  setUrl('');
                  setSteps([]);
                  setForce(false);
                }}
                className="px-4 py-2.5 border border-[#e5e5e5] text-[13px] font-medium rounded-[8px] hover:bg-[#f5f5f5] transition-colors"
              >
                Nouveau
              </button>
            </div>
          </div>
        )}

        {/* Progress state */}
        {sending && steps.length > 0 && (
          <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-6">
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.status === 'done' && <Check size={16} className="text-[#16a34a] shrink-0" />}
                  {step.status === 'active' && <Loader2 size={16} className="text-[#f97316] animate-spin shrink-0" />}
                  {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-[#e5e5e5] shrink-0" />}
                  {step.status === 'error' && <AlertCircle size={16} className="text-[#dc2626] shrink-0" />}
                  <span className={`text-[13px] ${
                    step.status === 'done' ? 'text-[#16a34a]'
                    : step.status === 'active' ? 'text-[#171717] font-medium'
                    : step.status === 'error' ? 'text-[#dc2626]'
                    : 'text-[#a3a3a3]'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {!result && !sending && (
          <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e5] rounded-[12px] p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-[8px]">
                <AlertCircle size={16} className="text-[#dc2626] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#dc2626]">{error}</p>
              </div>
            )}

            {conflictInfo && (
              <div className="p-3 bg-[#fffbeb] border border-[#fde68a] rounded-[8px]">
                <p className="text-[13px] text-[#b45309] mb-2">{conflictInfo.message}</p>
                <button
                  type="button"
                  onClick={() => {
                    setForce(true);
                    setConflictInfo(null);
                  }}
                  className="text-[12px] font-medium text-[#b45309] underline hover:text-[#92400e]"
                >
                  Forcer le renvoi
                </button>
              </div>
            )}

            {/* Mode toggle */}
            <div>
              <label className="block text-[13px] font-medium text-[#171717] mb-2">Canal</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('email')}
                  className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-[8px] text-[13px] font-medium border transition-colors ${
                    mode === 'email'
                      ? 'bg-[#171717] text-white border-[#171717]'
                      : 'bg-white text-[#525252] border-[#e5e5e5] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <Mail size={14} /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setMode('linkedin')}
                  className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-[8px] text-[13px] font-medium border transition-colors ${
                    mode === 'linkedin'
                      ? 'bg-[#0a66c2] text-white border-[#0a66c2]'
                      : 'bg-white text-[#525252] border-[#e5e5e5] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <MessageSquare size={14} /> LinkedIn
                </button>
              </div>
            </div>

            {/* Email field — only for email mode */}
            {mode === 'email' && (
              <div>
                <label className="block text-[13px] font-medium text-[#171717] mb-1.5">
                  Email du prospect
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@exemple.fr"
                  className="w-full px-3 py-2.5 border border-[#e5e5e5] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[#171717] mb-1.5">
                URL du site à analyser
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.fr"
                className="w-full px-3 py-2.5 border border-[#e5e5e5] rounded-[8px] text-[14px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#171717] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full flex items-center justify-center gap-2 py-3 text-white text-[14px] font-medium rounded-[8px] transition-colors ${
                mode === 'linkedin'
                  ? 'bg-[#0a66c2] hover:bg-[#084d94]'
                  : 'bg-[#171717] hover:bg-[#333]'
              }`}
            >
              {mode === 'email' ? (
                <><Send size={14} /> Analyser et envoyer</>
              ) : (
                <><MessageSquare size={14} /> Analyser et générer le message</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
