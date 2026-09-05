-- Rota — registra aplicação e remoção de rótulo no activity_log.
--
-- O comentário do activity_log em ...0001 já listava 'label.applied'
-- entre as ações esperadas, mas nenhum trigger a emitia. Sem isso a
-- timeline do processo perde quem classificou o quê, que é metade do
-- valor de ter rótulo.
--
-- SECURITY DEFINER desde o início, pelo mesmo motivo da migration
-- ...0003: o activity_log não tem policy de INSERT, então um trigger
-- SECURITY INVOKER seria rejeitado pela RLS e derrubaria junto a
-- aplicação do rótulo que o disparou.
--
-- O nome do rótulo vai no payload, e não só o id, para a timeline
-- continuar legível depois que alguém renomear ou desativar o rótulo.

create or replace function public.log_label_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _label_name text;
begin
  if tg_op = 'INSERT' then
    select name into _label_name from public.labels where id = new.label_id;
    insert into public.activity_log (process_id, actor_id, action, new_value)
    values (new.process_id, coalesce(new.applied_by, auth.uid()), 'label.applied',
            jsonb_build_object('label_id', new.label_id, 'label_name', _label_name));
    return new;
  else
    select name into _label_name from public.labels where id = old.label_id;
    insert into public.activity_log (process_id, actor_id, action, old_value)
    values (old.process_id, auth.uid(), 'label.removed',
            jsonb_build_object('label_id', old.label_id, 'label_name', _label_name));
    return old;
  end if;
end;
$$;

create trigger process_labels_log_activity
  after insert or delete on public.process_labels
  for each row execute function public.log_label_activity();
