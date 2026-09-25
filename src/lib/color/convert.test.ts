import { describe, expect, it } from 'vitest';
import {
  cmykToRgb,
  cssToHex,
  describe as describeColor,
  format,
  formatValueList,
  hexToHsl,
  hexToLab,
  hexToRgb,
  hslToHex,
  mixHex,
  normalizeHex,
  rgbToCmyk,
  rgbToHex,
} from './convert';

describe('hex', () => {
  it('normalises short, long and hashless hex', () => {
    expect(normalizeHex('#07959d')).toBe('#07959D');
    expect(normalizeHex('07959D')).toBe('#07959D');
    expect(normalizeHex('#fa0')).toBe('#FFAA00');
    expect(normalizeHex(' abc ')).toBe('#AABBCC');
  });

  it('rejects invalid hex', () => {
    for (const bad of ['', '#12', '#12345', '#GGGGGG', '1234567']) expect(normalizeHex(bad)).toBeNull();
  });

  it('round-trips through RGB', () => {
    expect(hexToRgb('#07959D')).toEqual([7, 149, 157]);
    expect(rgbToHex([7, 149, 157])).toBe('#07959D');
    expect(rgbToHex([300, -4, 12.6])).toBe('#FF000D');
  });
});

describe('CMYK', () => {
  it('converts the brief example #07959D to 96, 5, 0, 38', () => {
    expect(rgbToCmyk([7, 149, 157]).map(Math.round)).toEqual([96, 5, 0, 38]);
  });

  it('handles black and white', () => {
    expect(rgbToCmyk([0, 0, 0])).toEqual([0, 0, 0, 100]);
    expect(rgbToCmyk([255, 255, 255])).toEqual([0, 0, 0, 0]);
  });

  it('converts CMYK back to RGB', () => {
    expect(cmykToRgb([0, 0, 0, 0])).toEqual([255, 255, 255]);
    expect(cmykToRgb([0, 100, 100, 0])).toEqual([255, 0, 0]);
    expect(cmykToRgb([96, 5, 0, 38])).toEqual([6, 150, 158]);
  });
});

describe('HSL', () => {
  it('converts to and from hex', () => {
    const [h, s, l] = hexToHsl('#07959D');
    expect(Math.round(h)).toBe(183);
    expect(Math.round(s)).toBe(91);
    expect(Math.round(l)).toBe(32);
    expect(hslToHex([0, 100, 50])).toBe('#FF0000');
    expect(hslToHex([480, 100, 50])).toBe('#00FF00');
  });

  it('gives greys hue 0', () => {
    expect(hexToHsl('#808080')[0]).toBe(0);
  });
});

describe('LAB (D65)', () => {
  it('matches known values', () => {
    const white = hexToLab('#FFFFFF');
    expect(white.l).toBeCloseTo(100, 3);
    expect(white.a).toBeCloseTo(0, 3);
    expect(white.b).toBeCloseTo(0, 3);
    const red = hexToLab('#FF0000');
    expect(red.l).toBeCloseTo(53.24, 1);
    expect(red.a).toBeCloseTo(80.09, 1);
    expect(red.b).toBeCloseTo(67.2, 1);
  });
});

describe('describe', () => {
  it('returns rounded values in every format', () => {
    const v = describeColor('#07959d');
    expect(v.hex).toBe('#07959D');
    expect(v.rgb).toEqual([7, 149, 157]);
    expect(v.hsl).toEqual([183, 91, 32]);
    expect(v.cmyk).toEqual([96, 5, 0, 38]);
    expect(v.lab[0]).toBeCloseTo(55.6, 0);
    expect(format.rgb(v.rgb)).toBe('rgb(7, 149, 157)');
    expect(format.hsl(v.hsl)).toBe('hsl(183, 91%, 32%)');
    expect(format.cmyk(v.cmyk)).toBe('cmyk(96%, 5%, 0%, 38%)');
  });

  it('never prints negative zero', () => {
    expect(describeColor('#FFFFFF').lab.map((n) => Object.is(n, -0))).toEqual([false, false, false]);
  });
});

describe('formatValueList', () => {
  it('lists every value on its own line', () => {
    const text = formatValueList(describeColor('#07959D'), { code: '320 C', deltaE: 2.44 }, 'Peacock Feather');
    expect(text.split('\n')).toEqual([
      'Name: Peacock Feather',
      'HEX: #07959D',
      'RGB: rgb(7, 149, 157)',
      'HSL: hsl(183, 91%, 32%)',
      'CMYK: cmyk(96%, 5%, 0%, 38%)',
      expect.stringMatching(/^LAB: lab\(56\.\d+ -29\.\d+ -13\.\d+\)$/),
      'Pantone: PANTONE 320 C (approximate, ΔE 2.4)',
    ]);
  });

  it('leaves out the name and Pantone lines when there is no match', () => {
    const text = formatValueList(describeColor('#000000'), null, null);
    expect(text.startsWith('HEX: #000000')).toBe(true);
    expect(text).not.toContain('Pantone');
  });
});

describe('helpers', () => {
  it('parses CSS colours', () => {
    expect(cssToHex('teal')).toBe('#008080');
    expect(cssToHex('oklch(62.8% 0.2577 29.23)')).toBe('#FF0000');
    expect(cssToHex('not a colour')).toBeNull();
  });

  it('mixes in sRGB', () => {
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });
});
