/**
 * Formatação pt-BR. Um lugar só, sem `toLocaleString` espalhado.
 */

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const relativeFmt = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  return dateFmt.format(new Date(input));
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  return dateTimeFmt.format(new Date(input));
}

/** "há 3 minutos", "há 2 dias", "em 4 horas" (para prazos futuros). */
export function formatRelative(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const now = Date.now();
  const then = new Date(input).getTime();
  const diffSeconds = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSeconds);
  const step = (limit: number, div: number, unit: Intl.RelativeTimeFormatUnit) =>
    abs < limit ? relativeFmt.format(Math.round(diffSeconds / div), unit) : null;
  return (
    step(60, 1, 'second') ??
    step(3600, 60, 'minute') ??
    step(86_400, 3600, 'hour') ??
    step(2_592_000, 86_400, 'day') ??
    step(31_536_000, 2_592_000, 'month') ??
    relativeFmt.format(Math.round(diffSeconds / 31_536_000), 'year')
  );
}

/** Extrai iniciais para o avatar-fallback: "Ana Souza" → "AS". */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + (last ?? '')).toUpperCase() || '?';
}
