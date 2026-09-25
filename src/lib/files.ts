export type SaveResult = 'saved' | 'cancelled';

const TYPES: Record<string, { filterName: string; mime: string }> = {
  png: { filterName: 'PNG image', mime: 'image/png' },
  css: { filterName: 'CSS', mime: 'text/css' },
  json: { filterName: 'JSON', mime: 'application/json' },
};

/**
 * Saves a file: through Electron's save dialog in the app, or as a browser
 * download when the renderer runs on its own (`vite --mode web`).
 */
export async function saveFile(baseName: string, extension: 'png' | 'css' | 'json', data: string | Uint8Array): Promise<SaveResult> {
  const type = TYPES[extension];
  const defaultName = `${baseName}.${extension}`;
  if (window.ctz) {
    const path = await window.ctz.saveFile({ defaultName, filterName: type.filterName, extension, data });
    return path ? 'saved' : 'cancelled';
  }
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: type.mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: defaultName });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
