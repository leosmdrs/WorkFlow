#!/usr/bin/env bash
# Rota — start dev.
# Sobe painel web (http://localhost:5173) e build-watch da extensão
# em paralelo. Ctrl+C para os dois de uma vez.
#
# Depende de scripts/setup.sh já ter rodado ao menos uma vez.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "✗ .env.local não existe. Rode 'pnpm setup' primeiro." >&2
  exit 1
fi
if ! command -v supabase >/dev/null || ! supabase status >/dev/null 2>&1; then
  echo "! Supabase local não está de pé — os apps vão abrir sem backend."
  echo "  Rode 'supabase start' (ou 'pnpm setup') em outro terminal."
fi

echo "→ Painel:    http://localhost:5173"
echo "→ Extensão:  apps/extension/dist  (carregue como unpacked no chrome://extensions)"
echo "  Ctrl+C encerra os dois."
echo

# `pnpm -r --parallel` roda scripts que existirem, no caso `dev` em ambos.
# --stream=false garante que o Ctrl+C propague limpo para os filhos.
exec pnpm -r --parallel --filter "@rota/web" --filter "@rota/extension" dev
