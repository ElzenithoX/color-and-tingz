import { describe } from './color/convert';
import type { NamedSwatch } from './color/paletteExport';
import { linearGradientLine, radialRadius, sampleGradient, type GradientSpec } from './color/gradient';

export interface LoadedImage {
  name: string;
  /** Object URL for previewing; revoke it when the image is replaced. */
  url: string;
  width: number;
  height: number;
  /** RGBA pixels of a downscaled copy, for palette extraction. */
  pixels: Uint8ClampedArray;
}

/** Longest side of the copy that colours are extracted from. */
const SAMPLE_SIZE = 240;

export async function loadImage(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const width = img.naturalWidth || SAMPLE_SIZE;
    const height = img.naturalHeight || SAMPLE_SIZE;
    const scale = Math.min(1, SAMPLE_SIZE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return { name: file.name, url, width, height, pixels };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const FONT = '"Inter Variable", "Segoe UI", sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Renders the palette as a PNG: one column per colour with its name and codes underneath. */
export async function renderPalettePng(swatches: readonly NamedSwatch[]): Promise<Uint8Array> {
  await Promise.all([document.fonts.load(`800 26px ${FONT}`), document.fonts.load(`600 20px ${FONT}`)]);

  const colW = 280;
  const swatchH = 620;
  const infoH = 230;
  const pad = 36;
  const canvas = document.createElement('canvas');
  canvas.width = colW * swatches.length;
  canvas.height = swatchH + infoH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  swatches.forEach((s, i) => {
    const x = i * colW;
    const v = describe(s.hex);
    ctx.fillStyle = s.hex;
    ctx.fillRect(x, 0, colW, swatchH);

    const textW = colW - pad * 2;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#16161A';
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(fitText(ctx, s.name, textW), x + pad, swatchH + 64);
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(v.hex, x + pad, swatchH + 108);
    ctx.fillStyle = '#6B6E78';
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText(`RGB ${v.rgb.join(', ')}`, x + pad, swatchH + 148);
    ctx.fillText(`CMYK ${v.cmyk.join(', ')}`, x + pad, swatchH + 178);
    ctx.fillText(`${Math.round(s.share * 100)}%`, x + pad, swatchH + 208);
  });

  return toPng(canvas);
}

/**
 * Renders a gradient as a w×h PNG. Stops are sampled densely so an OKLCH
 * gradient looks the same as the preview (canvas itself only blends in sRGB).
 */
export async function renderGradientPng(spec: GradientSpec, w = 1920, h = 1080): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  let grad: CanvasGradient;
  if (spec.kind === 'linear') {
    const [a, b] = linearGradientLine(w, h, spec.angle);
    grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  } else {
    grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radialRadius(w, h));
  }
  const samples = sampleGradient(spec.stops, spec.mode === 'oklch' ? 64 : spec.stops.length, spec.mode);
  samples.forEach((hex, i) => grad.addColorStop(i / (samples.length - 1), hex));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return toPng(canvas);
}

async function toPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode PNG'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
