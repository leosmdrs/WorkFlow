import type { AppliedLabel, Label } from '@rota/db-types';
import { useApplyLabel, useLabels, useProcessLabels, useRemoveLabel } from '../data/labels.ts';

/**
 * Rótulos de um processo: os aplicados viram chips removíveis, e o
 * select lista só o que ainda não está aplicado.
 *
 * A cor do rótulo entra como bolinha, nunca como fundo do chip nem cor
 * do texto: `labels.color` é livre e escolhido por admin, então usá-la
 * atrás de texto produziria contraste imprevisível. A bolinha carrega a
 * identidade visual, o nome carrega o significado.
 */
export function LabelPicker({ processId }: { processId: string }) {
  const { data: applied = [], isLoading } = useProcessLabels(processId);
  const { data: catalog = [] } = useLabels();
  const apply = useApplyLabel();
  const remove = useRemoveLabel();

  const appliedIds = new Set(applied.map((a) => a.label_id));
  const available = catalog.filter((l) => !appliedIds.has(l.id));

  return (
    <>
      <div className="detail-side-title">Rótulos</div>

      {isLoading ? (
        <div className="muted text-sm">Carregando…</div>
      ) : applied.length === 0 ? (
        <div className="muted text-sm">Nenhum rótulo.</div>
      ) : (
        <div className="label-chips">
          {applied.map((a: AppliedLabel) => (
            <span className="chip label-chip" key={a.label_id}>
              <span className="label-dot" style={{ background: a.label.color }} />
              {a.label.name}
              <button
                type="button"
                className="label-chip-remove"
                aria-label={`Remover rótulo ${a.label.name}`}
                title={`Remover rótulo ${a.label.name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ processId, labelId: a.label_id })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <select
          className="select"
          style={{ marginTop: 'var(--space-2)' }}
          value=""
          disabled={apply.isPending}
          aria-label="Aplicar rótulo"
          onChange={(e) => {
            if (e.target.value) apply.mutate({ processId, labelId: e.target.value });
          }}
        >
          <option value="">Aplicar rótulo…</option>
          {available.map((l: Label) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}

      {(apply.isError || remove.isError) && (
        <div className="field-error">Não deu para salvar o rótulo. Tente de novo.</div>
      )}
    </>
  );
}
