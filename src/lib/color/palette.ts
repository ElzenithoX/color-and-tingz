import { rgbToHex } from './convert';
import { rgbToOklabInto } from './oklab';

export interface PaletteColor {
  hex: string;
  /** Fraction of the sampled (opaque) pixels in this colour's cluster, 0–1. */
  share: number;
}

export interface ExtractOptions {
  /** Pixels are sampled evenly down to at most this many. */
  maxSamples?: number;
  maxIterations?: number;
  /** Seed for k-means++ start points, so the same image always gives the same palette. */
  seed?: number;
}

/** Small seeded PRNG (mulberry32). */
function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2 = (p: Float32Array, i: number, c: Float64Array, j: number) => {
  const dl = p[i * 3] - c[j * 3];
  const da = p[i * 3 + 1] - c[j * 3 + 1];
  const db = p[i * 3 + 2] - c[j * 3 + 2];
  return dl * dl + da * da + db * db;
};

/**
 * Dominant colours of an RGBA pixel buffer (as from canvas getImageData), by
 * k-means in OKLab. Pixels under 50% alpha are ignored. Each colour returned
 * is the real image pixel closest to its cluster's centre, so it actually
 * appears in the image. Sorted by share, largest first. Returns fewer than
 * `k` colours when the image has fewer distinct colours.
 */
export function extractPalette(rgba: Uint8ClampedArray | Uint8Array, k: number, options: ExtractOptions = {}): PaletteColor[] {
  const { maxSamples = 20000, maxIterations = 30, seed = 1 } = options;
  const totalPixels = Math.floor(rgba.length / 4);

  let opaque = 0;
  for (let i = 0; i < totalPixels; i++) if (rgba[i * 4 + 3] >= 128) opaque++;
  if (opaque === 0 || k < 1) return [];

  // Sample evenly across the opaque pixels.
  const stride = Math.max(1, opaque / maxSamples);
  const rgb: number[] = [];
  let seen = 0;
  let next = 0;
  for (let i = 0; i < totalPixels; i++) {
    const o = i * 4;
    if (rgba[o + 3] < 128) continue;
    if (seen >= next) {
      rgb.push(rgba[o], rgba[o + 1], rgba[o + 2]);
      next += stride;
    }
    seen++;
  }
  const n = rgb.length / 3;

  const distinct = new Set<number>();
  for (let i = 0; i < n && distinct.size <= k; i++) distinct.add((rgb[i * 3] << 16) | (rgb[i * 3 + 1] << 8) | rgb[i * 3 + 2]);
  const clusters = Math.min(k, distinct.size);

  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) rgbToOklabInto(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], lab, i * 3);

  // k-means++ start points.
  const rand = random(seed);
  const centers = new Float64Array(clusters * 3);
  const nearestD = new Float64Array(n).fill(Infinity);
  let pick = Math.floor(rand() * n);
  for (let c = 0; c < clusters; c++) {
    centers.set(lab.subarray(pick * 3, pick * 3 + 3), c * 3);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = dist2(lab, i, centers, c);
      if (d < nearestD[i]) nearestD[i] = d;
      total += nearestD[i];
    }
    if (c === clusters - 1) break;
    let target = rand() * total;
    pick = n - 1;
    for (let i = 0; i < n; i++) {
      target -= nearestD[i];
      if (target <= 0 && nearestD[i] > 0) {
        pick = i;
        break;
      }
    }
  }

  // Lloyd iterations.
  const assign = new Int32Array(n).fill(-1);
  const sums = new Float64Array(clusters * 3);
  const counts = new Int32Array(clusters);
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < clusters; c++) {
        const d = dist2(lab, i, centers, c);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      nearestD[i] = bestD;
      if (assign[i] !== best) {
        assign[i] = best;
        changed++;
      }
    }
    if (changed === 0) break;

    sums.fill(0);
    counts.fill(0);
    for (let i = 0; i < n; i++) {
      const c = assign[i];
      counts[c]++;
      sums[c * 3] += lab[i * 3];
      sums[c * 3 + 1] += lab[i * 3 + 1];
      sums[c * 3 + 2] += lab[i * 3 + 2];
    }
    for (let c = 0; c < clusters; c++) {
      if (counts[c] === 0) {
        // Empty cluster: restart it on the pixel worst served by its centre.
        let far = 0;
        for (let i = 1; i < n; i++) if (nearestD[i] > nearestD[far]) far = i;
        centers.set(lab.subarray(far * 3, far * 3 + 3), c * 3);
        nearestD[far] = 0;
        continue;
      }
      centers[c * 3] = sums[c * 3] / counts[c];
      centers[c * 3 + 1] = sums[c * 3 + 1] / counts[c];
      centers[c * 3 + 2] = sums[c * 3 + 2] / counts[c];
    }
  }

  // Final counts, and the real pixel nearest each centre.
  counts.fill(0);
  const rep = new Int32Array(clusters).fill(-1);
  const repD = new Float64Array(clusters).fill(Infinity);
  for (let i = 0; i < n; i++) {
    const c = assign[i];
    counts[c]++;
    const d = dist2(lab, i, centers, c);
    if (d < repD[c]) {
      repD[c] = d;
      rep[c] = i;
    }
  }

  // Two clusters can share a representative pixel; merge those.
  const byHex = new Map<string, number>();
  for (let c = 0; c < clusters; c++) {
    if (counts[c] === 0) continue;
    const i = rep[c];
    const hex = rgbToHex([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]);
    byHex.set(hex, (byHex.get(hex) ?? 0) + counts[c] / n);
  }
  return [...byHex].map(([hex, share]) => ({ hex, share })).sort((a, b) => b.share - a.share);
}
