# ADR 0001 — Monorepo com pnpm workspaces

**Data:** 2026-09-03
**Status:** Aceito

## Contexto

O Rota tem duas superfícies (extensão MV3, painel web) que compartilham
tipos de banco, lógica de NUP, cálculos de prazo e enums de status.
Manter isso em repositórios separados obriga a publicar pacotes internos
ou copiar código à mão — os dois caminhos são custosos numa equipe pequena.

## Decisão

Monorepo `pnpm` com workspaces em `apps/*` e `packages/*`. Sem Turbo/Nx
por enquanto — os scripts do `package.json` raiz cobrem o necessário.
Se o build ficar dolorido, avaliamos Turbo depois.

## Consequências

- **+** Uma mudança de tipo do banco propaga por `db:types` e é vista em
  todos os consumidores no próximo `pnpm typecheck`.
- **+** Deploy de extensão e web são independentes, mas partilham `pnpm-lock.yaml`.
- **−** Contribuidor novo precisa aprender workspaces do pnpm. Mitigação:
  o README abre com passo a passo.

## Alternativas descartadas

- **Múltiplos repos.** Mais burocracia, menos coerência.
- **Yarn/npm workspaces.** pnpm resolve dependências mais rápido e tem
  ferramentário mais previsível para monorepos.
