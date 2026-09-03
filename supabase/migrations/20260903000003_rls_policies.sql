-- Rota — Row Level Security.
-- Regra geral: qualquer usuário ativo enxerga a área toda. A "segurança
-- entre analistas" não é aqui — é confiança institucional. O que o banco
-- garante é: (1) só usuário ativo lê/escreve; (2) tabelas administrativas
-- só admin; (3) trilha de auditoria é imutável.
--
-- Ver docs/adr/0004-rls-security-model.md para o racional.

alter table public.profiles       enable row level security;
alter table public.processes      enable row level security;
alter table public.assignments    enable row level security;
alter table public.deadlines      enable row level security;
alter table public.comments       enable row level security;
alter table public.mentions       enable row level security;
alter table public.follows        enable row level security;
alter table public.labels         enable row level security;
alter table public.process_labels enable row level security;
alter table public.holidays       enable row level security;
alter table public.notifications  enable row level security;
alter table public.activity_log   enable row level security;

-- --- profiles --------------------------------------------------------------
create policy profiles_read_all_active
  on public.profiles for select
  using (public.is_active_member());

create policy profiles_self_update
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and is_active = (select is_active from public.profiles where id = auth.uid())
  );
  -- Usuário atualiza os campos "cosméticos" (nome, avatar, preferências),
  -- mas nunca sobe a si mesmo a admin nem se reativa.

create policy profiles_admin_write
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- --- processes -------------------------------------------------------------
create policy processes_read_active
  on public.processes for select
  using (public.is_active_member());

create policy processes_insert_active
  on public.processes for insert
  with check (public.is_active_member() and created_by = auth.uid());

create policy processes_update_active
  on public.processes for update
  using (public.is_active_member())
  with check (public.is_active_member());

create policy processes_delete_admin
  on public.processes for delete
  using (public.is_admin());

-- --- assignments -----------------------------------------------------------
create policy assignments_read_active
  on public.assignments for select
  using (public.is_active_member());

create policy assignments_insert_active
  on public.assignments for insert
  with check (
    public.is_active_member()
    and (assigner_id is null or assigner_id = auth.uid())
  );

create policy assignments_update_participants
  on public.assignments for update
  using (
    public.is_active_member()
    and (assignee_id = auth.uid() or assigner_id = auth.uid() or public.is_admin())
  );

-- --- deadlines -------------------------------------------------------------
create policy deadlines_read_active
  on public.deadlines for select using (public.is_active_member());

create policy deadlines_write_active
  on public.deadlines for insert
  with check (public.is_active_member() and created_by = auth.uid());

create policy deadlines_update_author_or_admin
  on public.deadlines for update
  using (created_by = auth.uid() or public.is_admin());

create policy deadlines_delete_author_or_admin
  on public.deadlines for delete
  using (created_by = auth.uid() or public.is_admin());

-- --- comments --------------------------------------------------------------
create policy comments_read_active
  on public.comments for select using (public.is_active_member());

create policy comments_insert_active
  on public.comments for insert
  with check (public.is_active_member() and author_id = auth.uid());

create policy comments_update_own_window
  on public.comments for update
  using (
    author_id = auth.uid()
    and (deleted_at is null)
    and (created_at > now() - interval '5 minutes')
  )
  with check (author_id = auth.uid());
  -- Janela dura de 5 min. Após isso, só deleção lógica.

create policy comments_soft_delete_own
  on public.comments for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and deleted_at is not null);
  -- Complementa a policy anterior: qualquer momento, autor pode marcar deletado.

-- --- mentions --------------------------------------------------------------
create policy mentions_read_self
  on public.mentions for select
  using (mentioned_user_id = auth.uid() or public.is_admin());

create policy mentions_mark_read_self
  on public.mentions for update
  using (mentioned_user_id = auth.uid())
  with check (mentioned_user_id = auth.uid());

-- --- follows ---------------------------------------------------------------
create policy follows_read_active
  on public.follows for select using (public.is_active_member());

create policy follows_write_self
  on public.follows for insert
  with check (user_id = auth.uid() and public.is_active_member());

create policy follows_delete_self
  on public.follows for delete using (user_id = auth.uid());

-- --- labels + process_labels ----------------------------------------------
create policy labels_read_active
  on public.labels for select using (public.is_active_member());

create policy labels_admin_write
  on public.labels for all
  using (public.is_admin())
  with check (public.is_admin());

create policy process_labels_read_active
  on public.process_labels for select using (public.is_active_member());

create policy process_labels_write_active
  on public.process_labels for insert
  with check (public.is_active_member());

create policy process_labels_delete_active
  on public.process_labels for delete
  using (public.is_active_member());

-- --- holidays --------------------------------------------------------------
create policy holidays_read_all
  on public.holidays for select using (public.is_active_member());

create policy holidays_admin_write
  on public.holidays for all
  using (public.is_admin())
  with check (public.is_admin());

-- --- notifications ---------------------------------------------------------
create policy notifications_read_self
  on public.notifications for select
  using (user_id = auth.uid());

create policy notifications_update_self
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ninguém escreve notifications diretamente pelo cliente; só triggers/functions
-- server-side. Não criamos policy de INSERT.

-- --- activity_log ----------------------------------------------------------
create policy activity_log_read_active
  on public.activity_log for select
  using (public.is_active_member());

-- Sem INSERT/UPDATE/DELETE — só triggers (que rodam com privilégios da tabela).
