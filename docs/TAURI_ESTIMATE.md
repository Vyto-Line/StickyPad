# Tauri port: how much is left (2026-10-22)

Counted from the code, not guessed.

- `main.js` has 86 IPC handlers. The Rust side has **18** (21 %), the other **68** are missing.
- Main-process JavaScript to port: about **3,550 dense lines** (main.js 1,756 + ai.js 477 + the small modules). The Rust code that exists is **909 lines**.
- The screens (HTML/CSS/JS, 20 files) are reused unchanged through the shim, so the front end is not part of the work.

## Missing handlers by area
| Area | Missing | What it needs |
|---|---|---|
| Home / trash / folders (`all`, `trash`, `grp`) | 17 | lists, restore, purge, move, tidy, context menus |
| AI chat (`chat`) | 9 | streaming to the model, saving history, apply to note |
| Notes (`note`) | 8 | print, export/import, lock (AES-256-GCM + scrypt), reminders, panel |
| Search (`search`) | 6 | whole-note index, quick window, commands |
| Ollama (`ollama`) | 5 | start, pull with progress, delete, install |
| Settings (`settings`, `app`, `access`, `theme`, `ui`, `words`) | 14 | settings store, backups, data folder, log files, accessibility, themes |
| AI (`ai`), history (`hist`), welcome, what's new, drop import, home | 11 | edit stream, version history, tour windows |

Also not in the handler list but needed: the tray, global shortcuts, single-instance and "start again from the tray", splash, window placement on several screens, printing, auto-update signing.

## Rough size and time
- About **6,000 to 9,000 lines of Rust** (Rust is wordier than JavaScript).
- Roughly **many working sessions over 2 to 3 weeks**, plus test rounds on Alex's PC, because nothing here can be run in the cloud sandbox: it compiles and tests only on GitHub Actions.
- Installer afterwards: about **5 to 10 MB** (the unfinished port is 4.2 MB).
- The Node and window tests keep working for the screens; every Rust handler would need new `cargo test` tests.

## Risks
WebView2 differs from Electron's Chromium (focus, always-on-top, frameless and see-through windows, printing). This week's start-up and shortcut bugs were Electron-specific, but Tauri brings its own.
