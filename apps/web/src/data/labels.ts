import type { AppliedLabel, Label } from '@rota/db-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.ts';

/**
 * Rótulos. O catálogo é escrito só por admin (policy labels_admin_write),
 * mas qualquer membro ativo aplica e remove num processo — classificar é
 * trabalho do dia a dia, não ato administrativo.
 *
 * Aplicar e remover geram entrada no activity_log via trigger (migration
 * 20260905000004), então as mutações invalidam também a timeline.
 */

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async (): Promise<Label[]> => {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Label[];
    },
  });
}

export function useProcessLabels(processId: string | undefined) {
  return useQuery({
    enabled: !!processId,
    queryKey: ['process-labels', processId],
    queryFn: async (): Promise<AppliedLabel[]> => {
      if (!processId) return [];
      const { data, error } = await supabase
        .from('process_labels')
        .select('label_id, applied_at, applied_by, label:labels(*)')
        .eq('process_id', processId);
      if (error) throw error;
      return (data as unknown as AppliedLabel[]).sort((a, b) =>
        a.label.name.localeCompare(b.label.name, 'pt-BR'),
      );
    },
  });
}

function useLabelMutation<T>(fn: (input: T & { processId: string }) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_r, { processId }) => {
      qc.invalidateQueries({ queryKey: ['process-labels', processId] });
      qc.invalidateQueries({ queryKey: ['timeline', processId] });
    },
  });
}

export function useApplyLabel() {
  return useLabelMutation<{ labelId: string }>(async ({ processId, labelId }) => {
    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user?.id;
    if (!me) throw new Error('not_authenticated');
    const { error } = await supabase
      .from('process_labels')
      .insert({ process_id: processId, label_id: labelId, applied_by: me });
    if (error) throw error;
  });
}

export function useRemoveLabel() {
  return useLabelMutation<{ labelId: string }>(async ({ processId, labelId }) => {
    const { error } = await supabase
      .from('process_labels')
      .delete()
      .eq('process_id', processId)
      .eq('label_id', labelId);
    if (error) throw error;
  });
}
