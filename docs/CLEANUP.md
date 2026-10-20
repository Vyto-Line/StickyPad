# General clean-up (planned, not started)

Agreed 2026-10-20: do a general clean-up of the whole app **later**, not as part of a feature release. Remind Alex when a quiet moment comes
(after a calm release with no bug reports is the best time), and before any 2.0 work.

## Rules
- One area at a time, one release for each (so a problem can be traced to one change).
- Measure before and after; keep the numbers in the changelog.
- All tests pass before and after (`node tests/run.js` and every `tests/ui/t_*.py`).
- Never change the notes format (`notes.json`, `.stickypad`) during a clean-up.
- Things that cannot be tested here (a real Windows PC) go on `docs/WINDOWS_CHECKLIST.md` first.

## The list
1. **Measure.** Start-up time, opening a note, typing, search across notes, memory after hours of use, with 10 / 1,000 / 10,000 notes and with a huge note.
   Write the results down; fix the slowest first.
2. **Split the big files.** `main.js` (windows, notes, backups, search, AI, themes, updates, tray, shortcuts) and `note.js` (editor, find, undo, AI panel,
   reminders, prediction) into modules with one job each. Keep every IPC channel name unchanged.
3. **Remove dead code.** Leftovers from scrapped features (uninstall prompt, sync experiments on `sync-test` stay on that branch), unused CSS, unused IPC handlers.
4. **Memory and leaks.** Windows, timers, listeners and caches released when notes close (word list cache, search index, undo history); check a long session.
5. **Tests.** Fill gaps around saving, restoring, updating and the large-note path; make the UI tests faster and less timing-dependent.
6. **Docs.** Bring `docs/ARCHITECTURE.md` up to date; keep `docs/RELEASING.md` and the Windows checklist current.
7. **Dependencies.** Update Electron and other packages one at a time, read the release notes, run the checklist after each.

## Already done (so it is not repeated)
- Search across all notes: measured and sped up (1.14.2x).
- Huge notes: chunked editor, content-visibility, exact Find count (1.14.32, 1.14.33).
