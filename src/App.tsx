import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar, { type Screen } from './components/Sidebar';
import Converter, { type ConverterRequest } from './screens/Converter';
import ImagePalette from './screens/ImagePalette';
import GradientCreator from './screens/GradientCreator';
import Saved from './screens/Saved';
import { useTheme } from './lib/theme';
import { LibraryProvider } from './lib/useLibrary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('converter');
  const [theme, toggleTheme] = useTheme();
  const [converterRequest, setConverterRequest] = useState<ConverterRequest | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [screen]);

  // A file dropped outside a drop zone must not replace the app with that file.
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const openInConverter = useCallback((hex: string) => {
    setConverterRequest((r) => ({ hex, seq: (r?.seq ?? 0) + 1 }));
    setScreen('converter');
  }, []);

  // Screens stay mounted (just hidden) so each keeps its state when you switch away.
  return (
    <LibraryProvider>
      <div className="frame">
        <div className="titlebar">
          <span className="credit">
            Made by <strong>Elzenitho</strong>. The Design Bender
          </span>
        </div>
        <Sidebar current={screen} onSelect={setScreen} theme={theme} onToggleTheme={toggleTheme} />
        <main className="panel" ref={panelRef}>
          <div hidden={screen !== 'converter'}>
            <Converter request={converterRequest} />
          </div>
          <div hidden={screen !== 'palette'}>
            <ImagePalette />
          </div>
          <div hidden={screen !== 'gradient'}>
            <GradientCreator />
          </div>
          <div hidden={screen !== 'saved'}>
            <Saved onOpenColor={openInConverter} />
          </div>
        </main>
      </div>
    </LibraryProvider>
  );
}
