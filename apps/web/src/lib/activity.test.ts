import { describe, expect, it } from 'vitest';
import { describeActivity } from './activity.ts';

describe('describeActivity', () => {
  it('descreve as ações de rótulo com o nome que veio no payload', () => {
    expect(describeActivity('label.applied', { new: { label_name: 'convênio' } })).toBe(
      'aplicou o rótulo "convênio"',
    );
    expect(describeActivity('label.removed', { old: { label_name: 'auditoria' } })).toBe(
      'removeu o rótulo "auditoria"',
    );
  });

  it('sobrevive a rótulo sem nome no payload', () => {
    // O trigger sempre grava label_name, mas entradas antigas do
    // activity_log, gravadas antes da migration, não têm o campo.
    expect(describeActivity('label.applied', {})).toBe('aplicou um rótulo');
    expect(describeActivity('label.removed', { old: {} })).toBe('removeu um rótulo');
  });

  it('traduz status e prioridade para o rótulo humano', () => {
    expect(
      describeActivity('status.changed', {
        old: { status: 'received' },
        new: { status: 'in_analysis' },
      }),
    ).toBe('mudou o status de Recebido para Em análise');
    expect(
      describeActivity('priority.changed', {
        old: { priority: 'normal' },
        new: { priority: 'urgent' },
      }),
    ).toBe('mudou a prioridade de Normal para Urgente');
  });

  it('devolve a action crua quando não conhece a ação', () => {
    // Uma migration pode emitir um tipo antes do frontend saber dele:
    // melhor mostrar o cru do que sumir com o evento.
    expect(describeActivity('algo.que.nao.existe', {})).toBe('algo.que.nao.existe');
  });

  it('não quebra quando o payload vem vazio numa ação que espera valores', () => {
    expect(describeActivity('status.changed', {})).toBe('mudou o status de  para ');
  });

  it('descreve as ações simples de atribuição', () => {
    expect(describeActivity('assignment.transferred', {})).toBe('passou o processo adiante');
    expect(describeActivity('assignment.returned', {})).toBe('devolveu a passagem');
  });
});
