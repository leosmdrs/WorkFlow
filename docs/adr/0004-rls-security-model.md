# ADR 0004 — Modelo de segurança via RLS

**Data:** 2026-09-03
**Status:** Aceito

## Contexto

A base é acessada tanto pela extensão quanto pelo painel web — os dois
usam a chave `anon` pública do Supabase e a autorização acontece via
Row Level Security. Se o RLS estiver frouxo, o produto está frouxo.

Ao mesmo tempo, a área compartilha visibilidade de trabalho: qualquer
membro precisa enxergar qualquer processo, ler comentários, ver a
trilha. "Privacidade entre analistas" não é o modelo — é confiança
institucional numa equipe pequena.

## Decisão

Cinco regras que se aplicam a todas as tabelas:

1. **Ninguém anônimo lê nada relevante.** `is_active_member()` é o gate
   de leitura em quase tudo — usuário inativo perde acesso na hora.
2. **Escrita "cotidiana" liberada a qualquer ativo** (comentar, criar
   processo, mudar status, reatribuir). Auditoria compensa má fé;
   permissão granular por ação inibe o uso normal.
3. **Tabelas administrativas só para admin** (`labels`, `holidays`,
   configuração, `profiles` de outros). `is_admin()` é o gate.
4. **`activity_log` é imutável.** Sem policy de INSERT/UPDATE/DELETE
   para clientes; só triggers server-side escrevem.
5. **Criação de usuário é privilégio.** Único caminho: Edge Function
   `invite-user` que valida o JWT do chamador *e* checa role admin
   antes de usar service role.

## Zero conteúdo processual

O banco não guarda teor de documento oficial. Guarda **metadados de
gestão**: número, especificação, responsável, prazo, comentário interno.
Isso limita risco em caso de incidente, evita duplicação com o SEI e
mantém o produto no escopo declarado.

## Consequências

- **+** Falha do cliente não vira privilege escalation.
- **+** Analista desativado perde acesso imediatamente sem intervenção
  em cada tabela.
- **−** Análises finas (ex.: "só a chefia vê processos com rótulo X")
  exigirão policy nova. Aceitável — quando surgir a demanda,
  documenta-se em ADR.
