-- Rota — funções e triggers.
-- Toda regra que precisa ser respeitada mesmo com um cliente malcomportado
-- mora aqui, não no app.

-- ---------------------------------------------------------------------------
-- Helpers de autorização usados pelas policies do RLS.
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  )
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and is_active
  )
$$;

-- ---------------------------------------------------------------------------
-- touch_updated_at — mantém `updated_at` correto sem depender do cliente.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger processes_touch_updated_at
  before update on public.processes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- assignments_enforce_single_current — garante um único titular ativo.
-- Já temos um índice único parcial; o trigger fecha a corrida ao inserir.
-- ---------------------------------------------------------------------------
create or replace function public.assignments_enforce_single_current()
returns trigger
language plpgsql
as $$
begin
  if new.is_current then
    update public.assignments
       set is_current = false
     where process_id = new.process_id
       and id <> new.id
       and is_current;
  end if;
  return new;
end;
$$;

create trigger assignments_enforce_single_current_ins
  after insert on public.assignments
  for each row execute function public.assignments_enforce_single_current();

-- ---------------------------------------------------------------------------
-- comments -> mentions: extrai @username do body e materializa.
-- Simples e suficiente para MVP; edição de comentário refaz o conjunto.
-- ---------------------------------------------------------------------------
create or replace function public.extract_mentions(_body text)
returns setof citext
language sql
immutable
as $$
  select distinct m[1]::citext
  from regexp_matches(_body, '@([a-zA-Z0-9_.-]+)', 'g') as m
$$;

create or replace function public.comments_materialize_mentions()
returns trigger
language plpgsql
as $$
declare
  _username citext;
  _user_id uuid;
begin
  if (tg_op = 'UPDATE') then
    delete from public.mentions where comment_id = new.id;
  end if;

  if new.deleted_at is not null then
    return new;
  end if;

  for _username in select * from public.extract_mentions(new.body) loop
    select id into _user_id from public.profiles
      where username = _username and is_active;
    if _user_id is not null and _user_id <> new.author_id then
      insert into public.mentions (comment_id, mentioned_user_id)
      values (new.id, _user_id)
      on conflict do nothing;

      insert into public.notifications (user_id, kind, payload)
      values (_user_id, 'mention', jsonb_build_object(
        'comment_id', new.id,
        'process_id', new.process_id,
        'author_id', new.author_id
      ));
    end if;
  end loop;

  return new;
end;
$$;

create trigger comments_materialize_mentions_ins
  after insert on public.comments
  for each row execute function public.comments_materialize_mentions();

create trigger comments_materialize_mentions_upd
  after update of body, deleted_at on public.comments
  for each row execute function public.comments_materialize_mentions();

-- ---------------------------------------------------------------------------
-- activity_log — trigger genérico. Não uma linha por coluna alterada, uma
-- por operação lógica. O `action` é derivado da tabela + tipo de mudança.
-- ---------------------------------------------------------------------------
create or replace function public.log_process_activity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (process_id, actor_id, action, new_value)
    values (new.id, auth.uid(), 'process.created', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity_log (process_id, actor_id, action, old_value, new_value)
      values (new.id, auth.uid(), 'status.changed',
              jsonb_build_object('status', old.status),
              jsonb_build_object('status', new.status));
    end if;
    if new.priority is distinct from old.priority then
      insert into public.activity_log (process_id, actor_id, action, old_value, new_value)
      values (new.id, auth.uid(), 'priority.changed',
              jsonb_build_object('priority', old.priority),
              jsonb_build_object('priority', new.priority));
    end if;
    if (old.archived_at is null) and (new.archived_at is not null) then
      insert into public.activity_log (process_id, actor_id, action)
      values (new.id, auth.uid(), 'process.archived');
    end if;
  end if;
  return new;
end;
$$;

create trigger processes_log_activity
  after insert or update on public.processes
  for each row execute function public.log_process_activity();

create or replace function public.log_assignment_activity()
returns trigger
language plpgsql
as $$
begin
  insert into public.activity_log (process_id, actor_id, action, new_value)
  values (
    new.process_id,
    coalesce(new.assigner_id, auth.uid()),
    case when new.assigner_id is null then 'assignment.claimed'
                                       else 'assignment.transferred' end,
    jsonb_build_object(
      'assignee_id', new.assignee_id,
      'assigner_id', new.assigner_id,
      'handoff_context', new.handoff_context
    )
  );

  if new.assigner_id is not null and new.assigner_id <> new.assignee_id then
    insert into public.notifications (user_id, kind, payload)
    values (new.assignee_id, 'handoff_request', jsonb_build_object(
      'process_id', new.process_id,
      'from', new.assigner_id,
      'assignment_id', new.id
    ));
  end if;

  return new;
end;
$$;

create trigger assignments_log_activity
  after insert on public.assignments
  for each row execute function public.log_assignment_activity();

create or replace function public.log_comment_activity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (process_id, actor_id, action, new_value)
    values (new.process_id, new.author_id, 'comment.added',
            jsonb_build_object('comment_id', new.id));
  elsif tg_op = 'UPDATE' then
    if new.deleted_at is not null and old.deleted_at is null then
      insert into public.activity_log (process_id, actor_id, action, new_value)
      values (new.process_id, auth.uid(), 'comment.deleted',
              jsonb_build_object('comment_id', new.id));
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_log_activity
  after insert or update of deleted_at on public.comments
  for each row execute function public.log_comment_activity();

-- ---------------------------------------------------------------------------
-- business_days_between — cálculo de dias úteis honrando feriados.
-- Sábado e domingo contam como não-úteis. Feriados em `holidays`.
-- ---------------------------------------------------------------------------
create or replace function public.business_days_between(_from date, _to date)
returns integer
language sql
stable
as $$
  select coalesce(count(*), 0)::int
  from generate_series(_from, _to - 1, interval '1 day') as d(day)
  where extract(dow from d.day) not in (0, 6)
    and not exists (select 1 from public.holidays h where h.date = d.day::date)
$$;

comment on function public.business_days_between is
  'Dias úteis entre _from (inclusivo) e _to (exclusivo), ex-fins-de-semana e feriados.';
