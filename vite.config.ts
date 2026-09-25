import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(async ({ mode }) => ({
  base: './',
  plugins: [
    react(),
    // Tests and `--mode web` (renderer only, in a browser) skip Electron.
    ...(mode === 'test' || mode === 'web'
      ? []
      : await electron({
          main: { entry: 'electron/main.ts' },
          preload: { input: 'electron/preload.ts' },
        })),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
