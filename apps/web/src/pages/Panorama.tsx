import type { OverdueRow, StalledRow, WorkloadRow } from '@rota/db-types';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.tsx';
import { PriorityDot, StatusPill } from '../components/Pills.tsx';
import { useOverdueProcesses, useStalledProcesses, useWorkload } from '../data/panorama.ts';
import { formatDate } from '../lib/format.ts';

/**
 * Panorama — a visão da área: quem está carregado, o que furou prazo e
 * o que ninguém tocou. As três views por trás são comuns e com
 * security_invoker, então os números são sempre os atuais e cada pessoa
 * só enxerga o que a RLS permite.
 */

/** Abaixo disso não é abandono, é só uma semana normal. */
const STALLED_MIN_DAYS = 7;

/**
 * Carga por pessoa. Barra empilhada horizontal: o comprimento total é a
 * carga ativa, o pedaço vermelho é a parcela dela com prazo vencido.
 *
 * Deliberadamente não é um grid pessoa × métrica: `overdue` é
 * subconjunto de `active`, as duas não dividem escala, e num heatmap
 * quem tem muita carga em dia apareceria mais quente que quem tem pouca
 * carga e tudo atrasado — o oposto do que a tela precisa mostrar.
 */
function WorkloadChart({ rows }: { rows: WorkloadRow[] }) {
  const max = Math.max(...rows.map((r) => r.active_count), 1);

  return (
    <>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-swatch chart-swatch--load" />
          Em dia
        </span>
        <span className="chart-legend-item">
          <span className="chart-swatch chart-swatch--overdue" />
          Com prazo vencido
        </span>
      </div>

      <div className="workload-list">
        {rows.map((r) => {
          const overdue = Math.min(r.overdue_count, r.active_count);
          const rest = Math.max(r.active_count - overdue, 0);
          return (
            <div className="workload-row" key={r.user_id}>
              <span className="workload-name row" style={{ gap: 'var(--space-2)' }}>
                <Avatar name={r.full_name} size="sm" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontWeight: 600 }}>{r.full_name}</span>
                  <span className="muted text-sm"> @{r.username}</span>
                </span>
              </span>

              <span className="workload-track">
                {r.active_count === 0 ? (
                  <span className="workload-empty-bar" title="Sem processos ativos" />
                ) : (
                  <>
                    {overdue > 0 && (
                      <span
                        className="workload-bar workload-bar--overdue"
                        style={{ width: `${(overdue / max) * 100}%` }}
                        title={`${r.full_name}: ${overdue} com prazo vencido`}
                      />
                    )}
                    {rest > 0 && (
                      <span
                        className="workload-bar workload-bar--rest"
                        style={{ width: `${(rest / max) * 100}%` }}
                        title={`${r.full_name}: ${rest} em dia`}
                      />
                    )}
                  </>
                )}
              </span>

              {/* Rótulos diretos: o número nunca depende só da cor. */}
              <span className="workload-counts text-sm">
                <span style={{ fontWeight: 600 }}>{r.active_count}</span>
                <span className="muted"> ativo{r.active_count === 1 ? '' : 's'}</span>
                {r.overdue_count > 0 && (
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                    {' · '}
                    {r.overdue_count} vencido{r.overdue_count === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Linha clicável de processo, no mesmo formato da Minha Caixa. */
function ProcessLine({
  processId,
  nup,
  specification,
  status,
  priority,
  assigneeName,
  meta,
  badge,
  badgeTone,
}: {
  processId: string;
  nup: string;
  specification: string | null;
  status: OverdueRow['status'];
  priority: OverdueRow['priority'];
  assigneeName: string | null;
  meta?: string;
  badge: string;
  badgeTone: 'danger' | 'warn';
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="process-row"
      style={{ textAlign: 'left', font: 'inherit', color: 'inherit' }}
      onClick={() => navigate(`/p/${processId}`)}
    >
      <span className="process-row-main">
        <span className="process-row-nup">{nup}</span>
        <span className="process-row-spec">{specification ?? 'Sem especificação'}</span>
        <span className="process-row-meta">
          <StatusPill status={status} />
          <PriorityDot priority={priority} />
          <span className="muted text-sm">{assigneeName ?? 'Sem responsável'}</span>
          {meta && <span className="muted text-sm">{meta}</span>}
        </span>
      </span>
      <span className="process-row-side">
        <span className={`pill pill--${badgeTone} days-badge`}>{badge}</span>
      </span>
    </button>
  );
}

export function PanoramaPage() {
  const workload = useWorkload();
  const overdue = useOverdueProcesses();
  const stalled = useStalledProcesses(STALLED_MIN_DAYS);

  return (
    <>
      <h1 className="page-title">Panorama</h1>
      <p className="page-lead">
        Como a área está agora: quem está carregado, o que furou prazo e o que ninguém tocou.
      </p>

      <section className="panorama-section">
        <h2 className="panorama-section-title">Carga por pessoa</h2>
        {workload.isLoading ? (
          <div className="empty">Carregando…</div>
        ) : workload.data && workload.data.length > 0 ? (
          <div className="card">
            <WorkloadChart rows={workload.data} />
          </div>
        ) : (
          <div className="card">
            <div className="empty">Ainda sem dados de carga. Cadastre processos primeiro.</div>
          </div>
        )}
      </section>

      <section className="panorama-section">
        <h2 className="panorama-section-title">
          Prazo vencido{overdue.data && overdue.data.length > 0 ? ` (${overdue.data.length})` : ''}
        </h2>
        {overdue.isLoading ? (
          <div className="empty">Carregando…</div>
        ) : overdue.data && overdue.data.length > 0 ? (
          <div className="process-list">
            {overdue.data.map((r: OverdueRow) => (
              <ProcessLine
                key={`${r.process_id}-${r.due_date}`}
                processId={r.process_id}
                nup={r.nup}
                specification={r.specification}
                status={r.status}
                priority={r.priority}
                assigneeName={r.assignee_name}
                badgeTone="danger"
                badge={`${r.days_overdue} dia${r.days_overdue === 1 ? '' : 's'} de atraso`}
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty">Nenhum prazo vencido. É para ser assim.</div>
          </div>
        )}
      </section>

      <section className="panorama-section">
        <h2 className="panorama-section-title">
          Parados há mais de {STALLED_MIN_DAYS} dias
          {stalled.data && stalled.data.length > 0 ? ` (${stalled.data.length})` : ''}
        </h2>
        {stalled.isLoading ? (
          <div className="empty">Carregando…</div>
        ) : stalled.data && stalled.data.length > 0 ? (
          <div className="process-list">
            {stalled.data.map((r: StalledRow) => (
              <ProcessLine
                key={r.process_id}
                processId={r.process_id}
                nup={r.nup}
                specification={r.specification}
                status={r.status}
                priority={r.priority}
                assigneeName={r.assignee_name}
                meta={`Último toque em ${formatDate(r.last_activity_at)}`}
                badgeTone="warn"
                badge={`${r.days_stalled} dias parado`}
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty">Nada parado. Tudo teve movimento na última semana.</div>
          </div>
        )}
      </section>
    </>
  );
}
