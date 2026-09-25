import { normalizeHex } from './convert';
import { createLabIndex } from './nearest';

export interface PantoneEntry {
  code: string;
  hex: string;
}

export interface PantoneMatch extends PantoneEntry {
  /** CIEDE2000 distance between the input colour and this Pantone's sRGB value. */
  deltaE: number;
  /** Always true: Pantone inks can't be reproduced exactly in sRGB. */
  approximate: true;
}

/**
 * Canonical form for comparing codes: uppercase, no "PANTONE" prefix, single
 * spaces, and a space before a trailing C/U/M suffix ("320c" → "320 C").
 */
export function normalizePantoneCode(input: string): string {
  return input
    .trim()
    .replace(/^pantone\s*/i, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .replace(/^(.+?)\s*([CUM])$/, (_, body: string, suffix: string) => `${body} ${suffix}`);
}

export interface PantoneIndex {
  size: number;
  /** Exact lookup by code. A bare number such as "320" also finds "320 C". */
  find(code: string): PantoneEntry | null;
  /** Nearest Pantone by CIEDE2000 in L*a*b* (D65). */
  nearest(hex: string): PantoneMatch | null;
}

export function createPantoneIndex(entries: readonly PantoneEntry[]): PantoneIndex {
  const valid = entries.filter((e) => normalizeHex(e.hex));
  const byCode = new Map<string, PantoneEntry>();
  for (const e of valid) byCode.set(normalizePantoneCode(e.code), e);
  const labIndex = createLabIndex(valid);

  return {
    size: valid.length,
    find(code) {
      const raw = code.trim();
      if (!raw) return null;
      // Try the input as typed first so a code ending in a letter (for
      // example a hypothetical "BLACK M") isn't mangled by the suffix rule.
      const plain = raw.replace(/^pantone\s*/i, '').replace(/\s+/g, ' ').toUpperCase();
      const exact = byCode.get(plain) ?? byCode.get(normalizePantoneCode(raw));
      if (exact) return exact;
      // Only bare numbers get an implied coated suffix, so "purple" stays the
      // CSS colour rather than turning into Pantone Purple C.
      return /^\d+$/.test(plain) ? (byCode.get(`${plain} C`) ?? null) : null;
    },
    nearest(hex) {
      const m = labIndex.nearest(hex);
      if (!m) return null;
      return { code: m.item.code, hex: normalizeHex(m.item.hex)!, deltaE: m.deltaE, approximate: true };
    },
  };
}
