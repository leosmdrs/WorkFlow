/**
 * Content script — roda em todas as páginas do SEI.
 *
 * Responsabilidades da Fase 0 (aqui): identificar NUPs na página e injetar
 * um marcador *ao lado* deles, sem tocar no DOM oficial do SEI. Se o SEI
 * mudar o HTML, o pior cenário é o marcador sumir.
 *
 * A conexão com Supabase, o card com responsável/prazo e o drawer lateral
 * ficam para a Fase 1 — mas a arquitetura já é a definitiva: MutationObserver
 * + web components isolados via Shadow DOM.
 */

import { extractNups, normalizeNup } from '@rota/shared/nup';

const MARKER_TAG = 'rota-badge';
const MARKER_ATTR = 'data-rota-marked';

class RotaBadge extends HTMLElement {
  connectedCallback() {
    const nup = this.getAttribute('nup') ?? '?';
    const shadow = this.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host { display: inline-flex; margin-left: 6px; vertical-align: middle; }
        .pill {
          font: 500 11px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #f8fafc; background: #1e293b; border-radius: 999px;
          padding: 3px 8px; cursor: pointer; letter-spacing: 0.02em;
          border: 1px solid #334155;
        }
        .pill:hover { background: #334155; }
      </style>
      <button class="pill" title="Abrir no Rota (${nup})">Rota</button>
    `;
    shadow.querySelector('.pill')?.addEventListener('click', () => {
      // TODO(fase-1): abrir o drawer com o processo.
      window.dispatchEvent(new CustomEvent('rota:open', { detail: { nup } }));
    });
  }
}

if (!customElements.get(MARKER_TAG)) {
  customElements.define(MARKER_TAG, RotaBadge);
}

/**
 * Anota texto com badges do Rota ao lado de cada NUP encontrado.
 * Nunca reescreve o texto oficial — só insere um irmão.
 */
function markText(node: Text): void {
  const value = node.nodeValue;
  if (!value) return;
  const nups = extractNups(value);
  if (nups.length === 0) return;

  const parent = node.parentNode;
  if (!parent || (parent as Element).closest?.(MARKER_TAG)) return;

  // Estratégia simples de v0: um badge no final do nó, referenciando o
  // primeiro NUP encontrado. Fica bom em >90% dos usos reais (páginas de
  // andamento e detalhamento). Refinamento por posição exata vem depois.
  const first = normalizeNup(nups[0] ?? '')?.formatted;
  if (!first) return;

  const badge = document.createElement(MARKER_TAG);
  badge.setAttribute('nup', first);
  badge.setAttribute(MARKER_ATTR, '1');
  parent.insertBefore(badge, node.nextSibling);
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
      if (parent.closest(MARKER_TAG)) return NodeFilter.FILTER_REJECT;
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

// Primeira varredura + observação incremental.
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

// Atalho de teclado + comando via background.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'rota:open-drawer') {
    // TODO(fase-1): abrir drawer no NUP da URL/página atual.
    console.info('[Rota] open-drawer solicitado.');
  }
});
