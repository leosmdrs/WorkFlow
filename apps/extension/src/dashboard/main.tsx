import { APP_NAME } from '@rota/shared';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * "Dashboard" da extensão. Não duplica o painel React — o painel de
 * verdade roda no domínio configurado (localhost em dev, rota.prf...
 * em produção). Esta página é uma escala rápida que:
 *
 *   1. lê a URL do painel da preferência (chrome.storage.local).
 *   2. redireciona para `${webAppUrl}${route}` — o hash `#route=` vem
 *      preenchido pelo background.
 *   3. se não estiver configurado, mostra um form para o usuário
 *      informar o endereço (o admin da área diz qual é).
 *
 * Assim tanto o pilotinho self-hosted quanto o cenário nuvem funcionam
 * com o mesmo bundle da extensão.
 */

const DEFAULT_WEB_URL = 'http://localhost:5173';

async function readWebUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('rota:web_url', (r) => {
      const v = (r?.['rota:web_url'] as string | undefined) ?? DEFAULT_WEB_URL;
      resolve(v);
    });
  });
}

function saveWebUrl(v: string) {
  chrome.storage.local.set({ 'rota:web_url': v });
}

function readRouteFromHash(): string {
  const h = window.location.hash;
  const match = /route=([^&]+)/.exec(h);
  return match ? decodeURIComponent(match[1] ?? '/') : '/';
}

function Dashboard() {
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const route = readRouteFromHash();

  useEffect(() => {
    readWebUrl().then(setWebUrl);
  }, []);

  useEffect(() => {
    if (!webUrl) return;
    const target = `${webUrl.replace(/\/$/, '')}${route}`;
    window.location.replace(target);
  }, [webUrl, route]);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 32px',
        display: 'grid',
        placeItems: 'center',
        color: '#f1f5f9',
        background: '#0f172a',
        font: '500 15px/1.5 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>{APP_NAME}</h1>
        <p style={{ opacity: 0.7, marginBottom: 24 }}>Abrindo o painel em {webUrl ?? '…'}</p>
        <label htmlFor="web-url" style={{ fontSize: 12, opacity: 0.7 }}>
          Endereço do painel
        </label>
        <input
          id="web-url"
          type="url"
          defaultValue={webUrl ?? DEFAULT_WEB_URL}
          onBlur={(e) => saveWebUrl(e.target.value.trim() || DEFAULT_WEB_URL)}
          style={{
            width: '100%',
            marginTop: 6,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: 'inherit',
          }}
        />
        <p style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>
          Configure uma vez. O padrão vale para dev local.
        </p>
      </div>
    </main>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Dashboard />);
