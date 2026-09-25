import { hexToHsl, hslToHex, mixHex, normalizeHex } from './convert';

export type HarmonyKind = 'complementary' | 'analogous' | 'triadic' | 'splitComplementary' | 'tetradic';

/** Hue offsets in degrees, applied in HSL. The base colour is always offset 0. */
export const HARMONY_OFFSETS: Record<HarmonyKind, number[]> = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  splitComplementary: [0, 150, 210],
  // Rectangle tetrad: two complementary pairs 60° apart.
  tetradic: [0, 60, 180, 240],
};

export const HARMONY_LABELS: Record<HarmonyKind, string> = {
  complementary: 'Complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
  splitComplementary: 'Split complementary',
  tetradic: 'Tetradic',
};

export function rotateHue(hex: string, degrees: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex([h + degrees, s, l]);
}

export function harmony(hex: string, kind: HarmonyKind): string[] {
  const base = normalizeHex(hex)!;
  return HARMONY_OFFSETS[kind].map((d) => (d === 0 ? base : rotateHue(base, d)));
}

/** `steps` evenly spaced mixes toward white, lightest last. Excludes the colour and white. */
export function tints(hex: string, steps = 5): string[] {
  return Array.from({ length: steps }, (_, i) => mixHex(hex, '#FFFFFF', (i + 1) / (steps + 1)));
}

/** `steps` evenly spaced mixes toward black, darkest last. Excludes the colour and black. */
export function shades(hex: string, steps = 5): string[] {
  return Array.from({ length: steps }, (_, i) => mixHex(hex, '#000000', (i + 1) / (steps + 1)));
}
