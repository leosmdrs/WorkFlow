-- Rota — busca global (Fase 2).
--
-- Procura em três lugares: NUP, especificação do processo e corpo dos
-- comentários. Os índices GIN trigram para os três já existiam desde a
-- Fase 0 (migration ...0001) e nunca tinham sido usados.
--
-- SECURITY INVOKER, como as demais RPCs de leitura (inbox_for_me,
-- process_timeline): a RLS de quem consulta é quem decide o que volta,
-- e não há filtro de permissão duplicado aqui dentro.
--
-- Sobre NUP: quem busca digita pedaço. "000123" casa direto no texto
-- formatado, mas um NUP colado sem separadores ("08650000123202611")
-- não casaria em lugar nenhum. Daí o índice funcional abaixo, sobre a
-- versão só-dígitos, e o segundo braço do WHERE.

-- Índice funcional para busca por NUP sem separadores.
create index if not exists processes_nup_digits_trgm_idx
  on public.processes using gin ((regexp_replace(nup, '\D', '', 'g')) gin_trgm_ops);

create or replace function public.search_all(_q text, _limit int default 20)
returns table (
  kind          text,
  process_id    uuid,
  nup           text,
  specification text,
  status        text,
  priority      text,
  comment_id    uuid,
  snippet       text,
  author_name   text,
  occurred_at   timestamptz,
  rank          real
)
language sql
stable
set search_path = public
as $$
  with q as (
    select
      btrim(coalesce(_q, ''))                             as raw,
      regexp_replace(coalesce(_q, ''), '\D', '', 'g')     as digits
  ),
  -- Menos de 3 caracteres não é busca, é ruído: o trigram não tem o
  -- que indexar e o ILIKE varreria a tabela inteira.
  guarded as (select * from q where length(raw) >= 3),
  proc as (
    select
      'process'::text                                     as kind,
      p.id                                                as process_id,
      p.nup,
      p.specification,
      p.status,
      p.priority,
      null::uuid                                          as comment_id,
      null::text                                          as snippet,
      null::text                                          as author_name,
      p.created_at                                        as occurred_at,
      -- NUP exato vem primeiro; depois a semelhança com o que casou.
      (case
        when p.nup = g.raw then 1.0
        when regexp_replace(p.nup, '\D', '', 'g') = g.digits and g.digits <> '' then 1.0
        else greatest(
          similarity(p.nup, g.raw),
          similarity(coalesce(p.specification, ''), g.raw)
        )
       end)::real                                         as rank
    from public.processes p
    cross join guarded g
    where p.archived_at is null
      and (
        p.nup ilike '%' || g.raw || '%'
        or coalesce(p.specification, '') ilike '%' || g.raw || '%'
        or (length(g.digits) >= 4
            and regexp_replace(p.nup, '\D', '', 'g') like '%' || g.digits || '%')
      )
  ),
  cmt as (
    select
      'comment'::text                                     as kind,
      c.process_id,
      p.nup,
      p.specification,
      p.status,
      p.priority,
      c.id                                                as comment_id,
      -- Trecho curto para a lista; a íntegra fica no processo.
      (case when length(c.body) > 160
            then left(c.body, 157) || '…'
            else c.body end)                              as snippet,
      prof.full_name                                      as author_name,
      c.created_at                                        as occurred_at,
      -- Comentário nunca supera processo com NUP exato: o teto é o
      -- próprio similarity, que é sempre < 1 para casamento parcial.
      similarity(c.body, g.raw)::real                     as rank
    from public.comments c
    cross join guarded g
    join public.processes p on p.id = c.process_id
    left join public.profiles prof on prof.id = c.author_id
    where c.deleted_at is null
      and p.archived_at is null
      and c.body ilike '%' || g.raw || '%'
  )
  select * from (
    select * from proc
    union all
    select * from cmt
  ) t
  order by t.rank desc, t.occurred_at desc
  limit greatest(least(coalesce(_limit, 20), 100), 1);
$$;

revoke all on function public.search_all(text, int) from public, anon;
grant execute on function public.search_all(text, int) to authenticated;
