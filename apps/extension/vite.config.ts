import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import manifest from './manifest.config.ts';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  // O .env.local mora na raiz do repositório: é lá que o
  // scripts/setup.sh grava e o scripts/start.sh confere, e é um só
  // para os dois apps. Sem envDir o Vite procuraria em apps/<app>/ e
  // subiria sem as variáveis — tela branca com "supabaseUrl is
  // required", já que o setup teria dito que estava tudo certo.
  envDir: '../..',
  build: {
    target: 'chrome110',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        dashboard: 'src/dashboard/index.html',
      },
    },
  },
  server: { port: 5174 },
});
