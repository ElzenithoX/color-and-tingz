import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { BookmarkPlus, CircleAlert, FileCode2, FileJson, ImagePlus, ImageDown, Upload } from 'lucide-react';
import CopyButton from '../components/CopyButton';
import { describe, format } from '../lib/color/convert';
import { extractPalette } from '../lib/color/palette';
import { paletteFileBase, paletteToCss, paletteToJson, type NamedSwatch } from '../lib/color/paletteExport';
import { readableOn } from '../lib/color/contrast';
import { nameIndex } from '../lib/colorData';
import { loadImage, renderPalettePng, type LoadedImage } from '../lib/image';
import { saveFile } from '../lib/files';
import { addPalette } from '../lib/library';
import { useLibrary } from '../lib/useLibrary';

const COUNTS = [6, 7, 8, 9, 10];

type Status = { kind: 'info' | 'error'; text: string } | null;

export default function ImagePalette() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [count, setCount] = useState(8);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { update } = useLibrary();

  // Free the previous preview when the image changes or the screen goes away.
  useEffect(() => () => (image ? URL.revokeObjectURL(image.url) : undefined), [image]);

  useEffect(() => {
    if (status?.kind !== 'info') return;
    const t = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const swatches: NamedSwatch[] = useMemo(() => {
    if (!image) return [];
    return extractPalette(image.pixels, count).map((c) => ({
      ...c,
      name: nameIndex().nearest(c.hex)?.item.name ?? 'Unnamed',
    }));
  }, [image, count]);

  const open = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ kind: 'error', text: `${file.name} isn't an image.` });
      return;
    }
    setBusy(true);
    try {
      setImage(await loadImage(file));
      setStatus(null);
    } catch {
      setStatus({ kind: 'error', text: `Couldn't read ${file.name}. Try a PNG, JPG or WebP.` });
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    open(e.dataTransfer.files[0]);
  };

  const exportAs = async (kind: 'png' | 'css' | 'json') => {
    if (!swatches.length) return;
    const base = paletteFileBase(image?.name);
    try {
      const data =
        kind === 'png'
          ? await renderPalettePng(swatches)
          : kind === 'css'
            ? paletteToCss(swatches, image?.name)
            : paletteToJson(swatches, image?.name);
      const result = await saveFile(base, kind, data);
      if (result === 'saved') setStatus({ kind: 'info', text: `${kind.toUpperCase()} saved` });
    } catch {
      setStatus({ kind: 'error', text: `Couldn't save the ${kind.toUpperCase()} file.` });
    }
  };

  const savePalette = () => {
    if (!swatches.length) return;
    const name = image ? image.name.replace(/\.[^.]+$/, '') : 'Image palette';
    update((lib) => addPalette(lib, name, swatches.map((s) => s.hex), 'image'));
    setStatus({ kind: 'info', text: 'Palette saved to Saved' });
  };

  return (
    <div
      className="screen"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <header className="screen-header">
        <h1>Image Palette</h1>
        <div className="header-actions">
          <div className="count-picker" role="radiogroup" aria-label="Number of colours">
            <span>Colours</span>
            {COUNTS.map((n) => (
              <button key={n} role="radio" aria-checked={count === n} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
          <button className="dark-btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} strokeWidth={2} /> Upload image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              open(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      <div className="grid-palette">
        <section>
          <h2 className="section-title">Image</h2>
          <button
            className={`card dropzone${image ? ' has-image' : ''}${dragging ? ' is-dragging' : ''}`}
            onClick={() => fileRef.current?.click()}
            aria-label={image ? `Replace ${image.name}` : 'Choose an image'}
          >
            {image ? (
              <>
                <img src={image.url} alt="" draggable={false} />
                <span className="dropzone-caption">
                  {image.name} · {image.width}×{image.height}
                </span>
              </>
            ) : (
              <span className="dropzone-empty">
                <span className="dropzone-icon">
                  <ImagePlus size={28} strokeWidth={1.7} />
                </span>
                <strong>{busy ? 'Reading image…' : 'Drop an image here'}</strong>
                <span>or click to browse · PNG, JPG, WebP, GIF, SVG</span>
              </span>
            )}
          </button>
        </section>

        <section>
          <h2 className="section-title">Palette</h2>
          <div className="card accent-card palette-accent">
            {swatches.length ? (
              <div className="palette-strip">
                {swatches.map((s) => (
                  <span key={s.hex} style={{ background: s.hex, flexGrow: Math.max(s.share, 0.04) }} title={`${s.name} ${s.hex}`} />
                ))}
              </div>
            ) : (
              <div className="palette-strip is-empty" />
            )}
            <div>
              <p className="accent-title">
                {swatches.length ? `${swatches.length} colours found` : 'Your palette appears here'}
              </p>
              <p className="accent-sub">
                {swatches.length
                  ? 'Picked with k-means, sorted by how much of the image each colour covers.'
                  : 'Colours are extracted on this computer; nothing is uploaded.'}
              </p>
            </div>
            <div className="export-row">
              <button className="light-btn" disabled={!swatches.length} onClick={() => exportAs('png')}>
                <ImageDown size={15} /> PNG
              </button>
              <button className="light-btn" disabled={!swatches.length} onClick={() => exportAs('css')}>
                <FileCode2 size={15} /> CSS
              </button>
              <button className="light-btn" disabled={!swatches.length} onClick={() => exportAs('json')}>
                <FileJson size={15} /> JSON
              </button>
            </div>
            <button className="ghost-btn" disabled={!swatches.length} onClick={savePalette}>
              <BookmarkPlus size={15} /> Save palette
            </button>
            {status && (
              <p className={`accent-status${status.kind === 'error' ? ' is-error' : ''}`} role="status">
                {status.kind === 'error' && <CircleAlert size={14} />} {status.text}
              </p>
            )}
          </div>
        </section>
      </div>

      {swatches.length > 0 && (
        <section>
          <h2 className="section-title">Colours</h2>
          <div className="swatch-grid">
            {swatches.map((s) => (
              <SwatchCard key={s.hex} swatch={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SwatchCard({ swatch }: { swatch: NamedSwatch }) {
  const v = describe(swatch.hex);
  const rows: [string, string, string][] = [
    ['HEX', v.hex, v.hex],
    ['RGB', v.rgb.join(', '), format.rgb(v.rgb)],
    ['HSL', `${v.hsl[0]}°, ${v.hsl[1]}%, ${v.hsl[2]}%`, format.hsl(v.hsl)],
    ['CMYK', v.cmyk.join(', '), format.cmyk(v.cmyk)],
  ];
  return (
    <div className="card card-surface palette-card">
      <div className="palette-card-swatch" style={{ background: v.hex, color: readableOn(v.hex) }}>
        <span>{Math.round(swatch.share * 100)}%</span>
      </div>
      <div className="palette-card-name" title={swatch.name}>
        {swatch.name}
      </div>
      <ul className="palette-card-codes">
        {rows.map(([label, value, copy]) => (
          <li key={label}>
            <span className="code-label">{label}</span>
            <span className="code-value">{value}</span>
            <CopyButton value={copy} label={`${label} ${value}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
