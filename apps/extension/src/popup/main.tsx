import { APP_NAME, APP_TAGLINE } from '@rota/shared';
import { createRoot } from 'react-dom/client';

function Popup() {
  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
  };
  return (
    <main
      style={{
        width: 280,
        padding: 16,
        font: '500 14px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        color: '#f1f5f9',
        background: '#0f172a',
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{APP_NAME}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{APP_TAGLINE}</div>
      </header>
      <button
        type="button"
        onClick={openDashboard}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #334155',
          background: '#1e293b',
          color: 'inherit',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Abrir painel
      </button>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.6 }}>
        Fase 0 — apenas esqueleto. Login e caixa chegam na Fase 1.
      </p>
    </main>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Popup />);
