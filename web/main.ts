// Web app entry: the same app as Windows, plus the phone layout and offline support.
// The Windows app (index.html → src/main.tsx) never loads this file.
import '../src/main';
import './mobile.css';

// Offline support: sw.js is generated at build time (web/vite-plugin-web.ts).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
