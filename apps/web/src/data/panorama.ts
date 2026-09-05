import type { OverdueRow, StalledRow, WorkloadRow } from '@rota/db-types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.ts';

/**
 * Dados do Panorama. As três views são comuns e com security_invoker
 * (migrations 20260905000001 e ...0002), então o que volta aqui já é
 * o que a RLS permite a quem está logado — sem filtro extra no cliente.
 *
 * Os casts `as unknown as 'profiles'` existem porque as views ainda não
 * entraram em database.generated.ts; caem no próximo `pnpm db:types`.
 */

export function useWorkload() {
  return useQuery({
    queryKey: ['panorama', 'workload'],
    queryFn: async (): Promise<WorkloadRow[]> => {
      const { data, error } = await supabase
        .from('v_workload_by_user' as unknown as 'profiles')
        .select('*')
        .order('active_count', { ascending: false });
      if (error) throw error;
      return data as unknown as WorkloadRow[];
    },
  });
}

export function useOverdueProcesses() {
  return useQuery({
    queryKey: ['panorama', 'overdue'],
    queryFn: async (): Promise<OverdueRow[]> => {
      const { data, error } = await supabase
        .from('v_overdue_processes' as unknown as 'profiles')
        .select('*')
        .order('days_overdue', { ascending: false });
      if (error) throw error;
      return data as unknown as OverdueRow[];
    },
  });
}

/**
 * `minDays` corta o ruído: processo tocado esta semana não está parado.
 * A view não aplica limiar nenhum de propósito — quem decide o corte é
 * a tela, e sete dias é o começo de "ninguém olhou isso".
 */
export function useStalledProcesses(minDays = 7) {
  return useQuery({
    queryKey: ['panorama', 'stalled', minDays],
    queryFn: async (): Promise<StalledRow[]> => {
      const { data, error } = await supabase
        .from('v_stalled_processes' as unknown as 'profiles')
        .select('*')
        .gte('days_stalled', minDays)
        .order('days_stalled', { ascending: false });
      if (error) throw error;
      return data as unknown as StalledRow[];
    },
  });
}
