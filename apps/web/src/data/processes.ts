import type { InboxRow, ProcessPriority, ProcessRow, ProcessStatus } from '@rota/db-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

export function useMyInbox() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['inbox', 'me'],
    queryFn: async (): Promise<InboxRow[]> => {
      const { data, error } = await supabase.rpc('inbox_for_me');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: qualquer mudança em assignments/processes invalida a caixa.
  // Simples de propósito — a granularidade fina só compensa em >100 itens.
  useEffect(() => {
    const ch = supabase
      .channel('inbox-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () =>
        qc.invalidateQueries({ queryKey: ['inbox', 'me'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'processes' }, () =>
        qc.invalidateQueries({ queryKey: ['inbox', 'me'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return q;
}

export function useAllProcesses() {
  return useQuery({
    queryKey: ['processes', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProcessRow[];
    },
  });
}

export function useProcess(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['process', id],
    queryFn: async (): Promise<ProcessRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('processes').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProcessByNup(nup: string | null) {
  return useQuery({
    enabled: !!nup,
    queryKey: ['process', 'nup', nup],
    queryFn: async (): Promise<ProcessRow | null> => {
      if (!nup) return null;
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('nup', nup)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProcessStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProcessStatus }) => {
      const { error } = await supabase.from('processes').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['process', id] });
      qc.invalidateQueries({ queryKey: ['processes'] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['timeline', id] });
    },
  });
}

export function useUpdateProcessPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: ProcessPriority }) => {
      const { error } = await supabase.from('processes').update({ priority }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ['process', id] });
      qc.invalidateQueries({ queryKey: ['processes'] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export interface CreateProcessInput {
  nup: string;
  specification?: string | null;
  origin_unit?: string | null;
  process_type?: string | null;
  priority?: ProcessPriority;
  claim?: boolean;
}

/** Cria processo + auto-atribuição na sequência (via transfer_assignment). */
export function useCreateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProcessInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const me = userData.user?.id;
      if (!me) throw new Error('not_authenticated');
      const { data, error } = await supabase
        .from('processes')
        .insert({
          nup: input.nup,
          specification: input.specification ?? null,
          origin_unit: input.origin_unit ?? null,
          process_type: input.process_type ?? null,
          priority: input.priority ?? 'normal',
          created_by: me,
        })
        .select('*')
        .single();
      if (error) throw error;
      if (input.claim !== false) {
        const { error: aErr } = await supabase.rpc('transfer_assignment', {
          _process_id: data.id,
          _to_user_id: me,
          _handoff_context: '',
        });
        if (aErr) throw aErr;
      }
      return data as ProcessRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['processes'] });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}
