/**
 * Branding parametrizado num único lugar. Trocar o nome do produto
 * (Rota → Trilha → Farol) é uma mudança de constante, não uma refatoração.
 */
export const APP_NAME = 'Rota' as const;
export const APP_TAGLINE = 'Gestão de processos SEI' as const;

/** Atalho de abertura do drawer dentro do SEI. */
export const SHORTCUT_OPEN_DRAWER = 'Alt+R' as const;

/** Janela em que o autor pode editar seu próprio comentário. */
export const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;

/** Contexto de passagem de bastão: mínimo obrigatório em caracteres. */
export const HANDOFF_MIN_CHARS = 20;

/** Emoji set fechado para reações. */
export const REACTION_EMOJIS = ['👍', '✅', '👀', '❓'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
