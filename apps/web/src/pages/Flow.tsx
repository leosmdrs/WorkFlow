import { PROCESS_STATUSES, STATUS_LABEL } from '@rota/shared';

export function FlowPage() {
  return (
    <>
      <h1 className="page-title">Fluxo da Área</h1>
      <p className="page-lead">Kanban por status. Colunas configuráveis pelo admin.</p>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: `repeat(${PROCESS_STATUSES.length}, minmax(200px, 1fr))`,
        }}
      >
        {PROCESS_STATUSES.map((s) => (
          <div key={s} className="card" style={{ minHeight: 240 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{STATUS_LABEL[s]}</div>
            <div className="empty" style={{ padding: 8, fontSize: 13 }}>
              Vazio
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
