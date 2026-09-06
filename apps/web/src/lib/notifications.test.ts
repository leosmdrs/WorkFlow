import type { Notification } from '@rota/db-types';
import { describe, expect, it } from 'vitest';
import {
  KIND_LABEL,
  notificationTarget,
  notificationText,
  pickNew,
  shouldNotify,
} from './notifications.ts';

const base: Notification = {
  id: 'n1',
  user_id: 'u1',
  kind: 'mention',
  payload: { process_id: 'p1' },
  read_at: null,
  created_at: '2026-09-06T10:00:00Z',
};

describe('notificationText', () => {
  it('usa o rótulo humano do tipo', () => {
    expect(notificationText(base).title).toBe('Você foi mencionado');
  });

  it('mostra o motivo quando a passagem foi devolvida', () => {
    const n = { ...base, kind: 'handoff_returned', payload: { reason: 'Não é da minha área.' } };
    expect(notificationText(n)).toEqual({
      title: 'Passagem devolvida',
      body: 'Não é da minha área.',
    });
  });

  it('ignora motivo em branco ou de tipo errado', () => {
    for (const reason of ['   ', 42, null, undefined]) {
      const n = { ...base, kind: 'handoff_returned', payload: { reason } };
      expect(notificationText(n).body).toBeUndefined();
    }
  });

  it('cai no tipo cru quando não conhece — melhor que sumir com o aviso', () => {
    expect(notificationText({ ...base, kind: 'algo.novo' }).title).toBe('algo.novo');
  });

  it('tem rótulo para todo tipo previsto no schema', () => {
    for (const kind of [
      'mention',
      'assignment',
      'deadline_soon',
      'deadline_overdue',
      'handoff_request',
      'handoff_returned',
      'status_change',
      'digest',
    ]) {
      expect(KIND_LABEL[kind], kind).toBeTruthy();
    }
  });
});

describe('notificationText — digest', () => {
  const digest = (payload: Record<string, unknown>) =>
    notificationText({ ...base, kind: 'digest', payload });

  it('resume só o que é maior que zero', () => {
    expect(digest({ awaiting_acceptance: 3, overdue: 0, due_next_7_days: 1 })).toEqual({
      title: 'Seu resumo',
      body: '3 aguardando seu aceite · 1 vence em 7 dias',
    });
  });

  it('concorda em número', () => {
    expect(digest({ overdue: 1 }).body).toBe('1 com prazo vencido');
    expect(digest({ overdue: 4 }).body).toBe('4 com prazo vencido');
    expect(digest({ due_next_7_days: 1 }).body).toBe('1 vence em 7 dias');
    expect(digest({ due_next_7_days: 2 }).body).toBe('2 vencem em 7 dias');
  });

  it('não fica mudo com payload estragado', () => {
    expect(digest({}).body).toBe('Nada pendente.');
    expect(digest({ overdue: 'muitos' }).body).toBe('Nada pendente.');
  });

  it('mantém a ordem: aceite, vencido, a vencer', () => {
    expect(digest({ due_next_7_days: 1, overdue: 2, awaiting_acceptance: 3 }).body).toBe(
      '3 aguardando seu aceite · 2 com prazo vencido · 1 vence em 7 dias',
    );
  });
});

describe('notificationTarget', () => {
  it('aponta para o processo quando o payload traz o id', () => {
    expect(notificationTarget(base)).toBe('/p/p1');
  });

  it('devolve null quando não há para onde ir', () => {
    expect(notificationTarget({ ...base, payload: {} })).toBeNull();
    expect(notificationTarget({ ...base, payload: { process_id: 42 } })).toBeNull();
    expect(notificationTarget({ ...base, payload: { process_id: '' } })).toBeNull();
  });
});

describe('shouldNotify', () => {
  const ok = { permission: 'granted', documentHidden: true, isInitialLoad: false } as const;

  it('avisa quando há permissão, a aba está atrás e não é a primeira carga', () => {
    expect(shouldNotify(ok)).toBe(true);
  });

  it('cala sem permissão', () => {
    expect(shouldNotify({ ...ok, permission: 'default' })).toBe(false);
    expect(shouldNotify({ ...ok, permission: 'denied' })).toBe(false);
  });

  it('cala na primeira carga, para o login não virar avalanche', () => {
    expect(shouldNotify({ ...ok, isInitialLoad: true })).toBe(false);
  });

  it('cala com a aba à frente, porque o sino já mostra', () => {
    expect(shouldNotify({ ...ok, documentHidden: false })).toBe(false);
  });
});

describe('pickNew', () => {
  const a = { ...base, id: 'a' };
  const b = { ...base, id: 'b' };
  const lida = { ...base, id: 'c', read_at: '2026-09-06T11:00:00Z' };

  it('devolve só o que ainda não foi visto', () => {
    expect(pickNew([a, b], new Set(['a'])).map((n) => n.id)).toEqual(['b']);
  });

  it('ignora as já lidas — vieram de outra aba, onde o aviso já saiu', () => {
    expect(pickNew([lida], new Set()).map((n) => n.id)).toEqual([]);
  });

  it('preserva a ordem de entrada', () => {
    expect(pickNew([b, a], new Set()).map((n) => n.id)).toEqual(['b', 'a']);
  });
});
