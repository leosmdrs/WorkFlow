import type { TimelineEntry } from '@rota/db-types';
import { describeActivity } from '../lib/activity.ts';
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
