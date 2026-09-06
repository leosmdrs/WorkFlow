#!/usr/bin/env bash
# Rota — bootstrap zero-a-um.
#
# Roda de dentro do repositório clonado. Um comando prepara tudo:
#   • valida ferramentas (node, pnpm, docker, supabase CLI)
#   • pnpm install
#   • docker ping — precisa estar rodando
#   • supabase start (idempotente)
#   • gera .env.local a partir de `supabase status`
#   • aplica migrations + seed
#   • gera os tipos TS do schema
#
# É idempotente: rodar de novo no meio do dia não quebra nada — só
# checa/atualiza cada passo. Use `pnpm start` para subir os apps depois.

set -euo pipefail
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
YELLOW='\033[0;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'
say()  { printf "${BOLD}→${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$*"; }
die()  { printf "${RED}✗${RESET} %s\n" "$*" >&2; exit 1; }

# --- 1. ferramentas ---------------------------------------------------------
say "Checando ferramentas"
command -v node >/dev/null     || die "Node não encontrado. Instale Node 20.11+."
command -v pnpm >/dev/null     || die "pnpm não encontrado. Instale pnpm 9+ (npm i -g pnpm@9)."
command -v docker >/dev/null   || die "docker não encontrado."
command -v supabase >/dev/null || die "supabase CLI não encontrado. https://supabase.com/docs/guides/cli"
ok "node $(node -v) · pnpm $(pnpm -v) · docker $(docker -v | awk '{print $3}' | tr -d ,) · supabase $(supabase --version)"

# --- 2. docker daemon -------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  die "Docker está instalado mas o daemon não responde. Abra o Docker Desktop e tente de novo."
fi
ok "Docker daemon respondendo"

# --- 3. deps ----------------------------------------------------------------
say "Instalando dependências (pnpm install)"
pnpm install --silent
ok "Dependências prontas"

# --- 4. supabase local ------------------------------------------------------
say "Subindo Supabase local (pode demorar na primeira vez)"
if supabase status >/dev/null 2>&1; then
  ok "Supabase local já estava de pé"
else
  supabase start
  ok "Supabase local subido"
fi

# --- 5. .env.local (extraído do supabase status) ----------------------------
say "Escrevendo .env.local"
STATUS_JSON="$(supabase status -o json 2>/dev/null || true)"
if [ -z "$STATUS_JSON" ]; then
  # CLI antigo — parse do texto.
  API_URL="$(supabase status | awk -F': +' '/API URL/    {print $2; exit}')"
  ANON_KEY="$(supabase status | awk -F': +' '/anon key/  {print $2; exit}')"
else
  API_URL="$(printf '%s' "$STATUS_JSON" | grep -oE '"API_URL"[^"]*"[^"]*"' | awk -F'"' '{print $4}')"
  ANON_KEY="$(printf '%s' "$STATUS_JSON" | grep -oE '"ANON_KEY"[^"]*"[^"]*"' | awk -F'"' '{print $4}')"
fi
[ -n "$API_URL" ]   || die "Não consegui ler a API URL do supabase status."
[ -n "$ANON_KEY" ]  || die "Não consegui ler a anon key do supabase status."

cat > .env.local <<EOF
# Gerado por scripts/setup.sh — sobrescrever é seguro, é só reexecutar setup.
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
VITE_APP_NAME=Rota
VITE_APP_TAGLINE=Gestão de processos SEI
VITE_APP_ENV=development
EOF
ok ".env.local gravado ($API_URL)"

# --- 6. migrations + seed ---------------------------------------------------
say "Aplicando migrations + seed (supabase db reset)"
supabase db reset --no-seed=false >/dev/null
ok "Banco no estado do repositório, com seed"

# --- 7. tipos TS gerados ----------------------------------------------------
say "Gerando tipos TS do schema (pnpm db:types)"
pnpm --silent db:types
ok "packages/db-types/src/database.generated.ts atualizado"

# --- 8. sanity: lint/typecheck/testes ---------------------------------------
say "Sanidade: lint + typecheck + testes"
# Sem --silent: em comando recursivo o pnpm roteia a saída dos filhos
# pelo reporter, e --silent a descarta inteira. O efeito é uma falha
# muda — o script aborta pelo set -e sem nunca dizer o motivo, e o
# erro anterior na tela (o do lint, que passou) leva a suspeitar do
# comando errado. Ruído a mais vale menos que uma falha indecifrável.
pnpm lint
pnpm typecheck
pnpm test
ok "Tudo verde"

cat <<EOF

${BOLD}${GREEN}Pronto.${RESET}

Próximo passo:
  pnpm start                # sobe painel (5180) + build watch da extensão

Login (senha para todos: RotaDev!2026):
  admin  |  ana.souza  |  joao.silva  |  maria.lima

Studio (SQL, editor de linhas, logs):
  supabase status  # veja "Studio URL" (normalmente http://127.0.0.1:54623)

EOF
