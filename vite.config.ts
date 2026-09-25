import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import webApp from './web/vite-plugin-web';

export default defineConfig(async ({ mode }) => {
  // `--mode web` builds the web app (web.html → dist-web) without Electron.
  // Every other mode is the Windows app, unchanged.
  const web = mode === 'web';
  return {
    base: './',
    ...(web && {
      publicDir: 'web/public',
      build: { outDir: 'dist-web', emptyOutDir: true, rolldownOptions: { input: 'web.html' } },
    }),
    plugins: [
      react(),
      ...(web ? [webApp('dist-web')] : []),
      // Tests don't need Electron, and starting it there would launch a window.
      ...(mode === 'test' || web
        ? []
        : await electron({
            main: { entry: 'electron/main.ts' },
            preload: { input: 'electron/preload.ts' },
          })),
    ],
    test: {
      include: ['src/**/*.test.ts'],
    },
  };
});
