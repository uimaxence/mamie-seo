'use client';

import { useAuth } from './AuthProvider';
import { ArrowRight } from 'lucide-react';

interface AuthHeaderProps {
  showNewAnalysis?: boolean;
}

export default function AuthHeader({ showNewAnalysis = false }: AuthHeaderProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-neutral-200 bg-white">
      <a href="/" className="font-display text-[20px] text-neutral-900">
        Audit<span className="text-[#E05A2B]">.</span>
      </a>
      <nav className="flex items-center gap-5">
        {loading ? (
          <span className="w-16 h-3 bg-neutral-200 rounded animate-pulse" />
        ) : user ? (
          <>
            {showNewAnalysis && (
              <a href="/" className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors hidden sm:flex items-center gap-1">
                Nouvelle analyse <ArrowRight size={10} />
              </a>
            )}
            <a href="/dashboard" className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors">
              Mon espace
            </a>
            <button onClick={signOut} className="text-[12px] text-neutral-400 hover:text-neutral-900 transition-colors">
              Déconnexion
            </button>
          </>
        ) : (
          <>
            {showNewAnalysis && (
              <a href="/" className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors hidden sm:flex items-center gap-1">
                Nouvelle analyse <ArrowRight size={10} />
              </a>
            )}
            <a href="/login" className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors">
              Connexion
            </a>
            <a href="/signup" className="bg-neutral-900 text-white rounded-full px-4 py-1.5 text-[12px] font-medium hover:bg-neutral-800 transition-colors">
              Créer un compte
            </a>
          </>
        )}
      </nav>
    </header>
  );
}
