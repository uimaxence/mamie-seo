'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { IconArrowRight } from '@/components/Icons';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      setLoading(false);
      return;
    }

    const { error } = await getSupabaseBrowser().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-6 py-4">
          <a href="/" className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</a>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[#EAF3DE] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 8.5l3 3 6-7" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-[18px] font-medium text-[#1A1A18] mb-2">Vérifiez votre email</h1>
            <p className="text-[15px] text-[#504F4A] leading-relaxed">
              Un lien de confirmation a été envoyé à <strong className="text-[#1A1A18]">{email}</strong>.
              Cliquez dessus pour activer votre compte.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</a>
        <a href="/login" className="text-[13px] text-[#504F4A] hover:text-[#1A1A18] transition-colors">
          Se connecter
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-medium text-[#1A1A18] mb-2">Créer un compte</h1>
            <p className="text-[15px] text-[#504F4A]">Sauvegardez vos rapports et gérez vos crédits.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (6+ caractères)"
              className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
              required
              minLength={6}
            />
            {error && <p className="text-[11px] text-[#E05252] px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
              {!loading && <IconArrowRight size={14} />}
            </button>
          </form>

          <p className="text-center mt-6 text-[12px] text-[#9C9A91]">
            Déjà un compte ? <a href="/login" className="text-[#1A1A18] font-medium hover:underline">Se connecter</a>
          </p>
        </div>
      </main>
    </div>
  );
}
