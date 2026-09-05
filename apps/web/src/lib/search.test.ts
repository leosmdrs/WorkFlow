import { describe, expect, it } from 'vitest';
import { MIN_QUERY_LENGTH, isSearchable, sectionLabel } from './search.ts';

describe('isSearchable', () => {
  it('recusa consulta curta demais', () => {
    expect(isSearchable('')).toBe(false);
    expect(isSearchable('a')).toBe(false);
    expect(isSearchable('co')).toBe(false);
  });

  it('aceita a partir do limiar', () => {
    expect(isSearchable('con')).toBe(true);
    expect(isSearchable('convênio')).toBe(true);
  });

  it('ignora espaço em volta, e só espaço não vale', () => {
    expect(isSearchable('   ')).toBe(false);
    expect(isSearchable('  ab  ')).toBe(false);
    expect(isSearchable('  abc  ')).toBe(true);
  });

  it('conta caracteres, não bytes — acento não pode inflar o tamanho', () => {
    // 'ção' tem 3 caracteres e 5 bytes em UTF-8. Se a contagem fosse em
    // bytes, um termo de 2 letras acentuadas passaria indevidamente.
    expect(isSearchable('ção')).toBe(true);
    expect(isSearchable('çã')).toBe(false);
  });

  it('o limiar é o mesmo que a RPC search_all aplica', () => {
    // A guarda existe nos dois lados; se mudar num, tem que mudar no
    // outro. Este teste é o lembrete.
    expect(MIN_QUERY_LENGTH).toBe(3);
  });
});

describe('sectionLabel', () => {
  it('concorda em número', () => {
    expect(sectionLabel('process', 1)).toBe('1 processo');
    expect(sectionLabel('process', 4)).toBe('4 processos');
    expect(sectionLabel('comment', 1)).toBe('1 comentário');
    expect(sectionLabel('comment', 2)).toBe('2 comentários');
  });

  it('trata zero no plural', () => {
    expect(sectionLabel('process', 0)).toBe('0 processos');
    expect(sectionLabel('comment', 0)).toBe('0 comentários');
  });
});
