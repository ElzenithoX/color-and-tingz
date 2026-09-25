import { describe, expect, it } from 'vitest';
import { harmony, rotateHue, shades, tints } from './harmony';
import { contrastRatio, readableOn, relativeLuminance, wcag } from './contrast';

describe('harmony', () => {
  it('rotates hue in HSL', () => {
    expect(rotateHue('#FF0000', 120)).toBe('#00FF00');
    expect(rotateHue('#FF0000', -120)).toBe('#0000FF');
  });

  it('builds each harmony starting from the base colour', () => {
    expect(harmony('#ff0000', 'complementary')).toEqual(['#FF0000', '#00FFFF']);
    expect(harmony('#FF0000', 'triadic')).toEqual(['#FF0000', '#00FF00', '#0000FF']);
    expect(harmony('#FF0000', 'analogous')).toEqual(['#FF0080', '#FF0000', '#FF8000']);
    expect(harmony('#FF0000', 'splitComplementary')).toEqual(['#FF0000', '#00FF80', '#0080FF']);
    expect(harmony('#FF0000', 'tetradic')).toEqual(['#FF0000', '#FFFF00', '#00FFFF', '#0000FF']);
  });

  it('makes 5 tints getting lighter and 5 shades getting darker', () => {
    const t = tints('#07959D');
    const s = shades('#07959D');
    expect(t).toHaveLength(5);
    expect(s).toHaveLength(5);
    const lum = (xs: string[]) => xs.map(relativeLuminance);
    const lt = lum(t);
    const ls = lum(s);
    for (let i = 1; i < 5; i++) {
      expect(lt[i]).toBeGreaterThan(lt[i - 1]);
      expect(ls[i]).toBeLessThan(ls[i - 1]);
    }
    expect(t).not.toContain('#FFFFFF');
    expect(s).not.toContain('#000000');
  });
});

describe('contrast', () => {
  it('computes the WCAG extremes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('matches known ratios', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#07959D', '#FFFFFF')).toBeCloseTo(3.66, 1);
  });

  it('grades AA and AAA', () => {
    const r = wcag('#767676', '#FFFFFF');
    expect(r).toMatchObject({ aaNormal: true, aaLarge: true, aaaNormal: false, aaaLarge: true });
    expect(wcag('#FFFFFF', '#FFFF00').aaLarge).toBe(false);
  });

  it('picks readable text colour', () => {
    expect(readableOn('#FFFF00')).toBe('#000000');
    expect(readableOn('#001489')).toBe('#FFFFFF');
  });
});
