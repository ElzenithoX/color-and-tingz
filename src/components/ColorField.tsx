import type { ReactNode } from 'react';
import { parseColorInput } from '../lib/color/parse';
import { pantoneIndex } from '../lib/colorData';

export interface ColorFieldState {
  text: string;
  /** Last valid colour typed, kept while the text is invalid. */
  hex: string;
}

export const fieldFrom = (hex: string): ColorFieldState => ({ text: hex, hex });

/** Applies typed text: updates `hex` only when the text parses. */
export function typeInto(state: ColorFieldState, text: string): ColorFieldState {
  const parsed = parseColorInput(text, pantoneIndex().find);
  return { text, hex: parsed ? parsed.hex : state.hex };
}

interface Props {
  label: string;
  state: ColorFieldState;
  onChange: (s: ColorFieldState) => void;
  /** Extra controls on the right, such as a remove button. */
  action?: ReactNode;
}

/** Compact colour input that accepts any supported format (HEX, RGB, HSL, CMYK, Pantone, CSS). */
export default function ColorField({ label, state, onChange, action }: Props) {
  const invalid = state.text.trim() !== '' && parseColorInput(state.text, pantoneIndex().find) === null;
  return (
    <div className={`color-field${invalid ? ' is-invalid' : ''}`}>
      <span className="color-field-dot" style={{ background: state.hex }} />
      <label className="color-field-body">
        <span className="color-field-label">{invalid ? `${label} · not recognised` : label}</span>
        <input
          value={state.text}
          onChange={(e) => onChange(typeInto(state, e.target.value))}
          onFocus={(e) => e.target.select()}
          // Leaving the field empty puts the last valid colour back.
          onBlur={() => state.text.trim() === '' && onChange(fieldFrom(state.hex))}
          spellCheck={false}
          placeholder="#07959D, 7,149,157, 320 C…"
        />
      </label>
      {action}
    </div>
  );
}
