/**
 * Enums do domínio. Espelham exatamente os CHECKs do banco. Se um valor
 * mudar aqui, a migration correspondente muda junto — nunca só de um lado.
 */

export const PROCESS_STATUSES = [
  'received',
  'in_analysis',
  'awaiting_external',
  'in_review',
  'done',
  'archived',
] as const;
export type ProcessStatus = (typeof PROCESS_STATUSES)[number];

export const PROCESS_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type ProcessPriority = (typeof PROCESS_PRIORITIES)[number];

export const USER_ROLES = ['member', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Rótulos em pt-BR para exibição. Convenção: string do usuário ≠ enum. */
export const STATUS_LABEL: Record<ProcessStatus, string> = {
  received: 'Recebido',
  in_analysis: 'Em análise',
  awaiting_external: 'Aguardando externo',
  in_review: 'Revisão',
  done: 'Concluído',
  archived: 'Arquivado',
};

export const PRIORITY_LABEL: Record<ProcessPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};
