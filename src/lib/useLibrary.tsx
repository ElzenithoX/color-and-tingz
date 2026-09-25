import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyLibrary, normalizeLibrary, type Library } from './library';

/** Browser-only fallback (vite --mode web), so the screens work without Electron. */
const WEB_KEY = 'ctz-library';

const storage = {
  async read(): Promise<unknown> {
    if (window.ctz) return window.ctz.library.read();
    try {
      const s = localStorage.getItem(WEB_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  async write(lib: Library): Promise<void> {
    if (window.ctz) return window.ctz.library.write(lib);
    localStorage.setItem(WEB_KEY, JSON.stringify(lib));
  },
};

interface LibraryContext {
  library: Library;
  loaded: boolean;
  /** Set when the last save failed; cleared by the next successful one. */
  saveError: boolean;
  update: (change: (lib: Library) => Library) => void;
}

const Ctx = createContext<LibraryContext | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const current = useRef<Library>(library);
  // Saves run one after another so an older write can never land last.
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Changes wait for the first read, so an early save can't overwrite the file.
  const ready = useRef<Promise<void> | null>(null);

  if (!ready.current) {
    ready.current = storage
      .read()
      .then((raw) => {
        current.current = normalizeLibrary(raw);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    let alive = true;
    ready.current!.then(() => {
      if (!alive) return;
      setLibrary(current.current);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // `change` runs exactly once per call (outside React's updater), so ids it
  // generates are the same on screen and on disk.
  const update = useCallback((change: (lib: Library) => Library) => {
    ready.current!.then(() => {
      const prev = current.current;
      const next = change(prev);
      if (next === prev) return;
      current.current = next;
      setLibrary(next);
      queue.current = queue.current
        .then(() => storage.write(next))
        .then(
          () => setSaveError(false),
          () => setSaveError(true),
        );
    });
  }, []);

  const value = useMemo(() => ({ library, loaded, saveError, update }), [library, loaded, saveError, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
