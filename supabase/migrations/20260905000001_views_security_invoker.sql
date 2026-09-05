-- Rota — fecha o vazamento de RLS nas views e acaba com os dados
-- velhos do Panorama.
--
-- Dois defeitos, uma causa comum e uma correção comum.
--
-- 1. VAZAMENTO. No Postgres uma view roda com os privilégios do DONO
--    (aqui, postgres), não de quem consulta. Nenhuma das quatro views
--    declarava `security_invoker`, então todas contornavam a RLS das
--    tabelas base. Verificado em cluster local: o role `anon` — sem
--    login algum, apenas com a anon key, que é pública por design e
--    viaja no bundle do navegador — lia as 18 colunas de
--    `v_processes_with_current_assignee` para TODOS os processos: NUP,
--    especificação, unidade de origem, status, prioridade e o
--    responsável (username e nome completo). A tabela `processes`
--    devolvia corretamente 0 linhas para o mesmo role. A RLS estava
--    certa; as views passavam por fora dela.
--
-- 2. DADOS VELHOS. `mv_workload_by_user` e `mv_overdue_processes` só
--    recebiam `refresh` no seed. O cabeçalho da migration ...0004 diz
--    "As materializadas são atualizadas por cron (ver migration
--    seguinte)" — o cron nunca foi implementado. Na prática o Panorama
--    congela nos números do seed: um processo urgente com prazo
--    vencido há 10 dias continua contando como 0 atrasados.
--
-- A correção resolve os dois de uma vez. As materializadas viram views
-- comuns (sempre exatas, zero maquinaria de refresh) e as quatro
-- passam a declarar `security_invoker = true`, devolvendo a decisão de
-- acesso para a RLS, que já está correta.
--
-- Custo: as agregações passam a ser calculadas por consulta em vez de
-- lidas de um cache. Na escala do Rota — dezenas de usuários, milhares
-- de processos, com os índices já presentes — isso é irrelevante. A
-- materialização era otimização prematura para um volume que não
-- existe.

-- ---------------------------------------------------------------------------
-- 1. As duas views comuns passam a respeitar a RLS de quem consulta.
--    ALTER em vez de CREATE OR REPLACE para não duplicar a definição.
-- ---------------------------------------------------------------------------
alter view public.v_processes_with_current_assignee set (security_invoker = true);
alter view public.v_next_deadline                   set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 2. As materializadas viram views comuns. O prefixo `mv_` deixaria de
--    ser verdade, então acompanham a convenção `v_` das demais.
-- ---------------------------------------------------------------------------
drop materialized view if exists public.mv_workload_by_user;
drop materialized view if exists public.mv_overdue_processes;

-- v_workload_by_user — carga por pessoa. Base do Panorama.
create view public.v_workload_by_user
  with (security_invoker = true) as
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

-- v_overdue_processes — o feed de "atrasados" do Panorama.
create view public.v_overdue_processes
  with (security_invoker = true) as
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

-- ---------------------------------------------------------------------------
-- 3. Grants explícitos. Com security_invoker a RLS já barra o anônimo,
--    mas o revoke é a segunda linha de defesa: se um dia alguém criar
--    uma policy permissiva demais, o grant continua fechado.
-- ---------------------------------------------------------------------------
revoke all on public.v_processes_with_current_assignee from public, anon;
revoke all on public.v_next_deadline                   from public, anon;
revoke all on public.v_workload_by_user                from public, anon;
revoke all on public.v_overdue_processes               from public, anon;

grant select on public.v_processes_with_current_assignee to authenticated;
grant select on public.v_next_deadline                   to authenticated;
grant select on public.v_workload_by_user                to authenticated;
grant select on public.v_overdue_processes               to authenticated;
