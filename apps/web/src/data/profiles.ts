import type { Profile } from '@rota/db-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.ts';

export function useCurrentProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Profile | null> => {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (error) throw error;
      return data;
    },
  });
}

/** Lista membros ativos — usado no picker de reatribuição e no admin. */
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles', 'active'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

/** Todos, inclusive inativos — só admin usa. */
export function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles', 'all'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Profile> }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
