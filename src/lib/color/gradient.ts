import { clampChroma, formatHex, interpolate } from 'culori';

export type GradientKind = 'linear' | 'radial';
export type InterpolationMode = 'srgb' | 'oklch';

export interface GradientSpec {
  /** Two or three hex colours, evenly spaced. */
  stops: readonly string[];
  kind: GradientKind;
  /** CSS angle in degrees (0 = to top, 90 = to right). Ignored for radial. */
  angle: number;
  mode: InterpolationMode;
}

/** Colour at position t (0–1) along evenly spaced stops, gamut-mapped into sRGB. */
export function colorAt(stops: readonly string[], t: number, mode: InterpolationMode): string {
  const fn = interpolate([...stops], mode === 'oklch' ? 'oklch' : 'rgb');
  const c = fn(Math.min(1, Math.max(0, t)));
  // OKLCH midpoints can fall outside sRGB; reduce chroma rather than clip channels.
  return formatHex(mode === 'oklch' ? clampChroma(c, 'oklch') : c).toUpperCase();
}

/** `count` evenly spaced colours from the first stop to the last, both included. */
export function sampleGradient(stops: readonly string[], count: number, mode: InterpolationMode): string[] {
  if (count < 2) return [colorAt(stops, 0, mode)];
  return Array.from({ length: count }, (_, i) => colorAt(stops, i / (count - 1), mode));
}

const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function normalizeAngle(angle: number): number {
  return ((Math.round(angle) % 360) + 360) % 360;
}

/**
 * CSS for the gradient. sRGB gives a plain gradient. OKLCH gives a sampled
 * sRGB fallback that works in every browser, then the native `in oklch`
 * version for browsers that support it.
 */
export function gradientCss(spec: GradientSpec, fallbackStops = 9): string {
  const shape = spec.kind === 'linear' ? `${normalizeAngle(spec.angle)}deg` : 'circle';
  const fn = `${spec.kind}-gradient`;
  if (spec.mode === 'srgb') return `background: ${fn}(${shape}, ${spec.stops.join(', ')});`;

  const samples = sampleGradient(spec.stops, fallbackStops, 'oklch')
    .map((hex, i) => `${hex} ${round((i / (fallbackStops - 1)) * 100)}%`)
    .join(', ');
  return [
    `background: ${fn}(${shape}, ${samples});`,
    `background: ${fn}(in oklch ${shape}, ${spec.stops.join(', ')});`,
  ].join('\n');
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Start and end of the gradient line CSS uses for a linear gradient at
 * `angle` in a w×h box, so a canvas export matches the CSS exactly.
 */
export function linearGradientLine(w: number, h: number, angle: number): [Point, Point] {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return [
    { x: cx - dx * half, y: cy - dy * half },
    { x: cx + dx * half, y: cy + dy * half },
  ];
}

/** Radius of a CSS `radial-gradient(circle, …)` (farthest-corner) centred in a w×h box. */
export function radialRadius(w: number, h: number): number {
  return Math.hypot(w / 2, h / 2);
}
