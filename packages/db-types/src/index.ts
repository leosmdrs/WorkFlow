/**
 * Tipos do banco Postgres.
 *
 * `database.generated.ts` é gerado por `pnpm db:types` (que roda
 * `supabase gen types typescript`). Este arquivo é o ponto de entrada
 * público — re-exporta os tipos gerados + alguns aliases convenientes.
 *
 * Enquanto a Fase 0 não tem Supabase local rodando, o arquivo gerado
 * ainda não existe. Assim que rodar `pnpm db:start && pnpm db:types`,
 * remova o placeholder abaixo.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
// TODO(fase-0): substituir pelo re-export do arquivo gerado:
// export type { Database } from './database.generated.ts';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
