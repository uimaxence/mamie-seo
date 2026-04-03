'use client';

import { useAuth } from './AuthProvider';
import { IconArrowRight } from './Icons';

interface AuthHeaderProps {
  showNewAnalysis?: boolean;
}

export default function AuthHeader({ showNewAnalysis = false }: AuthHeaderProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-[#EEEDEB] bg-white">
      <a href="/" className="text-[14px] font-medium text-[#1A1A18]">Mamie SEO</a>
      <div className="flex items-center gap-4">
        {loading ? (
          <span className="w-16 h-3 bg-[#EEEDEB] rounded animate-pulse" />
        ) : user ? (
          <>
            {showNewAnalysis && (
              <a href="/" className="text-[11px] text-[#73726C] hover:text-[#1A1A18] transition-colors flex items-center gap-1">
                Nouvelle analyse <IconArrowRight size={10} />
              </a>
            )}
            <a href="/dashboard" className="text-[11px] text-[#73726C] hover:text-[#1A1A18] transition-colors">
              Mon espace
            </a>
            <button onClick={signOut} className="text-[11px] text-[#C2C0B6] hover:text-[#1A1A18] transition-colors">
              Déconnexion
            </button>
          </>
        ) : (
          <>
            {showNewAnalysis && (
              <a href="/" className="text-[11px] text-[#73726C] hover:text-[#1A1A18] transition-colors flex items-center gap-1">
                Nouvelle analyse <IconArrowRight size={10} />
              </a>
            )}
            <a href="/login" className="text-[11px] text-[#73726C] hover:text-[#1A1A18] transition-colors">
              Connexion
            </a>
            <a href="/signup" className="px-3 py-1.5 bg-[#1A1A18] text-white text-[11px] font-medium rounded-[6px] hover:bg-[#333] transition-colors">
              Créer un compte
            </a>
          </>
        )}
      </div>
    </header>
  );
}
