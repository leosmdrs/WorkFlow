import type { ProcessRow, ProcessStatus } from '@rota/db-types';
import { PROCESS_STATUSES, STATUS_LABEL } from '@rota/shared';
import { useNavigate } from 'react-router-dom';
import { DeadlineBadge } from '../components/DeadlineBadge.tsx';
import { PriorityDot, StatusPill } from '../components/Pills.tsx';
import { useAllProcesses } from '../data/processes.ts';

/**
 * Kanban por status. Sem drag-and-drop nesta iteração — a mudança de
 * status acontece pelo detalhe do processo. Cortar DnD do MVP evita
 * uma dependência (dnd-kit) e uma classe inteira de bugs; volta na
 * Fase 2 se a equipe pedir.
 */
export function FlowPage() {
  const { data: rows = [], isLoading } = useAllProcesses();
  const byStatus = new Map<ProcessStatus, ProcessRow[]>(PROCESS_STATUSES.map((s) => [s, []]));
  for (const r of rows) byStatus.get(r.status)?.push(r);

  return (
    <>
      <h1 className="page-title">Fluxo da Área</h1>
      <p className="page-lead">
        Todos os processos abertos, agrupados por status. Clique num card para abrir.
      </p>
      {isLoading ? (
        <div className="empty">Carregando…</div>
      ) : (
        <div className="kanban">
          {PROCESS_STATUSES.map((s) => (
            <Column key={s} status={s} items={byStatus.get(s) ?? []} />
          ))}
        </div>
      )}
    </>
  );
}

function Column({ status, items }: { status: ProcessStatus; items: ProcessRow[] }) {
  const navigate = useNavigate();
  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span>{STATUS_LABEL[status]}</span>
        <span className="kanban-count">{items.length}</span>
      </div>
      {items.length === 0 && <div className="muted text-sm">Vazio</div>}
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          className="kanban-card"
          onClick={() => navigate(`/p/${p.id}`)}
        >
          <div className="mono text-sm muted">{p.nup}</div>
          <div style={{ fontWeight: 600 }}>{p.specification ?? 'Sem especificação'}</div>
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <StatusPill status={p.status} />
            <PriorityDot priority={p.priority} />
            <DeadlineBadge dueDate={null} compact />
          </div>
        </button>
      ))}
    </div>
  );
}
