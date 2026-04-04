'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AuthHeader from '@/components/AuthHeader';
import {
  IconSearch, IconBarChart, IconTarget, IconStar,
  IconShield, IconZap, IconType, IconCreditCard, IconArrowRight, IconCheck
} from '@/components/Icons';

// Mini animated preview asset — a fake score gauge rendered in SVG
function PreviewGauge() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
      <circle cx="60" cy="60" r="50" fill="none" stroke="#EEEDEB" strokeWidth="6" />
      <circle
        cx="60" cy="60" r="50" fill="none" stroke="#22A168" strokeWidth="6"
        strokeDasharray="314" strokeDashoffset="94"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        className="animate-[gauge-draw_2s_ease-out_infinite_alternate]"
      />
      <text x="60" y="56" textAnchor="middle" fill="#1A1A18" fontSize="28" fontWeight="500" fontFamily="system-ui">
        72
      </text>
      <text x="60" y="72" textAnchor="middle" fill="#9C9A91" fontSize="10" fontWeight="500" fontFamily="system-ui">
        /100
      </text>
    </svg>
  );
}

// Mini criteria preview bars
function PreviewBars() {
  const bars = [
    { label: 'HTTPS', pct: 100, color: '#22A168' },
    { label: 'Meta titres', pct: 60, color: '#F0C744' },
    { label: 'Balises H1', pct: 80, color: '#22A168' },
    { label: 'Images alt', pct: 35, color: '#E05252' },
    { label: 'Maillage', pct: 45, color: '#F27A2A' },
  ];

  return (
    <div className="space-y-2.5">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="text-[10px] text-[#504F4A] w-16 text-right shrink-0">{b.label}</span>
          <div className="flex-1 h-1.5 bg-[#EEEDEB] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: <IconSearch size={20} />,
    title: 'Crawl intelligent',
    desc: 'Sitemap, BFS, détection CMS. On lit votre site comme Google le fait.',
  },
  {
    icon: <IconBarChart size={20} />,
    title: 'Score technique sur 100',
    desc: '10 critères SEO analysés automatiquement avec explications accessibles.',
  },
  {
    icon: <IconStar size={20} />,
    title: 'Analyse éditoriale par IA',
    desc: 'Claude analyse votre copywriting, offres, CTA et signaux de confiance.',
  },
  {
    icon: <IconTarget size={20} />,
    title: 'Plan d\'action priorisé',
    desc: 'Des actions concrètes classées par impact et difficulté.',
  },
  {
    icon: <IconType size={20} />,
    title: 'Mots-clés manquants',
    desc: 'Découvrez les termes que vos clients tapent et que vous n\'utilisez pas.',
  },
  {
    icon: <IconZap size={20} />,
    title: 'Résultats en 2 minutes',
    desc: 'Pas besoin de compte premium ou de setup complexe.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, email: authEmail } = useAuth();
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Prefill email if user is logged in
  useEffect(() => {
    if (authEmail && !email) setEmail(authEmail);
  }, [authEmail, email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (!parsed.hostname.includes('.')) throw new Error();
    } catch {
      setError("Entrez une URL valide (ex: https://monsite.fr)");
      return;
    }

    // If logged in, use auth email directly
    const finalEmail = user?.email || email;
    if (!finalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
      setError("Entrez une adresse email valide.");
      return;
    }

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    sessionStorage.setItem('mamie_url', fullUrl);
    sessionStorage.setItem('mamie_email', (user?.email || email).trim().toLowerCase());
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <AuthHeader />

      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center px-6 pt-12 pb-16">
        <div className="max-w-5xl w-full">
          {/* Hero top — form + preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            {/* Left — CTA + Form */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EEEDEB] rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22A168]" />
                <span className="text-[11px] font-medium text-[#504F4A]">Gratuit — aucune carte requise</span>
              </div>

              <h1 className="text-[36px] lg:text-[42px] font-medium text-[#1A1A18] mb-4 leading-[1.1] tracking-tight">
                Votre SEO, analysé et expliqué en 2&nbsp;minutes
              </h1>
              <p className="text-[15px] text-[#504F4A] leading-relaxed mb-8 max-w-md">
                Audit technique + analyse éditoriale par IA. Pensé pour les freelances qui veulent comprendre leur SEO sans jargon.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://monsite.fr"
                  className="w-full px-4 py-3.5 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
                  autoFocus
                />
                {user ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#F8F8F7] border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#504F4A]">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#22A168" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Connecté en tant que {user.email}
                  </div>
                ) : (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full px-4 py-3.5 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
                  />
                )}
                {error && <p className="text-[11px] text-[#E05252] px-1">{error}</p>}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#1A1A18] text-white text-[14px] font-medium rounded-[8px] hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                >
                  Analyser mon site gratuitement
                  <IconArrowRight size={16} />
                </button>
              </form>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-[12px] text-[#9C9A91]">
                  <IconShield size={14} />
                  <span>Pas de spam</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#9C9A91]">
                  <IconZap size={14} />
                  <span>Résultats en 2 min</span>
                </div>
              </div>
            </div>

            {/* Right — Visual asset */}
            <div className="hidden lg:block">
              <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-6 space-y-6">
                {/* Fake report preview */}
                <div className="flex items-center gap-3 pb-4 border-b border-[#EEEDEB]">
                  <div className="w-2 h-2 rounded-full bg-[#22A168]" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91]">
                    Exemple de rapport
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <PreviewGauge />
                  <PreviewBars />
                </div>

                <div className="bg-[#F8F8F7] rounded-[8px] p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-2">Analyse IA</p>
                  <p className="text-[14px] text-[#504F4A] leading-relaxed italic">
                    &ldquo;On comprend immédiatement que vous êtes coach pour dirigeants.
                    Votre H1 manque de mots-clés — essayez &apos;Coach certifié pour dirigeants&apos;.&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">coaching</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">dirigeant</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">+ coach certifié</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">+ burnout</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features grid */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-[24px] font-medium text-[#1A1A18] mb-2">
                Ce que vous obtenez gratuitement
              </h2>
              <p className="text-[15px] text-[#504F4A]">
                Un audit SEO complet, normalement facturé 200 EUR par une agence.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#EEEDEB] rounded-[12px] p-5"
                >
                  <span className="text-[#9C9A91] block mb-3">{f.icon}</span>
                  <h3 className="text-[14px] font-medium text-[#1A1A18] mb-1">{f.title}</h3>
                  <p className="text-[14px] text-[#504F4A] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing section */}
          <div id="pricing" className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-[24px] font-medium text-[#1A1A18] mb-2">
                Allez plus loin avec l&apos;analyse de page
              </h2>
              <p className="text-[15px] text-[#504F4A] max-w-md mx-auto">
                L&apos;audit SEO est gratuit. Pour une analyse UI, copywriting et conversion page par page, passez en Pro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Free plan */}
              <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#9C9A91] mb-1">Gratuit</p>
                <p className="text-[32px] font-medium text-[#1A1A18] tabular-nums mb-1">0 EUR</p>
                <p className="text-[14px] text-[#504F4A] mb-5">1 audit SEO complet par site</p>
                <ul className="space-y-2.5">
                  {[
                    'Crawl de 60 pages max',
                    'Score technique sur 100',
                    'Analyse éditoriale par IA',
                    'Plan d\'action priorisé',
                    'Mots-clés manquants',
                    'Rapport envoyé par email',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[14px] text-[#504F4A]">
                      <IconCheck size={14} className="text-[#22A168] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro plan */}
              <div className="bg-white border-2 border-[#1A1A18] rounded-[12px] p-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-[#1A1A18] text-white text-[10px] font-medium uppercase tracking-wider rounded-full">
                    Recommandé
                  </span>
                </div>
                <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#F27A2A] mb-1">Pro</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-medium text-[#1A1A18] tabular-nums">4,90</span>
                  <span className="text-[14px] text-[#504F4A]">EUR</span>
                </div>
                <p className="text-[14px] text-[#504F4A] mb-5">3 analyses de page approfondies</p>
                <ul className="space-y-2.5">
                  {[
                    'Tout le plan gratuit inclus',
                    'Analyse UI & première impression',
                    'Audit copywriting détaillé',
                    'Évaluation des CTA',
                    'Analyse confiance & preuve sociale',
                    'Recommandations actionnables',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[14px] text-[#504F4A]">
                      <IconCheck size={14} className="text-[#22A168] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center py-12 border-t border-[#EEEDEB]">
            <h2 className="text-[24px] font-medium text-[#1A1A18] mb-3">
              Prêt à améliorer votre visibilité ?
            </h2>
            <p className="text-[15px] text-[#504F4A] mb-6">
              Lancez votre première analyse — c&apos;est gratuit et ça prend 2 minutes.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-8 py-3.5 bg-[#1A1A18] text-white text-[14px] font-medium rounded-[8px] hover:bg-[#333] transition-colors inline-flex items-center gap-2"
            >
              Analyser mon site
              <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
