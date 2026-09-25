import { converter, formatHex, parse } from 'culori';
import type { Lab } from './deltaE';

export type Rgb = [r: number, g: number, b: number];
export type Hsl = [h: number, s: number, l: number];
export type Cmyk = [c: number, m: number, y: number, k: number];

const toRgb = converter('rgb');
const toHsl = converter('hsl');
const toLab65 = converter('lab65');

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, digits = 0) => {
  const f = 10 ** digits;
  // Adding 0 turns -0 into 0 so it never prints as "-0".
  return Math.round(v * f) / f + 0;
};

/** Normalise "#abc", "abc" or "#aabbcc" to "#AABBCC". Returns null when invalid. */
export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return `#${h.toUpperCase()}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex);
  if (!h) throw new Error(`Invalid hex colour: ${hex}`);
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Naive (uncalibrated, no ICC profile) RGB to CMYK. Values are 0–100. */
export function rgbToCmyk([r, g, b]: Rgb): Cmyk {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const k = 1 - Math.max(rf, gf, bf);
  if (k >= 1) return [0, 0, 0, 100];
  const d = 1 - k;
  return [((1 - rf - k) / d) * 100, ((1 - gf - k) / d) * 100, ((1 - bf - k) / d) * 100, k * 100];
}

export function cmykToRgb([c, m, y, k]: Cmyk): Rgb {
  const kf = 1 - clamp(k, 0, 100) / 100;
  const ch = (v: number) => Math.round(255 * (1 - clamp(v, 0, 100) / 100) * kf);
  return [ch(c), ch(m), ch(y)];
}

/** HSL with h in degrees (0–360), s and l in 0–100. Greys get hue 0. */
export function hexToHsl(hex: string): Hsl {
  const c = toHsl(hex)!;
  return [c.h ?? 0, (c.s ?? 0) * 100, (c.l ?? 0) * 100];
}

export function hslToHex([h, s, l]: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  return formatHex({ mode: 'hsl', h: hue, s: clamp(s, 0, 100) / 100, l: clamp(l, 0, 100) / 100 }).toUpperCase();
}

/** CIE L*a*b* under the D65 white point. */
export function hexToLab(hex: string): Lab {
  const c = toLab65(hex)!;
  return { l: c.l, a: c.a, b: c.b };
}

/** Parse any CSS colour string with culori and return "#RRGGBB" (gamut-clipped), or null. */
export function cssToHex(input: string): string | null {
  const c = parse(input);
  if (!c) return null;
  const rgb = toRgb(c);
  return rgbToHex([rgb.r * 255, rgb.g * 255, rgb.b * 255]);
}

/** Mix two colours in sRGB. t = 0 gives `a`, t = 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export interface ColorValues {
  hex: string;
  rgb: Rgb;
  hsl: Hsl;
  cmyk: Cmyk;
  lab: [l: number, a: number, b: number];
}

/** All display values for a colour, rounded for presentation. */
export function describe(hex: string): ColorValues {
  const h = normalizeHex(hex);
  if (!h) throw new Error(`Invalid hex colour: ${hex}`);
  const rgb = hexToRgb(h);
  const [hh, s, l] = hexToHsl(h);
  const cmyk = rgbToCmyk(rgb);
  const lab = hexToLab(h);
  return {
    hex: h,
    rgb,
    hsl: [round(hh) % 360, round(s), round(l)],
    cmyk: [round(cmyk[0]), round(cmyk[1]), round(cmyk[2]), round(cmyk[3])],
    lab: [round(lab.l, 2), round(lab.a, 2), round(lab.b, 2)],
  };
}

export const format = {
  rgb: ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`,
  hsl: ([h, s, l]: Hsl) => `hsl(${h}, ${s}%, ${l}%)`,
  cmyk: ([c, m, y, k]: Cmyk) => `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`,
  lab: ([l, a, b]: [number, number, number]) => `lab(${l} ${a} ${b})`,
};

/**
 * Every value as one "LABEL: value" line each, for copying to the clipboard.
 * The Pantone line is only added when a match is given.
 */
export function formatValueList(
  v: ColorValues,
  pantone?: { code: string; deltaE: number } | null,
  name?: string | null,
): string {
  const lines = [
    ...(name ? [`Name: ${name}`] : []),
    `HEX: ${v.hex}`,
    `RGB: ${format.rgb(v.rgb)}`,
    `HSL: ${format.hsl(v.hsl)}`,
    `CMYK: ${format.cmyk(v.cmyk)}`,
    `LAB: ${format.lab(v.lab)}`,
  ];
  if (pantone) lines.push(`Pantone: PANTONE ${pantone.code} (approximate, ΔE ${pantone.deltaE.toFixed(1)})`);
  return lines.join('\n');
}
