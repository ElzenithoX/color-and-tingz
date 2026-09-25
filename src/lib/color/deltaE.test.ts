import { describe, expect, it } from 'vitest';
import { differenceCiede2000 } from 'culori';
import { ciede2000, type Lab } from './deltaE';

const lab = (l: number, a: number, b: number): Lab => ({ l, a, b });

// Selected pairs from the test data in Sharma, Wu & Dalal (2005).
const SHARMA: [Lab, Lab, number][] = [
  [lab(50, 2.6772, -79.7751), lab(50, 0, -82.7485), 2.0425],
  [lab(50, 3.1571, -77.2803), lab(50, 0, -82.7485), 2.8615],
  [lab(50, 2.8361, -74.02), lab(50, 0, -82.7485), 3.4412],
  [lab(50, 0, 0), lab(50, -1, 2), 2.3669],
  [lab(50, -1, 2), lab(50, 0, 0), 2.3669],
  [lab(50, 2.49, -0.001), lab(50, -2.49, 0.0009), 7.1792],
  [lab(50, 2.5, 0), lab(73, 25, -18), 27.1492],
  [lab(50, 2.5, 0), lab(61, -5, 29), 22.8977],
  [lab(50, 2.5, 0), lab(56, -27, -3), 31.903],
  [lab(50, 2.5, 0), lab(58, 24, 15), 19.4535],
  [lab(60.2574, -34.0099, 36.2677), lab(60.4626, -34.1751, 39.4387), 1.2644],
  [lab(63.0109, -31.0961, -5.8663), lab(62.8187, -29.7946, -4.0864), 1.263],
];

describe('ciede2000', () => {
  it.each(SHARMA)('matches the Sharma reference data (%o vs %o)', (x, y, expected) => {
    expect(ciede2000(x, y)).toBeCloseTo(expected, 4);
  });

  it('is zero for identical colours and symmetric', () => {
    const c = lab(42, 12, -30);
    expect(ciede2000(c, c)).toBe(0);
    expect(ciede2000(c, lab(60, -5, 8))).toBeCloseTo(ciede2000(lab(60, -5, 8), c), 10);
  });

  it('agrees with culori on arbitrary colours', () => {
    const culoriDe = differenceCiede2000();
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const x = lab(rand() * 100, rand() * 200 - 100, rand() * 200 - 100);
      const y = lab(rand() * 100, rand() * 200 - 100, rand() * 200 - 100);
      // culori converts its inputs to lab65, so hand it lab65 to compare like for like.
      expect(ciede2000(x, y)).toBeCloseTo(culoriDe({ mode: 'lab65', ...x }, { mode: 'lab65', ...y }), 6);
    }
  });
});
