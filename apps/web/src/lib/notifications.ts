import type { Notification } from '@rota/db-types';

/**
 * Texto e regras de exibição das notificações, fora do React para
 * poderem ser testados sem montar componente.
 */

/**
 * Rótulo humano por tipo. Os três primeiros são os que os triggers
 * emitem hoje; os demais estão previstos no comentário da tabela
 * `notifications` e ganham rótulo desde já — quando o trigger existir,
 * a UI não vai mostrar `deadline_overdue` cru para o usuário.
 */
export const KIND_LABEL: Record<string, string> = {
  mention: 'Você foi mencionado',
  handoff_request: 'Nova passagem para você',
  handoff_returned: 'Passagem devolvida',
  assignment: 'Processo atribuído a você',
  deadline_soon: 'Prazo se aproximando',
  deadline_overdue: 'Prazo vencido',
  status_change: 'Status alterado',
  digest: 'Seu resumo',
};

/** Só conta o que é maior que zero — "0 vencidos" é ruído. */
function parts(payload: Record<string, unknown>): string[] {
  const rotulos: [string, string, string][] = [
    ['awaiting_acceptance', 'aguardando seu aceite', 'aguardando seu aceite'],
    ['overdue', 'com prazo vencido', 'com prazo vencido'],
    ['due_next_7_days', 'vence em 7 dias', 'vencem em 7 dias'],
  ];
  const out: string[] = [];
  for (const [chave, singular, plural] of rotulos) {
    const n = Number(payload[chave] ?? 0);
    if (Number.isFinite(n) && n > 0) out.push(`${n} ${n === 1 ? singular : plural}`);
  }
  return out;
}

/** Título e corpo de um aviso, seja no sino ou no navegador. */
export function notificationText(n: Notification): { title: string; body?: string } {
  const title = KIND_LABEL[n.kind] ?? n.kind;

  if (n.kind === 'digest') {
    const p = parts(n.payload);
    // O job não enfileira digest vazio, mas um payload corrompido não
    // deve virar um aviso mudo.
    return { title, body: p.length ? p.join(' · ') : 'Nada pendente.' };
  }

  const reason = (n.payload as { reason?: unknown }).reason;
  if (n.kind === 'handoff_returned' && typeof reason === 'string' && reason.trim()) {
    return { title, body: reason.trim() };
  }
  return { title };
}

/** Para onde o clique leva, quando o payload diz. */
export function notificationTarget(n: Notification): string | null {
  const id = (n.payload as { process_id?: unknown }).process_id;
  return typeof id === 'string' && id ? `/p/${id}` : null;
}

export interface NotifyContext {
  /** Estado da permissão do navegador. */
  permission: 'default' | 'granted' | 'denied';
  /** A aba está em segundo plano? */
  documentHidden: boolean;
  /** É a primeira leva de dados desde que a tela abriu? */
  isInitialLoad: boolean;
}

/**
 * Decide se um aviso do navegador deve ser disparado.
 *
 * Três recusas, cada uma por um motivo diferente:
 *
 *  • sem permissão concedida — óbvio, e o navegador recusaria de todo
 *    jeito; melhor nem chamar;
 *  • primeira carga — ao abrir o painel a lista chega inteira, e
 *    disparar um popup por notificação antiga transformaria o login
 *    numa avalanche;
 *  • aba em primeiro plano — o sino no topo já mostra o contador. Um
 *    popup do sistema por cima do app que a pessoa está olhando é
 *    ruído, não aviso.
 */
export function shouldNotify(ctx: NotifyContext): boolean {
  if (ctx.permission !== 'granted') return false;
  if (ctx.isInitialLoad) return false;
  if (!ctx.documentHidden) return false;
  return true;
}

/**
 * Quais notificações são novas em relação ao que já se viu.
 * Preserva a ordem de entrada e ignora as já lidas — uma notificação
 * que já chega lida veio de outra aba, e lá o aviso já apareceu.
 */
export function pickNew(items: Notification[], seen: ReadonlySet<string>): Notification[] {
  return items.filter((n) => !seen.has(n.id) && n.read_at === null);
}
