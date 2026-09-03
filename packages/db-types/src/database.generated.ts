/**
 * ⚠️ Este arquivo é sobrescrito por `pnpm db:types`.
 *
 * Enquanto a geração automática não roda, mantemos aqui uma versão
 * manual da shape Database que o cliente Supabase consome. Assim
 * `import { Database } from '@rota/db-types'` funciona em qualquer
 * clone recém-feito, sem precisar do Supabase local de pé.
 *
 * Ao rodar `supabase gen types typescript --local`, este arquivo é
 * substituído pelo tipo real derivado do schema — commit o resultado.
 */

import type {
  Assignment,
  Comment,
  Deadline,
  InboxRow,
  Notification,
  Profile,
  ProcessRow,
  TimelineEntry,
} from './domain.ts';

interface TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
}

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      processes: TableShape<ProcessRow>;
      assignments: TableShape<Assignment>;
      deadlines: TableShape<Deadline>;
      comments: TableShape<Comment>;
      notifications: TableShape<Notification>;
      labels: TableShape<{ id: string; name: string; color: string; is_active: boolean }>;
      holidays: TableShape<{ date: string; description: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      email_for_username: {
        Args: { _username: string };
        Returns: string | null;
      };
      inbox_for_me: { Args: Record<string, never>; Returns: InboxRow[] };
      process_timeline: { Args: { _process_id: string }; Returns: TimelineEntry[] };
      transfer_assignment: {
        Args: { _process_id: string; _to_user_id: string; _handoff_context: string };
        Returns: string;
      };
      respond_handoff: {
        Args: { _assignment_id: string; _accept: boolean; _return_reason?: string | null };
        Returns: null;
      };
      unread_notification_count: { Args: Record<string, never>; Returns: number };
    };
    Enums: Record<string, never>;
  };
}
