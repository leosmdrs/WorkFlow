import type { Assignment } from '@rota/db-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { asDomain } from '../lib/rows.ts';
import { supabase } from '../lib/supabase.ts';

export function useCurrentAssignment(processId: string | undefined) {
  return useQuery({
    enabled: !!processId,
    queryKey: ['assignment', 'current', processId],
    queryFn: async (): Promise<Assignment | null> => {
      if (!processId) return null;
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('process_id', processId)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return asDomain<Assignment | null>(data);
    },
  });
}

export function useTransferAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { processId: string; toUserId: string; context: string }) => {
      const { data, error } = await supabase.rpc('transfer_assignment', {
        _process_id: input.processId,
        _to_user_id: input.toUserId,
        _handoff_context: input.context,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_r, { processId }) => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['assignment', 'current', processId] });
      qc.invalidateQueries({ queryKey: ['timeline', processId] });
      qc.invalidateQueries({ queryKey: ['process', processId] });
    },
  });
}

export function useRespondHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assignmentId: string;
      accept: boolean;
      returnReason?: string;
    }) => {
      const { error } = await supabase.rpc('respond_handoff', {
        _assignment_id: input.assignmentId,
        _accept: input.accept,
        _return_reason: input.returnReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['assignment'] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
