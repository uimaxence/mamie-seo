'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AuthHeader from '@/components/AuthHeader';
import {
  IconSearch, IconBarChart, IconTarget, IconStar,
  IconShield, IconZap, IconType, IconArrowRight, IconCheck
} from '@/components/Icons';

// ─── Animated placeholder that cycles between freelance URLs ───
const PLACEHOLDER_URLS = [
  'https://marie-coach.fr',
  'https://thomas-dev.com',
  'https://studio-bloom.fr',
  'https://sophie-naturopathe.fr',
  'https://lucas-consultant.com',
];

function useAnimatedPlaceholder() {
  const [placeholder, setPlaceholder] = useState('');
  const [urlIndex, setUrlIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const currentUrl = PLACEHOLDER_URLS[urlIndex];

    if (isPaused) {
      const timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    if (!isDeleting && charIndex < currentUrl.length) {
      const timeout = setTimeout(() => {
        setPlaceholder(currentUrl.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 40 + Math.random() * 30);
      return () => clearTimeout(timeout);
    }

    if (!isDeleting && charIndex === currentUrl.length) {
      setIsPaused(true);
      return;
    }

    if (isDeleting && charIndex > 0) {
      const timeout = setTimeout(() => {
        setPlaceholder(currentUrl.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, 20);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setUrlIndex((urlIndex + 1) % PLACEHOLDER_URLS.length);
    }
  }, [charIndex, isDeleting, isPaused, urlIndex]);

  return placeholder;
}

// ─── Mini animated preview gauge ───
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

// ─── Mini criteria preview bars ───
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

// ─── Social proof avatars ───
function SocialProof() {
  const colors = ['#7F77DD', '#22A168', '#F27A2A', '#E05252', '#F0C744'];
  const initials = ['MC', 'TD', 'SB', 'LR', 'AP'];

  return (
    <div className="flex items-center gap-3 mt-6">
      <div className="flex -space-x-2">
        {colors.map((bg, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full border-2 border-[#F8F8F7] flex items-center justify-center text-[8px] font-bold text-white"
            style={{ backgroundColor: bg }}
          >
            {initials[i]}
          </div>
        ))}
      </div>
      <div className="text-[12px] text-[#504F4A]">
        <span className="font-medium text-[#1A1A18]">+1 200</span> analyses ce mois
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <IconSearch size={20} />,
    title: 'Crawl intelligent',
    desc: 'Sitemap, BFS, d\u00e9tection CMS. On lit votre site comme Google le fait.',
  },
  {
    icon: <IconBarChart size={20} />,
    title: 'Score technique sur 100',
    desc: '10 crit\u00e8res SEO analys\u00e9s automatiquement avec explications accessibles.',
  },
  {
    icon: <IconStar size={20} />,
    title: 'Analyse \u00e9ditoriale par IA',
    desc: 'Claude analyse votre copywriting, offres, CTA et signaux de confiance.',
  },
  {
    icon: <IconTarget size={20} />,
    title: 'Plan d\'action prioritaire',
    desc: 'Des actions concr\u00e8tes class\u00e9es par impact et difficult\u00e9.',
  },
  {
    icon: <IconType size={20} />,
    title: 'Mots-cl\u00e9s manquants',
    desc: 'D\u00e9couvrez les termes que vos clients tapent et que vous n\'utilisez pas.',
  },
  {
    icon: <IconZap size={20} />,
    title: 'R\u00e9sultats en 60 secondes',
    desc: 'Pas de setup, pas de compte obligatoire. Entrez votre URL, c\'est tout.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Marie L.',
    role: 'Coach de vie',
    text: 'J\'ai enfin compris pourquoi mon site n\'apparaissait pas sur Google. Les recommandations \u00e9taient claires et actionnables.',
  },
  {
    name: 'Thomas R.',
    role: 'D\u00e9veloppeur freelance',
    text: 'L\'analyse \u00e9ditoriale par IA m\'a ouvert les yeux sur mon copywriting. Mon taux de conversion a augment\u00e9 de 30%.',
  },
  {
    name: 'Sophie M.',
    role: 'Naturopathe',
    text: 'Simple, rapide, et les conseils sont adapt\u00e9s \u00e0 mon m\u00e9tier. Bien plus utile qu\'un audit g\u00e9n\u00e9rique.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, email: authEmail } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animatedPlaceholder = useAnimatedPlaceholder();

  // Auto-focus on desktop
  useEffect(() => {
    if (window.innerWidth > 768 && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Real-time URL validation
  useEffect(() => {
    if (!url) {
      setUrlValid(null);
      return;
    }
    try {
      const full = url.startsWith('http') ? url : `https://${url}`;
      const parsed = new URL(full);
      setUrlValid(parsed.hostname.includes('.'));
    } catch {
      setUrlValid(false);
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      const parsed = new URL(fullUrl);
      if (!parsed.hostname.includes('.')) throw new Error();
    } catch {
      setError("Entrez une URL valide (ex: monsite.fr)");
      return;
    }

    sessionStorage.setItem('mamie_url', fullUrl);
    // If user is logged in, store their email
    if (user?.email) {
      sessionStorage.setItem('mamie_email', user.email);
    }
    router.push('/analyzing');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />

      {/* ════════ Hero ════════ */}
      <section className="flex-1 flex flex-col items-center px-6 pt-12 pb-16">
        <div className="max-w-5xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            {/* Left — CTA */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EEEDEB] rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22A168] animate-pulse" />
                <span className="text-[11px] font-medium text-[#504F4A]">Gratuit — aucune carte requise</span>
              </div>

              <h1 className="text-[36px] lg:text-[44px] font-medium text-[#1A1A18] mb-4 leading-[1.08] tracking-tight">
                Votre site attire-t-il vraiment vos futurs&nbsp;clients&nbsp;?
              </h1>
              <p className="text-[15px] text-[#504F4A] leading-relaxed mb-8 max-w-md">
                Analyse SEO, copywriting et design en 60&nbsp;secondes. Pens&eacute; pour les freelances et ind&eacute;pendants.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={animatedPlaceholder || 'https://votre-site.fr'}
                    className={`w-full px-4 py-4 bg-white border rounded-[10px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none transition-all ${
                      urlValid === false && url
                        ? 'border-[#E05252] focus:border-[#E05252]'
                        : urlValid === true
                        ? 'border-[#22A168] focus:border-[#22A168]'
                        : 'border-[#EEEDEB] focus:border-[#1A1A18]'
                    }`}
                  />
                  {urlValid === true && url && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="8" fill="#22A168" />
                        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
                {error && <p className="text-[11px] text-[#E05252] px-1">{error}</p>}
                <button
                  type="submit"
                  disabled={!url || urlValid === false}
                  className="w-full py-4 bg-[#1A1A18] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#333] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Analyser mon site gratuitement
                  <IconArrowRight size={16} />
                </button>
              </form>

              {/* Trust badges */}
              <div className="flex items-center gap-5 mt-5">
                <div className="flex items-center gap-1.5 text-[12px] text-[#9C9A91]">
                  <IconCheck size={14} className="text-[#22A168]" />
                  <span>Gratuit</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#9C9A91]">
                  <IconZap size={14} className="text-[#F0C744]" />
                  <span>R&eacute;sultat en 60s</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#9C9A91]">
                  <IconShield size={14} />
                  <span>Sans installation</span>
                </div>
              </div>

              {/* Social proof */}
              <SocialProof />
            </div>

            {/* Right — Visual asset */}
            <div className="hidden lg:block">
              <div className="bg-white border border-[#EEEDEB] rounded-[12px] p-6 space-y-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)]">
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
                    &ldquo;On comprend imm&eacute;diatement que vous &ecirc;tes coach pour dirigeants.
                    Votre H1 manque de mots-cl&eacute;s — essayez &apos;Coach certifi&eacute; pour dirigeants&apos;.&rdquo;
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">coaching</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">dirigeant</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">+ coach certifi&eacute;</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">+ burnout</span>
                </div>
              </div>
            </div>
          </div>

          {/* ════════ Features grid ════════ */}
          <div className="mb-24">
            <div className="text-center mb-10">
              <h2 className="text-[24px] font-medium text-[#1A1A18] mb-2">
                Ce que vous obtenez gratuitement
              </h2>
              <p className="text-[15px] text-[#504F4A]">
                Un audit SEO complet, normalement factur&eacute; 200&nbsp;EUR par une agence.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#EEEDEB] rounded-[12px] p-5 hover:border-[#9C9A91] transition-colors"
                >
                  <span className="text-[#9C9A91] block mb-3">{f.icon}</span>
                  <h3 className="text-[14px] font-medium text-[#1A1A18] mb-1">{f.title}</h3>
                  <p className="text-[14px] text-[#504F4A] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ════════ Testimonials ════════ */}
          <div className="mb-24">
            <div className="text-center mb-10">
              <h2 className="text-[24px] font-medium text-[#1A1A18] mb-2">
                Ils ont d&eacute;j&agrave; analys&eacute; leur site
              </h2>
              <p className="text-[15px] text-[#504F4A]">
                Des freelances et ind&eacute;pendants comme vous.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="bg-white border border-[#EEEDEB] rounded-[12px] p-5">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="12" height="12" viewBox="0 0 16 16" fill="#F0C744">
                        <path d="M8 1l2.2 4.5 5 .7-3.6 3.5.9 5L8 12.4 3.5 14.7l.9-5L.8 6.2l5-.7L8 1z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[14px] text-[#504F4A] leading-relaxed mb-4 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 pt-3 border-t border-[#EEEDEB]">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: ['#7F77DD', '#22A168', '#F27A2A'][i] }}
                    >
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#1A1A18]">{t.name}</p>
                      <p className="text-[11px] text-[#9C9A91]">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════ Pricing ════════ */}
          <div id="pricing" className="mb-24">
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
                <p className="text-[14px] text-[#504F4A] mb-5">Audit SEO complet par site</p>
                <ul className="space-y-2.5">
                  {[
                    'Crawl de 60 pages max',
                    'Score technique sur 100',
                    'Analyse \u00e9ditoriale par IA',
                    'Plan d\'action prioritaire',
                    'Mots-cl\u00e9s manquants',
                    'Rapport sauvegard\u00e9',
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
                    Recommand&eacute;
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
                    'Analyse UI & premi\u00e8re impression',
                    'Audit copywriting d\u00e9taill\u00e9',
                    '\u00c9valuation des CTA',
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

          {/* ════════ Final CTA ════════ */}
          <div className="text-center py-12 border-t border-[#EEEDEB]">
            <h2 className="text-[24px] font-medium text-[#1A1A18] mb-3">
              Pr&ecirc;t &agrave; am&eacute;liorer votre visibilit&eacute; ?
            </h2>
            <p className="text-[15px] text-[#504F4A] mb-6">
              Lancez votre premi&egrave;re analyse — c&apos;est gratuit et &ccedil;a prend 60&nbsp;secondes.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-8 py-3.5 bg-[#1A1A18] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#333] transition-colors inline-flex items-center gap-2"
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
