import type { DeadlineKind } from '@rota/db-types';
import { classifyDeadline } from '@rota/shared';
import { formatDate } from '../lib/format.ts';
import { useHolidays } from '../lib/holidays.ts';

interface Props {
  dueDate: string | null | undefined;
  kind?: DeadlineKind | null;
  compact?: boolean;
}

/**
 * Badge de prazo que troca de tom conforme a proximidade em dias úteis.
 * Sem prazo → mostra um traço discreto e tom neutro.
 */
export function DeadlineBadge({ dueDate, kind, compact }: Props) {
  const holidays = useHolidays().data ?? new Set<string>();
  if (!dueDate) {
    return compact ? <span className="muted text-sm">sem prazo</span> : null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const { severity, daysLeft } = classifyDeadline(dueDate, today, holidays);
  const tone =
    severity === 'overdue'
      ? 'pill--danger'
      : severity === 'today' || severity === 'soon'
        ? 'pill--warn'
        : 'pill--ok';

  const label =
    severity === 'overdue'
      ? `Atrasado ${Math.abs(daysLeft)}d`
      : severity === 'today'
        ? 'Vence hoje'
        : `Em ${daysLeft} dia${daysLeft === 1 ? '' : 's'} úteis`;

  const kindLabel = kind === 'internal' ? 'interno' : kind === 'institutional' ? 'oficial' : null;

  return (
    <span
      className={`pill ${tone}`}
      title={`Prazo ${kindLabel ?? ''} · ${formatDate(dueDate)}`.trim()}
    >
      {label}
    </span>
  );
}
