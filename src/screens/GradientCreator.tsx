import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, BookmarkPlus, CircleAlert, ImageDown, Plus, X } from 'lucide-react';
import ColorField, { fieldFrom, type ColorFieldState } from '../components/ColorField';
import CopyButton from '../components/CopyButton';
import { readableOn } from '../lib/color/contrast';
import {
  colorAt,
  gradientCss,
  normalizeAngle,
  sampleGradient,
  type GradientKind,
  type GradientSpec,
  type InterpolationMode,
} from '../lib/color/gradient';
import { renderGradientPng } from '../lib/image';
import { saveFile } from '../lib/files';
import { addPalette } from '../lib/library';
import { useLibrary } from '../lib/useLibrary';

type Status = { kind: 'info' | 'error'; text: string } | null;

/** Enough samples that an OKLCH preview is indistinguishable from the real thing. */
const PREVIEW_SAMPLES = 24;

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mode-toggle mode-toggle-lg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export default function GradientCreator() {
  const [start, setStart] = useState(() => fieldFrom('#07959D'));
  const [end, setEnd] = useState(() => fieldFrom('#F2C94C'));
  const [middle, setMiddle] = useState<ColorFieldState | null>(null);
  const [kind, setKind] = useState<GradientKind>('linear');
  const [mode, setMode] = useState<InterpolationMode>('oklch');
  const [angle, setAngle] = useState(90);
  const [steps, setSteps] = useState(7);
  const [status, setStatus] = useState<Status>(null);
  const { update } = useLibrary();

  useEffect(() => {
    if (status?.kind !== 'info') return;
    const t = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const spec: GradientSpec = useMemo(
    () => ({ stops: middle ? [start.hex, middle.hex, end.hex] : [start.hex, end.hex], kind, angle, mode }),
    [start.hex, middle, end.hex, kind, angle, mode],
  );

  const preview = useMemo(() => {
    const samples = sampleGradient(spec.stops, PREVIEW_SAMPLES, spec.mode);
    const shape = spec.kind === 'linear' ? `${normalizeAngle(spec.angle)}deg` : 'circle';
    return `${spec.kind}-gradient(${shape}, ${samples.join(', ')})`;
  }, [spec]);

  const css = useMemo(() => gradientCss(spec), [spec]);
  const stepColors = useMemo(() => sampleGradient(spec.stops, steps, spec.mode), [spec, steps]);

  const addMiddle = () => setMiddle(fieldFrom(colorAt([start.hex, end.hex], 0.5, mode)));
  const swap = () => {
    setStart(end);
    setEnd(start);
  };

  const savePalette = () => {
    update((lib) => addPalette(lib, `Gradient ${spec.stops.join(' → ')}`, stepColors, 'gradient'));
    setStatus({ kind: 'info', text: `${stepColors.length} steps saved to Saved` });
  };

  const exportPng = async () => {
    try {
      const data = await renderGradientPng(spec);
      const name = `gradient-${spec.stops.map((h) => h.slice(1).toLowerCase()).join('-')}`;
      if ((await saveFile(name, 'png', data)) === 'saved') setStatus({ kind: 'info', text: 'PNG saved' });
    } catch {
      setStatus({ kind: 'error', text: "Couldn't save the PNG file." });
    }
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Gradient Creator</h1>
        <div className="header-actions">
          <Segmented label="Gradient type" value={kind} onChange={setKind} options={[['linear', 'Linear'], ['radial', 'Radial']]} />
          <Segmented label="Interpolation" value={mode} onChange={setMode} options={[['oklch', 'OKLCH'], ['srgb', 'sRGB']]} />
        </div>
      </header>

      <div className="grid-gradient">
        <section>
          <h2 className="section-title">Preview</h2>
          <div className="card gradient-preview" style={{ background: preview }} role="img" aria-label="Gradient preview" />
        </section>

        <section>
          <h2 className="section-title">Stops</h2>
          <div className="card card-surface gradient-controls">
            <ColorField label="Start" state={start} onChange={setStart} />
            {middle ? (
              <ColorField
                label="Middle"
                state={middle}
                onChange={setMiddle}
                action={
                  <button className="icon-btn" onClick={() => setMiddle(null)} title="Remove middle stop" aria-label="Remove middle stop">
                    <X size={16} />
                  </button>
                }
              />
            ) : (
              <button className="add-stop" onClick={addMiddle}>
                <Plus size={15} strokeWidth={2} /> Add middle stop
              </button>
            )}
            <ColorField
              label="End"
              state={end}
              onChange={setEnd}
              action={
                <button className="icon-btn" onClick={swap} title="Swap start and end" aria-label="Swap start and end">
                  <ArrowLeftRight size={16} />
                </button>
              }
            />

            <div className={`slider-row${kind === 'radial' ? ' is-disabled' : ''}`}>
              <div className="slider-head">
                <span>Angle</span>
                <strong>{kind === 'radial' ? 'Centre' : `${angle}°`}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={angle}
                disabled={kind === 'radial'}
                onChange={(e) => setAngle(Number(e.target.value))}
                aria-label="Angle in degrees"
              />
            </div>

            <div className="slider-row">
              <div className="slider-head">
                <span>Steps</span>
                <strong>{steps}</strong>
              </div>
              <input type="range" min={3} max={12} step={1} value={steps} onChange={(e) => setSteps(Number(e.target.value))} aria-label="Number of steps" />
            </div>
          </div>
        </section>
      </div>

      <div className="grid-bottom">
        <section>
          <h2 className="section-title">Steps</h2>
          <div className="card card-surface steps-card">
            <div className="steps-strip">
              {stepColors.map((hex, i) => (
                <StepSwatch key={`${hex}-${i}`} hex={hex} />
              ))}
            </div>
            <p className="steps-hint">Click a step to copy its hex.</p>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2 className="section-title">CSS</h2>
            <CopyButton value={css} label="CSS" text="Copy CSS" />
          </div>
          <div className="card accent-card css-card">
            <pre className="css-code">{css}</pre>
            {mode === 'oklch' && (
              <p className="accent-sub">The first line is an sRGB fallback; browsers that support OKLCH gradients use the second.</p>
            )}
            <div className="export-row">
              <button className="light-btn" onClick={exportPng}>
                <ImageDown size={15} /> Export PNG · 1920×1080
              </button>
            </div>
            <button className="ghost-btn" onClick={savePalette}>
              <BookmarkPlus size={15} /> Save steps as palette
            </button>
            {status && (
              <p className={`accent-status${status.kind === 'error' ? ' is-error' : ''}`} role="status">
                {status.kind === 'error' && <CircleAlert size={14} />} {status.text}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StepSwatch({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      className="step-swatch"
      style={{ background: hex, color: readableOn(hex) }}
      title={`Copy ${hex}`}
      onClick={() => navigator.clipboard.writeText(hex).then(() => setCopied(true), () => undefined)}
    >
      <span>{copied ? 'Copied' : hex.slice(1)}</span>
    </button>
  );
}
