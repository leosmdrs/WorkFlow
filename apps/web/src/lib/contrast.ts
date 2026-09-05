/**
 * Cálculo de contraste WCAG 2.1. Existe para o teste de paleta poder
 * medir, em vez de alguém julgar a olho — foi exatamente o olho que
 * errou aqui: a suspeita era do modo escuro e o problema estava no
 * claro, com o rótulo de prazo a 2.64:1.
 */

export type Rgb = readonly [number, number, number];

/**
 * Aceita `#rrggbb` e `rgba(r, g, b, a)`. O rgba é composto sobre
 * `base`, porque os tokens `-soft` do modo escuro são translúcidos e
 * o contraste real depende da superfície debaixo.
 */
export function parseColor(input: string, base: Rgb = [255, 255, 255]): Rgb | null {
  const s = input.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(s);
  const h = hex?.[1];
  if (h) {
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgba = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)$/i.exec(s);
  if (rgba?.[1] && rgba[2] && rgba[3]) {
    const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
    const ch = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])] as const;
    return [
      Math.round(a * ch[0] + (1 - a) * base[0]),
      Math.round(a * ch[1] + (1 - a) * base[1]),
      Math.round(a * ch[2] + (1 - a) * base[2]),
    ];
  }
  return null;
}

/** Luminância relativa, WCAG 2.1 §relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Razão de contraste, de 1:1 a 21:1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Extrai os custom properties de um bloco CSS. */
export function readTokens(cssBlock: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of cssBlock.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    const [, name, value] = m;
    if (name && value) out[name] = value.trim();
  }
  return out;
}
