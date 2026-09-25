/**
 * Fast sRGB (0–255) → OKLab, for converting many pixels at once.
 * Björn Ottosson's matrices; culori gives the same values but is too slow per pixel.
 */

const LINEAR = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Writes L, a, b for one pixel into `out` at `offset`. */
export function rgbToOklabInto(r: number, g: number, b: number, out: Float32Array | Float64Array, offset: number) {
  const lr = LINEAR[r];
  const lg = LINEAR[g];
  const lb = LINEAR[b];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  out[offset] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[offset + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[offset + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const out = new Float64Array(3);
  rgbToOklabInto(r, g, b, out, 0);
  return [out[0], out[1], out[2]];
}
