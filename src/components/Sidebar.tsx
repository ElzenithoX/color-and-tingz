import { Bookmark, Blend, Image, Moon, Pipette, Sun, type LucideIcon } from 'lucide-react';
import logoUrl from '../assets/logo.svg';
import type { Theme } from '../lib/theme';

export type Screen = 'converter' | 'palette' | 'gradient' | 'saved';

const ITEMS: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'converter', label: 'Converter', icon: Pipette },
  { id: 'palette', label: 'Image Palette', icon: Image },
  { id: 'gradient', label: 'Gradient Creator', icon: Blend },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

interface Props {
  current: Screen;
  onSelect: (s: Screen) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Sidebar({ current, onSelect, theme, onToggleTheme }: Props) {
  return (
    <nav className="sidebar" aria-label="Sections">
      <img className="sidebar-logo" src={logoUrl} alt="color&tingz" draggable={false} />
      <ul className="sidebar-nav">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              className="sidebar-btn"
              aria-current={current === id ? 'page' : undefined}
              title={label}
              aria-label={label}
              onClick={() => onSelect(id)}
            >
              <Icon size={20} strokeWidth={1.8} />
            </button>
          </li>
        ))}
      </ul>
      <button
        className="sidebar-btn"
        title={theme === 'light' ? 'Dark theme' : 'Light theme'}
        aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        onClick={onToggleTheme}
      >
        {theme === 'light' ? <Moon size={20} strokeWidth={1.8} /> : <Sun size={20} strokeWidth={1.8} />}
      </button>
    </nav>
  );
}
