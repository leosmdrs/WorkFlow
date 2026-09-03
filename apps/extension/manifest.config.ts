import { defineManifest } from '@crxjs/vite-plugin';

/**
 * Manifest V3 do Rota.
 *
 * `host_permissions` fica restrito ao domínio do SEI da PRF. Não pedimos
 * `<all_urls>` para minimizar prompt de instalação e escopo de risco.
 * Se em algum momento o SEI trocar de domínio, é uma linha aqui.
 *
 * `web_accessible_resources` expõe o bundle do dashboard para ser aberto
 * em `chrome-extension://<id>/dashboard.html` — mesmo bundle React do
 * painel web, embutido na extensão para simplificar o piloto.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Rota',
  version: '0.0.1',
  description: 'Gestão de processos SEI para a equipe. Camada de contexto sobre o SEI.',
  action: {
    default_title: 'Rota',
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://sei.prf.gov.br/*',
        // TODO(fase-1): confirmar o domínio real com a TI da PRF; ajustar se necessário.
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/dashboard/index.html', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
  permissions: ['storage', 'notifications'],
  host_permissions: ['https://sei.prf.gov.br/*'],
  commands: {
    'open-drawer': {
      suggested_key: { default: 'Alt+R', mac: 'Alt+R' },
      description: 'Abrir o painel Rota no processo atual',
    },
  },
});
