/**
 * Regras da busca global que não dependem de React nem do banco.
 *
 * O limiar de 3 caracteres existe nos dois lados de propósito: a RPC
 * search_all devolve vazio abaixo disso (sem ele o ILIKE varreria a
 * tabela), e o cliente nem chega a fazer a chamada. Se um dia mudar,
 * mude nos dois — o teste desta constante é o lembrete.
 */
export const MIN_QUERY_LENGTH = 3;

/** Curto demais, ou só espaço, não é busca. */
export function isSearchable(query: string): boolean {
  return query.trim().length >= MIN_QUERY_LENGTH;
}

/**
 * Rótulo da seção para um tipo de resultado, já no plural certo.
 * O banco devolve tudo numa lista só; a tela é que agrupa.
 */
export function sectionLabel(kind: 'process' | 'comment', count: number): string {
  if (kind === 'process') return count === 1 ? '1 processo' : `${count} processos`;
  return count === 1 ? '1 comentário' : `${count} comentários`;
}
