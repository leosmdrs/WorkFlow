import { PRIORITY_LABEL, STATUS_LABEL } from '@rota/shared';

/**
 * Traduz uma `action` do activity_log para a frase que aparece na
 * timeline, sempre completando "Fulano ___".
 *
 * Ação desconhecida cai no default e devolve a própria action. É
 * deliberado: uma migration nova pode passar a emitir um tipo antes do
 * frontend saber dele, e é melhor a timeline mostrar `algo.estranho` do
 * que sumir com o evento ou quebrar a tela.
 */
export function describeActivity(action: string, payload: Record<string, unknown>): string {
  const from = (key: string) => (payload.old as Record<string, string> | undefined)?.[key] ?? '';
  const to = (key: string) => (payload.new as Record<string, string> | undefined)?.[key] ?? '';

  switch (action) {
    case 'process.created':
      return 'criou o processo aqui no Rota';
    case 'process.archived':
      return 'arquivou o processo';
    case 'status.changed': {
      const a = from('status') as keyof typeof STATUS_LABEL;
      const b = to('status') as keyof typeof STATUS_LABEL;
      return `mudou o status de ${STATUS_LABEL[a] ?? a} para ${STATUS_LABEL[b] ?? b}`;
    }
    case 'priority.changed': {
      const a = from('priority') as keyof typeof PRIORITY_LABEL;
      const b = to('priority') as keyof typeof PRIORITY_LABEL;
      return `mudou a prioridade de ${PRIORITY_LABEL[a] ?? a} para ${PRIORITY_LABEL[b] ?? b}`;
    }
    case 'assignment.claimed':
      return 'assumiu o processo';
    case 'assignment.transferred':
      return 'passou o processo adiante';
    case 'assignment.accepted':
      return 'aceitou a passagem';
    case 'assignment.returned':
      return 'devolveu a passagem';
    case 'comment.deleted':
      return 'removeu um comentário';
    case 'label.applied': {
      const name = (payload.new as Record<string, string> | undefined)?.label_name;
      return name ? `aplicou o rótulo "${name}"` : 'aplicou um rótulo';
    }
    case 'label.removed': {
      const name = (payload.old as Record<string, string> | undefined)?.label_name;
      return name ? `removeu o rótulo "${name}"` : 'removeu um rótulo';
    }
    default:
      return action;
  }
}
