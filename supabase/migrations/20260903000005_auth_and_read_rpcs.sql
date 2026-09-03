-- Rota — RPCs de apoio.
--
-- Concentra tudo que o cliente precisa fazer server-side em pequenas
-- funções nomeadas, para o app não depender de joins complicados
-- no PostgREST nem de escrever raw SQL do lado do cliente.
--
-- Regra: cada RPC diz explicitamente quem pode chamar. Nada de
-- 'grant execute ... to public' — sempre para anon ou authenticated
-- de forma deliberada.

-- ---------------------------------------------------------------------------
-- email_for_username — resolve o e-mail de auth.users pelo username.
-- Anônimo pode chamar, porque é necessário para o fluxo de login por
-- username. Consequência: um atacante consegue enumerar usernames
-- válidos, o que aceitamos numa área institucional pequena e fechada.
-- Se um dia isso incomodar, trocar por Edge Function.
-- ---------------------------------------------------------------------------
create or replace function public.email_for_username(_username citext)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = _username and p.is_active
$$;

revoke all on function public.email_for_username(citext) from public;
grant execute on function public.email_for_username(citext) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- inbox_for_me — a caixa de entrada do usuário logado.
-- Retorna processos onde is_current = true e assignee = auth.uid(),
-- com informações agregadas usadas pela UI. Ordena pelo prazo mais
-- próximo (nulos por último) e depois por criação mais recente.
--
-- Rows aceitas: is_accepted (assignment.accepted_at is not null),
-- para o app distinguir "aguardando aceite" das já em andamento.
-- ---------------------------------------------------------------------------
create or replace function public.inbox_for_me()
returns table (
  process_id uuid,
  nup text,
  specification text,
  status text,
  priority text,
  next_due_date date,
  next_due_kind text,
  unread_comments int,
  assignment_id uuid,
  is_accepted boolean,
  assigner_id uuid,
  assigner_name text,
  handoff_context text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with mine as (
    select a.*
    from public.assignments a
    where a.is_current and a.assignee_id = auth.uid()
  )
  select
    p.id,
    p.nup,
    p.specification,
    p.status,
    p.priority,
    d.due_date,
    d.kind,
    -- proxy simples para "comentários novos": criados após o assignment
    -- corrente. Refinaremos em Fase 2 com uma tabela de reads.
    (
      select count(*)::int from public.comments c
      where c.process_id = p.id
        and c.created_at > mine.created_at
        and c.author_id <> auth.uid()
        and c.deleted_at is null
    ),
    mine.id,
    (mine.accepted_at is not null),
    mine.assigner_id,
    prof.full_name,
    mine.handoff_context,
    greatest(p.updated_at, mine.created_at)
  from mine
  join public.processes p on p.id = mine.process_id
  left join public.v_next_deadline d on d.process_id = p.id
  left join public.profiles prof on prof.id = mine.assigner_id
  where p.archived_at is null
  order by
    (mine.accepted_at is null) desc,     -- pendentes de aceite primeiro
    d.due_date nulls last,
    p.updated_at desc
$$;

grant execute on function public.inbox_for_me() to authenticated;

-- ---------------------------------------------------------------------------
-- process_timeline — timeline unificada (activity + comentários).
-- O activity_log já cobre criação, status, atribuição, deleção de
-- comentário. Faltavam os comentários em si, unidos por union.
-- ---------------------------------------------------------------------------
create or replace function public.process_timeline(_process_id uuid)
returns table (
  entry_id text,
  entry_kind text,      -- 'activity' ou 'comment'
  action text,          -- ex.: 'status.changed' ou 'comment'
  actor_id uuid,
  actor_name text,
  actor_avatar text,
  payload jsonb,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select 'a:' || a.id::text,
         'activity',
         a.action,
         a.actor_id,
         prof.full_name,
         prof.avatar_url,
         jsonb_build_object('old', a.old_value, 'new', a.new_value),
         a.created_at
  from public.activity_log a
  left join public.profiles prof on prof.id = a.actor_id
  where a.process_id = _process_id
  union all
  select 'c:' || c.id::text,
         'comment',
         'comment',
         c.author_id,
         prof.full_name,
         prof.avatar_url,
         jsonb_build_object(
           'comment_id', c.id,
           'body', case when c.deleted_at is null then c.body else null end,
           'deleted', c.deleted_at is not null,
           'edited_at', c.edited_at,
           'parent_id', c.parent_id
         ),
         c.created_at
  from public.comments c
  left join public.profiles prof on prof.id = c.author_id
  where c.process_id = _process_id
  order by 8 asc
$$;

grant execute on function public.process_timeline(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- transfer_assignment — reatribuição atômica.
-- Cria o novo assignment como is_current=true (o trigger derruba o
-- anterior). Valida o contexto de handoff (>= 20 chars), a menos que
-- seja auto-atribuição (assigner = assignee, ex.: 'peguei').
-- ---------------------------------------------------------------------------
create or replace function public.transfer_assignment(
  _process_id uuid,
  _to_user_id uuid,
  _handoff_context text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _new_id uuid;
begin
  if _me is null then
    raise exception 'not_authenticated';
  end if;
  if _to_user_id <> _me and length(coalesce(trim(_handoff_context), '')) < 20 then
    raise exception 'handoff_context_too_short'
      using hint = 'Explique em pelo menos 20 caracteres o que a pessoa recebe.';
  end if;
  if not exists(select 1 from public.profiles where id = _to_user_id and is_active) then
    raise exception 'target_inactive_or_missing';
  end if;

  insert into public.assignments (process_id, assignee_id, assigner_id, handoff_context, is_current)
  values (
    _process_id, _to_user_id,
    case when _to_user_id = _me then null else _me end,
    nullif(trim(_handoff_context), ''),
    true
  )
  returning id into _new_id;

  return _new_id;
end;
$$;

grant execute on function public.transfer_assignment(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- respond_handoff — aceitar ou devolver um assignment pendente.
-- Ao devolver, revive o assignment anterior (o titular imediatamente
-- antes) como is_current. Se não houver histórico, o processo fica
-- órfão até nova atribuição — chefia trata pelo Panorama.
-- ---------------------------------------------------------------------------
create or replace function public.respond_handoff(
  _assignment_id uuid,
  _accept boolean,
  _return_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _row public.assignments%rowtype;
  _prev uuid;
begin
  select * into _row from public.assignments where id = _assignment_id;
  if not found then raise exception 'assignment_not_found'; end if;
  if _row.assignee_id <> _me then raise exception 'forbidden'; end if;
  if _row.accepted_at is not null or _row.returned_at is not null then
    raise exception 'already_responded';
  end if;

  if _accept then
    update public.assignments set accepted_at = now() where id = _assignment_id;
    insert into public.activity_log (process_id, actor_id, action, new_value)
    values (_row.process_id, _me, 'assignment.accepted',
            jsonb_build_object('assignment_id', _assignment_id));
    return;
  end if;

  if length(coalesce(trim(_return_reason), '')) < 10 then
    raise exception 'return_reason_too_short'
      using hint = 'Explique o motivo em pelo menos 10 caracteres.';
  end if;

  update public.assignments
     set returned_at = now(), return_reason = _return_reason, is_current = false
   where id = _assignment_id;

  -- Reviver o assignment anterior — o mais recente antes deste.
  select id into _prev from public.assignments
    where process_id = _row.process_id and id <> _assignment_id
    order by created_at desc limit 1;
  if _prev is not null then
    update public.assignments set is_current = true where id = _prev;
  end if;

  insert into public.activity_log (process_id, actor_id, action, new_value)
  values (_row.process_id, _me, 'assignment.returned',
          jsonb_build_object('assignment_id', _assignment_id, 'reason', _return_reason));

  if _row.assigner_id is not null then
    insert into public.notifications (user_id, kind, payload)
    values (_row.assigner_id, 'handoff_returned', jsonb_build_object(
      'process_id', _row.process_id,
      'assignment_id', _assignment_id,
      'by', _me,
      'reason', _return_reason
    ));
  end if;
end;
$$;

grant execute on function public.respond_handoff(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- unread_notification_count — para o sino no header, sem PII.
-- ---------------------------------------------------------------------------
create or replace function public.unread_notification_count()
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int from public.notifications
  where user_id = auth.uid() and read_at is null
$$;

grant execute on function public.unread_notification_count() to authenticated;
