import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from './supabase.ts';

/**
 * Guarda de rota. Enquanto a sessão está sendo carregada, mostra um
 * estado neutro (não redireciona nem renderiza o filho) para evitar
 * flash de "não autenticado" antes do Supabase acordar do storage.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="empty">Carregando…</div>;
  if (session === null) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
