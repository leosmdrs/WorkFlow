import type { TimelineEntry } from '@rota/db-types';
import { PRIORITY_LABEL, STATUS_LABEL } from '@rota/shared';
import { formatDateTime, formatRelative } from '../lib/format.ts';
import { Avatar } from './Avatar.tsx';

interface Props {
  entries: TimelineEntry[];
}

/**
 * Timeline unificada: activity_log + comments, já ordenados pelo RPC.
 * Cada tipo de `action` conhecida tem um rótulo humano; desconhecidas
 * caem no default (mostra a action crua). Assim novos tipos não quebram
 * a UI se aparecerem antes da atualização.
 */
export function Timeline({ entries }: Props) {
  if (entries.length === 0) {
    return <div className="empty">Nenhum evento ainda.</div>;
  }
  return (
    <div className="timeline">
      {entries.map((e) => (
        <TimelineItem key={e.entry_id} entry={e} />
      ))}
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const when = formatRelative(entry.created_at);
  const cls = `timeline-entry timeline-entry--${entry.entry_kind}`;
  const actor = entry.actor_name ?? 'Sistema';
  const p = entry.payload ?? {};

  if (entry.entry_kind === 'comment') {
    const deleted = p.deleted === true;
    return (
      <div className={cls}>
        <span className="timeline-marker" />
        <div className="timeline-head">
          <Avatar name={entry.actor_name} avatarUrl={entry.actor_avatar} size="sm" />
          <strong>{actor}</strong>
          <span>comentou</span>
          <span title={formatDateTime(entry.created_at)}>· {when}</span>
        </div>
        <div className={`timeline-body${deleted ? ' timeline-body--deleted' : ''}`}>
          {deleted ? '(comentário removido)' : ((p.body as string) ?? '')}
        </div>
      </div>
    );
  }

  return (
    <div className={cls}>
      <span className="timeline-marker" />
      <div className="timeline-head">
        <Avatar name={entry.actor_name} avatarUrl={entry.actor_avatar} size="sm" />
        <strong>{actor}</strong>
        <span>{describeActivity(entry.action, p)}</span>
        <span title={formatDateTime(entry.created_at)}>· {when}</span>
      </div>
    </div>
  );
}

function describeActivity(action: string, payload: Record<string, unknown>): string {
  switch (action) {
    case 'process.created':
      return 'criou o processo aqui no Rota';
    case 'process.archived':
      return 'arquivou o processo';
    case 'status.changed': {
      const from = ((payload.old as Record<string, string>)?.status ??
        '') as keyof typeof STATUS_LABEL;
      const to = ((payload.new as Record<string, string>)?.status ??
        '') as keyof typeof STATUS_LABEL;
      return `mudou o status de ${STATUS_LABEL[from] ?? from} para ${STATUS_LABEL[to] ?? to}`;
    }
    case 'priority.changed': {
      const from = ((payload.old as Record<string, string>)?.priority ??
        '') as keyof typeof PRIORITY_LABEL;
      const to = ((payload.new as Record<string, string>)?.priority ??
        '') as keyof typeof PRIORITY_LABEL;
      return `mudou a prioridade de ${PRIORITY_LABEL[from] ?? from} para ${PRIORITY_LABEL[to] ?? to}`;
    }
    case 'assignment.claimed':
      return 'assumiu o processo';
    case 'assignment.transferred':
      return 'passou o processo adiante';
    case 'assignment.accepted':
      return 'aceitou a passagem';
    case 'assignment.returned':
      return 'devolveu a passagem';
    case 'comment.deleted':
      return 'removeu um comentário';
    default:
      return action;
  }
}
