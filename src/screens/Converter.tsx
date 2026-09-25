import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, BookmarkPlus, CircleAlert } from 'lucide-react';
import CopyButton from '../components/CopyButton';
import { describe, format, formatValueList, hexToRgb, rgbToHex } from '../lib/color/convert';
import { parseColorInput, type InputFormat } from '../lib/color/parse';
import { HARMONY_LABELS, harmony, shades, tints, type HarmonyKind } from '../lib/color/harmony';
import { readableOn, wcag, type WcagResult } from '../lib/color/contrast';
import { nameIndex, pantoneIndex } from '../lib/colorData';
import { addColor, addPalette, hasColor, removeColor } from '../lib/library';
import { useLibrary } from '../lib/useLibrary';

const DEFAULT = '#07959D';

const FORMAT_LABEL: Record<InputFormat, string> = {
  hex: 'HEX',
  rgb: 'RGB',
  hsl: 'HSL',
  cmyk: 'CMYK',
  pantone: 'Pantone',
  css: 'CSS',
};

const HARMONY_TINT: Record<HarmonyKind, string> = {
  complementary: 'lavender',
  analogous: 'mint',
  triadic: 'cream',
  splitComplementary: 'sky',
  tetradic: 'peach',
};

type InputMode = 'hex' | 'rgb';
type RgbFields = [string, string, string];

const rgbFields = (hex: string): RgbFields => hexToRgb(hex).map(String) as RgbFields;

/** A channel box is valid when it holds a whole number from 0 to 255. */
const channel = (s: string): number | null => {
  if (!/^\d{1,3}$/.test(s.trim())) return null;
  const n = Number(s);
  return n <= 255 ? n : null;
};

/** Ask the Converter to load a colour; `seq` makes repeat requests for the same colour count. */
export interface ConverterRequest {
  hex: string;
  seq: number;
}

export default function Converter({ request }: { request?: ConverterRequest | null }) {
  const { library, update } = useLibrary();
  const [mode, setMode] = useState<InputMode>('hex');
  const [text, setText] = useState(DEFAULT);
  const [rgb, setRgb] = useState<RgbFields>(() => rgbFields(DEFAULT));
  const [current, setCurrent] = useState(() => parseColorInput(DEFAULT)!);
  const headerRef = useRef<HTMLElement>(null);
  const invalid =
    mode === 'hex'
      ? text.trim() !== '' && parseColorInput(text, pantoneIndex().find) === null
      : rgb.some((c) => channel(c) === null);

  const onType = (value: string) => {
    setText(value);
    const parsed = parseColorInput(value, pantoneIndex().find);
    if (parsed) setCurrent(parsed);
  };

  const onChannel = (i: number, value: string) => {
    const next = [...rgb] as RgbFields;
    next[i] = value.replace(/\D/g, '').slice(0, 3);
    setRgb(next);
    const nums = next.map(channel);
    if (nums.every((n) => n !== null)) {
      setCurrent({ hex: rgbToHex(nums as [number, number, number]), format: 'rgb' });
    }
  };

  // Switching modes carries the current colour across.
  const switchMode = (m: InputMode) => {
    if (m === mode) return;
    setMode(m);
    if (m === 'rgb') setRgb(rgbFields(current.hex));
    else setText(current.hex);
  };

  const load = (hex: string) => {
    setText(hex);
    setRgb(rgbFields(hex));
    setCurrent({ hex, format: mode });
    headerRef.current?.closest('.panel')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Runs only when a new request arrives.
    if (request) load(request.hex);
  }, [request]);

  // Name matching scans ~30k colours; deferring keeps typing responsive.
  const hex = useDeferredValue(current.hex);
  const values = useMemo(() => describe(hex), [hex]);
  const name = useMemo(() => nameIndex().nearest(hex), [hex]);
  const pantone = useMemo(() => pantoneIndex().nearest(hex), [hex]);
  const onColor = readableOn(hex);
  const saved = hasColor(library, hex);
  const toggleSaved = () =>
    update((lib) => {
      const entry = lib.colors.find((c) => c.hex === values.hex);
      return entry ? removeColor(lib, entry.id) : addColor(lib, values.hex, name?.item.name ?? values.hex);
    });

  const rows: { label: string; value: string; copy: string }[] = [
    { label: 'HEX', value: values.hex, copy: values.hex },
    { label: 'RGB', value: values.rgb.join(', '), copy: format.rgb(values.rgb) },
    { label: 'HSL', value: `${values.hsl[0]}°, ${values.hsl[1]}%, ${values.hsl[2]}%`, copy: format.hsl(values.hsl) },
    { label: 'CMYK', value: values.cmyk.join(', '), copy: format.cmyk(values.cmyk) },
    { label: 'LAB', value: values.lab.map((n) => n.toFixed(2)).join(', '), copy: format.lab(values.lab) },
  ];

  return (
    <div className="screen">
      <header className="screen-header" ref={headerRef}>
        <h1>Converter</h1>
        <div className={`color-input${invalid ? ' is-invalid' : ''}`}>
          <span className="color-input-dot" style={{ background: current.hex }} />
          <div className="mode-toggle" role="radiogroup" aria-label="Input format">
            {(['hex', 'rgb'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={mode === m} onClick={() => switchMode(m)}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {mode === 'hex' ? (
            <input
              className="color-input-text"
              value={text}
              onChange={(e) => onType(e.target.value)}
              onFocus={(e) => e.target.select()}
              spellCheck={false}
              aria-label="Colour value"
              placeholder="#07959D, or 320 C, 96,5,0,38…"
            />
          ) : (
            <div className="rgb-fields">
              {(['R', 'G', 'B'] as const).map((ch, i) => (
                <label key={ch} className={`rgb-field${channel(rgb[i]) === null ? ' is-invalid' : ''}`}>
                  <span>{ch}</span>
                  <input
                    value={rgb[i]}
                    inputMode="numeric"
                    onChange={(e) => onChannel(i, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      // Arrow keys nudge the value, Shift for steps of 10.
                      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                      e.preventDefault();
                      const step = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
                      onChannel(i, String(Math.min(255, Math.max(0, (channel(rgb[i]) ?? 0) + step))));
                    }}
                    aria-label={`${ch} (0 to 255)`}
                  />
                </label>
              ))}
            </div>
          )}

          {invalid ? (
            <span className="chip chip-error">
              <CircleAlert size={14} /> {mode === 'rgb' ? '0–255 only' : 'Not recognised'}
            </span>
          ) : (
            mode === 'hex' &&
            current.format !== 'hex' && <span className="chip">{FORMAT_LABEL[current.format]}</span>
          )}
        </div>
      </header>

      <div className="grid-top">
        <section>
          <h2 className="section-title">Colour</h2>
          <div className="card swatch-card" style={{ background: hex, color: onColor }}>
            <div className="swatch-meta">
              <span className="swatch-kicker">
                Nearest name{name && name.deltaE > 0.5 ? ` · ΔE ${name.deltaE.toFixed(1)}` : ''}
              </span>
              <button
                className={`save-btn${saved ? ' is-saved' : ''}`}
                onClick={toggleSaved}
                aria-pressed={saved}
                // Saved: filled with the text colour, so it inverts against the swatch.
                style={saved ? { background: onColor, color: hex } : undefined}
                title={saved ? 'Remove from Saved' : 'Save colour'}
              >
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
            <div className="swatch-name">{name?.item.name ?? 'Unnamed'}</div>
            <div className="swatch-hex">{values.hex}</div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2 className="section-title">Values</h2>
            <CopyButton value={formatValueList(values, pantone, name?.item.name)} label="all values" text="Copy all" />
          </div>
          <div className="card card-surface values-card">
            <ul className="value-list">
              {rows.map((r) => (
                <li key={r.label} className="value-row">
                  <span className="value-tag">{r.label}</span>
                  <span className="value-text">{r.value}</span>
                  <CopyButton value={r.copy} label={r.label} />
                </li>
              ))}
              {pantone && (
                <li className="value-row">
                  <span className="value-tag">PMS</span>
                  <span className="value-text">
                    <span className="pantone-dot" style={{ background: pantone.hex }} />
                    {pantone.code}
                    <span className="value-note">
                      ΔE {pantone.deltaE.toFixed(1)} · approximate
                    </span>
                  </span>
                  <CopyButton value={`PANTONE ${pantone.code}`} label="Pantone code" />
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>

      <section>
        <h2 className="section-title">Harmonies</h2>
        <div className="harmony-grid">
          {(Object.keys(HARMONY_LABELS) as HarmonyKind[]).map((kind) => (
            <div key={kind} className={`card harmony-card pastel-${HARMONY_TINT[kind]}`}>
              <div className="harmony-head">
                <h3>{HARMONY_LABELS[kind]}</h3>
                <HarmonySave
                  name={`${HARMONY_LABELS[kind]} · ${name?.item.name ?? values.hex}`}
                  colors={harmony(hex, kind)}
                  onSave={(n, c) => update((lib) => addPalette(lib, n, c, 'harmony'))}
                />
              </div>
              <div className="harmony-swatches">
                {harmony(hex, kind).map((h, i) => (
                  <button
                    key={`${h}-${i}`}
                    className="harmony-swatch"
                    style={{ background: h }}
                    title={`Load ${h}`}
                    onClick={() => load(h)}
                  />
                ))}
              </div>
              <div className="harmony-hexes">
                {harmony(hex, kind).map((h, i) => (
                  <span key={`${h}-${i}`}>{h.slice(1)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid-bottom">
        <section>
          <h2 className="section-title">Tints &amp; shades</h2>
          <div className="card card-surface ramp-card">
            <div className="ramp">
              {[...shades(hex).reverse(), values.hex, ...tints(hex)].map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  className={`ramp-step${i === 5 ? ' is-base' : ''}`}
                  style={{ background: h, color: readableOn(h) }}
                  title={`Load ${h}`}
                  onClick={() => load(h)}
                >
                  <span>{h.slice(1)}</span>
                </button>
              ))}
            </div>
            <div className="ramp-legend">
              <span>Shades</span>
              <span>Base</span>
              <span>Tints</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title">Contrast</h2>
          <div className="card accent-card">
            <ContrastRow label="On white" bg="#FFFFFF" fg={hex} result={wcag(hex, '#FFFFFF')} />
            <ContrastRow label="On black" bg="#000000" fg={hex} result={wcag(hex, '#000000')} />
            <p className="accent-foot">WCAG 2.2 · AA needs 4.5:1 for body text, 3:1 for large text</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ContrastRow({ label, bg, fg, result }: { label: string; bg: string; fg: string; result: WcagResult }) {
  const badges: [string, boolean][] = [
    ['AA', result.aaNormal],
    ['AA Large', result.aaLarge],
    ['AAA', result.aaaNormal],
    ['AAA Large', result.aaaLarge],
  ];
  return (
    <div className="contrast-row">
      <div className="contrast-sample" style={{ background: bg, color: fg }}>
        Aa
      </div>
      <div className="contrast-body">
        <div className="contrast-top">
          <span className="contrast-label">{label}</span>
          <span className="contrast-ratio">{result.ratio.toFixed(2)}:1</span>
        </div>
        <div className="contrast-badges">
          {badges.map(([name, pass]) => (
            <span key={name} className={`badge ${pass ? 'is-pass' : 'is-fail'}`}>
              {pass ? '✓' : '✕'} {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HarmonySave({ name, colors, onSave }: { name: string; colors: string[]; onSave: (name: string, colors: string[]) => void }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1200);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      className={`icon-btn icon-btn-sm${done ? ' is-done' : ''}`}
      title="Save as palette"
      aria-label={`Save ${name} as palette`}
      onClick={() => {
        onSave(name, colors);
        setDone(true);
      }}
    >
      {done ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
    </button>
  );
}
