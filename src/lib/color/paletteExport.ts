import { describe, type ColorValues } from './convert';

export interface NamedSwatch {
  hex: string;
  name: string;
  share: number;
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** Palette as CSS custom properties: --palette-1, --palette-2, … with the name in a comment. */
export function paletteToCss(colors: readonly NamedSwatch[], source?: string): string {
  const header = `/* Palette${source ? ` from ${source.replace(/\*\//g, '')}` : ''}, made with color&tingz */`;
  const lines = colors.map((c, i) => `  --palette-${i + 1}: ${c.hex}; /* ${c.name.replace(/\*\//g, '')} · ${percent(c.share)} */`);
  return `${header}\n:root {\n${lines.join('\n')}\n}\n`;
}

export interface PaletteJson {
  source: string | null;
  colors: (Omit<ColorValues, 'hex'> & { hex: string; name: string; share: number })[];
}

/** Palette as JSON with every colour's codes and its share of the image (0–1, 3 decimals). */
export function paletteToJson(colors: readonly NamedSwatch[], source?: string): string {
  const data: PaletteJson = {
    source: source ?? null,
    colors: colors.map((c) => {
      const v = describe(c.hex);
      return { name: c.name, ...v, share: Math.round(c.share * 1000) / 1000 };
    }),
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** "holiday photo.JPG" → "holiday-photo-palette" */
export function paletteFileBase(source?: string): string {
  const stem = (source ?? '').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return stem ? `${stem}-palette` : 'palette';
}
