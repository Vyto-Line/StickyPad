# Architecture

## Layout
| File | Role |
|---|---|
| `main.js` | Electron main process: windows, tray, shortcuts, storage, IPC |
| `preload.js` | the only bridge (`window.api`) between the pages and the main process |
| `note.*`, `all.*`, `chat.*`, `settings.*`, `splash.*` | the screens: plain HTML/CSS/JS, no framework, no bundler |
| `ai.js` | prompts, Greek rules, chunking, streaming (Ollama and Claude API); pure Node |
| `ollama.js` | list/pull models, find/start/install Ollama; pure Node |
| `ollamaui.js` | model picker + install button shared by the note popover and Settings |
| `datadir.js` | movable data folder, atomic writes, conflict copies; pure Node |
| `backup.js`, `themes.js` | daily backups, colour themes |
| `tools/stickypad_db.py` | notes.json <-> SQLite |

Modules marked "pure Node" do not import Electron, so they are unit-tested directly (`npm test`).
The screens only talk to `window.api`, so they can be reused with a different backend.

## Data format (`notes.json`, version 2)
    { "version": 2, "notes": { "<id>": Note }, "trash": [Note + deletedAt], "groups": [{id, name}], "settings": {...} }
    Note  = { id, title, group, rolled, pinned, color, font, size, updated, bounds:{x,y,width,height},
              blocks:[{t:"text",v} | {t:"check",v,done} | {t:"img",id}], text (plain copy for search), lock? }
`lock` holds the AES-256-GCM ciphertext (scrypt key); locked notes have empty `blocks`/`text`.
Pictures are files in `images/`, referenced by id.

## SQLite (`tools/stickypad_db.py`)
`python tools/stickypad_db.py export` writes `stickypad.db` with tables `meta`, `groups`, `notes`, `blocks`, `images`
(see the docstring for columns). `import` writes it back, keeping a `notes.json.bak`. The round trip is lossless
(the full record is kept in `notes.data_json`), and edits made to the relational columns by another program are applied on import.
It is meant as the shared format for other clients (for example an Android app).

## Syncing between PCs
Move the data folder into a folder that a file-sync service keeps in sync (Settings > Data & backup). The app polls `notes.json`;
when another PC changed it and this PC has nothing unsaved, it reloads and refreshes the open notes. If both sides changed,
this PC's version is written and the other one is kept in `conflicts/`. Settings (shortcuts, AI key, startup) are per-PC;
note that the file also contains them, so the last PC to save wins for those. Writes are atomic.
Sync services copy whole files, so two PCs editing the same second can still conflict: that is what `conflicts/` is for.

## Tauri port (in progress, `src-tauri/`)
Goal: no bundled Chromium (the installer is about 2.5 MB instead of ~80 MB), and a path to Android (Tauri 2 mobile).

How it works: `scripts/prep-tauri.js` copies the existing screens into `src-tauri/ui` and generates a small `tauri-shim.js` from `preload.js`
that defines the same `window.api`; every call goes to one Rust command, `ipc(channel, args)`, whose channel names are the Electron ones
(`note:get`, `note:update`, ...). So the screens do not change and the Rust side is a table of handlers ported one by one from `main.js`.
`notes.json` / `images/` / `location.json` are read and written in the same format and place, so both apps can use the same data.

| Area | Status |
|---|---|
| Notes storage (load, atomic save, sanitising, empty/expired cleanup) | done, compiles in CI, not yet run on a PC |
| Note windows: open, move/resize remembered, pin, roll-up, new, close, delete to trash | done (same status) |
| Pictures (save/load) | done (same status) |
| Tray, All notes, trash window, folders, snap, tidy | not yet |
| Locked notes (AES-256-GCM + scrypt) | not yet |
| Settings window, themes apply-all, backups, data-folder sync, start with Windows | not yet |
| AI: summarize / grammar / checklist / chat / live edit, Ollama manager | not yet (reports itself as off) |
| Android | later: needs the Tauri mobile targets and a touch-friendly layout |

Build: GitHub Actions workflow *Tauri build (preview)* produces the Windows installer as a downloadable artifact on every push that touches the port.
Locally: install Rust + the MSVC build tools, then `node scripts/prep-tauri.js && npx @tauri-apps/cli@2 build`.
