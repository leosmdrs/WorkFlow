import type { WorkloadRow } from '@rota/db-types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.ts';

/**
 * Panorama — carga por pessoa. Lê v_workload_by_user, que desde a
 * migration 20260905000001 é uma view comum com security_invoker:
 * os números são sempre os atuais e a RLS de quem consulta vale.
 *
 * O heatmap e a lista de "parados há X dias" entram na Fase 2.
 */
export function PanoramaPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['workload'],
    queryFn: async (): Promise<WorkloadRow[]> => {
      // O cast cai quando `pnpm db:types` for rodado com as views novas:
      // views comuns entram nos tipos gerados, materializadas não entravam.
      const { data, error } = await supabase
        .from('v_workload_by_user' as unknown as 'profiles')
        .select('*')
        .order('active_count', { ascending: false });
      if (error) throw error;
      return data as unknown as WorkloadRow[];
    },
  });

  return (
    <>
      <h1 className="page-title">Panorama</h1>
      <p className="page-lead">
        Carga por pessoa hoje. Métricas mais finas (atrasos, tempo médio, quem tá parado) entram na
        Fase 2.
      </p>
      {isLoading ? (
        <div className="empty">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="empty">Ainda sem dados de carga. Cadastre processos primeiro.</div>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th style={{ textAlign: 'right' }}>Ativos</th>
              <th style={{ textAlign: 'right' }}>Em análise</th>
              <th style={{ textAlign: 'right' }}>Prioridade alta</th>
              <th style={{ textAlign: 'right' }}>Atrasados</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                  <div className="muted text-sm">@{r.username}</div>
                </td>
                <td style={{ textAlign: 'right' }}>{r.active_count}</td>
                <td style={{ textAlign: 'right' }}>{r.in_analysis_count}</td>
                <td style={{ textAlign: 'right' }}>{r.high_priority_count}</td>
                <td
                  style={{
                    textAlign: 'right',
                    color: r.overdue_count > 0 ? 'var(--color-danger)' : undefined,
                    fontWeight: r.overdue_count > 0 ? 600 : undefined,
                  }}
                >
                  {r.overdue_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
