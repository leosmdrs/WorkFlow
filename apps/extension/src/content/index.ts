/**
 * Content script — roda em todas as páginas do SEI.
 *
 * Detecta NUPs no DOM, injeta um badge "Rota" ao lado do texto (Shadow
 * DOM fechado, sem tocar no DOM oficial), consulta o backend para saber
 * se o processo já existe e cria o registro sob demanda. Ao clicar,
 * abre o detalhe no dashboard embutido em uma nova aba.
 *
 * Estratégia de resiliência: se qualquer coisa quebrar (consulta falha,
 * usuário deslogado, backend fora do ar), o badge silenciosamente
 * degrada para o rótulo genérico "Rota" — nunca quebramos a página.
 */

import { extractNups } from '@rota/shared/nup';
import { supabase } from '../lib/supabase.ts';

const BADGE_TAG = 'rota-badge';
const MARKER_ATTR = 'data-rota-marked';

type BadgeState =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'known'; status: string; assignee?: string | null }
  | { kind: 'anonymous' };

class RotaBadge extends HTMLElement {
  static observedAttributes = ['nup', 'state', 'label', 'tone'];

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host { display: inline-flex; margin-left: 6px; vertical-align: middle; }
        button {
          all: unset;
          cursor: pointer;
          font: 500 11px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid transparent;
          letter-spacing: 0.02em;
        }
        button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 1px; }
        .tone-neutral  { background: #1e293b; color: #f8fafc; border-color: #334155; }
        .tone-accent   { background: #1e40af; color: #f8fafc; border-color: #1e3a8a; }
        .tone-warn     { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .tone-muted    { background: #e2e8f0; color: #475569; border-color: #cbd5e1; }
        .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; background: currentColor; opacity: 0.7; }
      </style>
      <button type="button">
        <span class="dot"></span>
        <span class="label"></span>
      </button>
    `;
    const btn = shadow.querySelector('button');
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nup = this.getAttribute('nup') ?? '';
      this.dispatchEvent(new CustomEvent('rota:click', { detail: { nup }, bubbles: true }));
    });
    this.render(shadow);
  }

  attributeChangedCallback() {
    const shadow = this.shadowRoot as ShadowRoot | null;
    if (shadow) this.render(shadow);
  }

  private render(shadow: ShadowRoot) {
    const btn = shadow.querySelector('button');
    const label = shadow.querySelector('.label');
    if (!btn || !label) return;
    const tone = this.getAttribute('tone') ?? 'neutral';
    btn.className = `tone-${tone}`;
    label.textContent = this.getAttribute('label') ?? 'Rota';
    btn.setAttribute('title', `Rota · ${this.getAttribute('nup') ?? ''}`);
  }
}

if (!customElements.get(BADGE_TAG)) {
  customElements.define(BADGE_TAG, RotaBadge);
}

/** Renderiza o estado no badge. */
function paint(el: HTMLElement, state: BadgeState) {
  if (state.kind === 'loading') {
    el.setAttribute('label', '…');
    el.setAttribute('tone', 'muted');
    return;
  }
  if (state.kind === 'anonymous') {
    el.setAttribute('label', 'Entrar no Rota');
    el.setAttribute('tone', 'neutral');
    return;
  }
  if (state.kind === 'unknown') {
    el.setAttribute('label', '+ Trazer para o Rota');
    el.setAttribute('tone', 'warn');
    return;
  }
  const status = state.status ?? '';
  const who = state.assignee ? `· ${state.assignee}` : '';
  el.setAttribute('label', `${status} ${who}`.trim());
  el.setAttribute('tone', 'accent');
}

const STATUS_SHORT: Record<string, string> = {
  received: 'Recebido',
  in_analysis: 'Em análise',
  awaiting_external: 'Aguardando externo',
  in_review: 'Revisão',
  done: 'Concluído',
  archived: 'Arquivado',
};

/**
 * Cache por página para não repetir consulta por NUP.
 * Vive só pela vida do content script.
 */
const cache = new Map<string, BadgeState>();

async function resolve(nup: string): Promise<BadgeState> {
  const cached = cache.get(nup);
  if (cached) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const s: BadgeState = { kind: 'anonymous' };
    cache.set(nup, s);
    return s;
  }

  const { data: proc, error } = await supabase
    .from('processes')
    .select('id, status')
    .eq('nup', nup)
    .maybeSingle();
  if (error) {
    return { kind: 'unknown' };
  }
  if (!proc) {
    const s: BadgeState = { kind: 'unknown' };
    cache.set(nup, s);
    return s;
  }
  const { data: assignment } = await supabase
    .from('assignments')
    .select('assignee_id, profiles:profiles!assignments_assignee_id_fkey(username, full_name)')
    .eq('process_id', proc.id)
    .eq('is_current', true)
    .maybeSingle();
  const shortName =
    (assignment as { profiles?: { full_name?: string } } | null)?.profiles?.full_name?.split(
      ' ',
    )[0] ?? null;
  const s: BadgeState = {
    kind: 'known',
    status: STATUS_SHORT[proc.status] ?? proc.status,
    assignee: shortName,
  };
  cache.set(nup, s);
  return s;
}

function attachBadge(anchor: Node, nup: string) {
  const parent = anchor.parentNode;
  if (!parent) return;
  const el = document.createElement(BADGE_TAG) as HTMLElement;
  el.setAttribute('nup', nup);
  el.setAttribute(MARKER_ATTR, '1');
  paint(el, { kind: 'loading' });
  parent.insertBefore(el, anchor.nextSibling);
  resolve(nup)
    .then((s) => paint(el, s))
    .catch(() => paint(el, { kind: 'unknown' }));
  el.addEventListener('rota:click', async (e) => {
    const detail = (e as CustomEvent).detail as { nup?: string };
    const targetNup = detail?.nup ?? nup;
    const state = cache.get(targetNup);
    if (state?.kind === 'anonymous') {
      chrome.runtime.sendMessage({ type: 'rota:open-dashboard', path: '/login' });
      return;
    }
    if (state?.kind === 'unknown') {
      const { data: sessionData } = await supabase.auth.getSession();
      const me = sessionData.session?.user.id;
      if (!me) {
        chrome.runtime.sendMessage({ type: 'rota:open-dashboard', path: '/login' });
        return;
      }
      const { data: created, error } = await supabase
        .from('processes')
        .insert({ nup: targetNup, created_by: me })
        .select('id')
        .single();
      if (error || !created) {
        paint(el, { kind: 'unknown' });
        return;
      }
      await supabase.rpc('transfer_assignment', {
        _process_id: created.id,
        _to_user_id: me,
        _handoff_context: '',
      });
      cache.delete(targetNup);
      const next = await resolve(targetNup);
      paint(el, next);
      chrome.runtime.sendMessage({ type: 'rota:open-dashboard', path: `/p/${created.id}` });
      return;
    }
    // known: abre o detalhe
    const { data: proc } = await supabase
      .from('processes')
      .select('id')
      .eq('nup', targetNup)
      .maybeSingle();
    if (proc?.id) {
      chrome.runtime.sendMessage({ type: 'rota:open-dashboard', path: `/p/${proc.id}` });
    }
  });
}

function markText(node: Text): void {
  const value = node.nodeValue;
  if (!value) return;
  const nups = extractNups(value);
  if (nups.length === 0) return;
  const parent = node.parentNode as Element | null;
  if (!parent || parent.closest(BADGE_TAG)) return;
  attachBadge(node, nups[0] as string);
}

function scan(root: ParentNode): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || node.nodeValue.length < 17) return NodeFilter.FILTER_SKIP;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_SKIP;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest(BADGE_TAG)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const batch: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    batch.push(n as Text);
    n = walker.nextNode();
  }
  for (const t of batch) markText(t);
}

scan(document.body);

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const added of m.addedNodes) {
      if (added.nodeType === Node.ELEMENT_NODE) scan(added as Element);
      else if (added.nodeType === Node.TEXT_NODE) markText(added as Text);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'rota:open-drawer') {
    // Fase 1.5: abrir um drawer sobre a página. Por enquanto abre o
    // dashboard embutido — mesmo destino, mais fluído no piloto.
    chrome.runtime.sendMessage({ type: 'rota:open-dashboard', path: '/' });
  }
});
