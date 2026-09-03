# ADR 0003 — Manifest V3 e injeção não-intrusiva no SEI

**Data:** 2026-09-03
**Status:** Aceito

## Contexto

O SEI é um sistema oficial: quebrar sua UI é politicamente caro e
tecnicamente inevitável se editarmos o DOM oficial. Ao mesmo tempo,
precisamos de presença visual do Rota nas páginas do SEI para não
obrigar o analista a alternar de janela.

## Decisão

Extensão Chrome MV3. Content script varre a página, identifica NUPs por
regex e **insere elementos irmãos** (custom elements com Shadow DOM
fechado) ao lado do texto oficial. Nunca sobrescreve, nunca reordena,
nunca remove nó original.

`host_permissions` restrito ao domínio do SEI da PRF — não pedimos
`<all_urls>` para reduzir o prompt de instalação e o escopo de risco.

## Consequências

- **+** Se o SEI atualiza HTML numa próxima release, o badge some;
  o SEI continua íntegro. O pior cenário é degradação silenciosa,
  detectável pelos testes E2E.
- **+** Shadow DOM isola CSS do Rota do CSS do SEI (e vice-versa).
- **−** Não há como *melhorar* o SEI (ex.: reformatar tabelas). Aceitamos
  — o Rota é camada de gestão, não de UX do SEI.

## Alternativas descartadas

- **Iframe intercalado.** Quebra fluxo de teclado do SEI, atrapalha copy/paste.
- **Bookmarklet.** Não sobrevive a navegação, sem service worker.
- **App standalone só.** Perde o valor de "presença no fluxo".
