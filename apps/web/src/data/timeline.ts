import type { TimelineEntry } from '@rota/db-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { asDomain } from '../lib/rows.ts';
import { supabase } from '../lib/supabase.ts';

export function useTimeline(processId: string | undefined) {
  const qc = useQueryClient();
  const q = useQuery({
    enabled: !!processId,
    queryKey: ['timeline', processId],
    queryFn: async (): Promise<TimelineEntry[]> => {
      if (!processId) return [];
      const { data, error } = await supabase.rpc('process_timeline', {
        _process_id: processId,
      });
      if (error) throw error;
      return asDomain<TimelineEntry[]>(data ?? []);
    },
  });

  useEffect(() => {
    if (!processId) return;
    const ch = supabase
      .channel(`timeline:${processId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `process_id=eq.${processId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['timeline', processId] }),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `process_id=eq.${processId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['timeline', processId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [processId, qc]);

  return q;
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { processId: string; body: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData.user?.id;
      if (!me) throw new Error('not_authenticated');
      const { error } = await supabase.from('comments').insert({
        process_id: input.processId,
        author_id: me,
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: (_r, { processId }) => {
      qc.invalidateQueries({ queryKey: ['timeline', processId] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}
