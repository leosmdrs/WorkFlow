-- Rota — dados de seed para desenvolvimento local.
-- Nunca rodar em produção. Cria 4 usuários fictícios via auth.users +
-- profiles, um punhado de processos, comentários e prazos, e feriados
-- federais de 2026.
--
-- Senha de todos: RotaDev!2026

-- ---------------------------------------------------------------------------
-- Feriados federais brasileiros (subset para 2026).
-- Admin ajusta pela UI posteriormente.
-- ---------------------------------------------------------------------------
insert into public.holidays (date, description) values
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-02-16', 'Carnaval (segunda)'),
  ('2026-02-17', 'Carnaval (terça)'),
  ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'),
  ('2026-06-04', 'Corpus Christi'),
  ('2026-09-07', 'Independência do Brasil'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-12-25', 'Natal')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Usuários. Em ambiente local, criar direto em auth.users é OK. Em prod,
-- isso passa pela Edge Function `invite-user`.
-- ---------------------------------------------------------------------------
do $$
declare
  _admin_id   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  _ana_id     uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  _joao_id    uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  _maria_id   uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  _process_1  uuid;
  _process_2  uuid;
  _process_3  uuid;
begin
  -- auth.users (bypass da Edge Function; seed local só)
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (_admin_id, 'authenticated', 'authenticated', 'admin@rota.local',
     crypt('RotaDev!2026', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
    (_ana_id,   'authenticated', 'authenticated', 'ana.souza@rota.local',
     crypt('RotaDev!2026', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
    (_joao_id,  'authenticated', 'authenticated', 'joao.silva@rota.local',
     crypt('RotaDev!2026', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
    (_maria_id, 'authenticated', 'authenticated', 'maria.lima@rota.local',
     crypt('RotaDev!2026', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
  on conflict (id) do nothing;

  insert into public.profiles (id, username, full_name, role, unit) values
    (_admin_id, 'admin',     'Admin (dev)',     'admin',  'Coordenação'),
    (_ana_id,   'ana.souza', 'Ana Souza',       'member', 'Análise'),
    (_joao_id,  'joao.silva','João da Silva',   'member', 'Análise'),
    (_maria_id, 'maria.lima','Maria Lima',      'member', 'Convênios')
  on conflict (id) do nothing;

  -- Rótulos
  insert into public.labels (name, color) values
    ('urgente',   '#ef4444'),
    ('convênio',  '#3b82f6'),
    ('recurso',   '#a855f7'),
    ('auditoria', '#f59e0b')
  on conflict do nothing;

  -- Processos + assignments iniciais
  insert into public.processes (nup, specification, origin_unit, process_type, status, priority, created_by)
  values
    ('08650.000123/2026-11', 'Convênio com prefeitura de Exemplópolis',
     'Divisão Administrativa', 'Convênio', 'in_analysis', 'high', _ana_id)
    returning id into _process_1;

  insert into public.processes (nup, specification, origin_unit, process_type, status, priority, created_by)
  values
    ('08650.000124/2026-55', 'Análise de recurso administrativo #4432',
     'Serviço de Recursos', 'Recurso', 'received', 'normal', _joao_id)
    returning id into _process_2;

  insert into public.processes (nup, specification, origin_unit, process_type, status, priority, created_by)
  values
    ('08650.000125/2026-99', 'Auditoria interna de convênios 2025',
     'Auditoria', 'Auditoria', 'in_review', 'urgent', _admin_id)
    returning id into _process_3;

  insert into public.assignments (process_id, assignee_id, is_current) values
    (_process_1, _ana_id, true),
    (_process_2, _joao_id, true),
    (_process_3, _maria_id, true);

  insert into public.deadlines (process_id, kind, due_date, description, created_by) values
    (_process_1, 'institutional', current_date + 15, 'Prazo de resposta institucional', _ana_id),
    (_process_1, 'internal',      current_date + 3,  'Fechar análise inicial',          _ana_id),
    (_process_2, 'internal',      current_date - 1,  'Deadline vencido (para testar)',  _joao_id),
    (_process_3, 'institutional', current_date + 30, 'Entrega do relatório final',      _admin_id);

  insert into public.comments (process_id, author_id, body) values
    (_process_1, _ana_id,
     'Primeira leitura feita. @joao.silva, você que cuidou do último convênio dessa mesma prefeitura, algum ponto pra ficar de olho?'),
    (_process_2, _joao_id,
     'Vou pegar amanhã de manhã. Se aparecer algo urgente antes, me avisem.'),
    (_process_3, _admin_id,
     'Prioridade alta. Amostragem já definida — @maria.lima, começa pelos convênios acima de R$500k.');

  refresh materialized view public.mv_workload_by_user;
  refresh materialized view public.mv_overdue_processes;
end $$;
