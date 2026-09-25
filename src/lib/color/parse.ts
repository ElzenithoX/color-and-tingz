import { cmykToRgb, cssToHex, hslToHex, normalizeHex, rgbToHex } from './convert';
import type { PantoneEntry } from './pantone';

export type InputFormat = 'hex' | 'rgb' | 'hsl' | 'cmyk' | 'pantone' | 'css';

export interface ParsedColor {
  hex: string;
  format: InputFormat;
  /** Set when the input was a Pantone code. */
  pantone?: PantoneEntry;
}

export type PantoneLookup = (code: string) => PantoneEntry | null;

interface Token {
  value: number;
  unit: string;
}

const NUMBER_TOKEN = /^([-+]?(?:\d+\.?\d*|\.\d+))(%|deg)?$/i;

function tokenize(body: string): Token[] | null {
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  const out: Token[] = [];
  for (const p of parts) {
    const m = NUMBER_TOKEN.exec(p);
    if (!m) return null;
    out.push({ value: parseFloat(m[1]), unit: (m[2] ?? '').toLowerCase() });
  }
  return out;
}

const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

/**
 * Unitless CMYK values are percentages unless `unitlessIsFraction` is set (CSS
 * device-cmyk() uses 0–1). "0.96, 0.05, 0, 0.38" is also read as fractions.
 */
function fromCmykTokens(t: Token[], unitlessIsFraction = false): string | null {
  if (t.length !== 4) return null;
  const allUnitlessFractions = t.every((x) => !x.unit && inRange(x.value, 0, 1));
  const looksFractional = allUnitlessFractions && t.some((x) => x.value > 0 && x.value < 1);
  const v = t.map((x) => (!x.unit && (unitlessIsFraction || looksFractional) ? x.value * 100 : x.value));
  if (!v.every((x) => inRange(x, 0, 100))) return null;
  return rgbToHex(cmykToRgb([v[0], v[1], v[2], v[3]]));
}

function fromTripleTokens(t: Token[]): { hex: string; format: 'rgb' | 'hsl' } | null {
  if (t.length !== 3) return null;
  const isHsl = t[0].unit === 'deg' || t[1].unit === '%' || t[2].unit === '%';
  if (isHsl) {
    const [h, s, l] = t.map((x) => x.value);
    if (!inRange(s, 0, 100) || !inRange(l, 0, 100)) return null;
    return { hex: hslToHex([h, s, l]), format: 'hsl' };
  }
  if (t.some((x) => x.unit || !inRange(x.value, 0, 255))) return null;
  return { hex: rgbToHex([t[0].value, t[1].value, t[2].value]), format: 'rgb' };
}

/**
 * Detects the format of a colour typed by the user and returns its hex value.
 *
 * Accepts HEX (#07959D, 07959D, #079), RGB (7,149,157 or rgb(...)), HSL
 * (184, 91%, 32% or hsl(...)), CMYK (96,5,0,38 or cmyk(...)), a Pantone code
 * ("320 C", "Pantone 320C", or a bare "320" when "320 C" exists) and, as a
 * fallback, any CSS colour culori understands (names, lab(), oklch()...).
 */
export function parseColorInput(input: string, findPantone?: PantoneLookup): ParsedColor | null {
  const raw = input.trim();
  if (!raw) return null;

  // Pantone first: "320" would otherwise be read as the hex #332200.
  // A leading "#", a comma or a bracket means it can't be a Pantone code.
  if (findPantone && !/[#,()]/.test(raw)) {
    const p = findPantone(raw);
    if (p) {
      const hex = normalizeHex(p.hex);
      if (hex) return { hex, format: 'pantone', pantone: p };
    }
  }

  const hex = normalizeHex(raw);
  if (hex) return { hex, format: 'hex' };

  const fn = /^([a-z-]+)\s*\((.*)\)$/i.exec(raw);
  if (fn) {
    const name = fn[1].toLowerCase();
    if (name === 'cmyk' || name === 'device-cmyk') {
      const t = tokenize(fn[2]);
      const h = t && fromCmykTokens(t, name === 'device-cmyk');
      return h ? { hex: h, format: 'cmyk' } : null;
    }
    const css = cssToHex(raw);
    if (!css) return null;
    if (name === 'rgb' || name === 'rgba') return { hex: css, format: 'rgb' };
    if (name === 'hsl' || name === 'hsla') return { hex: css, format: 'hsl' };
    return { hex: css, format: 'css' };
  }

  const tokens = tokenize(raw);
  if (tokens) {
    if (tokens.length === 4) {
      const h = fromCmykTokens(tokens);
      return h ? { hex: h, format: 'cmyk' } : null;
    }
    if (tokens.length === 3) return fromTripleTokens(tokens);
    return null;
  }

  const css = cssToHex(raw);
  return css ? { hex: css, format: 'css' } : null;
}
