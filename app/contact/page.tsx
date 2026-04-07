'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AuthHeader from '@/components/AuthHeader';
import { IconArrowRight, IconCheck } from '@/components/Icons';

const SUBJECTS = [
  { value: 'discuss', label: 'Discuter des résultats de mon audit' },
  { value: 'seo', label: 'Déléguer les corrections SEO' },
  { value: 'redesign', label: 'Parler d\'une refonte de site' },
  { value: 'other', label: 'Autre chose' },
];

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-[15px] text-[#504F4A]">Chargement...</p></div>}>
      <ContactPageInner />
    </Suspense>
  );
}

function ContactPageInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const reportId = searchParams.get('report');
  const reportUrl = searchParams.get('url');
  const reportScore = searchParams.get('score');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('discuss');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from auth + report context
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);

    if (reportUrl && reportScore && !message) {
      setMessage(
        `Bonjour, suite à l'analyse de ${decodeURIComponent(reportUrl)} (score ${reportScore}/100), j'aimerais `
      );
    }
  }, [user, reportUrl, reportScore, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          reportId,
          reportUrl,
          reportScore,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto mb-4">
              <IconCheck size={24} className="text-[#22A168]" />
            </div>
            <h2 className="text-[18px] font-medium text-[#1A1A18] mb-2">Message envoyé !</h2>
            <p className="text-[15px] text-[#504F4A] leading-relaxed mb-6">
              Je reviens vers vous rapidement. En attendant, vous pouvez consulter votre rapport.
            </p>
            {reportId && (
              <a
                href={`/report/${reportId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
              >
                Voir mon rapport <IconArrowRight size={14} />
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-medium text-[#1A1A18] mb-2">
              Parlons de votre projet
            </h1>
            <p className="text-[15px] text-[#504F4A] leading-relaxed">
              Décrivez-moi votre besoin. Je reviens vers vous sous 24h.
            </p>
          </div>

          {/* Cal.com CTA if available */}
          {process.env.NEXT_PUBLIC_CAL_LINK && (
            <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 mb-6 text-center">
              <p className="text-[14px] text-[#504F4A] mb-3">
                Vous préférez en discuter de vive voix ?
              </p>
              <a
                href={process.env.NEXT_PUBLIC_CAL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors"
              >
                Réserver un appel de 30 min <IconArrowRight size={14} />
              </a>
            </div>
          )}

          {process.env.NEXT_PUBLIC_CAL_LINK && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#EEEDEB]" />
              <span className="text-[12px] text-[#9C9A91]">ou écrivez-moi</span>
              <div className="flex-1 h-px bg-[#EEEDEB]" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1 block">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-2 block">Je souhaite</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSubject(s.value)}
                    className={`px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all ${
                      subject === s.value
                        ? 'bg-[#1A1A18] text-white'
                        : 'bg-white border border-[#EEEDEB] text-[#504F4A] hover:border-[#9C9A91]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors resize-none"
              />
            </div>

            {error && <p className="text-[11px] text-[#E05252]">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || !message}
              className="w-full py-3.5 bg-[#1A1A18] text-white text-[14px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {loading ? 'Envoi...' : 'Envoyer'}
              {!loading && <IconArrowRight size={14} />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
