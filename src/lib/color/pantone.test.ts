import { describe, expect, it } from 'vitest';
import pantoneData from '../../data/pantone.json';
import { createPantoneIndex, normalizePantoneCode } from './pantone';
import { createLabIndex } from './nearest';

describe('normalizePantoneCode', () => {
  it('canonicalises spellings', () => {
    expect(normalizePantoneCode('320c')).toBe('320 C');
    expect(normalizePantoneCode('  pantone   320   C ')).toBe('320 C');
    expect(normalizePantoneCode('Cool Gray 11U')).toBe('COOL GRAY 11 U');
  });
});

describe('createPantoneIndex', () => {
  const index = createPantoneIndex([
    { code: '320 C', hex: '#009CA6' },
    { code: '185 C', hex: '#E4002B' },
    { code: 'Broken', hex: 'nope' },
  ]);

  it('skips entries with invalid hex', () => {
    expect(index.size).toBe(2);
    expect(index.find('Broken')).toBeNull();
  });

  it('finds exact codes', () => {
    expect(index.find('185c')?.hex).toBe('#E4002B');
    expect(index.find('999 C')).toBeNull();
  });

  it('returns the nearest Pantone, marked approximate, with delta E', () => {
    const m = index.nearest('#07959D')!;
    expect(m.code).toBe('320 C');
    expect(m.approximate).toBe(true);
    expect(m.deltaE).toBeGreaterThan(0);
    expect(m.deltaE).toBeLessThan(5);
    expect(index.nearest('#009ca6')!.deltaE).toBe(0);
  });

  it('returns null for an empty table', () => {
    expect(createPantoneIndex([]).nearest('#000000')).toBeNull();
  });
});

describe('bundled pantone.json', () => {
  it('is well formed, with unique codes', () => {
    expect(pantoneData.length).toBeGreaterThan(50);
    const codes = new Set<string>();
    for (const e of pantoneData) {
      expect(e.hex).toMatch(/^#[0-9A-F]{6}$/);
      const c = normalizePantoneCode(e.code);
      expect(codes.has(c), e.code).toBe(false);
      codes.add(c);
    }
  });

  it('matches every entry to itself', () => {
    const index = createPantoneIndex(pantoneData);
    for (const e of pantoneData) expect(index.nearest(e.hex)!.deltaE).toBe(0);
  });
});

describe('createLabIndex', () => {
  it('prefers the perceptually closer colour', () => {
    const index = createLabIndex([
      { hex: '#FF0000', name: 'red' },
      { hex: '#00FF00', name: 'green' },
      { hex: '#0000FF', name: 'blue' },
    ]);
    expect(index.nearest('#E01010')!.item.name).toBe('red');
    expect(index.nearest('#1020D0')!.item.name).toBe('blue');
  });
});
