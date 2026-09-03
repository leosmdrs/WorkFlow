/**
 * Tipos do banco. Enquanto `pnpm db:types` não roda no seu ambiente,
 * mantemos um tipo *estruturado* aqui — não `any` — cobrindo tudo que a
 * UI acessa. Assim já ganhamos autocomplete e catch de typos.
 *
 * Quando você rodar `pnpm db:types`, esse arquivo é substituído pela
 * geração automática. Faça o commit da versão gerada.
 */

export type UserRole = 'member' | 'admin';
export type ProcessStatus =
  | 'received'
  | 'in_analysis'
  | 'awaiting_external'
  | 'in_review'
  | 'done'
  | 'archived';
export type ProcessPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DeadlineKind = 'institutional' | 'internal';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  registration: string | null;
  role: UserRole;
  unit: string | null;
  avatar_url: string | null;
  is_active: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProcessRow {
  id: string;
  nup: string;
  specification: string | null;
  origin_unit: string | null;
  process_type: string | null;
  status: ProcessStatus;
  priority: ProcessPriority;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Assignment {
  id: string;
  process_id: string;
  assignee_id: string;
  assigner_id: string | null;
  handoff_context: string | null;
  accepted_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  is_current: boolean;
  created_at: string;
}

export interface Deadline {
  id: string;
  process_id: string;
  kind: DeadlineKind;
  due_date: string;
  description: string | null;
  fulfilled_at: string | null;
  created_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  process_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface InboxRow {
  process_id: string;
  nup: string;
  specification: string | null;
  status: ProcessStatus;
  priority: ProcessPriority;
  next_due_date: string | null;
  next_due_kind: DeadlineKind | null;
  unread_comments: number;
  assignment_id: string;
  is_accepted: boolean;
  assigner_id: string | null;
  assigner_name: string | null;
  handoff_context: string | null;
  updated_at: string;
}

export interface TimelineEntry {
  entry_id: string;
  entry_kind: 'activity' | 'comment';
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface WorkloadRow {
  user_id: string;
  username: string;
  full_name: string;
  active_count: number;
  in_analysis_count: number;
  high_priority_count: number;
  overdue_count: number;
}

// -----------------------------------------------------------------------------
// Forma "Database" compatível com o cliente do supabase-js.
// Só carrega o que os hooks acessam via `.from(...)` — o resto usa `.rpc(...)`.
// -----------------------------------------------------------------------------

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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
