import { initials } from '../lib/format.ts';

interface Props {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

/**
 * Avatar circular com fallback para iniciais. Priorizamos as iniciais
 * até termos upload real de foto; o `avatar_url` já é lido do banco
 * quando presente.
 */
export function Avatar({ name, avatarUrl, size = 'md', title }: Props) {
  const cls = size === 'sm' ? 'avatar avatar--sm' : size === 'lg' ? 'avatar avatar--lg' : 'avatar';
  if (avatarUrl) {
    return (
      <img className={cls} src={avatarUrl} alt={name ?? ''} title={title ?? name ?? undefined} />
    );
  }
  return (
    <span className={cls} title={title ?? name ?? undefined}>
      {initials(name)}
    </span>
  );
}
