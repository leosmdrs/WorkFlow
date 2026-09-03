import { HANDOFF_MIN_CHARS } from '@rota/shared';
import { useState } from 'react';
import { useTransferAssignment } from '../data/assignments.ts';
import { useProfiles } from '../data/profiles.ts';
import { Dialog } from './Dialog.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  processId: string;
  currentAssigneeId: string | null;
}

/**
 * Passagem de bastão — o diferencial do produto.
 *
 * O contexto obrigatório força a boa prática que hoje só existe na
 * cabeça de quem passou. O erro do banco (handoff_context_too_short)
 * é traduzido aqui numa mensagem inline, não num toast genérico.
 */
export function HandoffDialog({ open, onClose, processId, currentAssigneeId }: Props) {
  const { data: profiles = [] } = useProfiles();
  const transfer = useTransferAssignment();
  const [target, setTarget] = useState('');
  const [context, setContext] = useState('');

  const eligible = profiles.filter((p) => p.id !== currentAssigneeId);
  const needsContext = target && target !== currentAssigneeId;
  const contextTooShort = needsContext && context.trim().length < HANDOFF_MIN_CHARS;

  async function submit() {
    if (!target || contextTooShort) return;
    await transfer.mutateAsync({ processId, toUserId: target, context });
    setTarget('');
    setContext('');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reatribuir processo"
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!target || contextTooShort || transfer.isPending}
            onClick={submit}
          >
            {transfer.isPending ? 'Enviando…' : 'Enviar'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="handoff-target" className="field-label">
            Para quem
          </label>
          <select
            id="handoff-target"
            className="select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Selecione um colega…</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.username})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="handoff-context" className="field-label">
            Contexto da passagem
          </label>
          <textarea
            id="handoff-context"
            className="textarea"
            placeholder="Ex.: Estou te passando esse porque X. Já fiz Y, falta Z. Prazo interno é sexta."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <span className={contextTooShort ? 'field-error' : 'field-hint'}>
            {contextTooShort
              ? `Descreva com pelo menos ${HANDOFF_MIN_CHARS} caracteres — a pessoa que recebe agradece.`
              : `${context.trim().length}/${HANDOFF_MIN_CHARS}`}
          </span>
        </div>
        {transfer.error && (
          <div className="field-error">Não foi possível transferir. Tente novamente.</div>
        )}
      </div>
    </Dialog>
  );
}
