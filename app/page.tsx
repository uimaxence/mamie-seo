'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  Globe, ArrowRight, Check, AlertCircle, TriangleAlert,
  BarChart2, PenLine, Scan,
} from 'lucide-react';

// ─── Animated placeholder ───
const PLACEHOLDER_URLS = [
  'https://marie-coach.fr',
  'https://thomas-dev.com',
  'https://studio-bloom.fr',
  'https://sophie-naturopathe.fr',
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
      const t = setTimeout(() => { setIsPaused(false); setIsDeleting(true); }, 2000);
      return () => clearTimeout(t);
    }
    if (!isDeleting && charIndex < currentUrl.length) {
      const t = setTimeout(() => { setPlaceholder(currentUrl.slice(0, charIndex + 1)); setCharIndex(charIndex + 1); }, 40 + Math.random() * 30);
      return () => clearTimeout(t);
    }
    if (!isDeleting && charIndex === currentUrl.length) { setIsPaused(true); return; }
    if (isDeleting && charIndex > 0) {
      const t = setTimeout(() => { setPlaceholder(currentUrl.slice(0, charIndex - 1)); setCharIndex(charIndex - 1); }, 20);
      return () => clearTimeout(t);
    }
    if (isDeleting && charIndex === 0) { setIsDeleting(false); setUrlIndex((urlIndex + 1) % PLACEHOLDER_URLS.length); }
  }, [charIndex, isDeleting, isPaused, urlIndex]);

  return placeholder;
}

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const animatedPlaceholder = useAnimatedPlaceholder();

  useEffect(() => {
    if (window.innerWidth > 768 && inputRef.current) inputRef.current.focus();
  }, []);

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
    if (user?.email) sessionStorage.setItem('mamie_email', user.email);
    router.push('/analyzing');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ═══ NAV ═══ */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-neutral-200">
        <a href="/" className="font-display text-[20px] text-neutral-900">
          Audit<span className="text-[#E05A2B]">.</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors">Fonctionnalités</a>
          <a href="#preview" className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors">Exemples</a>
          <a href="#pricing" className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors">Tarifs</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <a href="/dashboard" className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors">Mon espace</a>
          ) : (
            <a href="/login" className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors">Connexion</a>
          )}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-neutral-900 text-white rounded-full px-5 py-2 text-[13px] font-medium flex items-center gap-1.5 hover:bg-neutral-800 transition-colors"
          >
            Commencer <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="text-center pt-16 pb-0 px-6 lg:px-12">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-1.5 border border-neutral-300 rounded-full px-4 py-1 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E05A2B]" />
          <span className="text-[12px] text-neutral-500">Pensé pour les freelances et indépendants</span>
        </div>

        {/* H1 */}
        <h1 className="font-display text-[clamp(38px,5vw,58px)] leading-[1.1] tracking-tight max-w-2xl mx-auto mb-5">
          Votre site attire-t-il vraiment<br />
          <em className="text-[#E05A2B]">vos futurs clients</em> ?
        </h1>

        {/* Subtitle */}
        <p className="text-[16px] text-neutral-500 max-w-md mx-auto mb-10 leading-relaxed">
          Analyse SEO, copywriting et design en 60&nbsp;secondes. Un rapport concret, pas du jargon.
        </p>

        {/* URL input bar */}
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div className="flex items-center border border-neutral-300 rounded-xl pl-4 pr-2 py-2">
            <Globe size={16} className="text-neutral-400 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={animatedPlaceholder || 'https://votre-site.fr'}
              className="flex-1 text-[15px] placeholder-neutral-400 bg-transparent outline-none"
            />
            <button
              type="submit"
              className="bg-neutral-900 text-white rounded-lg px-6 py-3 text-[14px] font-medium hover:bg-neutral-800 transition-colors shrink-0"
            >
              Analyser mon site
            </button>
          </div>
          {error && <p className="text-[12px] text-[#C03030] mt-2">{error}</p>}
        </form>

        {/* Meta badges */}
        <div className="flex items-center justify-center gap-4 mt-3">
          {['Gratuit', 'Résultat en 60s', 'Sans installation'].map((t) => (
            <span key={t} className="flex items-center gap-1 text-[12px] text-neutral-400">
              <Check size={12} /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ REPORT PREVIEW ═══ */}
      <section id="preview" className="max-w-4xl mx-auto mt-12 px-6">
        <div className="border border-neutral-200 rounded-2xl bg-neutral-50 p-6">
          {/* Title bar */}
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#C03030]" />
            <span className="w-2 h-2 rounded-full bg-[#E05A2B]" />
            <span className="w-2 h-2 rounded-full bg-[#2D8A5E]" />
            <span className="text-[12px] text-neutral-400 ml-2">marie-coach.fr — Rapport d&apos;analyse</span>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Score global', value: '58', suffix: '/100', color: '#E05A2B' },
              { label: 'Technique', value: '52', suffix: '/100', color: '#E05A2B' },
              { label: 'Éditorial', value: '64', suffix: '/100', color: '#E05A2B' },
              { label: 'Pages crawlées', value: '18', suffix: '', color: '#2D8A5E' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-neutral-200 rounded-xl p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5">{s.label}</p>
                <p className="text-[22px] font-medium" style={{ color: s.color }}>
                  {s.value}<span className="text-[13px] text-neutral-400">{s.suffix}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Grid: bars + problems */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left — progress bars */}
            <div className="space-y-4">
              {[
                { label: 'Méta-titres', value: '4/18 pages', pct: 22, color: '#E05A2B' },
                { label: 'Balises H1', value: '15/18 pages', pct: 83, color: '#2D8A5E' },
                { label: 'Images avec alt', value: '40%', pct: 40, color: '#E05A2B' },
                { label: 'Maillage interne', value: 'faible', pct: 25, color: '#C03030' },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                    <span>{b.label}</span><span>{b.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-200">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Right — problem cards */}
            <div className="flex flex-col gap-2">
              {[
                { type: 'danger' as const, title: 'H1 trop vague', desc: '« Accompagnons-nous vers votre mieux-être » — Google ne comprend pas votre métier.' },
                { type: 'danger' as const, title: '12 pages sans méta-description', desc: 'Google choisit lui-même votre texte dans les résultats de recherche.' },
                { type: 'warning' as const, title: 'CTA invisible sur mobile', desc: 'Contraste insuffisant (2.1:1). Minimum requis : 4.5:1.' },
              ].map((p) => (
                <div key={p.title} className="flex items-start gap-2.5 bg-white border border-neutral-200 rounded-lg p-3 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.type === 'danger' ? 'bg-[#FCEBEB]' : 'bg-[#FDF3ED]'}`}>
                    {p.type === 'danger'
                      ? <AlertCircle size={11} className="text-[#C03030]" />
                      : <TriangleAlert size={11} className="text-[#E05A2B]" />}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{p.title}</p>
                    <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-neutral-200 mt-14">
        {[
          { value: '1 200+', label: 'Analyses ce mois' },
          { value: '47 s', label: "Temps moyen d'analyse" },
          { value: '12', label: 'Critères vérifiés' },
          { value: '100%', label: 'Pensé pour les indépendants' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`py-7 px-8 ${i < 3 ? 'border-r border-neutral-200' : ''}`}
          >
            <p className="font-display text-[32px] mb-1">{s.value}</p>
            <p className="text-[12px] uppercase tracking-wide text-neutral-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ FEATURES ("Pourquoi choisir") ═══ */}
      <section id="features" className="grid grid-cols-1 lg:grid-cols-2 gap-16 px-6 lg:px-12 py-18 items-start max-w-7xl mx-auto">
        {/* Left */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#E05A2B] mb-5">
            Pourquoi choisir Audit.fr
          </p>
          <h2 className="font-display text-[38px] leading-[1.15] tracking-tight mb-5">
            Découvrez ce qui freine vraiment votre site
          </h2>
          <p className="text-[15px] text-neutral-500 leading-relaxed mb-8">
            Les outils SEO classiques sont faits pour des équipes marketing. Celui-ci est fait pour vous : un freelance qui veut être trouvé par ses futurs clients, sans passer des heures à apprendre le jargon.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-neutral-900 text-white rounded-full px-6 py-3 text-sm font-medium flex items-center gap-1.5 hover:bg-neutral-800 transition-colors"
            >
              Analyser mon site <ArrowRight size={14} />
            </button>
            <a href="#preview" className="text-sm text-neutral-400 underline underline-offset-2">
              Voir un exemple de rapport
            </a>
          </div>
        </div>

        {/* Right — feature cards */}
        <div className="flex flex-col gap-3">
          {/* Card 1 */}
          <div className="flex items-start gap-3.5 bg-neutral-50 border border-neutral-200 rounded-xl p-4.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#FDF3ED] shrink-0">
              <BarChart2 size={16} className="text-[#E05A2B]" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Analyse SEO complète en 60 secondes</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Méta-titres, structure H1-H6, sitemap, maillage interne — 12 critères vérifiés automatiquement sur toutes vos pages.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex items-start gap-3.5 bg-neutral-50 border border-neutral-200 rounded-xl p-4.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#FDF3ED] shrink-0">
              <PenLine size={16} className="text-[#E05A2B]" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Analyse éditoriale par Claude</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Est-ce qu&apos;on comprend ce que vous faites ? Vos offres sont-elles claires ? Un regard expert sur votre copywriting, avec des exemples concrets pour votre métier.
              </p>
            </div>
          </div>

          {/* Card 3 — split */}
          <div className="grid grid-cols-2 bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-5">
              <p className="font-medium text-sm mb-1.5">Analyse UI annotée</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Screenshot de votre page avec des annotations visuelles sur chaque section. Design, lisibilité, CTA, mobile.
              </p>
              <p className="mt-2.5 text-xs font-medium text-[#E05A2B]">Pro · 1 crédit / page</p>
            </div>
            <div className="bg-neutral-900 flex items-center justify-center p-4">
              <div className="w-full rounded-md overflow-hidden border border-white/10 bg-white/[0.08] p-2 relative">
                <div className="h-1 rounded bg-white/25 mb-1.5 w-[80%]" />
                <div className="h-1 rounded bg-white/25 mb-1.5 w-[60%]" />
                <div className="h-1 rounded bg-white/25 mb-1.5 w-[80%]" />
                <div className="h-1 rounded bg-white/25 w-[50%]" />
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[#E05A2B] text-white flex items-center justify-center text-[8px] font-bold">1</span>
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#E05A2B] text-white flex items-center justify-center text-[8px] font-bold">2</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="px-6 lg:px-12 py-18 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-medium uppercase tracking-wide text-[#E05A2B] mb-4">Tarifs</p>
          <h2 className="font-display text-[32px] tracking-tight mb-3">Simple et transparent</h2>
          <p className="text-[15px] text-neutral-500">L&apos;audit SEO est gratuit. Les analyses de page sont en crédits.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="border border-neutral-200 rounded-xl p-6">
            <p className="text-[12px] uppercase tracking-wide text-neutral-400 mb-1">Gratuit</p>
            <p className="text-[32px] font-medium text-neutral-900 mb-1">0 €</p>
            <p className="text-[14px] text-neutral-500 mb-6">Audit SEO complet par site</p>
            <ul className="space-y-2.5 mb-6">
              {['Crawl de 60 pages max', 'Score technique sur 100', 'Analyse éditoriale par IA', 'Plan d\'action priorisé', 'Mots-clés manquants', 'Rapport sauvegardé'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[14px] text-neutral-600">
                  <Check size={14} className="text-[#2D8A5E] shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full py-3 border border-neutral-300 rounded-full text-[14px] font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              Analyser gratuitement
            </button>
          </div>

          {/* Pro */}
          <div className="border-2 border-neutral-900 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-neutral-900 text-white text-[10px] font-medium uppercase tracking-wider rounded-full">
                Recommandé
              </span>
            </div>
            <p className="text-[12px] uppercase tracking-wide text-[#E05A2B] mb-1">Pro</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[32px] font-medium text-neutral-900">4,90</span>
              <span className="text-[14px] text-neutral-500">€</span>
            </div>
            <p className="text-[14px] text-neutral-500 mb-6">3 analyses de page approfondies</p>
            <ul className="space-y-2.5 mb-6">
              {['Tout le plan gratuit inclus', 'Analyse UI & première impression', 'Audit copywriting détaillé', 'Évaluation des CTA', 'Analyse confiance & preuve sociale', 'Recommandations actionnables'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[14px] text-neutral-600">
                  <Check size={14} className="text-[#2D8A5E] shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cta-accent w-full py-3 text-[14px] flex items-center justify-center gap-1.5"
            >
              Commencer une analyse <ArrowRight size={14} />
            </button>
            <p className="text-[11px] text-neutral-400 text-center mt-2">Achetez vos crédits depuis votre rapport</p>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <div className="text-center py-16 border-t border-neutral-200">
        <h2 className="font-display text-[28px] tracking-tight mb-3">Prêt à améliorer votre visibilité ?</h2>
        <p className="text-[15px] text-neutral-500 mb-6">60 secondes pour tout comprendre.</p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-neutral-900 text-white rounded-full px-8 py-3.5 text-[14px] font-medium inline-flex items-center gap-1.5 hover:bg-neutral-800 transition-colors"
        >
          Analyser mon site <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
