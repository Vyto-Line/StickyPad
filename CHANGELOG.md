# Changelog

## 1.12.1
- **Copy note as text**: one click (Settings tab *Note* > "Copy note as text") or **Ctrl+Alt+C** copies the whole note to the clipboard as plain text: the topic first, checklist items as `[ ]` / `[x]`, pictures left out. Handy for pasting a list into an email or chat.

## 1.12.0
- **Auto-update**: when StickyPad starts (and every 6 hours while it runs) it looks for a newer version on this GitHub repo's Releases, downloads it in the background and asks whether to restart now or install when you quit. Settings > About has a switch and a "Check now" button. Only works in the installed app.
- **Select all + Delete fixed**: Ctrl+A followed by Delete, Backspace, Ctrl+X or typing now replaces the *whole* note, including checklist items and pictures, even when a picture was selected or the focus was outside the text. Ctrl+A works from anywhere in the note window.
- **Big notes made safer**: a checklist item damaged by a rough multi-item delete is repaired instead of stopping the note from saving; undo history is capped by size (a multi-megabyte note no longer eats memory); the "is the note empty" check no longer builds a giant string on every key.
- **More recommended models**: Gemma 3 (1B, 4B, 12B), Qwen 2.5 (3B, 7B), Phi-4 mini and Mistral 7B join the Llama models, 10 in total, from 0.8 GB to 8 GB.
- Reasoning models' `<think>` text is never shown.


## 1.11.0
- `build.bat` and `start-dev.bat` download Node.js automatically if it is not installed (`get-node.bat` / `get-node.ps1`).
- **Better Greek**: Greek notes get Greek-specific instructions (accents/τόνοι, final ς, ν ephelkystikon, ό,τι/ότι, ι/η/υ/ει/οι spelling), a worked example, and a safety check that rejects answers that were translated to English or rewritten wildly. Summaries of Greek notes are written in Greek. Added Gemma 3 4B and Qwen 2.5 7B (both good at Greek) to the recommended models.
- **Long notes fixed**: notes were silently cut off after 400 blocks (so the last lines vanished after a save). The limit is now 50,000 blocks / 5 MB of text per block. The AI chat also kept only the first 6,000 characters of a note; it now sends up to 40,000 and, beyond that, keeps the start *and the end*.
- **Long notes and the AI**: Fix grammar, Summarize and To checklist work on any length by processing the note in chunks (summaries are merged so the end counts as much as the start). The model's context window is sized to the text so nothing is dropped.
- **Use your notes everywhere**: Settings > Data & backup > "Choose folder…" moves the data folder into any synced folder (OneDrive, Dropbox, Google Drive, Syncthing). Other PCs using the same folder see changes within seconds; if two PCs edit at once the other version is kept in `conflicts/`. Saves are now atomic (temp file + rename) so a crash can't corrupt `notes.json`.
- **SQLite export/import** (`tools/stickypad_db.py`): turns the notes into a small `stickypad.db` and back, as the data format for other apps or an Android client.
- Open source: tests (`npm test`), CI that builds the installer, MIT licence.

## 1.10.0
- **Live AI edit**: AI tab > "Edit live" (or Ctrl+Shift+E). The text you selected, or the block with your cursor, is rewritten in front of you as the model types. Fix spelling and grammar / polish / shorten / friendlier / continue writing. Stop (or Esc) puts your text back; Undo reverts a finished edit.
- **Model list instead of typing**: pick from your installed Ollama models, or choose a recommended Llama (3.2 1B, 3.2 3B, 3.1 8B) and it downloads through Ollama with a progress bar. "Other" still lets you type any model name.
- **Install Ollama from the app**: if Ollama is missing, one button downloads the official installer, runs it and starts Ollama. If it is installed but stopped, "Start Ollama".
- **Faster AI**: the model stays loaded for 30 minutes and is warmed up at launch, replies are length-capped, answers stream.
- **Settings on the note**: a gear in the note's popover tab bar (and Ctrl+,) opens the full Settings window.
- **More compact**: tighter note, All notes, Settings and chat layouts.
- **Lighter build**: only English and Greek Chromium locales, maximum compression, and build.bat can delete the ~1 GB of build leftovers afterwards (the installer is all you keep).

## 1.9.0
- Settings window (gear icon in every note and in All notes, tray menu "Settings...", or Ctrl+Alt+S). Eight categories,
  each setting with a title and a short explanation, plus a search box that finds any setting:
  General (start with Windows, what opens on launch, startup animation, hide from taskbar, your name, greeting language),
  Appearance (theme, apply to all notes, default text size), Notes (snapping, snap distance, how long deleted notes are
  kept, empty trash), Shortcuts (global shortcuts on/off and a cheat sheet), AI (provider, model, key, test, chat history),
  Folders (add, rename, delete), Data & backup (daily automatic backup, back up now, open folders), About.
- Gear icon replaces the old "..." button; the popover has an "All settings..." link.
- Smaller topic box with a bigger strip for dragging the window (the topic grows while you type; hover for the full text).
- Automatic backup: once a day StickyPad copies notes.json, the chat history and the pictures into
  %APPDATA%\StickyPad\backups (newest 7 kept). To restore, close StickyPad and copy a backup's files back into %APPDATA%\StickyPad.
- Fixed: switching the AI provider no longer keeps the other provider's model name.
