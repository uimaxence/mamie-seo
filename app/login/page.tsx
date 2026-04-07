'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { IconArrowRight } from '@/components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: loginError } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : loginError.message);
      setLoading(false);
      return;
    }

    // Sync email to sessionStorage
    sessionStorage.setItem('mamie_email', email.toLowerCase().trim());

    // Link any pending report to this user
    const pendingReportId = sessionStorage.getItem('mamie_pending_report');
    if (pendingReportId && data.user) {
      try {
        await fetch('/api/link-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            reportId: pendingReportId,
            userId: data.user.id,
          }),
        });
      } catch { /* non-blocking */ }
      sessionStorage.removeItem('mamie_pending_report');
      router.push(`/report/${pendingReportId}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</a>
        <a href="/signup" className="text-[13px] text-[#504F4A] hover:text-[#1A1A18] transition-colors">
          Créer un compte
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-medium text-[#1A1A18] mb-2">Connexion</h1>
            <p className="text-[15px] text-[#504F4A]">Retrouvez vos rapports et vos crédits.</p>
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
              placeholder="Mot de passe"
              className="w-full px-4 py-3 bg-white border border-[#EEEDEB] rounded-[8px] text-[15px] text-[#1A1A18] placeholder:text-[#9C9A91] outline-none focus:border-[#1A1A18] transition-colors"
              required
            />
            {error && <p className="text-[11px] text-[#E05252] px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1A1A18] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <IconArrowRight size={14} />}
            </button>
          </form>

          <p className="text-center mt-6 text-[12px] text-[#9C9A91]">
            Pas encore de compte ? <a href="/signup" className="text-[#1A1A18] font-medium hover:underline">Créer un compte</a>
          </p>
        </div>
      </main>
    </div>
  );
}
