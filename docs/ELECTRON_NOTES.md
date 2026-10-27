# Electron versions: what to watch

StickyPad uses Electron `^44.9.3` (so any 44.x). Checked against the Electron breaking-changes list for versions 40 to 45 on 2026-10-27, after "New note from the clipboard" silently did nothing: Electron 44 made `clipboard.readText()` (and `read`, `write`, `writeText`, `has`) return Promises.

| Change | Version | StickyPad |
|---|---|---|
| `clipboard` methods return Promises; many helpers (e.g. `availableFormats`, `readImage`) removed | 44 | `readText` is awaited and pictures use `clipboard.read()`; `writeText` is only called to write (its Promise is ignored on purpose). Renderer code uses `navigator.clipboard`. |
| `app.setLoginItemSettings()` `openAsHidden` and the `wasOpenedAsHidden` / `restoreState` fields removed | 44 | Only `openAtLogin` is used. Nothing to do. |
| `dialog.showOpenDialog*` / `showSaveDialog*` `defaultPath` now defaults to Downloads | 43 | Every dialog sets its own `defaultPath`. Nothing to do. |
| `nativeImage.toBitmap()` normalised to sRGB | 43 | Not used (only `createFromPath`). |
| `safeStorage.isEncryptionAvailable/encryptString/decryptString` deprecated, removed in 46 | 45 | Used for the Claude API key. **Before moving to Electron 45 or 46 switch to the async versions.** |
| Windows ia32 and Linux armv7l builds removed | 44 | StickyPad builds x64 only. |

Rule of thumb: when Electron's major version changes, read its breaking-changes page and test every feature that talks to Windows (shortcuts, clipboard, tray, dialogs, login item, notifications, printing).
