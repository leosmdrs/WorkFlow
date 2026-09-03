import type { ProcessPriority, ProcessStatus } from '@rota/db-types';
import { PRIORITY_LABEL, STATUS_LABEL } from '@rota/shared';

const STATUS_TONE: Record<ProcessStatus, string> = {
  received: '',
  in_analysis: 'pill--info',
  awaiting_external: 'pill--warn',
  in_review: 'pill--accent',
  done: 'pill--ok',
  archived: '',
};

export function StatusPill({ status }: { status: ProcessStatus }) {
  return <span className={`pill ${STATUS_TONE[status]}`.trim()}>{STATUS_LABEL[status]}</span>;
}

export function PriorityDot({ priority }: { priority: ProcessPriority }) {
  return (
    <span title={`Prioridade: ${PRIORITY_LABEL[priority]}`}>
      <span className={`priority-dot priority-dot--${priority}`} />
      <span className="muted text-sm">{PRIORITY_LABEL[priority]}</span>
    </span>
  );
}
