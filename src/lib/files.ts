export type SaveResult = 'saved' | 'cancelled';

const TYPES: Record<string, { filterName: string; mime: string }> = {
  png: { filterName: 'PNG image', mime: 'image/png' },
  css: { filterName: 'CSS', mime: 'text/css' },
  json: { filterName: 'JSON', mime: 'application/json' },
};

/**
 * Saves a file: through Electron's save dialog in the Windows app. In the web
 * app it uses the share sheet on phones (Save Image, Save to Files…) and a
 * normal download elsewhere.
 */
export async function saveFile(baseName: string, extension: 'png' | 'css' | 'json', data: string | Uint8Array): Promise<SaveResult> {
  const type = TYPES[extension];
  const defaultName = `${baseName}.${extension}`;
  if (window.ctz) {
    const path = await window.ctz.saveFile({ defaultName, filterName: type.filterName, extension, data });
    return path ? 'saved' : 'cancelled';
  }

  const file = new File([data as BlobPart], defaultName, { type: type.mime });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'saved';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason: fall back to a download.
    }
  }

  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: defaultName });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
