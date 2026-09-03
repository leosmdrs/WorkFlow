import { APP_NAME } from '@rota/shared';
import { createRoot } from 'react-dom/client';

/**
 * Bundle do dashboard dentro da extensão.
 * Na Fase 0 é uma placeholder — a Fase 1 traz Minha Caixa e Fluxo,
 * usando o mesmo React app do apps/web (ambos consumirão @rota/web-app).
 */
function Dashboard() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 32px',
        font: '500 15px/1.5 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 28, margin: 0 }}>{APP_NAME}</h1>
      <p style={{ opacity: 0.7, marginTop: 8 }}>
        Painel — Fase 0. Estrutura pronta; telas reais chegam na Fase 1.
      </p>
      <ul style={{ marginTop: 32, lineHeight: 1.8 }}>
        <li>Minha Caixa</li>
        <li>Fluxo da Área (Kanban)</li>
        <li>Panorama</li>
      </ul>
    </main>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Dashboard />);
