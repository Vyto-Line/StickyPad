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
1. Print several notes at once, in a chosen order (select in Home, order, one print job).
2. Greeting hours: ask Alex what he wants (later start for "afternoon"? different word?).
3. More tests (search, AI, update handlers).
4. Home window speed-up: only if Alex has hundreds or thousands of notes.
5. Alex's further ideas.

## Set aside by Alex (only when he asks)
- Split main.js and note.js; upgrade Electron 33.

## Still wanted, no date
- Test on a real Windows PC (WINDOWS_CHECKLIST.md). The performance and AI logs help here.
- Code signing the installer (removes the SmartScreen warning).
- Tauri auto-updater needs a signing key from Alex (only if the Tauri build comes back).

## Scrapped
- Cloud sync (the `sync-test` branch is left alone), the 2.0.0 far plans, Android.

## Alex's ideas (2026-10-21), status
- Printing: single note done in 1.14.43 (Ctrl+P). Still open: print several notes at once, in a chosen order (Alex picked "one at a time" for now).
- Home "+ Note" opens behind Home: fixed in 1.14.43.
- Greeting hours: "Good afternoon" shows from 12:00 to 17:00. Alex had no preference when asked; ask again what he wants (later start? different word?).
- Accessibility tab: shortcuts row removed (1.14.43).
- Trash drag and drop (delete by dropping on Trash, restore by dropping on Notes): done in 1.14.43.
