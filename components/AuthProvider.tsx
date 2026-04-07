'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

interface AuthContext {
  user: User | null;
  loading: boolean;
  email: string | null;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  loading: true,
  email: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setUser(data.user ?? null);
          // Sync email to sessionStorage for backwards compat
          if (data.user?.email) {
            sessionStorage.setItem('mamie_email', data.user.email);
          }
        }
      } catch {
        // Supabase not configured — that's OK
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // Listen for auth changes
    try {
      const supabase = getSupabaseBrowser();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u?.email) {
          sessionStorage.setItem('mamie_email', u.email);

          // On sign-in or email confirmation, link any pending reports
          if (event === 'SIGNED_IN' && u.id) {
            const pendingReportId = sessionStorage.getItem('mamie_pending_report');
            if (pendingReportId) {
              fetch('/api/link-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: u.email,
                  reportId: pendingReportId,
                  userId: u.id,
                }),
              }).catch(() => { /* non-blocking */ });
              sessionStorage.removeItem('mamie_pending_report');
            }
          }
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      return () => { mounted = false; };
    }
  }, []);

  const email = user?.email || (typeof window !== 'undefined' ? sessionStorage.getItem('mamie_email') : null);

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
    } catch { /* */ }
    setUser(null);
    // Only clear auth-related keys, preserve mamie_url for re-analysis
    sessionStorage.removeItem('mamie_email');
    sessionStorage.removeItem('mamie_onboarding');
    sessionStorage.removeItem('mamie_pending_report');
  };

  return (
    <AuthCtx.Provider value={{ user, loading, email, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
