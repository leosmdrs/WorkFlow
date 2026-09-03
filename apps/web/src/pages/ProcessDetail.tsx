import type { DeadlineKind, ProcessPriority, ProcessStatus } from '@rota/db-types';
import { PRIORITY_LABEL, PROCESS_PRIORITIES, PROCESS_STATUSES, STATUS_LABEL } from '@rota/shared';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.tsx';
import { CommentComposer } from '../components/CommentComposer.tsx';
import { DeadlineBadge } from '../components/DeadlineBadge.tsx';
import { HandoffDialog } from '../components/HandoffDialog.tsx';
import { PriorityDot, StatusPill } from '../components/Pills.tsx';
import { Timeline } from '../components/Timeline.tsx';
import { useCurrentAssignment } from '../data/assignments.ts';
import { useAddDeadline, useDeadlines, useFulfillDeadline } from '../data/deadlines.ts';
import { useProcess, useUpdateProcessPriority, useUpdateProcessStatus } from '../data/processes.ts';
import { useProfiles } from '../data/profiles.ts';
import { useTimeline } from '../data/timeline.ts';
import { formatDate } from '../lib/format.ts';

export function ProcessDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: process, isLoading } = useProcess(id);
  const { data: assignment } = useCurrentAssignment(id);
  const { data: profiles = [] } = useProfiles();
  const { data: entries = [] } = useTimeline(id);
  const { data: deadlines = [] } = useDeadlines(id);

  const updateStatus = useUpdateProcessStatus();
  const updatePriority = useUpdateProcessPriority();
  const addDeadline = useAddDeadline();
  const fulfillDeadline = useFulfillDeadline();

  const [handoffOpen, setHandoffOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueKind, setNewDueKind] = useState<DeadlineKind>('internal');

  if (isLoading) return <div className="empty">Carregando…</div>;
  if (!process) {
    return (
      <div className="empty">
        Processo não encontrado.{' '}
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          voltar
        </button>
      </div>
    );
  }

  const assignee = profiles.find((p) => p.id === assignment?.assignee_id);
  const openDeadlines = deadlines.filter((d) => d.fulfilled_at === null);

  return (
    <>
      <div className="detail-header">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(-1)}
            style={{ marginBottom: 6 }}
          >
            ← voltar
          </button>
          <div className="detail-nup">{process.nup}</div>
          <div className="detail-spec">{process.specification ?? 'Sem especificação'}</div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <StatusPill status={process.status} />
            <PriorityDot priority={process.priority} />
            {process.origin_unit && <span className="chip">{process.origin_unit}</span>}
            {process.process_type && <span className="chip">{process.process_type}</span>}
          </div>
        </div>
      </div>

      <div className="detail">
        <div className="stack">
          <CommentComposer processId={id} />
          <Timeline entries={entries} />
        </div>

        <aside className="detail-side">
          <div className="card">
            <div className="detail-side-title">Responsável</div>
            {assignee ? (
              <div className="row">
                <Avatar name={assignee.full_name} avatarUrl={assignee.avatar_url} />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{assignee.full_name}</div>
                  <div className="muted text-sm">
                    @{assignee.username}
                    {assignee.unit ? ` · ${assignee.unit}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted text-sm">Sem responsável.</div>
            )}
            {assignment?.handoff_context && (
              <div className="timeline-body" style={{ marginTop: 'var(--space-2)' }}>
                {assignment.handoff_context}
              </div>
            )}
            <button
              type="button"
              className="btn"
              style={{ marginTop: 'var(--space-3)', width: '100%' }}
              onClick={() => setHandoffOpen(true)}
            >
              Reatribuir…
            </button>
          </div>

          <div className="card">
            <div className="detail-side-title">Status</div>
            <select
              className="select"
              value={process.status}
              onChange={(e) => updateStatus.mutate({ id, status: e.target.value as ProcessStatus })}
            >
              {PROCESS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            <div className="detail-side-title" style={{ marginTop: 'var(--space-3)' }}>
              Prioridade
            </div>
            <select
              className="select"
              value={process.priority}
              onChange={(e) =>
                updatePriority.mutate({ id, priority: e.target.value as ProcessPriority })
              }
            >
              {PROCESS_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <div className="detail-side-title">Prazos</div>
            {openDeadlines.length === 0 && <div className="muted text-sm">Sem prazos ativos.</div>}
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              {openDeadlines.map((d) => (
                <div key={d.id} className="row row--between">
                  <div>
                    <DeadlineBadge dueDate={d.due_date} kind={d.kind} />
                    <div className="muted text-sm" style={{ marginTop: 2 }}>
                      {formatDate(d.due_date)}
                      {d.description ? ` · ${d.description}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => fulfillDeadline.mutate(d.id)}
                  >
                    Cumprido
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="row" style={{ gap: 6 }}>
                <select
                  className="select"
                  style={{ flex: '0 0 auto', width: 110 }}
                  value={newDueKind}
                  onChange={(e) => setNewDueKind(e.target.value as DeadlineKind)}
                >
                  <option value="internal">Interno</option>
                  <option value="institutional">Oficial</option>
                </select>
                <input
                  type="date"
                  className="input"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!newDueDate || addDeadline.isPending}
                  onClick={async () => {
                    await addDeadline.mutateAsync({
                      processId: id,
                      kind: newDueKind,
                      dueDate: newDueDate,
                    });
                    setNewDueDate('');
                  }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <HandoffDialog
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        processId={id}
        currentAssigneeId={assignment?.assignee_id ?? null}
      />
    </>
  );
}
