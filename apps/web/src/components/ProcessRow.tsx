import type { InboxRow } from '@rota/db-types';
import { useNavigate } from 'react-router-dom';
import { DeadlineBadge } from './DeadlineBadge.tsx';
import { PriorityDot, StatusPill } from './Pills.tsx';

interface Props {
  row: InboxRow;
  onOpenHandoff?: (row: InboxRow) => void;
}

/**
 * Linha de processo usada na Minha Caixa. Um clique abre o detalhe.
 * "Aguardando aceite" recebe destaque de cor no card e o rótulo âmbar
 * — a passagem pendente é a coisa mais importante para reagir logo.
 */
export function ProcessRow({ row, onOpenHandoff }: Props) {
  const navigate = useNavigate();
  const pending = !row.is_accepted;

  function activate() {
    if (pending) onOpenHandoff?.(row);
    else navigate(`/p/${row.process_id}`);
  }

  return (
    <button
      type="button"
      className={`process-row${pending ? ' process-row--pending' : ''}`}
      style={{ textAlign: 'left', font: 'inherit', color: 'inherit' }}
      onClick={activate}
    >
      <span className="process-row-main">
        <span className="process-row-nup">{row.nup}</span>
        <span className="process-row-spec">{row.specification ?? 'Sem especificação'}</span>
        <span className="process-row-meta">
          <StatusPill status={row.status} />
          <PriorityDot priority={row.priority} />
          <DeadlineBadge dueDate={row.next_due_date} kind={row.next_due_kind} compact />
          {row.unread_comments > 0 && (
            <span className="pill pill--info">
              {row.unread_comments} novo{row.unread_comments === 1 ? '' : 's'} comentário
              {row.unread_comments === 1 ? '' : 's'}
            </span>
          )}
        </span>
      </span>
      <span className="process-row-side">
        {pending ? (
          <span className="pill pill--warn" title={row.handoff_context ?? ''}>
            Aceitar de {row.assigner_name ?? 'alguém'}
          </span>
        ) : (
          <span className="muted text-sm">abrir →</span>
        )}
      </span>
    </button>
  );
}
