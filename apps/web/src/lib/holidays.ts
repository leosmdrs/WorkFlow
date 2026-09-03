import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase.ts';

/**
 * Feriados vindos do banco. Carregado uma vez por sessão (staleTime alto)
 * — a UI usa isso para classificar prazos em dias úteis sem fazer
 * roundtrip por card.
 */
export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    staleTime: 12 * 60 * 60 * 1000, // 12h
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('date').order('date');
      if (error) throw error;
      return new Set<string>(data.map((h) => h.date));
    },
  });
}
