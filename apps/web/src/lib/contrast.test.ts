import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Rgb, contrastRatio, parseColor, readTokens } from './contrast.ts';

/**
 * Trava de acessibilidade da paleta. Lê o styles.css de verdade, então
 * mudar um token e quebrar o contraste reprova aqui, não em produção.
 *
 * Limiares WCAG 2.1 AA: 4.5:1 para texto (as pills têm 11px, então não
 * se qualificam como "texto grande"), 3:1 para componente gráfico —
 * a bolinha de prioridade não tem texto, só precisa ser distinguível.
 */

const css = readFileSync(fileURLToPath(new URL('../styles.css', import.meta.url)), 'utf8');

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const light = readTokens(css.slice(css.indexOf(':root'), darkStart));
const dark = readTokens(css.slice(darkStart, css.indexOf('\n}\n\n', darkStart)));

const MODES: [string, Record<string, string>][] = [
  ['claro', light],
  ['escuro', dark],
];
const SEMANTIC = ['ok', 'warn', 'danger', 'info', 'accent'] as const;

function color(tokens: Record<string, string>, name: string, base?: Rgb): Rgb {
  const raw = tokens[name];
  if (!raw) throw new Error(`token ausente: --${name}`);
  const rgb = parseColor(raw, base);
  if (!rgb) throw new Error(`token não parseável: --${name} = ${raw}`);
  return rgb;
}

describe('paleta — contraste WCAG AA', () => {
  it.each(MODES)('pills legíveis no modo %s', (_mode, tokens) => {
    const surface = color(tokens, 'color-bg-elevated');
    for (const name of SEMANTIC) {
      const bg = color(tokens, `color-${name}-soft`, surface);
      const fg = color(tokens, `color-${name}`);
      expect(contrastRatio(fg, bg), `pill--${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(MODES)('texto sobre fundo sólido no modo %s', (_mode, tokens) => {
    for (const name of ['danger', 'accent'] as const) {
      const fg = color(tokens, `color-${name}-fg`);
      const bg = color(tokens, `color-${name}`);
      expect(contrastRatio(fg, bg), `--color-${name}-fg`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(MODES)('token como texto na página no modo %s', (_mode, tokens) => {
    const page = color(tokens, 'color-bg');
    for (const name of ['warn', 'danger', 'info'] as const) {
      expect(contrastRatio(color(tokens, `color-${name}`), page), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(MODES)('bolinha de prioridade distinguível no modo %s', (_mode, tokens) => {
    const card = color(tokens, 'color-bg-elevated');
    for (const name of ['info', 'warn', 'danger'] as const) {
      expect(contrastRatio(color(tokens, `color-${name}`), card), name).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(MODES)('texto principal e secundário no modo %s', (_mode, tokens) => {
    const card = color(tokens, 'color-bg-elevated');
    expect(contrastRatio(color(tokens, 'color-fg'), card)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color(tokens, 'color-fg-muted'), card)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('parseColor', () => {
  it('compõe rgba sobre a superfície, que é o caso dos -soft no escuro', () => {
    // 50% de branco sobre preto tem de cair no meio.
    expect(parseColor('rgba(255, 255, 255, 0.5)', [0, 0, 0])).toEqual([128, 128, 128]);
  });

  it('lê hexadecimal e devolve null para o que não reconhece', () => {
    expect(parseColor('#1e293b')).toEqual([30, 41, 59]);
    expect(parseColor('salmon')).toBeNull();
  });

  it('mede os extremos corretamente', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 1);
    expect(contrastRatio([120, 120, 120], [120, 120, 120])).toBeCloseTo(1, 5);
  });
});
