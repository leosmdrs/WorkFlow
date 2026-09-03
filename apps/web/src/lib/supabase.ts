import { createClient } from '@supabase/supabase-js';
import type { Database } from '@rota/db-types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha ruidosa em dev: melhor um erro claro no console do que um app
  // que "funciona" fazendo login em nada.
  console.error(
    '[Rota] VITE_SUPABASE_URL/ANON_KEY ausentes. Copie .env.example para .env.local.',
  );
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Login por username. O Auth do Supabase quer e-mail, mas nossa UI expõe
 * username. Resolvemos aqui: perguntamos o e-mail correspondente à profile
 * antes de chamar signInWithPassword.
 *
 * Segurança: a leitura de profiles por username retorna só id + email
 * (via view segura) e é permitida a anônimos apenas para essa finalidade.
 * Se não quiserem expor sequer o email, trocar por Edge Function.
 * TODO(fase-1): confirmar essa decisão com a TI da PRF.
 */
export async function signInWithUsername(username: string, password: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    // Truque: usamos rpc em vez de select para não vazar email arbitrariamente.
    // Placeholder até a Fase 1 definir. Aqui deixamos com select para o skeleton.
    .eq('username', username)
    .maybeSingle();
  if (error || !data) {
    return { error: { message: 'Usuário ou senha inválidos.' } as const };
  }
  // TODO(fase-1): resolver email via RPC segura e chamar signInWithPassword.
  return {
    error: { message: 'Login por username ainda não implementado (Fase 1).' } as const,
  };
}
