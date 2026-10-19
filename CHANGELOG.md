# Changelog

## 1.14.15
- **Pick the AI model right in the chat.** *Ask the AI* has a model chip (🧠) in the message box: choose any model you have installed (or a Claude model) and the next answer uses it. *Get more models…* opens *Settings > AI*. When the AI is off, the chip becomes a button that takes you to *Settings > AI*, and the hints now say Settings instead of the old note menu.
- Not tried on a real Windows PC yet.

## 1.14.14
- **The startup animation now shows on PCs where it stayed invisible.** It used a see-through window, which many PCs do not draw when Low memory mode (the default) is on. It is now a normal dark card that works everywhere. If it cannot appear within 4 seconds, StickyPad just opens instead of waiting.
- **"Restart to update" is safer.** StickyPad now tidies up before it closes for an update (tray icon, shortcuts, timers), answers the button first, ignores a second launch while it is closing, and the new version waits for the old one to finish instead of giving up. Any error in the main program is written to `crash.log` (in `%APPDATA%\StickyPad`) instead of showing a Windows error box.
- Not tried on a real Windows PC yet.

## 1.14.13
- **"What's new" after an update.** The first time StickyPad starts after an update, a window lists what changed since your old version (you can switch it off there or in *Settings > About*, and open it any time with *Show what's new*). A new install does not show it.
- **The startup animation no longer flashes and vanishes** on a slow start: its 2.7 seconds now count from the moment it appears, and it starts only once the window is visible.
- Not tried on a real Windows PC yet.

## 1.14.12
This release also contains everything from 1.14.8 to 1.14.11 (Home window, themes with light and dark, the new note panel, the neon update bar, deleting AI models).
- **Better local AI models.** The download list now offers current models: **Gemma 4** (E2B, E4B, 12B) and **Qwen3** (1.7B to 14B), plus Gemma 3 4B and Llama 3.2 3B, each with a note on its Greek. For Greek, Gemma 4 E4B is the pick on a PC with 16 GB of RAM. Models you already have stay in the list.
- **Better instructions for the AI.** The note is now always sent marked as text to work on (between note tags, with the task repeated after it). Small models used to answer what a note said ("Call Nick…") instead of summarising, titling, making a checklist or editing it.
- Qwen3 and other reasoning models are told not to "think out loud": much faster, and their thinking can no longer appear in your note during a live edit. Older Ollama versions that do not know this setting are handled.
- Translating into Greek no longer tells the model that the (English) text "is Greek", which confused small models.
- **Settings has one menu**: its pages are listed under *Settings* in the Home sidebar, and the search box sits at the top of the page.
- **The chat's note context is a chip** inside the message box (📎 No note / a note / ★ All my notes).
- Not tried on a real Windows PC yet.

## 1.14.11
- **The note panel is one short list, no tabs.** *Look* (colours, font, size), *This note* (Reminder, Folder, Lock, Earlier versions, Copy or export: one line each, and only the one you click opens; each line shows its current value) and *AI*. *Chat about this note* and *Move to trash* sit at the bottom.
- **AI: one list and a Run button** instead of six buttons plus a second list. It remembers your last choice. The local model is loaded only when you point at the AI list or Run, not every time the panel opens.
- **Folder chips in Home:** All, each folder (with how many notes), No folder. Click one to see only that folder; drop a card on a chip to move the note there.
- **A neon progress bar while an update downloads**, then "Restart to update" when it is ready. It respects "reduce motion" in Windows and can be hidden with ✕.
- The theme picker moved out of the note panel (it is in *Settings > Appearance* since 1.14.10); "All notes" left the note title bar (it is the Home window, Ctrl+Alt+A).
- Not tried on a real Windows PC yet.

## 1.14.10
- **Themes for the whole app, in light and dark.** A theme now colours everything: the Home window, Settings, the AI chat, the note panel and the colours offered for notes. Every theme has a light and a dark version, and there is a new **Purple** theme (10 themes in all).
- **Light, Dark or Same as Windows** in *Settings > Appearance*. "Same as Windows" switches by itself when Windows does; window title bars follow too.
- **Notes follow light and dark** (on by default): notes in theme colours switch to the matching dark colour and back. Custom colours never change. The first time you start this version nothing is repainted; notes follow from the next switch on (or press *Apply to all notes*).
- Text stays readable: every theme passes a contrast check (WCAG AA) in both versions, and a note chooses dark or light text by itself. The Mono theme's mid grey is a little darker for that reason.
- Not tried on a real Windows PC yet: please check switching Light/Dark/Same as Windows and a few themes.

## 1.14.9
- **A simpler layout: one Home window.** All notes, Trash, the AI chat and Settings are now pages of a single window, switched from a sidebar (Notes, Trash, Ask the AI, Settings). Ctrl+Alt+A, Ctrl+Alt+C, Ctrl+Alt+S, the tray menu and the buttons in a note all open that same window on the right page, so there are no more separate windows to lose track of. The chat is no longer a docked side window.
- **The note's settings panel lost its duplicates.** The *App* tab is gone (start with Windows, snapping and hiding from the taskbar are in Settings, and New / Tidy / Trash are in the Home window). The AI tab keeps the AI buttons and folds the provider and model options under *Model and connection*, which opens by itself when the AI is off or the model is missing.
- Not tried on a real Windows PC yet: please check the window switching (especially opening the chat from a note) and tell me what feels wrong.

## 1.14.8
- **You can delete a downloaded AI model.** In the AI tab (and Settings > AI), pick an installed model and press **Delete model…**; it asks once more, then removes it from your PC and frees its disk space. Handy when a model answers badly or is too slow. If it was the model in use, none is selected afterwards, so choose another one.

## 1.14.7
- **The settings panel is now a column on the right, beside your text, in every note.** A narrow note grows wider to the right while the panel is open (to the left if there is no room on that side of the screen) and goes back to its size when you close it. The saved size of the note never changes. The panel stays open while you click in the note, so you can select text and press *Translate* or *Edit live* straight away. If the screen is too small to fit it, the panel opens above the text instead.

## 1.14.6
- **The settings panel no longer covers your note.** In a narrow note the panel now sits above the text and the note stays visible below it (the panel scrolls if it is tall). In a wide note (about 560 px and more) the panel is a column on the right, beside the text, and it stays open while you click in the note, so you can select text and press *Translate* or *Edit live* right away.

## 1.14.5
- **A small "Restart to update" message instead of a Windows notification.** When an update has finished downloading, every open note (and the All notes window) shows a small bar at the bottom: *Update 1.x.y is ready* with a **Restart to update** button and a ✕ for later. It comes back for the next version, and the update still installs by itself when you close StickyPad.

## 1.14.4
- **Right-click a link** in a note for *Open link* and *Copy link* (for an e-mail address: *Write an e-mail* and *Copy e-mail address*).

## 1.14.3
- **No more Windows pop-up for updates.** When an update has downloaded, StickyPad shows a quiet notification (click it to open Settings > About and restart) instead of a dialog window. The update still installs when you close the app.

## 1.14.2
- **Much more reliable translation (Greek ⇄ English).** The text is now translated in small pieces (so long notes work too), each piece is wrapped so the model translates it instead of answering it, and the prompt includes short examples. Every piece is **checked**: if the model answered in the wrong language, or the answer is far too short or too long, it is asked once more, and if it still fails **nothing is changed** and you get a clear message instead of garbage in your note. Paragraph breaks and spacing are kept.
- The model list now says honestly which models are good for Greek and translating (Gemma 3 4B / 12B, Qwen 2.5 7B) and which are weak (the 1B ones).

## 1.14.1
- **Clickable links.** Web addresses (`https://…`, `www.…`) and e-mail addresses in a note are underlined; **Ctrl+click** opens them. Only safe web and e-mail links are ever opened.
- **New note from the clipboard** (Ctrl+Alt+V from anywhere): whatever text you last copied becomes a new note. Markdown headings and `- [ ]` lines turn into a title and checklist items.
- **Your own keyboard shortcuts.** Settings > Shortcuts: click a shortcut, press the keys you want. Works for the global shortcuts and for those inside a note. Clashes and keys needed for editing are refused, **Reset** restores the original, and if Windows will not give a shortcut to StickyPad (another program holds it) you are told. Shortcuts now also work with a Greek keyboard layout.
- **AI: automatic title.** *AI* tab > **✨ Title** suggests a short title in the language of the note; you accept, retry or cancel.
- **AI: ask all your notes.** In the AI chat, *Note context* > **★ All my notes**. StickyPad picks the notes that best fit your question (accents and word endings do not matter, locked notes are never read), gives them to the AI, and shows under the answer which notes it looked at.
- **Dates become reminders.** If a note says "tomorrow at 5pm", "αύριο στις 17:30", "15/11 10:00", "Friday 14:00" or "σε 2 ώρες", a small bar offers *Remind me*. It is rule-based (instant, works without the AI, Greek and English) and can be switched off in Settings > General.
- **Import from other apps.** Settings > Data & backup > *Import from other apps*: **Google Keep** (the `.json` files from Google Takeout, or the whole Keep folder; colours and the first label are kept, trashed notes are skipped) and **Windows Sticky Notes** (reads its `plum.sqlite` directly, no extra program needed).
- **Several screens.** StickyPad remembers which screen each note is on. If you unplug a monitor, its notes appear on your main screen (nothing is lost, and the saved place is kept); when the monitor comes back, they return to where they were. Notes that were left off screen are brought back too.
- **Fixed**: reminder notifications showed an Electron/author name in Windows instead of just "StickyPad". The time field in *Note > Reminder* no longer shifts sideways when a reminder is set.

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
