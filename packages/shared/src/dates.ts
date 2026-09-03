/**
 * Cálculo de dias úteis. Espelho do que o Postgres faz em
 * `public.business_days_between`, para uso no cliente (contagem
 * regressiva do card, prévia ao definir prazo, etc).
 *
 * Fonte de verdade dos feriados: tabela `holidays` no banco. O app
 * mantém em memória a lista carregada no login.
 */

export type IsoDate = string; // 'YYYY-MM-DD'

/** Converte Date em ISO (YYYY-MM-DD) em UTC. */
export function toIsoDate(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse defensivo. Aceita ISO curto ou Date. */
export function toDate(input: IsoDate | Date): Date {
  if (input instanceof Date) return new Date(Date.UTC(
    input.getFullYear(), input.getMonth(), input.getDate(),
  ));
  const [y, m, d] = input.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dias úteis entre `from` (inclusivo) e `to` (exclusivo). */
export function businessDaysBetween(
  from: IsoDate | Date,
  to: IsoDate | Date,
  holidays: ReadonlySet<IsoDate>,
): number {
  const start = toDate(from).getTime();
  const end = toDate(to).getTime();
  if (end <= start) return 0;
  let count = 0;
  for (let t = start; t < end; t += DAY_MS) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    if (holidays.has(toIsoDate(d))) continue;
    count++;
  }
  return count;
}

/** Adiciona N dias úteis, pulando fim de semana e feriados. */
export function addBusinessDays(
  from: IsoDate | Date,
  days: number,
  holidays: ReadonlySet<IsoDate>,
): Date {
  const result = toDate(from);
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const dow = result.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    if (holidays.has(toIsoDate(result))) continue;
    remaining--;
  }
  return result;
}

export interface DeadlineStatus {
  /** Positivo: dias úteis até vencer. Zero: vence hoje. Negativo: atrasado. */
  daysLeft: number;
  severity: 'ok' | 'soon' | 'today' | 'overdue';
}

/** Classifica um prazo para uso direto na UI (cor do card). */
export function classifyDeadline(
  dueDate: IsoDate | Date,
  today: IsoDate | Date,
  holidays: ReadonlySet<IsoDate>,
): DeadlineStatus {
  const due = toDate(dueDate);
  const now = toDate(today);
  if (due.getTime() < now.getTime()) {
    return { daysLeft: -businessDaysBetween(due, now, holidays), severity: 'overdue' };
  }
  const days = businessDaysBetween(now, due, holidays);
  if (days === 0) return { daysLeft: 0, severity: 'today' };
  if (days <= 3) return { daysLeft: days, severity: 'soon' };
  return { daysLeft: days, severity: 'ok' };
}
