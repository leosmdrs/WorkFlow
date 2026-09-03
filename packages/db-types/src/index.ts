/**
 * Tipos do banco.
 *
 * Duas camadas:
 *
 * 1. `domain.ts` — nossos tipos de negócio (Profile, ProcessRow,
 *    InboxRow, TimelineEntry, …). Independentes da geração automática.
 *
 * 2. `database.generated.ts` — a shape `Database` que o cliente
 *    Supabase consome. É sobrescrita por `pnpm db:types`. Enquanto
 *    a geração não roda, mantemos um placeholder manual em cima dos
 *    tipos de domain.ts para que qualquer clone recém-feito compile.
 */

export type { Database } from './database.generated.ts';
export * from './domain.ts';

import type { Database } from './database.generated.ts';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
