import type { Deadline, DeadlineKind } from '@rota/db-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asDomain } from '../lib/rows.ts';
import { supabase } from '../lib/supabase.ts';

export function useDeadlines(processId: string | undefined) {
  return useQuery({
    enabled: !!processId,
    queryKey: ['deadlines', processId],
    queryFn: async (): Promise<Deadline[]> => {
      if (!processId) return [];
      const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('process_id', processId)
        .order('due_date');
      if (error) throw error;
      return asDomain<Deadline[]>(data);
    },
  });
}

export function useAddDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      processId: string;
      kind: DeadlineKind;
      dueDate: string;
      description?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData.user?.id;
      if (!me) throw new Error('not_authenticated');
      const { error } = await supabase.from('deadlines').insert({
        process_id: input.processId,
        kind: input.kind,
        due_date: input.dueDate,
        description: input.description ?? null,
        created_by: me,
      });
      if (error) throw error;
    },
    onSuccess: (_r, { processId }) => {
      qc.invalidateQueries({ queryKey: ['deadlines', processId] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useFulfillDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deadlines')
        .update({ fulfilled_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deadlines'] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}
