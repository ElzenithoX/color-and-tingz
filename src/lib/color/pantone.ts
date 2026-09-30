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
  /**
   * Codes matching what the user has typed so far, best first: exact code,
   * then codes starting with it, then codes with a word starting with it
   * ("blue" → "Reflex Blue C"), then codes containing it. Spaces and a
   * "Pantone" prefix are ignored, so "320c" finds "320 C".
   */
  search(query: string, limit?: number): PantoneEntry[];
}

const squash = (s: string) => s.replace(/^\s*pantone\s*/i, '').replace(/\s+/g, '').toUpperCase();

export function createPantoneIndex(entries: readonly PantoneEntry[]): PantoneIndex {
  const valid = entries.filter((e) => normalizeHex(e.hex));
  const byCode = new Map<string, PantoneEntry>();
  for (const e of valid) byCode.set(normalizePantoneCode(e.code), e);
  const labIndex = createLabIndex(valid);
  const searchable = valid.map((e, order) => ({
    entry: e,
    order,
    squashed: squash(e.code),
    words: e.code.toUpperCase().split(/\s+/),
  }));

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
    search(query, limit = 8) {
      const q = squash(query);
      if (!q) return [];
      const word = query.replace(/^\s*pantone\s*/i, '').trim().toUpperCase();
      const ranked: { rank: number; order: number; entry: PantoneEntry }[] = [];
      for (const s of searchable) {
        let rank = -1;
        if (s.squashed === q) rank = 0;
        else if (s.squashed.startsWith(q)) rank = 1;
        else if (word && s.words.some((w) => w.startsWith(word))) rank = 2;
        else if (s.squashed.includes(q)) rank = 3;
        if (rank >= 0) ranked.push({ rank, order: s.order, entry: s.entry });
      }
      ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);
      return ranked.slice(0, limit).map((r) => r.entry);
    },
  };
}
