import type { Notification } from '@rota/db-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationTarget, notificationText, pickNew, shouldNotify } from './notifications.ts';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

function currentPermission(): Permission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as Permission;
}

/**
 * Espelha as notificações do app em avisos do navegador.
 *
 * A permissão só pode ser pedida a partir de um gesto do usuário — o
 * navegador ignora (ou pune) pedido automático ao carregar a página.
 * Por isso `request` é devolvido para um botão chamar, em vez de a
 * gente pedir sozinho no primeiro render.
 *
 * O conjunto de vistos é semeado com a primeira leva sem disparar
 * nada, senão abrir o painel viraria uma enxurrada de popups do
 * histórico.
 */
export function useBrowserNotifications(items: Notification[], onOpen: (path: string) => void) {
  const [permission, setPermission] = useState<Permission>(currentPermission);
  const seen = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  const request = useCallback(async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    const novas = pickNew(items, seen.current);
    for (const n of items) seen.current.add(n.id);

    const isInitialLoad = !seeded.current;
    seeded.current = true;

    if (
      !shouldNotify({
        permission: permission === 'unsupported' ? 'denied' : permission,
        documentHidden: typeof document !== 'undefined' && document.hidden,
        isInitialLoad,
      })
    ) {
      return;
    }

    for (const n of novas) {
      const { title, body } = notificationText(n);
      // `tag` faz o navegador substituir o aviso anterior do mesmo
      // processo em vez de empilhar — quem volta de uma reunião não
      // encontra doze popups do mesmo assunto.
      const target = notificationTarget(n);
      const aviso = new Notification(title, { body, tag: target ?? n.id });
      aviso.onclick = () => {
        window.focus();
        if (target) onOpen(target);
        aviso.close();
      };
    }
  }, [items, permission, onOpen]);

  return { permission, request };
}
