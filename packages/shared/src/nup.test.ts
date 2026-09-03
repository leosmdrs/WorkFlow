import { describe, expect, it } from 'vitest';
import { extractNups, isValidNup, normalizeNup } from './nup.ts';

describe('normalizeNup', () => {
  it('canoniza um NUP já formatado', () => {
    const n = normalizeNup('08650.000123/2026-11');
    expect(n?.formatted).toBe('08650.000123/2026-11');
    expect(n?.unit).toBe('08650');
    expect(n?.sequence).toBe('000123');
    expect(n?.year).toBe('2026');
    expect(n?.check).toBe('11');
  });

  it('canoniza um NUP sem separadores', () => {
    expect(normalizeNup('08650000123202611')?.formatted).toBe('08650.000123/2026-11');
  });

  it('rejeita strings com dígitos a mais/menos', () => {
    expect(normalizeNup('0865000012320261')).toBeNull();
    expect(normalizeNup('086500001232026112')).toBeNull();
  });

  it('rejeita anos absurdos', () => {
    expect(normalizeNup('08650.000123/1899-11')).toBeNull();
  });
});

describe('isValidNup', () => {
  it('aceita só o formato canônico', () => {
    expect(isValidNup('08650.000123/2026-11')).toBe(true);
    expect(isValidNup('08650000123202611')).toBe(false);
  });
});

describe('extractNups', () => {
  it('extrai múltiplos de um blob de HTML', () => {
    const html = `
      <div>Processo 08650.000123/2026-11 tramitando.</div>
      <div>Ver também 08650000124202655 e 08650.000123/2026-11 (repetido).</div>
      <div>Nada aqui: 12345 e 000.000/0000-00 é lixo.</div>
    `;
    expect(extractNups(html)).toEqual([
      '08650.000123/2026-11',
      '08650.000124/2026-55',
    ]);
  });

  it('devolve array vazio quando não há match', () => {
    expect(extractNups('sem NUP algum por aqui.')).toEqual([]);
  });
});
