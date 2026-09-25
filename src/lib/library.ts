import { normalizeHex } from './color/convert';

export type PaletteSource = 'image' | 'gradient' | 'harmony' | 'manual';

export interface SavedColor {
  id: string;
  hex: string;
  name: string;
  createdAt: string;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
  source: PaletteSource;
  createdAt: string;
}

/** Everything the user has saved. Stored as saved.json in the app data folder. */
export interface Library {
  version: 1;
  colors: SavedColor[];
  palettes: SavedPalette[];
}

export const emptyLibrary = (): Library => ({ version: 1, colors: [], palettes: [] });

const SOURCES: PaletteSource[] = ['image', 'gradient', 'harmony', 'manual'];
const MAX_NAME = 80;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const cleanName = (v: unknown, fallback: string) => {
  const s = typeof v === 'string' ? v.trim().slice(0, MAX_NAME) : '';
  return s || fallback;
};
const cleanDate = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date(0).toISOString());

let counter = 0;
export function newId(): string {
  counter = (counter + 1) % 1e6;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Turns whatever was read from disk into a valid Library, dropping entries
 * that are malformed (bad hex, empty palettes) instead of failing entirely.
 */
export function normalizeLibrary(raw: unknown): Library {
  const lib = emptyLibrary();
  if (!isRecord(raw)) return lib;
  const ids = new Set<string>();
  const id = (v: unknown) => {
    let s = typeof v === 'string' && v ? v : newId();
    if (ids.has(s)) s = newId();
    ids.add(s);
    return s;
  };

  if (Array.isArray(raw.colors)) {
    const seen = new Set<string>();
    for (const c of raw.colors) {
      if (!isRecord(c) || typeof c.hex !== 'string') continue;
      const hex = normalizeHex(c.hex);
      if (!hex || seen.has(hex)) continue;
      seen.add(hex);
      lib.colors.push({ id: id(c.id), hex, name: cleanName(c.name, hex), createdAt: cleanDate(c.createdAt) });
    }
  }

  if (Array.isArray(raw.palettes)) {
    for (const p of raw.palettes) {
      if (!isRecord(p) || !Array.isArray(p.colors)) continue;
      const colors = p.colors.map((h) => (typeof h === 'string' ? normalizeHex(h) : null)).filter((h): h is string => !!h);
      if (colors.length === 0) continue;
      lib.palettes.push({
        id: id(p.id),
        name: cleanName(p.name, 'Untitled palette'),
        colors,
        source: SOURCES.includes(p.source as PaletteSource) ? (p.source as PaletteSource) : 'manual',
        createdAt: cleanDate(p.createdAt),
      });
    }
  }
  return lib;
}

export function hasColor(lib: Library, hex: string): boolean {
  const h = normalizeHex(hex);
  return !!h && lib.colors.some((c) => c.hex === h);
}

/** Adds a colour at the top. Saving a colour that's already saved just moves it to the top. */
export function addColor(lib: Library, hex: string, name: string, now = new Date()): Library {
  const h = normalizeHex(hex);
  if (!h) return lib;
  const existing = lib.colors.find((c) => c.hex === h);
  const entry: SavedColor = existing ?? { id: newId(), hex: h, name: cleanName(name, h), createdAt: now.toISOString() };
  return { ...lib, colors: [entry, ...lib.colors.filter((c) => c.hex !== h)] };
}

export function removeColor(lib: Library, id: string): Library {
  return { ...lib, colors: lib.colors.filter((c) => c.id !== id) };
}

export function addPalette(lib: Library, name: string, colors: readonly string[], source: PaletteSource, now = new Date()): Library {
  const hexes = colors.map((c) => normalizeHex(c)).filter((h): h is string => !!h);
  if (hexes.length === 0) return lib;
  const entry: SavedPalette = { id: newId(), name: cleanName(name, 'Untitled palette'), colors: hexes, source, createdAt: now.toISOString() };
  return { ...lib, palettes: [entry, ...lib.palettes] };
}

export function removePalette(lib: Library, id: string): Library {
  return { ...lib, palettes: lib.palettes.filter((p) => p.id !== id) };
}

export function renamePalette(lib: Library, id: string, name: string): Library {
  return { ...lib, palettes: lib.palettes.map((p) => (p.id === id ? { ...p, name: cleanName(name, p.name) } : p)) };
}

/** Puts a removed item back where it was, for undo. */
export function restoreColor(lib: Library, item: SavedColor, index: number): Library {
  if (lib.colors.some((c) => c.hex === item.hex)) return lib;
  const colors = [...lib.colors];
  colors.splice(Math.min(index, colors.length), 0, item);
  return { ...lib, colors };
}

export function restorePalette(lib: Library, item: SavedPalette, index: number): Library {
  if (lib.palettes.some((p) => p.id === item.id)) return lib;
  const palettes = [...lib.palettes];
  palettes.splice(Math.min(index, palettes.length), 0, item);
  return { ...lib, palettes };
}
