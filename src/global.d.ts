/** API exposed by electron/preload.ts. Missing when the renderer runs in a plain browser. */
interface CtzApi {
  platform: string;
  saveFile(req: { defaultName: string; filterName: string; extension: string; data: string | Uint8Array }): Promise<string | null>;
  library: {
    /** Parsed saved.json, or null when there isn't one yet. */
    read(): Promise<unknown>;
    write(data: unknown): Promise<void>;
    /** Shows saved.json in File Explorer. */
    reveal(): Promise<void>;
  };
}

interface Window {
  ctz?: CtzApi;
}
