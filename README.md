# Rota

**Camada de gestão de processos SEI para a equipe.** Não substitui o SEI —
organiza o que fica invisível no fluxo oficial: responsabilidade, prazo,
contexto e conversa.

> Nome parametrizado em `packages/shared/src/constants.ts::APP_NAME`. Trocar
> "Rota" por "Trilha" ou "Farol" é uma mudança de constante, não uma
> refatoração.

## Status

**Fase 1 — MVP navegável.** Sobre a fundação da Fase 0, agora a equipe
pode usar. Uma pessoa consegue fazer o fluxo ponta a ponta:

- Login por username (via RPC `email_for_username`).
- **Minha Caixa** real, ordenada por prazo, com destaque para passagens
  pendentes de aceite.
- **Fluxo** — kanban por status.
- **Detalhe de processo**: timeline unificada (activity_log + comments),
  compositor de comentário com @menção, prazos institucional/interno em
  dias úteis, mudança de status/prioridade, reatribuição.
- **Passagem de bastão** com contexto obrigatório (≥ 20 caracteres) e
  fluxo de aceite/devolução (motivo ≥ 10 caracteres).
- **Painel de admin de usuários** — convite por e-mail ou senha temporária
  via Edge Function `invite-user`.
- **Notificações in-app** com sino, contador e realtime.
- **Extensão** que reconhece NUP no SEI, mostra status + responsável real,
  cria o processo sob demanda e abre o detalhe em nova aba do painel.

**Fase 0 — Fundação.** Monorepo, esquema Postgres com RLS, esqueletos
buildáveis da extensão e do painel, CI verde. O que já era real na Fase 0:

- Schema completo (`supabase/migrations/`), com RLS, triggers, materialized
  views e helpers de dia útil.
- Edge Function `invite-user`: única superfície pela qual admins criam
  usuários — sem self-signup em lugar nenhum.
- Regex e utilidades de NUP (`packages/shared/src/nup.ts`), testadas.
- Cálculo de dias úteis honrando feriados, espelho do que o Postgres faz.
- Extensão MV3 que já reconhece NUPs em qualquer texto do SEI e injeta
  um badge não intrusivo ao lado — sem tocar no DOM oficial.
- Painel web com login, guarda de rota e as três abas da Fase 1 como
  placeholders com estados vazios legíveis.

Tudo que é **stub** está marcado com `TODO(fase-1)`. Ver `docs/SCOPE.md`
para o documento completo e o roadmap.

## Setup — dois comandos

Requisitos: Node 20.11+, pnpm 9+, Docker Desktop rodando,
[Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).

```bash
git clone git@github.com:leosmdrs/WorkFlow.git rota
cd rota
pnpm run setup  # instala deps, sobe Supabase local, escreve .env.local,
                # aplica migrations+seed, gera tipos, roda sanidade
pnpm start      # painel em http://localhost:5180 + build-watch da extensão
```

O `run` é obrigatório: `pnpm setup` (sem `run`) é um comando embutido do
pnpm, que configura o `PNPM_HOME` e nunca chega no `scripts/setup.sh`.
`pnpm start` dispensa o `run` porque `start` é um dos poucos nomes que o
pnpm repassa direto para o script.

`pnpm run setup` é idempotente — rodar de novo no dia seguinte só refaz o
que mudou. Se algo estiver ausente (docker off, CLI faltando) ele diz
qual e para.

**Extensão no Chrome:** `chrome://extensions` → ativar "Modo do
desenvolvedor" → **Carregar sem compactação** → apontar para
`apps/extension/dist`.

Usuários de seed (senha `RotaDev!2026` para todos):
`admin`, `ana.souza`, `joao.silva`, `maria.lima`.

Comandos avulsos ainda existem quando precisar: `pnpm db:start`,
`pnpm db:reset`, `pnpm db:types`, `pnpm dev:web`, `pnpm dev:extension`,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Estrutura

```
apps/
  extension/          # Chrome MV3 — content script, popup, dashboard embutido
  web/                # Painel React (Vite) — Minha Caixa, Fluxo, Panorama
packages/
  shared/             # NUP, dias úteis, enums, constantes de branding
  db-types/           # Tipos gerados por supabase gen types
supabase/
  migrations/         # SQL versionado — única fonte de verdade do schema
  functions/          # Edge Functions (invite-user, digest, etc)
  seed.sql            # Dados de desenvolvimento local
docs/
  SCOPE.md            # Documento de escopo completo (fonte deste README)
  adr/                # Architecture Decision Records
```

## Comandos comuns

| Comando | Ação |
|---|---|
| `pnpm lint` | Biome check |
| `pnpm typecheck` | tsc --noEmit em cada workspace |
| `pnpm test` | Vitest unitário |
| `pnpm build` | Build de packages + apps |
| `pnpm db:reset` | Recria banco local do zero |
| `pnpm db:types` | Regenera `packages/db-types/src/database.generated.ts` |

## Disciplina de escopo

Regras que **não** se afrouxam:

1. **Zero conteúdo processual no banco.** Só metadados de gestão. Se um PR
   precisa armazenar teor de documento, está errado — repense.
2. **Migrations versionadas.** Nada de mexer no schema pelo Studio do
   Supabase em produção. Se mudou, virou migration.
3. **Nomes técnicos em inglês, strings ao usuário em pt-BR.** Sempre.
4. **RLS ativado em toda tabela.** Se criar tabela nova sem policy, o CI
   ainda não trava — mas o revisor deve.
5. **Feature flags para experimentação.** Menos redeploy, mais aprendizado.

## Segurança

Ver `docs/adr/0004-rls-security-model.md`. Resumo:

- HTTPS sempre, banco criptografado em repouso.
- RLS obrigatório; helpers `is_admin()` e `is_active_member()` centralizam
  a verificação.
- `activity_log` imutável — só triggers escrevem, ninguém apaga.
- Criação de usuário só via Edge Function `invite-user`, protegida por
  dupla checagem (JWT do chamador + role admin).

## LGPD

- Dados pessoais tratados: nome, matrícula (opcional), e-mail
  institucional, atividade no sistema. Base legal: execução de política
  pública / interesse legítimo do órgão.
- Direito de retirada: usuário desativado é anonimizado em 30 dias
  (histórico preservado, identidade substituída por "Usuário Anônimo").

## Contribuindo

- Commits pequenos e atômicos. Um commit resolve uma coisa e explica o
  porquê.
- Decisões arquiteturais não triviais ganham ADR em `docs/adr/`.
- PRs seguem o template em `.github/pull_request_template.md`.
