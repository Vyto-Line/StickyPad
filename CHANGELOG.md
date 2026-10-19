# Changelog

## 1.14.0
- **Much lower memory use.** New *Low memory mode* (Settings > General, on by default, applies after a restart): StickyPad no longer starts the separate graphics-card process, trims background services Chromium does not need for sticky notes, and tunes the JavaScript engine for size.
- **The AI model is no longer loaded at start.** It used to be preloaded and kept in memory for 30 minutes, which could take several GB. Now it loads when you open the AI tab or chat, stays for 5 minutes by default, and *Settings > AI > Keep the model in memory* lets you choose Unload right away, 5 minutes or 30 minutes.
- **Pictures are read from files** instead of being copied into the page as huge text, which saves memory in notes with many images.
- **Memory meter**: Settings > About > *Measure* shows how much memory StickyPad uses right now, split into notes, main process, graphics and other. Press it with Low memory mode on and off to see the difference on your PC.
- Smaller things: the notes file is written in a compact form, notes open one after another at start instead of all at once, and the undo history of very large notes is capped by size.

## 1.13.2
- **Update log**: Settings > About has two new buttons. *Open update log* shows a small text file that records what each update check did and, if it failed, the exact reason. *Releases page* opens the GitHub releases so you can download the newest installer yourself. This makes it easy to find out why an update does not arrive.

## 1.13.1
- **Auto-update is more reliable**: StickyPad now asks GitHub directly for the newest release that really has its installer files (`latest.yml`) and updates from that one. Before, an empty release (for example one created with a tag without the `v`) or a stale releases feed could make it answer "No downloadable update was found" even though a newer version existed. The message now also says to wait a few minutes after publishing, and shows the technical detail.

## 1.13.0
- **Find in a note (Ctrl+F)**: a search bar with every match highlighted, Enter / Shift+Enter (or F3) to jump between them, and a counter. Ignores capital letters and Greek accents, so `καλημερα` finds `Καλημέρα`. Works inside checklist items too and never changes your text.
- **Reminders**: in the gear panel, tab *Note* > *Reminder*, pick a date and time (or press 10 min / 1 hour / 3 hours / Tomorrow 9:00) and Windows shows a notification that opens the note. A reminder that came due while StickyPad was closed fires when you start it. A small dot on the gear shows that a note has a reminder.
- **Version history**: StickyPad keeps up to 30 older copies of each note while you edit (one at least every 5 minutes, and always before a sudden big deletion). *Note* > *Version history…* lists them with time, word count and a preview; **Restore** brings one back and keeps today's version in the list too. Locked notes keep no copies.
- **Export and import**: *Note* > *Export…* saves one note as a Markdown (.md) or text (.txt) file; Settings > Data & backup has **Export all notes** (one file per note, in folders like yours) and **Import notes** (`.md` / `.txt`; lines such as `- [ ] item` become checklist items).
- **Translate Greek ⇄ English**: a new button in the AI tab, and an option in the *Edit live* list. Greek text becomes English, anything else becomes Greek; the translation streams into the note like the other live edits (select the part you want, or leave the cursor in a paragraph) and Undo brings the original back.
- **Missing AI model is spotted early**: if the model you chose is not downloaded (or Ollama is not running), the AI tab says so straight away and tells you where to press Download, instead of failing on the first request.
- **Fix**: "Copy note as text" now uses **Ctrl+Shift+T** (the 1.12.1 shortcut Ctrl+Alt+C was already taken by the global "open chat" shortcut).
- Already there, no change needed: the global **Ctrl+Alt+N** (new note from anywhere in Windows; switch in Settings > Shortcuts).

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
