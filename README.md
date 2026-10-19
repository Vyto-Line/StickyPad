# StickyPad

Colourful sticky notes for Windows, with a **local AI helper** (Ollama) that understands **Greek and English**, and notes you can keep in sync across PCs through any synced folder.

Each note is its own small window. Everything is stored on your PC; nothing is sent anywhere unless you choose an online AI provider.

## Features
- Notes: colours and 9 themes, any font and size, always-on-top pin, roll-up to just the title, pictures (paste or drop), checklists, folders, snap-to-edge/note, tidy-up, system tray, start with Windows
- **All notes** window with search, folders and a trash bin (restore for 30 days)
- **Lock** a note with a password (AES-256-GCM)
- **AI helper** (off by default): Summarize, Fix grammar, To checklist, a chat sidebar, and **live edit**, where the model rewrites your text in the note as it types (fix / polish / shorten / friendlier / continue)
  - Works with [Ollama](https://ollama.com) on your PC (free) or the Claude API (online)
  - Pick a model from a list; recommended ones download with a progress bar. If Ollama is missing, one button downloads and installs it
  - Long notes are handled in chunks, Greek has dedicated rules (accents, spelling, no translation)
- **Settings** window with every option, plus a gear on each note
- Daily automatic backups, movable data folder (use the same notes on every PC), SQLite export for other apps

## Install
Download **StickyPad Setup x.y.z.exe** from the [Releases](../../releases) page and run it. Windows SmartScreen may warn because the app is not code-signed; choose "More info", then "Run anyway".

### Build it yourself
Needs [Node.js LTS](https://nodejs.org). If you double-click `build.bat` or `start-dev.bat` and Node.js is missing, they download a private copy for you (checked against nodejs.org's checksum, no admin rights, kept in a `.node` folder).

    npm install
    npm start          # run from source
    npm run dist       # build the installer into dist/

On Windows you can double-click `build.bat` or `start-dev.bat` instead. `build.bat` can also delete the roughly 1 GB of build leftovers afterwards.

### Local AI in two minutes
1. Open a note, click the gear, choose the **AI** tab, set *Use* to **Ollama**
2. If you see "Ollama is not installed", press **Download and install Ollama**
3. Choose a model from the list (for Greek try *Gemma 3 4B* or *Qwen 2.5 7B*) and wait for the download
4. Select text (or put the cursor in a paragraph) and press **Edit live** (Ctrl+Shift+E)

## Shortcuts
Ctrl+N new note, Ctrl+Shift+C checklist item, Ctrl+Shift+E live AI edit, Ctrl+, all settings; global: Ctrl+Alt+N new note, Ctrl+Alt+A all notes, Ctrl+Alt+C chat, Ctrl+Alt+S settings.

## Your data
Stored in `%APPDATA%\StickyPad` (`notes.json`, `images/`, `chat.json`). Move it with *Settings > Data & backup > Choose folder*. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data format and the SQLite export (`tools/stickypad_db.py`).

## Development
    npm test                       # unit tests (Node)
    python tests/test_db.py        # SQLite export/import
    python tests/ui/t_ollama.py    # browser tests of the note/settings screens (needs Playwright)

Pull requests are welcome. Electron/Ollama behaviour on real hardware is only partly covered by the automated tests, so please report anything odd.

## Licence
[MIT](LICENSE)
