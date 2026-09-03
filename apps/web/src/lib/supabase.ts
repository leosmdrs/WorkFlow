import type { Database } from '@rota/db-types';
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('[Rota] VITE_SUPABASE_URL/ANON_KEY ausentes. Copie .env.example para .env.local.');
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 8 },
  },
});

/**
 * Login por username. A UI pede username; Supabase Auth quer e-mail.
 * Resolvemos server-side via RPC `email_for_username` (security definer),
 * criada na migration 20260903000005.
 *
 * Devolvemos o mesmo shape do signInWithPassword para os chamadores não
 * precisarem descobrir se erro foi de resolução ou de credencial — a
 * mensagem exibida é sempre "usuário ou senha inválidos", para não
 * confirmar existência do username a quem tentar enumerar.
 */
export async function signInWithUsername(username: string, password: string) {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return { error: { message: 'invalid_credentials' } };

  const { data: email, error: rpcError } = await supabase.rpc('email_for_username', {
    _username: trimmed,
  });
  if (rpcError || !email) return { error: { message: 'invalid_credentials' } };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: { message: 'invalid_credentials' } };
  return { data, error: null };
}
