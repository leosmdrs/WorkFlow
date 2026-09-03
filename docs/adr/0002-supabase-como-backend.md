# ADR 0002 — Supabase como backend único

**Data:** 2026-09-03
**Status:** Aceito, com contingência

## Contexto

Precisamos de: Postgres, autenticação, realtime, edge functions e um
mínimo de storage. Uma equipe pequena não escala servidor próprio para
cada uma dessas capacidades no dia 1.

## Decisão

Supabase gerenciado na nuvem para acelerar. Toda lógica sensível vive em
RLS + Edge Functions, nunca no cliente. Migrations versionadas em
`supabase/migrations/`; **nunca** alterar schema pelo Studio em produção.

## Contingência (self-hosting)

Se a TI da PRF impuser não-nuvem, o Supabase é self-hostable via Docker
Compose ou Kubernetes. **O código do app não muda** — mesmo cliente,
mesma URL, credenciais diferentes. Manter essa portabilidade é regra:
nada de usar recursos exclusivos da nuvem gerenciada (ex.: features
proprietárias do dashboard que não têm equivalente em SQL/migration).

## Consequências

- **+** Do zero ao MVP em semanas, não meses.
- **+** Realtime pronto para os canais principais.
- **−** Depende de decisão institucional. Cedo, antes da Fase 1,
  precisamos alinhar com a área de TI/segurança.
