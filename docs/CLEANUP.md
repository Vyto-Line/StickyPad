# General clean-up (step 1, measuring, done on 2026-10-21)

Agreed 2026-10-20: do a general clean-up of the whole app **later**, not as part of a feature release. Remind Alex when a quiet moment comes
(after a calm release with no bug reports is the best time), and before any 2.0 work.

## Rules
- One area at a time, one release for each (so a problem can be traced to one change).
- Measure before and after; keep the numbers in the changelog.
- All tests pass before and after (`node tests/run.js` and every `tests/ui/t_*.py`).
- Never change the notes format (`notes.json`, `.stickypad`) during a clean-up.
- Things that cannot be tested here (a real Windows PC) go on `docs/WINDOWS_CHECKLIST.md` first.

## The list
1. **Measure (done 2026-10-21, see results below).** Start-up time, opening a note, typing, search across notes, memory after hours of use, with 10 / 1,000 / 10,000 notes and with a huge note.
   Write the results down; fix the slowest first.
2. **Split the big files.** `main.js` (windows, notes, backups, search, AI, themes, updates, tray, shortcuts) and `note.js` (editor, find, undo, AI panel,
   reminders, prediction) into modules with one job each. Keep every IPC channel name unchanged.
3. **Remove dead code.** Leftovers from scrapped features (uninstall prompt, sync experiments on `sync-test` stay on that branch), unused CSS, unused IPC handlers.
4. **Memory and leaks.** Windows, timers, listeners and caches released when notes close (word list cache, search index, undo history); check a long session.
5. **Tests.** Fill gaps around saving, restoring, updating and the large-note path; make the UI tests faster and less timing-dependent.
6. **Docs.** Bring `docs/ARCHITECTURE.md` up to date; keep `docs/RELEASING.md` and the Windows checklist current.
7. **Dependencies.** Update Electron and other packages one at a time, read the release notes, run the checklist after each.

## Step 1 results: measurements (2026-10-21, a Linux test machine; a Windows PC with antivirus is slower)
Run them again with `node tools/measure.js` and `python tools/measure_ui.py` after each clean-up step. Electron start-up time and memory cannot be measured
here: use the new **Settings > About > Open performance log** on a real PC for those.

Node side, in milliseconds:

| | notes.json | save: build | load: parse | write | read+check | search 1st | search key press | Greek | word list | AI count |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 notes | 0.0 MB | 0.3 | 0.1 | 0.2 | 0.3 | 12 | 2.6 | 0.3 | 4.5 | 54 (JIT warm-up) |
| 1,000 notes | 1.4 MB | 10 | 5 | 3 | 22 | 41 | 5 | 2 | 45 | 2 |
| 10,000 notes | 13.9 MB | 106 | 70 | 54 | 171 | 375 | 38 | 15 | 420 | 2 |
| 1 huge note (3.7 MB) | 5.4 MB | 48 | 15 | 16 | 75 | 393 | 0.2 | 0 | 38 | 404 |

Windows (test browser), in milliseconds:

| | opens | typing per key | page memory |
|---|---|---|---|
| note, 20 lines | 198 | 33 (the floor) | 2 MB |
| note, 3,000 lines | 135 | 33 | 4 MB |
| note, 51,200 lines (3.7 MB) | 199 | 33 | 22 MB |
| Home, 10 notes | 127 | | 1 MB |
| Home, 1,000 notes | **513** | scroll 48 | 4 MB |
| Home, 10,000 notes | **3,373** | scroll 40 | 15 MB |

What the numbers say (slowest first):
1. **Home draws every note card and draws them all again on every change** (`refresh()` in all.js): 0.5 s with 1,000 notes, 3.4 s with 10,000, each time a note is saved while Home is open. Fix: draw only what is on screen (or in small batches) and update only the cards that changed. **This is the best next step.**
2. **Writing the notes file at 10,000 notes** takes about 160 ms (build 106 + write 54) and blocks every window for that long; it is already written less often when the file is big (1.14.40). A real fix means one file per note, which changes the notes format: not part of this clean-up.
3. **First search** after start-up or a big change builds the index: 375 ms at 10,000 notes, 393 ms for one huge note. Later key presses are 0.2 to 38 ms. Fine as it is.
4. **The AI "how many times" count** on a 3.7 MB note takes 0.4 s: fine, it only runs when you ask.
5. Notes of every size open in about 0.2 s and type at the frame rate: nothing to do.

## Already done (so it is not repeated)
- Search across all notes: measured and sped up (1.14.2x).
- Huge notes: chunked editor, content-visibility, exact Find count (1.14.32, 1.14.33).

## Research for steps 2 to 7 (2026-10-21, read-only: no code changed)

Ranked by value for the risk. Each is its own release.

### Step 2: dead code (low risk, do first)
- IPC handler never called by any page: `trash:list`.
- `preload.js` functions no page uses: `openTrash`, `setHideTaskbar`, `setSnap`, `setStartup` (their handlers `app:hideTaskbar`, `app:snap`, `app:startup` may then go too; check each before removing).
- Module exports used only inside their own file (can stop being exported).
- Unused CSS classes: all.css `gearpanel`; note.css `aibtns, badge, editline, sect, tabgear, tabs, tool, tools`.
- `src-tauri/ui/`: a 20-file, 188 KB copy of the UI for the scrapped Tauri port. Decide: keep (Tauri may come back) or delete; `tauri.yml` workflow goes with it.
- Check: all tests pass, packaging test still green, nothing changes for the user.

### Step 3: memory and leaks (low risk, small)
- `seeThrough` (main.js:343) is set in `makeNote` (line 312) and never deleted when a note window closes: one entry per note ever opened. Delete on close.
- `histT` only cleaned by `dropHistory`; check it on note delete.
- Timers are fine: watchFile is unwatched on quit, the 250 ms stall monitor is unref'd, reminders 15 s, note.js scroll-bar sync 500 ms (could stop while the window is hidden).
- Electron memory cannot be measured here; needs Alex's PC (Task Manager before/after).

### Step 4: tests (no risk to the app)
48 of 87 IPC handlers are not named in any Node test: note:roll/unlock/relock/removeLock/close, grp:update/delete, all:*, search:open/close, trash:*, ai:get/set/edit/editStop/warmup, ollama:*, theme:set, chat:*, update:*, access:get/set, settings:open, home:go, app:info. Best value: lock/unlock (data safety), trash restore/empty, grp:delete, chat save/load, access:get/set.
CI (`test.yml`) runs `npm test` on Ubuntu and Windows but not the Python UI tests; adding them would catch UI regressions automatically.

### Step 5: split the big files (medium risk, biggest effort)
main.js (1,660 lines) already has clear banners. Proposed modules, each taking `ctx` (shared state) so behaviour stays the same:
- `main/locking.js` (locking, pictures), `main/storage.js` (storage, backups, trash retention), `main/windows.js` (windows, snapping, tray, splash, tour), `main/history.js`, `main/search.js`, `main/export.js`, `main/ollama.js` + `main/chat.js` (AI), `main/updates.js`, `main/reminders.js`, `main/access.js`.
note.js (1,128 lines): `note-find.js`, `note-ai.js` (summarise + live edit, ~250 lines), `note-lock.js`, `note-undo.js`, `note-scrollbar.js`. New files must be added to note.html and package.json `build.files` (the packaging test checks this).
Do one module per release or per commit, running all tests each time. Does not make the app faster; it makes it safer to change.

### Step 6: docs (no risk)
README, CHANGELOG and docs/ refreshed for 1.14.x (Accessibility, perf log, AI log, shortcut change, `Ctrl+Alt+Q`); remove mentions of the scrapped sync.

### Step 7: dependencies
Only 3: `electron-updater ^6.3.9`, `electron ^33`, `electron-builder ^25`. Electron 33 is old (security fixes stop for old majors), so upgrading Electron is the one worthwhile item, but it can only be validated on a real Windows PC. npm registry is blocked here, so `npm outdated` could not run; do it in CI or on Alex's PC.

### Suggested order
2 (dead code) -> 3 (leaks) -> 4 (tests) -> 6 (docs) -> 5 (split, one module at a time) -> 7 (Electron upgrade, with a Windows test). Home-window speed-up (item 1 above) only if Alex has hundreds or thousands of notes.
