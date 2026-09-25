import { ciede2000, type Lab } from './deltaE';
import { hexToLab, normalizeHex } from './convert';

export interface Match<T> {
  item: T;
  deltaE: number;
}

export interface LabIndex<T> {
  size: number;
  nearest(hex: string): Match<T> | null;
}

/**
 * Precomputes L*a*b* (D65) for every entry, then finds the entry nearest to a
 * colour by CIEDE2000. Entries with an invalid hex are skipped.
 */
export function createLabIndex<T extends { hex: string }>(entries: readonly T[]): LabIndex<T> {
  const items: T[] = [];
  const labs: number[] = [];
  for (const e of entries) {
    const hex = normalizeHex(e.hex);
    if (!hex) continue;
    const lab = hexToLab(hex);
    items.push(e);
    labs.push(lab.l, lab.a, lab.b);
  }
  const store = Float64Array.from(labs);

  return {
    size: items.length,
    nearest(hex) {
      if (items.length === 0) return null;
      const target = hexToLab(hex);
      const candidate: Lab = { l: 0, a: 0, b: 0 };
      let best = 0;
      let bestDe = Infinity;
      for (let i = 0; i < items.length; i++) {
        candidate.l = store[i * 3];
        candidate.a = store[i * 3 + 1];
        candidate.b = store[i * 3 + 2];
        const de = ciede2000(target, candidate);
        if (de < bestDe) {
          bestDe = de;
          best = i;
          if (de === 0) break;
        }
      }
      return { item: items[best], deltaE: bestDe };
    },
  };
}
