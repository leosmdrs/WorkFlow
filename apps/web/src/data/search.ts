import type { SearchResult } from '@rota/db-types';
import { useQuery } from '@tanstack/react-query';
import { isSearchable } from '../lib/search.ts';
import { supabase } from '../lib/supabase.ts';

/**
 * Busca global. A RPC search_all é SECURITY INVOKER, então o que volta
 * já é o que a RLS permite a quem está logado.
 *
 * `enabled` evita a ida ao servidor para consulta curta — a RPC também
 * devolveria vazio, mas não há motivo para gastar a viagem.
 */
export function useGlobalSearch(query: string, limit = 20) {
  const q = query.trim();
  return useQuery({
    enabled: isSearchable(q),
    queryKey: ['search', q, limit],
    // Resultado de busca envelhece rápido, mas dentro de uma digitação
    // o mesmo termo não precisa ser perguntado duas vezes.
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase.rpc('search_all', { _q: q, _limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as SearchResult[];
    },
  });
}
