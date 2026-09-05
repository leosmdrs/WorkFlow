/**
 * Tipos de domínio do Rota. Vivem separados de `database.generated.ts`
 * porque este último é sobrescrito por `pnpm db:types`; se vivessem
 * juntos, a geração jogaria os enums e interfaces fora.
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

/** Uma linha de v_overdue_processes — processo com prazo vencido em aberto. */
export interface OverdueRow {
  process_id: string;
  nup: string;
  specification: string | null;
  status: ProcessStatus;
  priority: ProcessPriority;
  assignee_id: string | null;
  due_date: string;
  days_overdue: number;
  assignee_username: string | null;
  assignee_name: string | null;
}

/**
 * Uma linha de v_stalled_processes — processo sem atividade há
 * `days_stalled` dias. Processo que nunca teve atividade conta a
 * partir da criação, então `last_activity_at` nunca é nulo.
 */
export interface StalledRow {
  process_id: string;
  nup: string;
  specification: string | null;
  status: ProcessStatus;
  priority: ProcessPriority;
  assignee_id: string | null;
  assignee_username: string | null;
  assignee_name: string | null;
  last_activity_at: string;
  days_stalled: number;
}
