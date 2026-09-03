/**
 * Service worker do Rota.
 *
 * MV3 mata o worker quando ocioso, então tudo aqui é reativo — nenhum
 * timer longo, nenhum estado em memória. Estado durável mora em
 * chrome.storage.local (preferências) ou no Supabase.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // TODO(fase-1): abrir a tela de boas-vindas do dashboard.
    console.info('[Rota] instalado.');
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-drawer' && tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'rota:open-drawer' });
  }
});

// Ponte content-script ↔ dashboard: por enquanto só um echo para provar
// que o canal existe. Fluxos reais chegam na Fase 1.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'rota:ping') {
    sendResponse({ type: 'rota:pong', at: Date.now() });
    return true;
  }
  return false;
});
