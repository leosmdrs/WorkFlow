import type { InboxRow } from '@rota/db-types';
import { useState } from 'react';
import { AcceptHandoffDialog } from '../components/AcceptHandoffDialog.tsx';
import { ProcessRow } from '../components/ProcessRow.tsx';
import { useMyInbox } from '../data/processes.ts';

export function InboxPage() {
  const { data: rows = [], isLoading } = useMyInbox();
  const [handoffRow, setHandoffRow] = useState<InboxRow | null>(null);

  const pending = rows.filter((r) => !r.is_accepted);
  const mine = rows.filter((r) => r.is_accepted);

  if (isLoading) {
    return (
      <>
        <h1 className="page-title">Minha Caixa</h1>
        <div className="empty">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Minha Caixa</h1>
      <p className="page-lead">O que precisa da sua atenção, ordenado por urgência.</p>

      {pending.length > 0 && (
        <>
          <h2
            style={{
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-warn)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Aguardando seu aceite ({pending.length})
          </h2>
          <div className="process-list" style={{ marginBottom: 'var(--space-6)' }}>
            {pending.map((r) => (
              <ProcessRow key={r.process_id} row={r} onOpenHandoff={setHandoffRow} />
            ))}
          </div>
        </>
      )}

      {mine.length > 0 ? (
        <div className="process-list">
          {mine.map((r) => (
            <ProcessRow key={r.process_id} row={r} />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="card">
          <div className="empty">
            Nada aqui ainda. Assim que você tocar num processo pelo SEI com a extensão instalada,
            ele aparece aqui.
          </div>
        </div>
      ) : null}

      <AcceptHandoffDialog
        open={handoffRow !== null}
        onClose={() => setHandoffRow(null)}
        assignmentId={handoffRow?.assignment_id ?? ''}
        fromName={handoffRow?.assigner_name ?? null}
        handoffContext={handoffRow?.handoff_context ?? null}
      />
    </>
  );
}
