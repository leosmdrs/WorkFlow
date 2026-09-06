-- Rota — publica no realtime as tabelas que o app já escuta.
--
-- O app assina postgres_changes em três lugares desde a Fase 1:
--   data/notifications.ts  → notifications
--   data/processes.ts      → assignments, processes
--   data/timeline.ts       → comments, activity_log
--
-- Nenhuma delas estava na publication `supabase_realtime`, e no
-- Supabase criar a tabela e habilitar realtime nela são dois passos
-- separados. Sem este, o canal conecta, `subscribe()` devolve
-- SUBSCRIBED, nenhum erro aparece — e evento nenhum chega. As três
-- assinaturas eram código morto.
--
-- Sobre `replica identity`: fica no padrão (só a chave primária no
-- registro antigo) de propósito. `replica identity full` faria o
-- Postgres publicar a linha inteira em UPDATE e DELETE, e a RLS do
-- Realtime não é aplicada a DELETE — não há linha para avaliar a
-- policy contra. Ou seja, com `full`, apagar um processo transmitiria
-- NUP e especificação a qualquer assinante. Com o padrão, transmite
-- só um uuid. Os handlers do app apenas invalidam a query e não leem
-- `payload.old`, então não perdem nada com isso.

do $$
declare
  _t text;
begin
  -- Em projeto Supabase a publication já existe; num Postgres cru
  -- (CI, teste local sem o stack completo) não. Criar vazia mantém a
  -- migration aplicável nos dois.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach _t in array array['notifications','assignments','processes','comments','activity_log']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = _t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', _t);
    end if;
  end loop;
end $$;
