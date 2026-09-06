/**
 * ⚠️ Este arquivo é sobrescrito por `pnpm db:types`.
 *
 * Enquanto o Supabase local não subiu, ele existe para que um clone
 * recém-feito compile — `import { Database } from '@rota/db-types'`
 * funciona sem banco nenhum de pé.
 *
 * A regra que ele tem de respeitar: reproduzir a FORMA que o gerador
 * realmente emite, não uma versão mais conveniente. Em particular,
 * coluna `text` com CHECK vira `string` e `jsonb` vira `Json` — o
 * gerador não enxerga CHECK como tipo, e portanto não estreita nada.
 *
 * A versão anterior deste arquivo importava os tipos de domínio e
 * declarava `status: ProcessStatus`, `payload: Record<string,
 * unknown>` e afins. O repositório compilava — até alguém rodar o
 * `pnpm run setup`, que no passo 7 regenera este arquivo com os tipos
 * de verdade e no passo 8 reprova o typecheck com onze erros. O setup
 * quebrava a si mesmo em qualquer clone novo.
 *
 * Onde o app precisa dos tipos estreitos, a travessia é explícita:
 * `asDomain` em apps/web/src/lib/rows.ts.
 */
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

interface Tabela<Row> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Tabela<{
        id: string; username: string; full_name: string; role: string;
        unit: string | null; avatar_url: string | null; is_active: boolean;
        preferences: Json; created_at: string;
      }>;
      processes: Tabela<{
        id: string; nup: string; specification: string | null; origin_unit: string | null;
        process_type: string | null; status: string; priority: string; created_by: string;
        created_at: string; updated_at: string; archived_at: string | null;
      }>;
      assignments: Tabela<{
        id: string; process_id: string; assignee_id: string; assigner_id: string | null;
        is_current: boolean; accepted_at: string | null; handoff_context: string | null;
        created_at: string;
      }>;
      deadlines: Tabela<{
        id: string; process_id: string; kind: string; due_date: string;
        description: string | null; fulfilled_at: string | null; created_by: string;
        created_at: string;
      }>;
      comments: Tabela<{
        id: string; process_id: string; author_id: string; body: string;
        deleted_at: string | null; created_at: string;
      }>;
      notifications: Tabela<{
        id: string; user_id: string; kind: string; payload: Json;
        read_at: string | null; created_at: string;
      }>;
      labels: Tabela<{
        id: string; name: string; color: string; is_active: boolean; created_at: string;
      }>;
      process_labels: Tabela<{
        process_id: string; label_id: string; applied_by: string | null; applied_at: string;
      }>;
      holidays: Tabela<{ date: string; name: string }>;
      activity_log: Tabela<{
        id: number; process_id: string | null; actor_id: string | null; action: string;
        old_value: Json; new_value: Json; created_at: string;
      }>;
    };
    Views: {
      v_workload_by_user: { Row: { user_id: string; username: string; full_name: string;
        active_count: number; in_analysis_count: number; high_priority_count: number;
        overdue_count: number } };
      v_overdue_processes: { Row: { process_id: string; nup: string; specification: string | null;
        status: string; priority: string; assignee_id: string | null; due_date: string;
        days_overdue: number; assignee_username: string | null; assignee_name: string | null } };
      v_stalled_processes: { Row: { process_id: string; nup: string; specification: string | null;
        status: string; priority: string; assignee_id: string | null;
        assignee_username: string | null; assignee_name: string | null;
        last_activity_at: string; days_stalled: number } };
    };
    Functions: {
      email_for_username: { Args: { _username: string }; Returns: string };
      inbox_for_me: { Args: Record<string, never>; Returns: {
        process_id: string; nup: string; specification: string | null; status: string;
        priority: string; next_due_date: string | null; next_due_kind: string | null;
        unread_comments: number; assignment_id: string; is_accepted: boolean;
        assigner_id: string | null; assigner_name: string | null;
        handoff_context: string | null }[] };
      process_timeline: { Args: { _process_id: string }; Returns: {
        entry_id: string; entry_kind: string; action: string | null; actor_id: string | null;
        actor_name: string | null; actor_avatar: string | null; body: string | null;
        payload: Json; created_at: string }[] };
      transfer_assignment: {
        Args: { _process_id: string; _to_user_id: string; _handoff_context: string }; Returns: string };
      respond_handoff: {
        Args: { _assignment_id: string; _accept: boolean; _return_reason?: string };
        Returns: undefined };
      unread_notification_count: { Args: Record<string, never>; Returns: number };
      search_all: { Args: { _q: string; _limit?: number }; Returns: {
        kind: string; process_id: string; nup: string; specification: string | null;
        status: string; priority: string; comment_id: string | null; snippet: string | null;
        author_name: string | null; occurred_at: string; rank: number }[] };
      digest_for_me: { Args: Record<string, never>; Returns: {
        awaiting_acceptance: number; overdue: number; due_next_7_days: number;
        stalled: number; total: number }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
