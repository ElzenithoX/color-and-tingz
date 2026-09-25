import { describe, expect, it } from 'vitest';
import { colorAt, gradientCss, linearGradientLine, normalizeAngle, radialRadius, sampleGradient } from './gradient';
import { hexToHsl } from './convert';

describe('sampling', () => {
  it('interpolates in sRGB', () => {
    expect(sampleGradient(['#000000', '#FFFFFF'], 3, 'srgb')).toEqual(['#000000', '#808080', '#FFFFFF']);
  });

  it('keeps the end colours exact in both modes', () => {
    for (const mode of ['srgb', 'oklch'] as const) {
      const s = sampleGradient(['#07959D', '#F2C94C'], 7, mode);
      expect(s).toHaveLength(7);
      expect(s[0]).toBe('#07959D');
      expect(s[6]).toBe('#F2C94C');
    }
  });

  it('passes through the middle stop', () => {
    expect(colorAt(['#FF0000', '#00FF00', '#0000FF'], 0.5, 'srgb')).toBe('#00FF00');
    expect(colorAt(['#FF0000', '#00FF00', '#0000FF'], 0.5, 'oklch')).toBe('#00FF00');
  });

  it('avoids the grey dead zone that sRGB gives for complementary colours', () => {
    const srgb = colorAt(['#0000FF', '#FFFF00'], 0.5, 'srgb');
    const oklch = colorAt(['#0000FF', '#FFFF00'], 0.5, 'oklch');
    expect(srgb).toBe('#808080');
    expect(hexToHsl(oklch)[1]).toBeGreaterThan(30);
  });

  it('always returns valid in-gamut hex', () => {
    for (const hex of sampleGradient(['#FF00FF', '#00FFFF', '#FFFF00'], 25, 'oklch')) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('clamps t and handles a single sample', () => {
    expect(colorAt(['#000000', '#FFFFFF'], -1, 'srgb')).toBe('#000000');
    expect(colorAt(['#000000', '#FFFFFF'], 2, 'srgb')).toBe('#FFFFFF');
    expect(sampleGradient(['#123456', '#FFFFFF'], 1, 'srgb')).toEqual(['#123456']);
  });
});

describe('gradientCss', () => {
  it('writes a plain sRGB gradient', () => {
    expect(gradientCss({ stops: ['#07959D', '#F2C94C'], kind: 'linear', angle: 90, mode: 'srgb' })).toBe(
      'background: linear-gradient(90deg, #07959D, #F2C94C);',
    );
    expect(gradientCss({ stops: ['#000000', '#FFFFFF'], kind: 'radial', angle: 90, mode: 'srgb' })).toBe(
      'background: radial-gradient(circle, #000000, #FFFFFF);',
    );
  });

  it('writes an OKLCH gradient with a sampled fallback first', () => {
    const css = gradientCss({ stops: ['#000000', '#FFFFFF'], kind: 'linear', angle: -45, mode: 'oklch' }, 3);
    const [fallback, native] = css.split('\n');
    expect(fallback).toMatch(/^background: linear-gradient\(315deg, #000000 0%, #[0-9A-F]{6} 50%, #FFFFFF 100%\);$/);
    expect(native).toBe('background: linear-gradient(in oklch 315deg, #000000, #FFFFFF);');
  });

  it('normalises angles', () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(45.4)).toBe(45);
  });
});

describe('canvas geometry', () => {
  const close = (p: { x: number; y: number }, x: number, y: number) => {
    expect(p.x).toBeCloseTo(x, 6);
    expect(p.y).toBeCloseTo(y, 6);
  };

  it('matches the CSS gradient line', () => {
    let [a, b] = linearGradientLine(200, 100, 90);
    close(a, 0, 50);
    close(b, 200, 50);
    [a, b] = linearGradientLine(200, 100, 0);
    close(a, 100, 100);
    close(b, 100, 0);
    [a, b] = linearGradientLine(100, 100, 135);
    close(a, 0, 0);
    close(b, 100, 100);
  });

  it('uses the farthest-corner radius for radial', () => {
    expect(radialRadius(300, 400)).toBe(250);
  });
});
