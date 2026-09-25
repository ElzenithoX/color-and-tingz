import { useEffect, useState } from 'react';
import { CircleAlert, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import CopyButton from '../components/CopyButton';
import { readableOn } from '../lib/color/contrast';
import { paletteToCss } from '../lib/color/paletteExport';
import { nameIndex } from '../lib/colorData';
import {
  removeColor,
  removePalette,
  renamePalette,
  restoreColor,
  restorePalette,
  type PaletteSource,
  type SavedColor,
  type SavedPalette,
} from '../lib/library';
import { useLibrary } from '../lib/useLibrary';

type Undo =
  | { kind: 'color'; item: SavedColor; index: number }
  | { kind: 'palette'; item: SavedPalette; index: number };

const SOURCE_LABEL: Record<PaletteSource, string> = {
  image: 'From image',
  gradient: 'Gradient',
  harmony: 'Harmony',
  manual: 'Palette',
};

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function Saved({ onOpenColor }: { onOpenColor: (hex: string) => void }) {
  const { library, loaded, saveError, update } = useLibrary();
  const [undo, setUndo] = useState<Undo | null>(null);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const deleteColor = (c: SavedColor) => {
    setUndo({ kind: 'color', item: c, index: library.colors.findIndex((x) => x.id === c.id) });
    update((lib) => removeColor(lib, c.id));
  };

  const deletePalette = (p: SavedPalette) => {
    setUndo({ kind: 'palette', item: p, index: library.palettes.findIndex((x) => x.id === p.id) });
    update((lib) => removePalette(lib, p.id));
  };

  const undoDelete = () => {
    if (!undo) return;
    const u = undo;
    update((lib) => (u.kind === 'color' ? restoreColor(lib, u.item, u.index) : restorePalette(lib, u.item, u.index)));
    setUndo(null);
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Saved</h1>
        {window.ctz && (
          <button className="pill-btn pill-btn-lg" onClick={() => window.ctz!.library.reveal()} title="Show saved.json in File Explorer">
            <FolderOpen size={16} /> Show file
          </button>
        )}
      </header>

      {saveError && (
        <p className="banner-error" role="alert">
          <CircleAlert size={16} /> Couldn't write saved.json. Your latest changes may not be kept after closing the app.
        </p>
      )}

      <section>
        <h2 className="section-title">
          Colours <span className="count">{library.colors.length}</span>
        </h2>
        {loaded && library.colors.length === 0 ? (
          <div className="card empty-card">
            <strong>No saved colours yet</strong>
            <span>Use the Save button on the Converter's colour card.</span>
          </div>
        ) : (
          <div className="saved-colors">
            {library.colors.map((c) => (
              <div key={c.id} className="card card-surface saved-color">
                <button
                  className="saved-color-swatch"
                  style={{ background: c.hex, color: readableOn(c.hex) }}
                  onClick={() => onOpenColor(c.hex)}
                  title="Open in Converter"
                >
                  <span>Open</span>
                </button>
                <div className="saved-color-info">
                  <div className="saved-color-name" title={c.name}>
                    {c.name}
                  </div>
                  <div className="saved-color-hex">{c.hex}</div>
                </div>
                <div className="saved-color-actions">
                  <CopyButton value={c.hex} label={c.hex} />
                  <button className="icon-btn" onClick={() => deleteColor(c)} title="Delete" aria-label={`Delete ${c.name}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">
          Palettes <span className="count">{library.palettes.length}</span>
        </h2>
        {loaded && library.palettes.length === 0 ? (
          <div className="card empty-card">
            <strong>No saved palettes yet</strong>
            <span>Save one from Image Palette, Gradient Creator, or a harmony card in the Converter.</span>
          </div>
        ) : (
          <div className="saved-palettes">
            {library.palettes.map((p) => (
              <PaletteCard
                key={p.id}
                palette={p}
                onRename={(name) => update((lib) => renamePalette(lib, p.id, name))}
                onDelete={() => deletePalette(p)}
                onOpenColor={onOpenColor}
              />
            ))}
          </div>
        )}
      </section>

      {undo && (
        <div className="toast" role="status">
          <span>
            Deleted <strong>{undo.item.name}</strong>
          </span>
          <button onClick={undoDelete}>Undo</button>
        </div>
      )}
    </div>
  );
}

function PaletteCard({
  palette,
  onRename,
  onDelete,
  onOpenColor,
}: {
  palette: SavedPalette;
  onRename: (name: string) => void;
  onDelete: () => void;
  onOpenColor: (hex: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(palette.name);

  // Names are only needed for the CSS comments, so look them up on click.
  const css = () =>
    paletteToCss(
      palette.colors.map((hex) => ({ hex, name: nameIndex().nearest(hex)?.item.name ?? hex, share: 1 / palette.colors.length })),
      palette.name,
    );

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== palette.name) onRename(draft);
    else setDraft(palette.name);
  };

  return (
    <div className="card card-surface saved-palette">
      <div className="saved-palette-head">
        <div className="saved-palette-title">
          {editing ? (
            <input
              autoFocus
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                  setDraft(palette.name);
                  setEditing(false);
                }
              }}
              aria-label="Palette name"
            />
          ) : (
            <button className="saved-palette-name" onClick={() => setEditing(true)} title="Rename">
              <span>{palette.name}</span>
              <Pencil size={13} />
            </button>
          )}
          <span className="saved-palette-meta">
            {SOURCE_LABEL[palette.source]} · {palette.colors.length} colours · {dateFormat.format(new Date(palette.createdAt))}
          </span>
        </div>
        <div className="saved-palette-actions">
          <CopyButton value={palette.colors.join('\n')} label="hex list" />
          <LazyCopy getValue={css} />
          <button className="icon-btn" onClick={onDelete} title="Delete" aria-label={`Delete ${palette.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="saved-palette-strip">
        {palette.colors.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            style={{ background: hex, color: readableOn(hex) }}
            onClick={() => onOpenColor(hex)}
            title={`Open ${hex} in Converter`}
          >
            <span>{hex.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** "CSS" copy button whose text is built only when clicked. */
function LazyCopy({ getValue }: { getValue: () => string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1200);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      className={`icon-btn icon-text-btn${done ? ' is-done' : ''}`}
      title="Copy as CSS variables"
      onClick={() => navigator.clipboard.writeText(getValue()).then(() => setDone(true), () => undefined)}
    >
      {done ? '✓' : 'CSS'}
    </button>
  );
}
