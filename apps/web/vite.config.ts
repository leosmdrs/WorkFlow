import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // O .env.local mora na raiz do repositório: é lá que o
  // scripts/setup.sh grava e o scripts/start.sh confere, e é um só
  // para os dois apps. Sem envDir o Vite procuraria em apps/<app>/ e
  // subiria sem as variáveis — tela branca com "supabaseUrl is
  // required", já que o setup teria dito que estava tudo certo.
  envDir: '../..',
  server: { port: 5180, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
});
