# Plan (updated 2026-10-21)

## Done on 2026-10-21 (all published as v1.14.41)
- Scroll bar that could not be grabbed: StickyPad's own bar.
- AI: log (Settings > AI > Open AI log), no more empty answers (thinking off for Gemma 4 and other reasoning models).
- Huge note opens in a fraction of a second; medium notes type faster; the big notes file is written less often.
- All notes shortcut is Ctrl+Alt+Q.
- Accessibility tab (7 options, all off by default) and the "Make it comfortable" step in the tour.
- "Start with a note" in the tour; performance log (Settings > About > Open performance log).
- Clean-up step 1 (measuring): results in CLEANUP.md.

## Next (in this order)
1. Clean-up step 2: speed up the Home window (draw only what is on screen, update only changed cards). Own release.
2. The rest of the clean-up, one area per release (see CLEANUP.md): split main.js and note.js, remove dead code, memory and leaks, tests, docs, dependencies.
3. Alex's new ideas (to be added here).

## Still wanted, no date
- Test on a real Windows PC (WINDOWS_CHECKLIST.md). The performance and AI logs help here.
- Code signing the installer (removes the SmartScreen warning).
- Tauri auto-updater needs a signing key from Alex (only if the Tauri build comes back).

## Scrapped
- Cloud sync (the `sync-test` branch is left alone), the 2.0.0 far plans, Android.

## Alex's ideas (2026-10-21)
- Printing: single note done in 1.14.43 (Ctrl+P). Still open: print several notes at once, in a chosen order (Alex picked "one at a time" for now).
- Home "+ Note" opens behind Home: fixed in 1.14.43.
- Greeting hours: "Good afternoon" shows from 12:00 to 17:00. Alex had no preference when asked; ask again what he wants (later start? different word?).
- Accessibility tab: shortcuts row removed (1.14.43).
- Trash drag and drop (delete by dropping on Trash, restore by dropping on Notes): done in 1.14.43.
