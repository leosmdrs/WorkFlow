import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../data/notifications.ts';
import { formatRelative } from '../lib/format.ts';
import { notificationTarget, notificationText } from '../lib/notifications.ts';
import { useBrowserNotifications } from '../lib/use-browser-notifications.ts';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: items = [] } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = items.filter((n) => n.read_at === null).length;
  const browser = useBrowserNotifications(items, navigate);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="bell" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-label={`${unread} notificações não lidas`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-list" role="menu">
          <div
            className="row row--between"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <strong>Notificações</strong>
            {unread > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => markAll.mutate()}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          {items.length === 0 && (
            <div className="empty" style={{ padding: 'var(--space-6)' }}>
              Nada por aqui. Que ótimo.
            </div>
          )}
          {browser.permission === 'default' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{
                margin: 'var(--space-2) var(--space-4)',
                width: 'calc(100% - var(--space-8))',
              }}
              onClick={() => browser.request()}
            >
              Avisar também pelo navegador
            </button>
          )}
          {browser.permission === 'denied' && (
            <div className="muted text-sm" style={{ padding: '0 var(--space-4) var(--space-2)' }}>
              Avisos do navegador bloqueados nas permissões do site.
            </div>
          )}
          {items.map((n) => {
            const target = notificationTarget(n);
            const { title, body } = notificationText(n);
            return (
              <button
                key={n.id}
                type="button"
                className={`notification-item${n.read_at === null ? ' notification-item--unread' : ''}`}
                onClick={() => {
                  if (n.read_at === null) markOne.mutate(n.id);
                  setOpen(false);
                  if (target) navigate(target);
                }}
              >
                <div style={{ fontWeight: 600 }}>{title}</div>
                {body && (
                  <div className="text-sm" style={{ marginTop: 2 }}>
                    {body}
                  </div>
                )}
                <div className="muted text-sm" style={{ marginTop: 2 }}>
                  {formatRelative(n.created_at)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
