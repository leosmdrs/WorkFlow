-- Rota — views para consulta e views materializadas para o Panorama.
-- As materializadas são atualizadas por cron (ver migration seguinte).

-- ---------------------------------------------------------------------------
-- v_processes_with_current_assignee — junção comum, poupa joins repetidos.
-- ---------------------------------------------------------------------------
create or replace view public.v_processes_with_current_assignee as
  select
    p.*,
    a.id             as current_assignment_id,
    a.assignee_id    as current_assignee_id,
    a.accepted_at    as current_accepted_at,
    a.handoff_context as current_handoff_context,
    prof.username    as current_assignee_username,
    prof.full_name   as current_assignee_name,
    prof.avatar_url  as current_assignee_avatar
  from public.processes p
  left join public.assignments a
    on a.process_id = p.id and a.is_current
  left join public.profiles prof
    on prof.id = a.assignee_id;

-- ---------------------------------------------------------------------------
-- v_next_deadline — próximo prazo em aberto por processo.
-- ---------------------------------------------------------------------------
create or replace view public.v_next_deadline as
  select distinct on (process_id)
    process_id,
    id as deadline_id,
    kind,
    due_date,
    description
  from public.deadlines
  where fulfilled_at is null
  order by process_id, due_date asc;

-- ---------------------------------------------------------------------------
-- mv_workload_by_user — carga por titular ativo. Base do heatmap.
-- ---------------------------------------------------------------------------
create materialized view public.mv_workload_by_user as
  select
    prof.id                                          as user_id,
    prof.username,
    prof.full_name,
    count(*) filter (where p.archived_at is null)    as active_count,
    count(*) filter (where p.status = 'in_analysis') as in_analysis_count,
    count(*) filter (where p.priority in ('high', 'urgent')
                       and p.archived_at is null)    as high_priority_count,
    count(*) filter (
      where p.archived_at is null
        and exists (
          select 1 from public.deadlines d
          where d.process_id = p.id
            and d.fulfilled_at is null
            and d.due_date < current_date
        )
    ) as overdue_count
  from public.profiles prof
  left join public.assignments a on a.assignee_id = prof.id and a.is_current
  left join public.processes p on p.id = a.process_id
  where prof.is_active
  group by prof.id, prof.username, prof.full_name;

create unique index mv_workload_by_user_pk on public.mv_workload_by_user (user_id);

-- ---------------------------------------------------------------------------
-- mv_overdue_processes — o feed do Panorama para "atrasados".
-- ---------------------------------------------------------------------------
create materialized view public.mv_overdue_processes as
  select
    p.id                as process_id,
    p.nup,
    p.specification,
    p.status,
    p.priority,
    a.assignee_id,
    d.due_date,
    (current_date - d.due_date) as days_overdue
  from public.processes p
  join public.deadlines d
    on d.process_id = p.id and d.fulfilled_at is null and d.due_date < current_date
  left join public.assignments a
    on a.process_id = p.id and a.is_current
  where p.archived_at is null;

create index mv_overdue_processes_days_idx on public.mv_overdue_processes (days_overdue desc);

-- ---------------------------------------------------------------------------
-- Ao usar materialized views com RLS: elas rodam como o dono, então a
-- proteção é feita restringindo o SELECT a role authenticated. Cada view
-- só expõe métricas agregadas de usuários da área, o que é o mesmo grau
-- de exposição das tabelas base.
-- ---------------------------------------------------------------------------
revoke all on public.mv_workload_by_user   from public, anon;
revoke all on public.mv_overdue_processes  from public, anon;
grant  select on public.mv_workload_by_user   to authenticated;
grant  select on public.mv_overdue_processes  to authenticated;
