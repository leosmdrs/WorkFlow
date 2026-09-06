/**
 * Ponte entre o tipo que o Supabase gera e o tipo de domínio.
 *
 * `supabase gen types` emite `string` para coluna `text` com CHECK e
 * `Json` para `jsonb` — ele não tem como saber que `status` só assume
 * seis valores, porque CHECK não é enum e não aparece no catálogo como
 * tipo. O domínio conhece o conjunto, e quem garante é o banco: a
 * constraint recusa qualquer outro valor na escrita.
 *
 * Por isso aqui é conversão, não validação — não há o que validar em
 * runtime que o Postgres já não tenha recusado. A função existe para
 * que cada travessia dessa fronteira seja nomeada e localizável por
 * grep, em vez de um `as` solto no meio de uma query.
 *
 * O dia em que as colunas virarem enums de verdade no Postgres, o
 * gerador passa a emitir as uniões e todas estas chamadas somem.
 */
export function asDomain<T>(row: unknown): T {
  return row as T;
}
