import { describe, expect, it } from 'vitest';
import { addBusinessDays, businessDaysBetween, classifyDeadline, toIsoDate } from './dates.ts';

const HOLIDAYS = new Set(['2026-04-21']); // Tiradentes 2026 (terça)

describe('businessDaysBetween', () => {
  it('ignora fins de semana', () => {
    // seg 2026-01-05 → seg 2026-01-12 (exclusivo) = 5 dias úteis
    expect(businessDaysBetween('2026-01-05', '2026-01-12', new Set())).toBe(5);
  });

  it('ignora feriados', () => {
    // seg 2026-04-20 → seg 2026-04-27 = 5, menos Tiradentes na terça = 4
    expect(businessDaysBetween('2026-04-20', '2026-04-27', HOLIDAYS)).toBe(4);
  });

  it('devolve zero quando to <= from', () => {
    expect(businessDaysBetween('2026-01-10', '2026-01-10', new Set())).toBe(0);
    expect(businessDaysBetween('2026-01-10', '2026-01-05', new Set())).toBe(0);
  });
});

describe('addBusinessDays', () => {
  it('pula fim de semana', () => {
    // sex 2026-01-02 + 1 dia útil = seg 2026-01-05
    expect(toIsoDate(addBusinessDays('2026-01-02', 1, new Set()))).toBe('2026-01-05');
  });

  it('pula feriado', () => {
    // seg 2026-04-20 + 2 dias úteis, pulando Tiradentes na terça = qui 2026-04-23
    expect(toIsoDate(addBusinessDays('2026-04-20', 2, HOLIDAYS))).toBe('2026-04-23');
  });
});

describe('classifyDeadline', () => {
  const holidays = new Set<string>();
  it('classifica como overdue quando venceu', () => {
    expect(classifyDeadline('2026-01-01', '2026-01-05', holidays).severity).toBe('overdue');
  });
  it('classifica como today quando hoje', () => {
    expect(classifyDeadline('2026-01-05', '2026-01-05', holidays).severity).toBe('today');
  });
  it('classifica como soon quando ≤3 dias úteis', () => {
    // seg 2026-01-05 → qui 2026-01-08 = 3 dias úteis
    expect(classifyDeadline('2026-01-08', '2026-01-05', holidays).severity).toBe('soon');
  });
  it('classifica como ok quando confortável', () => {
    expect(classifyDeadline('2026-01-30', '2026-01-05', holidays).severity).toBe('ok');
  });
});
