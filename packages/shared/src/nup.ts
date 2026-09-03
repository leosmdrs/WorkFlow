/**
 * NUP — Número Único de Protocolo.
 *
 * Formato oficial (Decreto nº 8.539/2015 e Portaria Interministerial nº 11):
 *   NNNNN.NNNNNN/AAAA-DD
 *   ^^^^^ .^^^^^^ /^^^^ -^^
 *     |       |     |    └── dígitos verificadores (2)
 *     |       |     └────── ano (4)
 *     |       └──────────── sequencial (6)
 *     └──────────────────── código da unidade protocoladora (5)
 *
 * Este módulo faz três coisas:
 *   1. reconhecer NUPs em texto arbitrário (para o content script do SEI);
 *   2. normalizar variações de escrita (com/sem separadores, com espaços);
 *   3. validar a estrutura básica — a validação dos DVs em si é opcional
 *      e desligada por padrão porque a fórmula depende do módulo 11 e
 *      há divergências históricas entre unidades; para o MVP, aceitar
 *      o formato é suficiente e o SEI é a fonte da verdade.
 */

/** Regex canônica do NUP formatado. */
export const NUP_PATTERN = /^\d{5}\.\d{6}\/\d{4}-\d{2}$/;

/**
 * Regex "solta" para achar NUPs dentro de HTML/texto do SEI.
 * Aceita separadores opcionais e converte no `normalizeNup`.
 * Global + sem lookbehind (Safari-safe).
 */
export const NUP_LOOSE_PATTERN =
  /\b(\d{5})[.\s]?(\d{6})[/\s]?(\d{4})[-\s]?(\d{2})\b/g;

export interface Nup {
  /** Formato canônico: NNNNN.NNNNNN/AAAA-DD */
  formatted: string;
  /** Só os 17 dígitos, útil para índice/URL. */
  digits: string;
  unit: string;
  sequence: string;
  year: string;
  check: string;
}

/**
 * Converte qualquer variação para o formato canônico e devolve as partes.
 * Retorna `null` se não parecer um NUP.
 */
export function normalizeNup(input: string): Nup | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 17) return null;
  const unit = digits.slice(0, 5);
  const sequence = digits.slice(5, 11);
  const year = digits.slice(11, 15);
  const check = digits.slice(15, 17);
  const yearNum = Number(year);
  if (yearNum < 1900 || yearNum > 2999) return null;
  return {
    formatted: `${unit}.${sequence}/${year}-${check}`,
    digits,
    unit,
    sequence,
    year,
    check,
  };
}

/** Simples e rápido — para input já formatado (ex.: campo de busca). */
export function isValidNup(input: string): boolean {
  return NUP_PATTERN.test(input);
}

/**
 * Extrai todos os NUPs (canônicos, únicos) de um bloco de texto.
 * Preserva ordem de primeira aparição.
 */
export function extractNups(source: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of source.matchAll(NUP_LOOSE_PATTERN)) {
    const normalized = normalizeNup(match[0]);
    if (normalized && !seen.has(normalized.formatted)) {
      seen.add(normalized.formatted);
      out.push(normalized.formatted);
    }
  }
  return out;
}
