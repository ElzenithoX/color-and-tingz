import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Display name has an "&", so keep it out of file paths: user data lives in
// %APPDATA%\color-and-tingz rather than %APPDATA%\color&tingz.
app.setName('color&tingz');
app.setPath('userData', path.join(app.getPath('appData'), 'color-and-tingz'));
if (process.platform === 'win32') app.setAppUserModelId('com.elzenithox.color-and-tingz');

const FRAME = '#161618';

function createWindow() {
  const win = new BrowserWindow({
    title: 'color&tingz',
    width: 1380,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: FRAME,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: FRAME, symbolColor: '#d8d8dc', height: 36 },
    // Installed builds take the icon from the exe; in development, point at it directly.
    ...(process.env.VITE_DEV_SERVER_URL ? { icon: path.join(__dirname, '../build/icon.png') } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Keep the page title from overwriting the window title.
  win.on('page-title-updated', (e) => e.preventDefault());

  // The app is offline: never navigate the window away, and open real links
  // in the default browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

interface SaveRequest {
  defaultName: string;
  filterName: string;
  extension: string;
  data: string | Uint8Array;
}

// Export: ask where to save, then write the file. Returns the path, or null if cancelled.
ipcMain.handle('file:save', async (event, req: SaveRequest) => {
  if (
    typeof req?.defaultName !== 'string' ||
    typeof req.filterName !== 'string' ||
    !/^[a-z0-9]{1,8}$/i.test(req.extension) ||
    !(typeof req.data === 'string' || req.data instanceof Uint8Array)
  ) {
    throw new Error('Invalid save request');
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  const options = {
    defaultPath: path.join(app.getPath('downloads'), path.basename(req.defaultName)),
    filters: [{ name: req.filterName, extensions: [req.extension] }],
  };
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, req.data);
  return result.filePath;
});

// Saved colours and palettes: %APPDATA%\color-and-tingz\saved.json.
// The renderer validates the contents (src/lib/library.ts); main only stores them.
const libraryPath = () => path.join(app.getPath('userData'), 'saved.json');

ipcMain.handle('library:read', async () => {
  let text: string;
  try {
    text = await readFile(libraryPath(), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
  try {
    return JSON.parse(text);
  } catch {
    // Keep an unreadable file rather than overwriting it on the next save.
    await rename(libraryPath(), libraryPath().replace(/\.json$/, `.corrupt-${Date.now()}.json`));
    return null;
  }
});

ipcMain.handle('library:write', async (_event, data: unknown) => {
  if (typeof data !== 'object' || data === null) throw new Error('Invalid library');
  const file = libraryPath();
  const tmp = `${file}.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  // Write then rename, so a crash mid-write never leaves a half-written file.
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
});

ipcMain.handle('library:reveal', async () => {
  const file = libraryPath();
  try {
    await readFile(file);
    shell.showItemInFolder(file);
  } catch {
    await mkdir(path.dirname(file), { recursive: true });
    await shell.openPath(path.dirname(file));
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
