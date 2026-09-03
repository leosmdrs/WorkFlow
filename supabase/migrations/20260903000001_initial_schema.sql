-- Rota — schema inicial.
-- Convenções:
--   • Nomes de tabela e coluna em inglês (padrão Postgres/Supabase).
--   • Strings expostas ao usuário ficam nos apps, nunca no banco.
--   • Toda tabela tem `id uuid` como PK e `created_at timestamptz` default now().
--   • Chaves estrangeiras usam `on delete restrict` por padrão — apagar é raro
--     e deve ser um ato explícito. Casos que exigem cascade estão anotados.
--   • Nenhum conteúdo processual (documentos, textos oficiais) mora aqui.
--     Só metadados de gestão. Ver docs/adr/0004-rls-security-model.md.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- profiles — extensão de auth.users com o que a equipe precisa saber.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique,
  full_name text not null,
  registration text,                -- matrícula, opcional
  role text not null default 'member' check (role in ('member', 'admin')),
  unit text,                        -- unidade organizacional
  avatar_url text,
  is_active boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);
create index profiles_active_idx on public.profiles (is_active) where is_active;

comment on table public.profiles is 'Perfil de usuário da equipe. 1:1 com auth.users.';
comment on column public.profiles.role is 'member ou admin. Ver docs/adr/0004.';

-- ---------------------------------------------------------------------------
-- processes — o registro central. Metadados de um NUP.
-- ---------------------------------------------------------------------------
create table public.processes (
  id uuid primary key default gen_random_uuid(),
  nup text not null unique,
    -- padrão NUP: NNNNN.NNNNNN/AAAA-DD (17 dígitos + separadores)
  specification text,
  origin_unit text,
  process_type text,
  status text not null default 'received'
    check (status in ('received', 'in_analysis', 'awaiting_external', 'in_review', 'done', 'archived')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint nup_format check (nup ~ '^\d{5}\.\d{6}/\d{4}-\d{2}$')
);

create index processes_status_idx on public.processes (status)
  where archived_at is null;
create index processes_created_at_idx on public.processes (created_at desc);
create index processes_nup_trgm_idx on public.processes using gin (nup gin_trgm_ops);
create index processes_specification_trgm_idx on public.processes
  using gin (specification gin_trgm_ops);

comment on table public.processes is 'Metadados de gestão de um NUP. Nunca contém texto oficial.';

-- ---------------------------------------------------------------------------
-- assignments — histórico de responsabilidade + passagem de bastão.
-- Regra: exatamente um assignment `is_current` por processo (via trigger).
-- ---------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id) on delete restrict,
  assigner_id uuid references public.profiles (id) on delete restrict,
    -- null quando é a criação (auto-atribuição na origem)
  handoff_context text,
    -- contexto obrigatório em reatribuição — validado no app,
    -- não no banco, para permitir criação inicial sem contexto
  accepted_at timestamptz,
  returned_at timestamptz,
  return_reason text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint accept_or_return check (
    not (accepted_at is not null and returned_at is not null)
  )
);

create index assignments_process_idx on public.assignments (process_id, created_at desc);
create index assignments_assignee_idx on public.assignments (assignee_id)
  where is_current;
create unique index assignments_one_current_per_process
  on public.assignments (process_id) where is_current;

comment on table public.assignments is
  'Cada linha é uma tentativa de responsabilidade. is_current = titular ativo.';

-- ---------------------------------------------------------------------------
-- deadlines — múltiplos prazos por processo (institucional + interno).
-- ---------------------------------------------------------------------------
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  kind text not null check (kind in ('institutional', 'internal')),
  due_date date not null,
  description text,
  fulfilled_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index deadlines_process_idx on public.deadlines (process_id);
create index deadlines_due_open_idx on public.deadlines (due_date)
  where fulfilled_at is null;

-- ---------------------------------------------------------------------------
-- comments — internos da equipe. Nunca vão para o SEI.
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  edited_at timestamptz,
  deleted_at timestamptz,
    -- deleção lógica preserva a trilha; body é substituído no app
  created_at timestamptz not null default now()
);

create index comments_process_idx on public.comments (process_id, created_at);
create index comments_author_idx on public.comments (author_id);
create index comments_body_trgm_idx on public.comments using gin (body gin_trgm_ops)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- mentions — derivada de comments. Alimentada por trigger.
-- ---------------------------------------------------------------------------
create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (comment_id, mentioned_user_id)
);

create index mentions_unread_idx on public.mentions (mentioned_user_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- follows — usuário acompanha processo sem ser responsável.
-- ---------------------------------------------------------------------------
create table public.follows (
  process_id uuid not null references public.processes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (process_id, user_id)
);

create index follows_user_idx on public.follows (user_id);

-- ---------------------------------------------------------------------------
-- labels + process_labels
-- ---------------------------------------------------------------------------
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#64748b',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.process_labels (
  process_id uuid not null references public.processes (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  applied_by uuid references public.profiles (id) on delete set null,
  applied_at timestamptz not null default now(),
  primary key (process_id, label_id)
);

create index process_labels_label_idx on public.process_labels (label_id);

-- ---------------------------------------------------------------------------
-- holidays — feriados federais para cálculo de dias úteis.
-- Alimentado por seed inicial + tela de admin.
-- ---------------------------------------------------------------------------
create table public.holidays (
  date date primary key,
  description text not null
);

-- ---------------------------------------------------------------------------
-- notifications — fila por usuário.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
    -- ex.: 'mention', 'assignment', 'deadline_soon', 'deadline_overdue',
    --      'handoff_request', 'handoff_returned', 'status_change'
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- activity_log — trilha imutável. Escrita só por triggers. Ninguém edita.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id bigserial primary key,
  process_id uuid references public.processes (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
    -- ex.: 'process.created', 'assignment.transferred', 'comment.added',
    --      'status.changed', 'deadline.set', 'label.applied'
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_process_idx on public.activity_log (process_id, created_at desc);
create index activity_log_actor_idx on public.activity_log (actor_id, created_at desc);

comment on table public.activity_log is
  'Trilha de auditoria imutável. Só triggers escrevem; ninguém apaga.';
