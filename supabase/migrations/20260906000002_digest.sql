-- Rota — digest: o resumo periódico do que espera por você.
--
-- Duas funções, com responsabilidades separadas de propósito:
--
--   digest_for_me()          — calcula o resumo de quem chama.
--                              SECURITY INVOKER, então a RLS decide o
--                              que entra na conta. Serve para a tela
--                              mostrar "seu resumo" sem depender de
--                              nenhum agendador.
--
--   enqueue_daily_digests()  — percorre os membros ativos e enfileira
--                              uma notificação 'digest' para cada um
--                              que tenha algo a relatar. É o corpo do
--                              job; SECURITY DEFINER porque roda sem
--                              sessão de usuário.
--
-- O AGENDAMENTO fica de fora desta migration, deliberadamente. Ligar
-- pg_cron altera a infraestrutura do projeto e não se testa fora de
-- uma instância real. Quando quiser ativar, é uma linha, com a
-- extensão habilitada no dashboard:
--
--   select cron.schedule('rota-digest-diario', '0 11 * * 1-5',
--                        $$select public.enqueue_daily_digests()$$);
--
-- (11h UTC = 8h em Brasília, dias úteis.) A alternativa é uma Edge
-- Function chamada por agendador externo, que faz `select` na mesma
-- função — o corpo do trabalho é o mesmo nos dois caminhos.

create or replace function public.digest_for_me()
returns table (
  awaiting_acceptance int,
  overdue             int,
  due_next_7_days     int,
  stalled             int,
  total               int
)
language sql
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  meus as (
    select p.id
    from public.processes p
    join public.assignments a on a.process_id = p.id and a.is_current
    cross join me
    where a.assignee_id = me.id and p.archived_at is null
  ),
  contagens as (
    select
      (select count(*) from public.assignments a
        cross join me
        where a.assignee_id = me.id and a.is_current and a.accepted_at is null)   as awaiting_acceptance,
      (select count(*) from public.deadlines d
        where d.process_id in (select id from meus)
          and d.fulfilled_at is null and d.due_date < current_date)               as overdue,
      (select count(*) from public.deadlines d
        where d.process_id in (select id from meus)
          and d.fulfilled_at is null
          and d.due_date between current_date and current_date + 7)               as due_next_7_days,
      (select count(*) from public.v_stalled_processes s
        cross join me
        where s.assignee_id = me.id and s.days_stalled >= 7)                      as stalled
  )
  select
    awaiting_acceptance::int,
    overdue::int,
    due_next_7_days::int,
    stalled::int,
    (awaiting_acceptance + overdue + due_next_7_days + stalled)::int as total
  from contagens;
$$;

revoke all on function public.digest_for_me() from public, anon;
grant execute on function public.digest_for_me() to authenticated;

create or replace function public.enqueue_daily_digests()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _prof   record;
  _c      record;
  _criadas int := 0;
begin
  for _prof in select id from public.profiles where is_active loop
    -- Mesma conta de digest_for_me, mas para outro usuário: aqui não
    -- há sessão, então os filtros são explícitos em vez de virem da RLS.
    select
      (select count(*) from public.assignments a
        where a.assignee_id = _prof.id and a.is_current and a.accepted_at is null) as awaiting,
      (select count(*) from public.deadlines d
        join public.assignments a on a.process_id = d.process_id and a.is_current
        join public.processes p on p.id = d.process_id
        where a.assignee_id = _prof.id and p.archived_at is null
          and d.fulfilled_at is null and d.due_date < current_date)                as overdue,
      (select count(*) from public.deadlines d
        join public.assignments a on a.process_id = d.process_id and a.is_current
        join public.processes p on p.id = d.process_id
        where a.assignee_id = _prof.id and p.archived_at is null
          and d.fulfilled_at is null
          and d.due_date between current_date and current_date + 7)                as soon
    into _c;

    -- Silêncio é a resposta certa para quem não tem nada pendente: um
    -- digest vazio todo dia treina a equipe a ignorar o sino.
    if coalesce(_c.awaiting,0) + coalesce(_c.overdue,0) + coalesce(_c.soon,0) = 0 then
      continue;
    end if;

    -- Um por pessoa por dia. Rodar o job duas vezes não duplica.
    if exists (
      select 1 from public.notifications n
      where n.user_id = _prof.id and n.kind = 'digest'
        and n.created_at >= date_trunc('day', now())
    ) then
      continue;
    end if;

    insert into public.notifications (user_id, kind, payload)
    values (_prof.id, 'digest', jsonb_build_object(
      'awaiting_acceptance', _c.awaiting,
      'overdue',             _c.overdue,
      'due_next_7_days',     _c.soon
    ));
    _criadas := _criadas + 1;
  end loop;

  return _criadas;
end;
$$;

-- Ninguém dispara o digest da equipe pelo cliente: só o job.
revoke all on function public.enqueue_daily_digests() from public, anon, authenticated;
