'use client';

import { useAuth } from './AuthProvider';
import { IconArrowRight } from './Icons';

interface AuthHeaderProps {
  showNewAnalysis?: boolean;
}

export default function AuthHeader({ showNewAnalysis = false }: AuthHeaderProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="px-6 lg:px-12 py-3.5 flex items-center justify-between border-b border-[#EEEDEB] bg-white">
      <a href="/" className="flex items-center gap-2 group">
        <span className="w-7 h-7 rounded-[8px] bg-[#1A1A18] flex items-center justify-center text-white text-[11px] font-bold">M</span>
        <span className="text-[15px] font-semibold text-[#1A1A18] group-hover:text-[#504F4A] transition-colors">Mamie SEO</span>
      </a>
      <nav className="flex items-center gap-5">
        {loading ? (
          <span className="w-16 h-3 bg-[#EEEDEB] rounded animate-pulse" />
        ) : user ? (
          <>
            {showNewAnalysis && (
              <a href="/" className="text-[13px] text-[#504F4A] hover:text-[#1A1A18] transition-colors hidden sm:flex items-center gap-1">
                Nouvelle analyse <IconArrowRight size={10} />
              </a>
            )}
            <a href="/dashboard" className="text-[13px] text-[#504F4A] hover:text-[#1A1A18] transition-colors">
              Mon espace
            </a>
            <button onClick={signOut} className="text-[12px] text-[#9C9A91] hover:text-[#1A1A18] transition-colors">
              Déconnexion
            </button>
          </>
        ) : (
          <>
            {showNewAnalysis && (
              <a href="/" className="text-[13px] text-[#504F4A] hover:text-[#1A1A18] transition-colors hidden sm:flex items-center gap-1">
                Nouvelle analyse <IconArrowRight size={10} />
              </a>
            )}
            <a href="/login" className="text-[13px] text-[#504F4A] hover:text-[#1A1A18] transition-colors">
              Connexion
            </a>
            <a href="/signup" className="px-3.5 py-1.5 bg-[#1A1A18] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#333] transition-colors">
              Créer un compte
            </a>
          </>
        )}
      </nav>
    </header>
  );
}
