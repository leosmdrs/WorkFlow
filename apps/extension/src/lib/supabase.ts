import type { Database } from '@rota/db-types';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase da extensão. Guardamos a sessão em chrome.storage.local
 * em vez de localStorage, porque a extensão precisa ver a mesma sessão em
 * content script, popup, dashboard e background worker.
 *
 * As envs entram no bundle via Vite (VITE_SUPABASE_*). O .env.local é
 * o mesmo do web app — na dev, os dois apontam para o Supabase local.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const chromeStorage = {
  getItem: (key: string) =>
    new Promise<string | null>((resolve) => {
      chrome.storage.local.get(key, (r) => resolve((r?.[key] as string | undefined) ?? null));
    }),
  setItem: (key: string, value: string) =>
    new Promise<void>((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    }),
  removeItem: (key: string) =>
    new Promise<void>((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    }),
};

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: chromeStorage as unknown as Storage,
  },
});
