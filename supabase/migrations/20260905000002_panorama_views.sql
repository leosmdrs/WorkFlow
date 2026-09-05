-- Rota — views que alimentam o Panorama completo (Fase 2).
--
-- Ambas com `security_invoker = true`, seguindo a decisão da migration
-- 20260905000001: quem consulta é quem a RLS avalia.

-- ---------------------------------------------------------------------------
-- v_stalled_processes — "parados há X dias".
--
-- Um processo está parado desde a última entrada no activity_log, que os
-- triggers alimentam com criação, mudança de status, passagem de bastão,
-- prazo e comentário. Processo sem nenhuma atividade conta a partir da
-- própria criação, senão ele nunca apareceria — que é justamente o caso
-- mais preocupante, o que entrou e ninguém tocou.
--
-- A view não filtra por limiar: expõe `days_stalled` e deixa a tela
-- escolher o corte. Concluídos e arquivados ficam de fora — parar é o
-- estado correto deles.
-- ---------------------------------------------------------------------------
create view public.v_stalled_processes
  with (security_invoker = true) as
  select
    p.id                as process_id,
    p.nup,
    p.specification,
    p.status,
    p.priority,
    a.assignee_id,
    prof.username       as assignee_username,
    prof.full_name      as assignee_name,
    la.last_activity_at,
    (current_date - la.last_activity_at::date) as days_stalled
  from public.processes p
  left join public.assignments a
    on a.process_id = p.id and a.is_current
  left join public.profiles prof
    on prof.id = a.assignee_id
  cross join lateral (
    select coalesce(max(al.created_at), p.created_at) as last_activity_at
    from public.activity_log al
    where al.process_id = p.id
  ) la
  where p.archived_at is null
    and p.status not in ('done', 'archived');

-- ---------------------------------------------------------------------------
-- v_overdue_processes ganha o nome de quem responde pelo processo. Sem
-- isso a lista de atrasados mostraria um uuid, e o Panorama existe
-- justamente para responder "quem precisa de ajuda".
--
-- Colunas novas vão no fim: CREATE OR REPLACE VIEW só permite acrescentar.
-- ---------------------------------------------------------------------------
create or replace view public.v_overdue_processes
  with (security_invoker = true) as
  select
    p.id                as process_id,
    p.nup,
    p.specification,
    p.status,
    p.priority,
    a.assignee_id,
    d.due_date,
    (current_date - d.due_date) as days_overdue,
    prof.username       as assignee_username,
    prof.full_name      as assignee_name
  from public.processes p
  join public.deadlines d
    on d.process_id = p.id and d.fulfilled_at is null and d.due_date < current_date
  left join public.assignments a
    on a.process_id = p.id and a.is_current
  left join public.profiles prof
    on prof.id = a.assignee_id
  where p.archived_at is null;

revoke all on public.v_stalled_processes from public, anon;
grant select on public.v_stalled_processes to authenticated;
