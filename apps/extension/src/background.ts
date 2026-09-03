/**
 * Service worker do Rota.
 *
 * MV3 mata o worker quando ocioso. Tudo aqui é reativo — sem timers
 * longos nem estado em memória. Estado durável mora em chrome.storage
 * ou no Supabase.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-drawer' && tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'rota:open-drawer' });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'rota:open-dashboard') {
    const path = (message.path as string | undefined) ?? '/';
    // O React Router usa hash-less BrowserRouter — mas dentro da extensão
    // não temos servidor. Passamos o alvo via hash e o dashboard resolve.
    const url = chrome.runtime.getURL(`src/dashboard/index.html#route=${encodeURIComponent(path)}`);
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'rota:ping') {
    sendResponse({ type: 'rota:pong', at: Date.now() });
    return true;
  }
  return false;
});
