import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { PantoneEntry } from '../lib/color/pantone';
import { pantoneIndex } from '../lib/colorData';

interface Props {
  value: string;
  onChange: (text: string) => void;
  /** Called when a code is chosen from the list, or typed exactly. */
  onPick: (entry: PantoneEntry) => void;
}

/**
 * Search box for Pantone codes with a list of matches, each with its swatch.
 * Arrow keys move through the list; Enter picks; Escape closes it.
 */
export default function PantoneField({ value, onChange, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = useMemo(() => pantoneIndex().search(value, 8), [value]);
  // Hide the list once the box holds exactly the chosen code.
  const showList = open && results.length > 0 && !(results.length === 1 && results[0].code === value);

  const pick = (entry: PantoneEntry) => {
    onChange(entry.code);
    onPick(entry);
    setOpen(false);
  };

  const type = (text: string) => {
    onChange(text);
    setOpen(true);
    setActive(0);
    const exact = pantoneIndex().find(text);
    if (exact) onPick(exact);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === 'Enter' && showList) {
      e.preventDefault();
      pick(results[Math.min(active, results.length - 1)]);
    }
  };

  return (
    <div className="pantone-field">
      <input
        className="color-input-text"
        value={value}
        onChange={(e) => type(e.target.value)}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        role="combobox"
        aria-label="Pantone code"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        placeholder="Search: 320 C, Reflex Blue…"
      />
      {showList && (
        <ul className="pantone-list" id={listId} role="listbox" aria-label="Matching Pantone codes">
          {results.map((entry, i) => (
            <li
              key={entry.code}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: picking must happen before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(entry);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="pantone-option-dot" style={{ background: entry.hex }} />
              <span className="pantone-option-code">{entry.code}</span>
              <span className="pantone-option-hex">{entry.hex}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
