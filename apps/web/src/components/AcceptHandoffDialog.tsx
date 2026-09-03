import { useState } from 'react';
import { useRespondHandoff } from '../data/assignments.ts';
import { Dialog } from './Dialog.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  fromName: string | null;
  handoffContext: string | null;
}

/**
 * Diálogo de aceite/devolução. Devolver exige motivo (>= 10 chars),
 * regra checada no cliente e no banco (respond_handoff).
 */
export function AcceptHandoffDialog({
  open,
  onClose,
  assignmentId,
  fromName,
  handoffContext,
}: Props) {
  const respond = useRespondHandoff();
  const [mode, setMode] = useState<'view' | 'return'>('view');
  const [reason, setReason] = useState('');

  const reasonTooShort = reason.trim().length < 10;

  async function accept() {
    await respond.mutateAsync({ assignmentId, accept: true });
    onClose();
    reset();
  }
  async function returnBack() {
    if (reasonTooShort) return;
    await respond.mutateAsync({ assignmentId, accept: false, returnReason: reason });
    onClose();
    reset();
  }
  function reset() {
    setMode('view');
    setReason('');
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Passagem recebida"
      actions={
        mode === 'view' ? (
          <>
            <button type="button" className="btn" onClick={() => setMode('return')}>
              Devolver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={accept}
              disabled={respond.isPending}
            >
              {respond.isPending ? 'Aceitando…' : 'Aceitar'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setMode('view')}>
              Voltar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={returnBack}
              disabled={reasonTooShort || respond.isPending}
            >
              {respond.isPending ? 'Devolvendo…' : 'Devolver com esse motivo'}
            </button>
          </>
        )
      }
    >
      {mode === 'view' ? (
        <div className="stack">
          <p className="muted">
            <strong>{fromName ?? 'Alguém da equipe'}</strong> te passou este processo com o seguinte
            contexto:
          </p>
          <div className="timeline-body">
            {handoffContext ? handoffContext : <em>Sem contexto — passagem direta.</em>}
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Explique por que você está devolvendo. O remetente será avisado.</p>
          <textarea
            className="textarea"
            placeholder="Ex.: essa análise depende de dado da unidade X, que só a Ana tem acesso."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className={reasonTooShort ? 'field-error' : 'field-hint'}>
            {reasonTooShort ? 'Pelo menos 10 caracteres.' : `${reason.trim().length}/10`}
          </span>
        </div>
      )}
    </Dialog>
  );
}
