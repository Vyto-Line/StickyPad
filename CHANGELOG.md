# Changelog

## 1.14.53
- **Hide a note's buttons when idle (new, off by default).** The title bar, buttons and topic fade away and only the note's text and colour stay. Moving the mouse over the note, clicking or typing brings them back at once. Choose it in *Settings > Notes > Hide the note's buttons when idle*:
  - **Mouse away and not typing** (hides when the mouse is off the note and you have not typed for a while),
  - **Note not in use** (hides when another window is active),
  - **Either of these.**
  - *Hide them after* 3, 10 or 30 seconds. Also in the Ctrl+Alt+F search: "Hide note buttons when idle".
- The buttons stay visible while the note's panel, search, AI result, lock screen or topic is open, on a rolled-up note, and when Screen reader or High contrast is on.
- Not tried on a real Windows PC yet.

## 1.14.52
- **Select mode in Home (it was "Select notes to print").** Press **Select**, then click notes to choose them: each gets a number. **Shift+click** chooses a range, **Ctrl+A** or **Select all** chooses every note shown. With notes chosen you can **Print…**, **Move to folder…** or **Move to trash** (it asks once: press it twice). Locked notes can be moved or trashed (printing skips them). Esc or Cancel leaves select mode.
- Not tried on a real Windows PC yet.

## 1.14.51
- **The Print options preview now shows every chosen note** (it showed only the first 4 when you chose more). It shows the first page of what will print; long notes are shortened in the picture only.
- Not tried on a real Windows PC yet.

## 1.14.50
- **Print options.** Printing a note (Ctrl+P, the panel's Print… button, or right-click > Print… in Home) and printing several notes now open a **Print options** window with a preview before the Windows print window:
  - **Style:** *Plain* (text only), *Boxed* (a thin frame around each note, like a note on screen) or *Sticky note* (the frame filled with the note's own colour; uses more ink).
  - **Layout:** *Real size* (each note as big as on screen, starting at the top left corner, several side by side), *Full width*, *2 columns*, *3 columns* or *One note per page*.
  - **Text size** (small, normal, large) and whether to include **titles** and **pictures**.
  - Your choices are remembered separately for one note (starts as a box at real size, top left) and for several notes (starts plain, full width).
- In Home, "Each note on its own page" moved into the Print options window as "One note per page".
- Not tried on a real Windows PC yet. Printing needs a try with a printer or "Microsoft Print to PDF".

## 1.14.49
- **StickyPad now runs on Electron 44 (Chromium 152) instead of Electron 33.** Electron is the engine inside StickyPad; version 33 no longer received security fixes. Nothing about your notes, settings or features changes. Checked on a real Windows machine in the cloud (start-up, both windows appear, all six global shortcuts register, no crash), on Electron 35, 36, 40, 44 and 45.
- **The installer is bigger: about 99 MB instead of about 75 MB** (the newer Chromium is bigger). Two unused files (about 26 MB, DirectX shader compilers only used by WebGPU) are left out to keep it from being 106 MB. Updates after this one download only the changed parts, so they stay small.
- Not tried on a real Windows PC yet, so this release needs a few days of normal use: start-up, Ctrl+Alt+F, the tour, printing, dragging, see-through notes, updates.

## 1.14.48
- **Print several notes in one go.** In Home, press **Select notes to print**, then click the notes in the order you want them: each gets a number. Tick **Each note on its own page** if you want that, otherwise the notes follow one another on the same page (a thin line between them) and a new page starts only when one is full. Press **Print…** to open the Windows print window. Locked notes cannot be chosen. Esc or Cancel leaves select mode.
- Not tried on a real Windows PC yet. Printing needs a try with a printer or "Microsoft Print to PDF".

## 1.14.47
- **Home, notes and the tour can no longer stay hidden at start-up.** A hidden window waited for one signal ("ready to show") before appearing, and on some PCs that signal does not come: the notes appeared but the Home window did not. Every window now appears at the first of three signals (ready to show, page loaded, or 1.5 s), and at start-up it is raised to the front twice (right away and 0.4 s later). If the first signal was missing, the performance log says so (a `WINDOW ... was shown by` line), which tells me what Windows is doing on your PC.
- Not tried on a real Windows PC yet.

## 1.14.46
- **"When StickyPad starts" now also works when you start StickyPad while it is already running in the tray.** Before, starting it again only brought the notes forward, whatever the setting was, so "Open the All notes window" and "Open both" seemed to do nothing. Now: *Open my notes* shows the notes, *Open the All notes window* opens Home, *Open both* does both.
- Not tried on a real Windows PC yet.

## 1.14.45
- **StickyPad comes to the front when it starts.** The start-up splash never takes the front, so on Windows the notes and Home could open hidden behind other programs. For the first seconds after start-up (and when you click StickyPad's shortcut while it already runs in the tray), every window is now raised to the front, without stealing what you are typing. This applies whatever "When StickyPad starts" is set to.
- **More actions in the search window (Ctrl+Alt+F, or `>`):** every Settings page (General, Appearance, Notes, Keyboard shortcuts, Accessibility, Folders, About), the accessibility options (bigger or smaller interface, high contrast, bigger buttons, keyboard focus, reduced motion, easier-to-read notes, screen reader; each turns on or off; and "back to the defaults"), "Print the note I was just in", "Check for updates", and the performance, AI and update logs.
- Not tried on a real Windows PC yet.

## 1.14.44
- **Ctrl+Alt+F (search all notes) sometimes did nothing.** Likely cause: Ctrl and Alt are still held when the window appears, Windows moved the focus away for a moment, and the window closed itself at once. In its first second the search window now takes the focus back instead of closing. Also, the search window is now shown by whichever comes first of "ready", "page loaded" or a 0.7 s timer, so it can no longer stay hidden until the second press. Also: If the search window exists but is hidden, the shortcut now shows it instead of closing it (which could make it look dead). If Windows refuses a shortcut because another program already uses it, that is written to the performance log (Settings > About > Open performance log) and shown as a warning in Settings > Shortcuts.
- Not tried on a real Windows PC yet.

## 1.14.43
- **Print a note.** Press **Ctrl+P** in a note, use **Settings panel > Print…**, or right-click a note card in Home > **Print…**. The Windows print window opens (plain black on white, with checklists and pictures); nothing is sent until you press Print. Locked notes must be unlocked first.
- **Drag and drop with the Trash.** In Home, drag a note card onto **Trash** in the sidebar to delete it, and drag a deleted note out of the Trash list onto **Notes** to bring it back.
- **"+ Note" in Home (and Ctrl+N there) now opens the new note in front.** Before, it could open behind the Home window and look as if nothing happened.
- **Accessibility:** removed the "Keyboard shortcuts" row; shortcuts have their own tab.
- Clean-up from 1.14.42 is included: unused code removed, one small memory leak fixed.
- Not tried on a real Windows PC yet. Printing in particular needs a try with a real printer or "Microsoft Print to PDF".

## 1.14.42
- **Clean-up, no change you can see.** Removed code nothing used any more (one internal handler for the trash list, and three internal settings calls that Settings no longer needs). Fixed a small memory leak: the app remembered whether each note window was see-through even after the window closed, one tiny entry per note ever opened; now it forgets it on close. Also removed an unused function and tidied 20 internal names that were shared between files for no reason.
- Not tried on a real Windows PC yet.

## 1.14.41
- **A performance log: Settings > About > Open performance log.** If StickyPad feels slow, it writes down what was slow: a window that took more than half a second to appear (the tour, a note, Home), the app freezing for more than 0.3 seconds, and a save that took more than 60 ms, each with the size of the notes file and the number of open windows. It holds only times and sizes, never your notes, so you can send it to me and I can see where the time goes.
- **"Start with a note" no longer waits for the note.** The tour now closes after at most 0.6 seconds, and the new note still comes to the front as soon as it has appeared.
- Not tried on a real Windows PC yet.

## 1.14.40
- **"Start with a note" at the end of the tour opens the note.** The tour used to close at once, and Windows could hand the focus to another window while the new note was still appearing, leaving the note hidden behind it. The tour now stays until the new note is on screen, then brings it to the front and closes.
- **Less lag with long notes.** A note of 20,000 letters or more (about 3,500 words) is now drawn in short blocks, so typing in a 190,000-letter note costs 33 ms a key instead of 130 ms. A very big notes file (a huge note makes it several MB) is also written to the disk less often while you type (every 1 to 2 seconds instead of every 0.3 s); it is always written at once when you close StickyPad.
- Not tried on a real Windows PC yet.

## 1.14.39
- **A new Accessibility tab (Settings > Accessibility).** Seven options, all off until you switch them on, and all applied straight away to every open window. The preview shows a note with its title bar, so the effect of "Bigger buttons" is visible:
  - **Interface size** 100 / 115 / 130 / 150% for Home, Settings, the AI chat, search and the tour (notes keep their own text size; the search window grows with it);
  - **High contrast**: pure black on white (or white on black in dark mode), solid colours and real borders, and black or white text in notes;
  - **Easier-to-read notes**: a wide, familiar font (Verdana), more space between letters, words and lines;
  - **Reduce motion**: no startup animation, no tour animations, no fading or sliding;
  - **Always show the keyboard focus**: a thick orange outline on whatever the keyboard is on;
  - **Bigger buttons in notes**: a taller title bar and larger icons;
  - **Screen reader announcements**: Narrator and NVDA are told when the AI has answered, the AI has finished editing a note, or Find reaches a match.
- **The first-time tour has a new step, "Make it comfortable"**, with the size, high contrast, easier-to-read notes and reduce motion switches, so anyone who needs them can turn them on from the very start.
- Not tried on a real Windows PC yet (the interface size uses the same zoom as Ctrl + plus in a browser).

## 1.14.37
- **All notes now opens with Ctrl+Alt+Q.** Ctrl+Alt+A is a screenshot shortcut in several other programs, which then kept it for themselves and StickyPad never got it. If you changed the key yourself in Settings > Shortcuts, your choice is kept.
- **The shortcut named in the sidebar and in the tray menu is always the real one.** The line at the bottom of the sidebar reads "Ctrl+Alt+Q opens this window from anywhere" (using whatever key you set), and the tray menu shows your current keys instead of fixed text.
- Not tried on a real Windows PC yet.

## 1.14.36
- **The note's scroll bar can be grabbed.** The built-in scroll bar was only 8 pixels wide and, on Windows, the pointer stayed a text cursor over it, so a huge note could not be scrolled by dragging. A note now has StickyPad's own scroll bar: a 16 pixel grab area with an ordinary arrow pointer, kept clear of the window's resize border. Drag the thumb, click above or below it to move one page, or use the mouse wheel over it; the text cursor stays where it was. The mouse wheel, Page Up/Down and the keyboard scroll the note as before.
- Not tried on a real Windows PC yet.

## 1.14.35
- **A huge note opens in a fraction of a second.** A note of 51,200 lines (3.7 MB) took 10 to 15 seconds to open. The page read the whole text back out several times and each time glued a giant string together over and over; that now takes 6 milliseconds instead of almost a second, and the result is kept until you change something. The search for dates ("tomorrow at 5pm") only looks at the first 100,000 letters of a huge note, and spell-check is switched off for it (checking millions of letters is what made typing crawl).
- **The AI no longer goes silent with Gemma 4.** Gemma 4 "thinks" before it answers unless told not to, and could spend its whole answer on thinking and send back nothing (the "Ollama gave an empty reply" message). StickyPad now turns thinking off for Gemma 4 and the other reasoning families (Qwen3.5, DeepSeek, Phi-4-reasoning, Cogito, Nemotron, SmolLM3, GLM-4…), and sets gpt-oss to "low" because that one cannot be switched off. An Ollama that rejects the setting is asked again without it.
- **An AI log: Settings > AI > Open AI log.** Every AI request (chat, summarize, fix grammar, translate…) and every problem is written to a small text file: which model, how big the request was, how long it took, how much came back, and what went wrong (Ollama not running, too slow, an empty reply, a stream that stopped half way). It holds only sizes and timings, never your notes or the answers, so you can send it to me.
- **The AI no longer goes silent.** If the local model sends back nothing, StickyPad now asks it once more automatically (a model that is still loading often does this). If it is still empty you get a clear message that points to the log, instead of an empty chat bubble.
- Not tried on a real Windows PC yet.

## 1.14.33
- **Opening a huge note is instant.** The parts of a very long note that are off screen are no longer laid out or drawn until you scroll to them: drawing a 1.4 MB note went from about half a second to a few milliseconds (a 4 MB note took a second or more). Ctrl+End, Find and the scroll bar still reach every part of the note; Ctrl+End now puts the cursor at the very end by itself.
- **The scroll bar of a note can be grabbed again.** On Windows, the outer few pixels inside a frameless window are used for resizing it, and they covered the note's thin scroll bar, so clicking or dragging it did nothing. The scroll bar now sits a few pixels inside the edge.
- **The AI recognises many more ways of asking "how many times…".** "How many times was the word Remove captured?", "Count the occurrences of Remove", "How many times was "Remove" used", and the Greek forms are all understood, so StickyPad counts the word itself and gives the AI the exact number (45,000 instead of a guess of 85). Pronouns such as "it" or "this" are never counted as a word.
- Not tried on a real Windows PC yet.

## 1.14.32
- **Huge notes no longer lag.** A note with millions of letters made every key press take about a third of a second, because the editor had to lay out the whole text again each time. A very long text (over 200,000 letters) is now shown as many short blocks of about 100 lines, so only the block you type in is redone: typing is about five times faster (about 0.03 s instead of 0.3 s for a 1.8 MB note). The text itself is exactly the same: saving, exporting, undo and select-all work as before, and ordinary notes are not affected at all.
- **Find in note counts every match.** Ctrl+F showed "5000+" for a word that appears 46,511 times. It now counts all of them (up to half a million) and shows the exact number, and Next/Previous walk through all of them. Only the matches near the current one are highlighted, which keeps even a huge note fast.
- **The AI gives the exact count when you ask "how many times…".** Language models cannot count reliably (and a very long note is cut to fit them), so the local AI answered 95 for 46,511. When you ask how many times a word or phrase appears (in English or Greek, in a note or across all notes), StickyPad now counts it itself and gives the AI the exact number, ignoring capitals and accents. For very long notes the AI is also told that it only sees the beginning and the end.
- Not tried on a real Windows PC yet.

## 1.14.31
- **Pick your look in the welcome tour.** The second step shows the eight themes as colour swatches with a *Light / Dark / Match Windows* switch, and the whole app changes the moment you click. On a first run the choice is also applied to your first (blank) note. If you open the tour again later from Settings → About, only the app's look changes and your notes keep their colours.
- **An optional name.** The first step has a small *Call me* field: the title becomes "Welcome, Alex!" as you type, and the name is used in the greeting. It is optional, stays on your PC, can be changed in Settings, and is saved even if you close the tour straight away.
- The tour is still five steps: Welcome, Pick your look, Find anything, AI helper, Your notes are safe. (The "Make it yours" step was replaced by the picker.)
- Not tried on a real Windows PC yet.

## 1.14.30
- **A livelier welcome tour.** Each of the five steps now has its own small animated picture: sticky notes dropping onto the desktop and getting written on, a search box typing a word while results slide in, a note changing colour with a word being finished by **Tab**, a chat bubble answered by the AI "on your PC", and a shield with a tick next to your daily backups. The text slides in on every step and the dots glide between steps. If Windows is set to *reduce motion*, nothing moves.
- Not tried on a real Windows PC yet.

## 1.14.29
- **Fix: windows flickering on the screen until you closed one of them.** After an update, "What's new" and the Home window could open at the same moment and keep taking the keyboard focus from each other, so both flashed non-stop until you pressed *Got it*. A window now only takes the keyboard when it does not already have it, and if two windows start a fight over it the extra focus requests are simply ignored until it calms down. Notes use the same protection.
- Not tried on a real Windows PC yet (the flicker itself could not be reproduced here; the fix removes the cause that matches what you saw, and the rule is tested).

## 1.14.28
- **Ctrl+K: search and actions in one box.** In any StickyPad window press **Ctrl+K** (or the global **Ctrl+Alt+F**) and type. Notes are found as before; the things StickyPad can do now show up too, marked *action*: New note, New note from the clipboard, Open Home, Open the trash, AI chat, Settings, Set up the AI helper, Backups and restore, Back up now, Dark / Light / Match Windows, Show all notes, Tidy up notes and the Welcome tour. Type `>` first to see only actions (`>` alone lists them all). Enter runs the highlighted one.
- **The backups list is a drop down** in Settings → Data, closed until you open it, so the page is calmer.
- **Restore from a backup (Settings → Data).** StickyPad already made a daily backup; now you can use it without opening folders. A drop down shows each backup with its date, how many notes (and trashed notes) it holds, plus the copy kept at the last start that went well. For each one you can **Add missing notes** (puts back only the notes you do not have now, with their pictures, and changes nothing else) or **Replace all…** (your notes become exactly like that backup; asks you to press twice, and first keeps what you had in the backups folder as `before-restore-…`). **Restore from a file…** adds the notes of a `notes.json` you pick. Settings are never changed by a restore. A backup that cannot be read is shown but cannot be used.
- **A short welcome tour the first time you run StickyPad.** Five quick steps: your first note, finding things (with your real shortcuts), making notes yours, the optional AI helper (with a button to set it up) and how your notes stay safe. Skip it any time with Esc; open it again from Settings → About → *Welcome tour*.
- A checklist for trying a release on a real Windows PC is in `docs/WINDOWS_CHECKLIST.md`.
- Not tried on a real Windows PC yet.

## 1.14.26
- **Pictures are now exported with the note.** *Export…* writes the pictures inside the file: a **.stickypad** or Markdown file holds each picture right where it sits in the note (as a standard Markdown picture, so other Markdown programs show them too), and **opening or importing the file puts the pictures back** in the new note. *Export all notes* does the same for every note. Plain text (.txt) cannot hold pictures, and StickyPad says so when you save one. Files with pictures are bigger, so the size limit for importing a file is now 150 MB. Only normal pictures (PNG, JPEG, WebP, GIF) are read back from a file, at most 100 per note.
- **Drag and drop a file onto StickyPad to add it as a note.** Drop a `.stickypad`, Markdown (`.md`) or text (`.txt`) file on a note, on Home or on any other StickyPad window and it becomes a new note (it shows in All notes too, and a small message says how many were added). You can drop several at once (up to 50). Other kinds of files are refused politely instead of being opened inside the window, and pictures dropped into a note still go into the note as before.
- **Text files in any common format are read correctly.** Import and drag-and-drop now understand UTF-8, UTF-16 (what Notepad calls "Unicode") and the old 8-bit Windows text, including old Greek files (windows-1253), so the letters no longer turn into garbage. `.text` files are accepted too.
- **A note with an odd saved place or size now always opens.** Notes that came from another PC (a bigger monitor, a different screen layout), from an older version or from a damaged file could have missing, strange or huge position and size numbers, and then clicking the note did nothing at all. Now those numbers are checked when the note opens: the size is kept between the minimum and what fits your screens, the position is moved onto a screen you can see, and if Windows still refuses the window it opens in the default place. A bad colour in a note no longer stops it either.
- **A .stickypad file keeps the note's properties.** Exporting to `.stickypad` now also saves the note's colour, font, text size, see-through level, pin, folder, reminder (if it is still in the future), window size and last-edited time in a small header at the top of the file (a standard Markdown header, so other programs ignore it). Opening or importing the file gives the new note the same look and settings, and puts it in the same folder (created if you do not have it). If the other PC does not have the font, the note uses Segoe UI until the font is installed. Plain Markdown and text exports stay clean, and locked notes cannot be exported. Files from older versions still import as before.
- Not tried on a real Windows PC yet.

## 1.14.25
- **Your notes can no longer be lost when the notes file cannot be read (important fix).** If the notes file was busy or unreadable for a moment while StickyPad started (an update, antivirus, OneDrive or Dropbox holding it), older versions started with *no notes* and then saved that empty set over the real file. Now: a busy file is tried again for a few seconds; a file that stays unreadable is **kept as it is** (and copied to `notes.unreadable-….json`), the notes are **restored from the newest good copy** (the copy made at the last good start, then your daily backups) with a notification, and if there is no copy at all StickyPad explains what happened, opens the folder and **writes nothing**. A change made by another PC while its copy is half written is ignored instead of closing your notes. Empty days no longer push real backups out of the newest seven.
- **A moved notes folder that is not available no longer starts you with an empty set.** If your notes live in a folder on OneDrive, Dropbox or another drive and it cannot be reached at start, StickyPad waits up to 10 seconds, then asks whether to quit (the default, so you can start it again once the folder is connected) or start with an empty set for now.
- **Search all notes (Ctrl+Alt+F).** A small search window opens from anywhere in Windows (also in the tray menu as *Search notes…*). Type and the notes that contain all your words are listed at once, best match first (a title hit counts more), each with a piece of its text and the matching words marked. Up and Down choose, Enter opens the note, Esc or a click elsewhere closes it. Capitals and accents are ignored, Greek included (*καλημερα* finds *Καλημέρα*). Notes with a lock are found by title only, and their text is never read. You can change the shortcut in *Settings > Shortcuts*.
- **The search box in Home now finds words anywhere in a note.** It used to look only at the first 240 letters of each note, so a word further down was never found. It uses the same search as the new window.
- **Faster with many notes.** The word list for text prediction is no longer rebuilt from every note after each edit: only the note you changed is counted again (with 3000 notes: from about 1.6 s to about 8 ms, and the very first build is about three times faster). Folding capitals and accents is faster too.
- Not tried on a real Windows PC yet.

## 1.14.22
- **Font and transparency are now in a drop down.** In a note's panel, the font, the text size, *Transparency* and *Keep the text solid* sit under one line, **Font and transparency**, the same way *Model and connection* works in the AI section. It starts closed, so the colour swatches and the *This note* rows (Reminder, Folder, Lock…) fit without scrolling. The controls are the same as before.
- Not tried on a real Windows PC yet.

## 1.14.21
- **Ctrl + mouse wheel changes the text size.** Hold Ctrl and scroll up for bigger text, down for smaller (10 to 48 px). It is the same size as the slider in the note's panel and each note remembers its own.
- **Pasting from Excel gives the values, not a picture.** Excel puts both the text and a picture of the cells on the clipboard, and StickyPad used to pick the picture. Now the text wins (cells are separated by tabs, and the extra empty line Excel adds at the end is dropped). A picture is pasted only when there is no text, like a screenshot.
- **Copying a checklist no longer brings the extras.** Selecting checklist items and pressing Ctrl+C (or Ctrl+X) copies just their words, one per line, without the tick box, the remove button (the "x") or anything else. *Copy note as text* does the same: no more `[ ]` and `[x]` in front of the items. (Exporting to a Markdown file still writes `- [ ]` and `- [x]`, because importing needs them.)
- **Text prediction.** After you type three letters of a word you have written before, a small list offers it (up to five). **Tab** finishes the word, **Up and Down** move through the list, then **Enter** picks one, **Esc** closes it, and a click works too. Ctrl+Z takes back just the finished word. It learns from all your notes and from the note you are typing in, and a word needs to have been used at least twice. It works with Greek too, ignoring capitals and accents. Notes with a lock are never read. Switch it off in *Settings > General > Text prediction*.
- **Exported notes open with a double-click.** *Export…* now saves a **StickyPad note (.stickypad)** by default (Markdown inside, so any text editor can still read it; Markdown and text are still offered). After installing this version, double-clicking a `.stickypad` file opens it as a new note, also when StickyPad is already running. *Import notes* accepts `.stickypad` files too. Pictures are still not included.
- Not tried on a real Windows PC yet. The double-click part needs the installer: it only works after you install 1.14.21 (not with "npm start").

## 1.14.20
- **Ctrl+Z now undoes "Apply to note".** After you put an AI answer into a note (*Replace the note* or *Add at the end*), Ctrl+Z brings back the text from before, and Ctrl+Y or Ctrl+Shift+Z applies it again. Before, applying an answer cleared the note's undo history, so Ctrl+Z did nothing.
- Not tried on a real Windows PC yet.

## 1.14.19
- **A Home button in every note.** A house icon, first in the title bar, opens the Home window (all notes, trash, the AI chat and settings), the same as Ctrl+Alt+A or the tray icon.
- **The AI chat can now change your note.** With a note attached (📎), every answer has an **Apply to note** button: **Replace the note** or **Add at the end**. Checklist lines (`- [ ] item`) become real checklist items, pictures in the note are kept, and the old text always stays in *Earlier versions*. When you ask the AI to rewrite, fix, shorten or translate the attached note, it now replies with just the new note text, ready to apply. Not available with *All my notes* or locked notes.
- Not tried on a real Windows PC yet.

## 1.14.18
- **No more two gears.** The button in a note's title bar is now a *sliders* icon named "This note" (colours, transparency, reminder, folder, lock, AI). The gear inside the panel is gone: **All settings…** is now a link at the bottom of the panel, next to *Chat about this note* and *Move to trash*. A gear no longer means two different things.
- **The update buttons are colourful.** *Download* and *Restart to update* (in the bar and in *Settings > About*) use the same pink, purple and cyan as the neon progress bar instead of yellow, with dark text that stays easy to read.
- Not tried on a real Windows PC yet.

## 1.14.17
- **You decide when to download an update.** When a new version is found, StickyPad shows **Download** (in the bar at the bottom of a note or the Home window, and in *Settings > About*). Nothing is downloaded until you press it. The neon progress bar shows the download, and when it is done you press **Restart to update**. (Before, the download started by itself.)
- Not tried on a real Windows PC yet.

## 1.14.16
- **A Transparency bar for every note.** In the note's settings panel, under *Look*, drag *Transparency* to make that note see-through, from 0% (solid) up to 70%, so you can read what is behind it. Each note remembers its own setting. It never goes fainter than 30% visible, so a note cannot disappear.
- **Keep the text solid.** A switch under the Transparency bar fades only the note's background and leaves the text, buttons and pictures fully solid. It needs a see-through window, so it works when *Low memory mode* is off (*Settings > General*, then restart); with Low memory mode on, the whole note fades as before and the switch says so. Switching it on or off reopens that one note once.
- Not tried on a real Windows PC yet.

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
