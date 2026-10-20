# Windows check before a release

None of the recent versions have been run by a person on a real Windows PC yet. Use this list on a PC (best: one that has an **older StickyPad with real notes**, and a second one if you have it). Tick each line. Anything that fails: write down what you clicked and what you saw, and send it.

**Before you start:** copy the folder `%APPDATA%\StickyPad` somewhere safe (right-click → Copy, paste on the Desktop). It is your safety net.

## 1. Install and update
- [ ] Run the new installer **over** the old version. It finishes without errors and StickyPad starts.
- [ ] All your notes are there, in the same places, with the same colours and pictures.
- [ ] *Settings → About* shows the new version number.
- [ ] Reboot Windows (if "start with Windows" is on): StickyPad starts by itself and the notes appear.

## 2. Your notes are safe
- [ ] *Settings → Data*: press **Back up now**. "Done ✓" appears and the drop down says one more backup.
- [ ] Open the drop down **Choose a backup**: dates, note counts and trash counts look right.
- [ ] Make a note called "RESTORE TEST", then delete it. Choose the newest backup → **Add missing notes**: it says nothing was missing (or adds it back if the backup had it).
- [ ] Make a second note "KEEP ME". Choose a backup → **Replace all…** (press twice). Your notes now match that backup, "KEEP ME" is gone, and a `before-restore-…` folder exists in the backups folder. (Put the notes back by restoring that folder if you want.)
- [ ] **From a file…** with a `notes.json` from the backups folder adds only missing notes.

## 3. First-run welcome tour
- [ ] *Settings → About → Welcome tour* opens it in the middle of the screen.
- [ ] Next / Back / dots / arrow keys / Esc all work; the shortcuts shown are your real ones.
- [ ] "Set up the AI…" opens the AI settings. "Start with a note" makes a note.
- [ ] A fresh install (uninstall, delete `%APPDATA%\StickyPad`, install) shows the tour once, and not again at the next start.

## 4. Search and actions
- [ ] **Ctrl+Alt+F** opens the search window on the screen where the mouse is. Typing finds notes (try a word with Greek accents, in capitals).
- [ ] **Ctrl+K** inside a note, Home, Settings and AI chat opens the same window.
- [ ] Type `dark`: "Dark mode" is listed first as an action; Enter switches the look. `>` lists all actions; `>trash`, `>back up` and `>new` work.
- [ ] Esc or clicking elsewhere closes the window.

## 5. Files in and out
- [ ] Export a note with a picture as .stickypad and as .md: the picture is inside the file.
- [ ] Drag the .stickypad file onto a note, onto Home and onto Settings: a new note appears with the same colour, font and folder.
- [ ] Drag a `.txt` file made in Notepad (save once as "Unicode" and once as ANSI with Greek letters): the letters are correct.
- [ ] Double-click a .stickypad file in Explorer: it opens in StickyPad.

## 6. Notes from another PC
- [ ] Copy `notes.json` and `images` from a bigger or different monitor setup into the data folder (StickyPad closed), start it, and click every note: each one opens on a visible screen.

## 7. Data safety (only if you are brave)
- [ ] Close StickyPad. Open `notes.json` in Notepad, delete half of it, save. Start StickyPad: it says it restored your notes from the newest good copy and nothing is lost.
