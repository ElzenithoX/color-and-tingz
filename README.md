# color&tingz

An offline colour toolkit for Windows, made by Elzenitho. The Design Bender.

## Download

**[⬇ Download the latest version](https://github.com/ElzenithoX/color-and-tingz/releases/latest)**

1. Under **Assets**, download `color-and-tingz-<version>-windows.zip`. The "Source code" links are the code, not the app.
2. Right-click the zip and choose **Extract All**.
3. Double-click `color-and-tingz-Setup-<version>.exe` and follow the installer.
4. Windows may say "Windows protected your PC", because the app isn't code-signed yet. Click **More info**, then **Run anyway**.
5. Open **color&tingz** from the Start menu or the desktop shortcut. It works fully offline.

Requires Windows 10 or 11 (64-bit).

### iPhone, iPad, Android and Mac: use the web app

**[Open color&tingz on the web](https://elzenithox.github.io/color-and-tingz/)**

To install it on an iPhone or iPad, open the link in **Safari**, tap **Share**, then **Add to Home Screen**. It then opens full-screen like an app and works offline. On Android, open it in Chrome and choose **Install app**.

In the web app, saved colours stay in that browser on that device. Exports open the share sheet, so you can save images to Photos or files to Files.

## Features

- **Converter**: type HEX, RGB, HSL, CMYK or a Pantone code. You get the nearest colour name, every format, harmonies, tints and shades, and WCAG contrast.
- **Image Palette**: drop in an image to get its 6–10 dominant colours, then export them as PNG, CSS or JSON.
- **Gradient Creator**: linear or radial gradients in OKLCH or sRGB, with CSS output, stepped swatches and PNG export.
- **Saved**: colours and palettes, stored in `%APPDATA%\color-and-tingz\saved.json`.

## Commands

In Windows PowerShell, type `npm.cmd` instead of `npm`. Script execution is blocked by default, so plain `npm` fails.

| Command | What it does |
| --- | --- |
| `npm.cmd install` | Install dependencies (needs internet, once) |
| `npm.cmd run dev` | Run the app with live reload |
| `npm.cmd test` | Run the unit tests |
| `npm.cmd run dist` | Build the installer into `release\<version>\color-and-tingz-Setup-<version>.exe` |
| `npm.cmd run dev:web` | Run the web app with live reload (opens `/web.html`) |
| `npm.cmd run build:web` | Build the web app into `dist-web\` |

Every push to `master` rebuilds the web app and publishes it to GitHub Pages (`.github/workflows/web.yml`). The web-only files (`web.html` and the `web/` folder, which holds the phone layout, offline support and icons) are never part of the Windows app.

## Customising

- **Logo**: replace `src/assets/logo.svg`. The sidebar draws the cream tile behind it.
- **App icon**: `build/icon.ico` (Windows, 16–256 px) and `build/icon.png` (1024 px). Rebuild with `npm.cmd run dist` after changing them.
- **Pantone table**: `src/data/pantone.json`, as `[{ "code": "320 C", "hex": "#009CA6" }]`. It's bundled into the app, so rebuild after editing. Every Pantone match is shown as approximate.

## Notes

- Every dependency is a `devDependency`. Vite bundles everything the app uses into `dist/`, so the installer doesn't need to ship `node_modules`.
- The installer isn't code-signed. Windows SmartScreen will warn on first run: choose "More info", then "Run anyway". Signing requires a code-signing certificate.
- Uninstalling keeps `saved.json`.
