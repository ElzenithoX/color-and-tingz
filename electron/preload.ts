import { contextBridge, ipcRenderer } from 'electron';

// Shape is mirrored in src/global.d.ts.
contextBridge.exposeInMainWorld('ctz', {
  platform: process.platform,
  saveFile: (req: { defaultName: string; filterName: string; extension: string; data: string | Uint8Array }) =>
    ipcRenderer.invoke('file:save', req) as Promise<string | null>,
  library: {
    read: () => ipcRenderer.invoke('library:read') as Promise<unknown>,
    write: (data: unknown) => ipcRenderer.invoke('library:write', data) as Promise<void>,
    reveal: () => ipcRenderer.invoke('library:reveal') as Promise<void>,
  },
});
