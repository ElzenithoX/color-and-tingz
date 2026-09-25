import { describe, expect, it } from 'vitest';
import { converter } from 'culori';
import { extractPalette } from './palette';
import { rgbToOklab } from './oklab';
import { paletteFileBase, paletteToCss, paletteToJson } from './paletteExport';

/** Builds an RGBA buffer from [r, g, b, a, count] runs. */
function image(runs: [number, number, number, number, number][]): Uint8ClampedArray {
  const total = runs.reduce((s, r) => s + r[4], 0);
  const out = new Uint8ClampedArray(total * 4);
  let o = 0;
  for (const [r, g, b, a, count] of runs) {
    for (let i = 0; i < count; i++, o += 4) out.set([r, g, b, a], o);
  }
  return out;
}

describe('rgbToOklab', () => {
  it('matches culori', () => {
    const toOklab = converter('oklab');
    for (const [r, g, b] of [[0, 0, 0], [255, 255, 255], [7, 149, 157], [255, 0, 0], [12, 200, 40]]) {
      const ref = toOklab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
      const [l, a, bb] = rgbToOklab(r, g, b);
      expect(l).toBeCloseTo(ref.l, 5);
      expect(a).toBeCloseTo(ref.a, 5);
      expect(bb).toBeCloseTo(ref.b, 5);
    }
  });
});

describe('extractPalette', () => {
  const threeBlocks = image([
    [255, 0, 0, 255, 500],
    [0, 0, 255, 255, 300],
    [255, 255, 0, 255, 200],
  ]);

  it('finds the dominant colours with their shares, largest first', () => {
    const p = extractPalette(threeBlocks, 3);
    expect(p.map((c) => c.hex)).toEqual(['#FF0000', '#0000FF', '#FFFF00']);
    expect(p.map((c) => c.share)).toEqual([0.5, 0.3, 0.2]);
  });

  it('returns only real image colours, even from noisy clusters', () => {
    const noisy = image([
      [200, 20, 20, 255, 100],
      [210, 30, 25, 255, 100],
      [20, 20, 200, 255, 100],
      [25, 35, 190, 255, 100],
    ]);
    const hexes = extractPalette(noisy, 2).map((c) => c.hex);
    expect(hexes).toHaveLength(2);
    for (const h of hexes) expect(['#C81414', '#D21E19', '#1414C8', '#1923BE']).toContain(h);
  });

  it('ignores transparent pixels', () => {
    const p = extractPalette(image([[0, 255, 0, 255, 10], [255, 0, 0, 0, 1000]]), 4);
    expect(p).toEqual([{ hex: '#00FF00', share: 1 }]);
  });

  it('returns fewer colours than asked when the image has fewer', () => {
    expect(extractPalette(threeBlocks, 8)).toHaveLength(3);
  });

  it('is deterministic for a seed', () => {
    const pixels = new Uint8ClampedArray(4 * 5000);
    for (let i = 0; i < 5000; i++) pixels.set([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255], i * 4);
    const a = extractPalette(pixels, 8);
    expect(a).toHaveLength(8);
    expect(extractPalette(pixels, 8)).toEqual(a);
    expect(a.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1, 10);
  });

  it('handles empty input', () => {
    expect(extractPalette(new Uint8ClampedArray(0), 6)).toEqual([]);
    expect(extractPalette(threeBlocks, 0)).toEqual([]);
  });
});

describe('palette export', () => {
  const swatches = [
    { hex: '#07959D', name: 'Peacock Feather', share: 0.5234 },
    { hex: '#FFFFFF', name: 'White', share: 0.4766 },
  ];

  it('writes CSS variables', () => {
    expect(paletteToCss(swatches, 'beach.jpg')).toBe(
      '/* Palette from beach.jpg, made with color&tingz */\n' +
        ':root {\n' +
        '  --palette-1: #07959D; /* Peacock Feather · 52% */\n' +
        '  --palette-2: #FFFFFF; /* White · 48% */\n' +
        '}\n',
    );
  });

  it('keeps comment terminators out of the CSS', () => {
    const css = paletteToCss([{ hex: '#000000', name: 'Evil */ x', share: 1 }], 'a*/b.png');
    expect(css).toContain('Evil  x');
    expect(css).toContain('from ab.png');
  });

  it('writes JSON with every code', () => {
    const data = JSON.parse(paletteToJson(swatches, 'beach.jpg'));
    expect(data.source).toBe('beach.jpg');
    expect(data.colors[0]).toMatchObject({
      name: 'Peacock Feather',
      hex: '#07959D',
      rgb: [7, 149, 157],
      hsl: [183, 91, 32],
      cmyk: [96, 5, 0, 38],
      share: 0.523,
    });
    expect(data.colors[0].lab).toHaveLength(3);
  });

  it('builds safe file names', () => {
    expect(paletteFileBase('Holiday Photo (2).JPG')).toBe('holiday-photo-2-palette');
    expect(paletteFileBase()).toBe('palette');
  });
});
