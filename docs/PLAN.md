# Plan (updated 2026-10-21)

## Done on 2026-10-21 (all published as v1.14.41)
- Scroll bar that could not be grabbed: StickyPad's own bar.
- AI: log (Settings > AI > Open AI log), no more empty answers (thinking off for Gemma 4 and other reasoning models).
- Huge note opens in a fraction of a second; medium notes type faster; the big notes file is written less often.
- All notes shortcut is Ctrl+Alt+Q.
- Accessibility tab (7 options, all off by default) and the "Make it comfortable" step in the tour.
- "Start with a note" in the tour; performance log (Settings > About > Open performance log).
- Clean-up step 1 (measuring): results in CLEANUP.md.

## Done since (published as v1.14.43, includes 1.14.42)
- Clean-up: dead code removed, leak fixed, docs refreshed, tests for locking, folders, trash, chat history, accessibility.
- Print one note (Ctrl+P), Trash drag and drop, Home "+ Note" opens in front, shortcuts row removed from Accessibility.

## Next
1. Finish Select mode in Home: Export, Colour, Open/Close/Pin, Trash-tab Restore/Delete forever, drag a chosen group onto a folder or Trash.
2. More tests (search, AI, update handlers).
3. Home window speed-up: only if Alex has hundreds or thousands of notes.
4. Alex's further ideas. Quiet notes (1.14.53): change only after Alex has used it and reports what feels wrong.

(Print several notes at once: done in 1.14.48.)

## Done 2026-10-21/22 (v1.14.44 to v1.14.47)
- Ctrl+Alt+F reliable (focus kept, cannot stay hidden); more actions in the search window; windows always appear and come to the front at start-up; "When StickyPad starts" works when started again from the tray.

## Set aside by Alex (only when he asks)
- Split main.js and note.js.
- Electron 45 and later: stay on 44 for now (decided 2026-10-22). Before 46, move safeStorage to the async methods.

## Still wanted, no date
- Test on a real Windows PC (WINDOWS_CHECKLIST.md). The performance and AI logs help here.
- Code signing the installer: postponed by Alex (2026-10-22) until more people download the app. Options found: SignPath Foundation (free for open source, MIT qualifies, needs verifiable reputation and a Code signing policy section on the homepage; publisher shows as SignPath Foundation) or Azure Artifact Signing ($9.99/month, individuals only in the US/Canada, organizations in the US/Canada/EU/UK).
- Tauri auto-updater needs a signing key from Alex (only if the Tauri build comes back).

## Scrapped
- Cloud sync (the `sync-test` branch is left alone), the 2.0.0 far plans, Android.

## Alex's ideas (2026-10-21), status
- Printing: single note done in 1.14.43 (Ctrl+P). Still open: print several notes at once, in a chosen order (Alex picked "one at a time" for now).
- Home "+ Note" opens behind Home: fixed in 1.14.43.
- Save as PDF in Print options: not needed (Windows has Microsoft Print to PDF) (2026-10-22).
- Quiet notes extras (2026-10-22): no hide-while-typing, Home window never fades, no per-note switch.
- Greeting hours: dropped by Alex on 2026-10-22 (no change).
- Accessibility tab: shortcuts row removed (1.14.43).
- Trash drag and drop (delete by dropping on Trash, restore by dropping on Notes): done in 1.14.43.
