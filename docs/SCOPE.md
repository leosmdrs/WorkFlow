# Rota — Sistema de Gestão de Processos SEI (PRF)

> Documento de escopo. Elaborado para servir como briefing técnico e
> conceitual durante a construção do produto. Não contém código —
> descreve o quê, o porquê e o como em nível de arquitetura, fluxos,
> dados e experiência.
>
> **Este é um documento vivo.** Atualize-o conforme o produto amadurece.
> Decisões técnicas que fugirem do que está aqui viram ADR em
> `docs/adr/`.

## 1. Nome e conceito

**Rota** — porque toda demanda que entra na área tem um caminho a
percorrer, e o trabalho da equipe é conduzi-la até o destino sem que se
perca no meio do trajeto. O nome também dialoga com a identidade da PRF
(rodovia, rota, percurso) sem soar burocrático.

Alternativas descartadas mas viáveis, caso a equipe prefira: Trilha,
Baliza, Farol, Prumo. O código deve ser escrito com o nome
parametrizado em um único lugar (`packages/shared/src/constants.ts`)
para permitir troca sem retrabalho.

Conceito em uma frase: o Rota é a camada de gestão da equipe sobre o
SEI — não substitui, não duplica conteúdo, apenas organiza o que fica
invisível no fluxo oficial: responsabilidade, prazo, contexto e
conversa.

## 2. Problema e proposta de valor

**O problema real.** O SEI é excelente como sistema oficial de
tramitação, mas é péssimo como ferramenta de gestão de equipe. Hoje, na
prática:

- Não há visão consolidada do que está com quem, com que prazo e em que
  estágio.
- Comentários internos entre a equipe acabam em WhatsApp, e-mail ou
  memória.
- Prazos são controlados em planilhas paralelas que envelhecem rápido.
- Passagem de responsabilidade é informal ("me manda esse aí") e some.
- Quando alguém sai de férias, o sucessor herda um vácuo.
- Ninguém sabe, num dado momento, qual é a carga de trabalho de cada
  pessoa.

**O que o Rota entrega.** Uma camada leve, invisível para o SEI e
presente onde a equipe já trabalha, que resolve os quatro atritos acima
com quatro capacidades centrais: atribuir, prazo, comentar, acompanhar.
Nada mais no MVP. Tudo o que for além disso é bônus.

**O que o Rota não é.**

- Não é um substituto do SEI.
- Não é um repositório do teor dos processos (não armazena
  conteúdo/documentos).
- Não é uma ferramenta de tramitação oficial (isso continua sendo
  função exclusiva do SEI).
- Não é um chat corporativo genérico.

Essa disciplina de escopo é o que torna o produto viável — tanto
tecnicamente quanto do ponto de vista de segurança institucional.

## 3. Personas

Três papéis, três necessidades muito diferentes:

- **Analista** (usuário majoritário). Trabalha diariamente no SEI.
  Precisa ver rapidamente o que é dele, comentar, marcar como
  concluído, passar adiante. Otimização: menos cliques, mais teclado,
  informação certa na hora certa.
- **Chefia / coordenação.** Precisa da visão panorâmica: quem está
  sobrecarregado, o que está atrasado, o que travou. Raramente atua num
  processo individual — atua distribuindo, priorizando e desbloqueando.
- **Admin.** Cadastra novos usuários, define papéis, ajusta rótulos e
  configurações. Normalmente é um analista com privilégios extras, não
  uma pessoa dedicada.

## 4. Arquitetura macro

O sistema tem duas superfícies de uso apoiadas em um único backend:

```
┌───────────────────────────┐        ┌───────────────────────────┐
│  Extensão Chrome (MV3)    │        │  Painel Web (Rota App)    │
│  — injeta cards no SEI    │        │  — visão fora do SEI      │
│  — reconhece nº processo  │        │  — dashboards, filas      │
│  — ações rápidas          │        │  — gestão de usuários     │
└──────────────┬────────────┘        └──────────────┬────────────┘
               │                                    │
               └────────────────┬───────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │       Supabase        │
                    │  Postgres + Auth +    │
                    │  Realtime + Storage   │
                    │  + Edge Functions     │
                    └───────────────────────┘
```

**Nenhum servidor próprio.** Toda a lógica sensível fica em Row Level
Security (RLS) no Postgres e em Edge Functions do Supabase para
operações que precisam bypass controlado (ex.: criação de usuário pelo
admin).

**Sincronização em tempo real.** O Supabase Realtime propaga mudanças
para as duas superfícies simultaneamente — se alguém comenta ou
reatribui um processo, a extensão de outro colega atualiza sozinha, sem
refresh.

**Painel web pode viver dentro da própria extensão**
(`chrome-extension://.../dashboard.html` aberto em aba nova) para
simplificar deploy. Se depois quiserem hospedar como site próprio
(`rota.prf.gov.br` ou similar), o mesmo bundle roda em ambos.

## 5. Módulos funcionais

Ver o documento canônico do time (planilha em `docs/planejamento/`) para
o detalhamento vivo de cada módulo. Um resumo aqui para não perder
o contexto:

- **5.1 Reconhecimento e injeção no SEI** — content script MV3 detecta
  NUPs por regex, injeta card contextual sem tocar no DOM oficial.
- **5.2 Painel lateral dentro do SEI** — drawer com timeline, comentário
  rápido, ações (reatribuir, prazo, status, rótulo, seguir). Abre com
  `Alt+R`, fecha com `Esc`.
- **5.3 Painel web fora do SEI** — Minha Caixa, Fluxo (kanban),
  Panorama.
- **5.4 Passagem de bastão** — reatribuição com contexto obrigatório
  (mín. 20 caracteres) + aceite/devolução com justificativa.
- **5.5 Prazos inteligentes** — institucional vs. interno; dias úteis;
  notificação escalonada; herança em reatribuição.
- **5.6 Comentários e menções** — internos; @menção; markdown básico;
  reações emoji fechadas; edição em 5min; deleção lógica.
- **5.7 Seguir sem ser responsável.**
- **5.8 Rótulos e categorias** — configuráveis pelo admin.
- **5.9 Busca global** — `Cmd/Ctrl+K` em qualquer tela.
- **5.10 Notificações** — in-app, browser, e-mail digest.

## 6. Modelo de dados

Ver `supabase/migrations/` para a definição autoritativa. Tabelas
centrais: `profiles`, `processes`, `assignments`, `deadlines`,
`comments`, `mentions`, `follows`, `labels`, `process_labels`,
`activity_log`, `notifications`, `holidays`.

Views materializadas: `mv_workload_by_user`, `mv_overdue_processes`
(refresh via cron do Supabase).

## 7. Autenticação, papéis e permissões

- **Login** com Supabase Auth (e-mail + senha). UI aceita username; o
  app resolve para o e-mail correspondente antes de chamar o Auth.
- **Sem self-signup.** Usuários entram por convite ou por criação
  direta com senha temporária, sempre via Edge Function `invite-user`
  protegida por dupla checagem (JWT + role admin).
- **Papéis**: `member` e `admin`. Um único nível extra é suficiente.
- **RLS ativado em todas as tabelas**. Ver ADR 0004.

## 8. Fluxos-chave

Descritos no documento original (seção 8): primeiro contato do analista,
trabalho num processo pelo SEI, passagem de bastão, chefe olhando o
Panorama, admin cadastrando novo usuário.

## 9. Design system e UX

**Princípios.** Menos é mais. Teclado primeiro. Estados vazios com
personalidade. Densidade adequada (referência: Linear, Height, Notion).
Realtime discreto (animações sutis, sem flash). Sem cores gratuitas —
cor é semântica.

**Identidade visual.** Neutro moderno + acento único (sugestão:
azul-marinho profundo ou âmbar sóbrio). Tipografia Inter/Geist.
**Dark mode obrigatório** e cuidado — não inversão automática. Sem
imagens grandes.

**Componentes-chave a caprichar.** Card de processo, timeline de
atividade, paleta de comandos (`Cmd+K`), drawer lateral no SEI.

## 10. Stack técnica

- **Frontend**: TypeScript, React (Vite), Tailwind + shadcn/ui,
  TanStack Query, Zustand, Framer Motion. Extensão MV3 com
  `@crxjs/vite-plugin`.
- **Backend**: Supabase (Postgres 15, Auth, Realtime, Storage, Edge
  Functions, `pg_cron`).
- **Ferramental**: pnpm workspaces, Supabase CLI para migrações,
  Playwright para E2E críticos, Vitest para unitário, Biome para
  lint/format.
- **Publicação**: Chrome Web Store (privada durante piloto); painel web
  pode viver dentro da extensão ou em Vercel/Netlify.

## 11. Segurança e conformidade

- Zero conteúdo processual armazenado (ver ADR 0004).
- HTTPS + criptografia em repouso.
- RLS obrigatório.
- Rate limiting nas Edge Functions.
- `activity_log` imutável.
- **LGPD**: base legal por execução de política pública / interesse
  legítimo; anonimização de desativados em 30 dias; política de
  privacidade curta hospedada no próprio app.
- **Institucional**: conversar com a TI da PRF cedo sobre uso de
  Supabase (com plano B de self-hosting) e homologação da extensão.

## 12. Roadmap de entrega

- **Fase 0 — Fundação** (1 a 2 semanas). ✅ *Concluída — este commit.*
- **Fase 1 — MVP navegável** (3 a 4 semanas). Reconhecimento SEI, card,
  drawer, Minha Caixa, Fluxo, passagem de bastão, admin de usuários,
  notificações in-app. → *Piloto interno com 3-5 pessoas por 2 semanas.*
- **Fase 2 — Sofisticação** (3 a 4 semanas). Panorama, rótulos, busca
  global, notificações browser + digest, realtime completo, ajustes do
  piloto, dark mode caprichado. → *Lançamento para a área toda.*
- **Fase 3 — Amadurecimento** (contínuo). Métricas, exportação,
  templates, integrações leves, PWA mobile.

**Não-metas explícitas.** App nativo iOS/Android; chat em tempo real;
integração com WhatsApp/Telegram; aprovação hierárquica formal.

## 13. Métricas de sucesso

- **Adoção**: % da equipe abrindo 3x/semana, comentários por processo,
  % dos processos no Rota.
- **Impacto**: tempo entre atribuição e primeira ação; taxa de vencidos
  sem interação; taxa de devolução em passagens.
- **Qualitativo**: pesquisa trimestral curta (1-5 e NPS interno).

## 14. Decisões abertas (para o time discutir)

Todas viraram ADR quando decididas:

1. Escopo geográfico (mono-área vs. multi-área). *Recomendação: começar
   mono-área.*
2. SSO institucional (LDAP). *Recomendação: começar com senha própria.*
3. Nuvem gerenciada vs. self-hosted. *Recomendação: nuvem, com plano B.*
4. Publicação da extensão. *Recomendação: privada durante piloto.*
5. Escopo do "seguir". *Recomendação: só processos da área.*
6. Retenção de comentários. *Recomendação: para sempre.*

## 15. Instruções específicas para implementação

- Fundação (Fase 0) antes de qualquer feature.
- Migrations versionadas desde o primeiro commit.
- E2E para fluxos críticos.
- Design tokens centralizados (`packages/ui/tokens` na Fase 1).
- Nomes técnicos em inglês, strings ao usuário em pt-BR.
- Commits atômicos e descritivos.
- Feature flags para experimentação.
- ADRs para decisões contraintuitivas.
- README com setup em <10 minutos.

Se algo faltar no escopo, **prefira a opção mais simples que preserve
a possibilidade da mais complexa depois**. É melhor entregar o MVP e
evoluir do que atrasar por antecipação de casos que talvez nunca
cheguem.
