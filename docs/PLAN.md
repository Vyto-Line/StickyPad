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

## Planned for 1.15.0 (Alex, 2026-10-22; release in about two days)
1. **AI group in the note panel** (mockups approved): "Chat about this note" moves into the AI category as a big button, with Summarize, Translate... and a "More AI actions..." list.
2. **Translate menu**: Translate... opens a language menu (English, Greek, Spanish, French, German, Italian, Portuguese, Dutch, Turkish, Russian, Arabic, Chinese, Japanese, with search). The source language is detected by the app and shown as "Greek (Auto-detected)"; the note's own language is greyed out as "same as the note". Greek and English keep their tuned pipeline; other languages get a general prompt with the same safety checks. The last chosen language is remembered. Small local models are weaker outside Greek and English; say so in the menu.
3. **Snap a note to a side of the screen** (new idea): drag a note to the left or right edge and it fills that half of the screen; drag it to the top edge and it fills the whole screen (like Windows snap). Not designed yet. To settle first: should it be off by default (Alex's rule: every option off by default), how a snapped note returns to its old size when dragged away, and how it works with several screens and with the existing "Snap to edges and other notes" setting. Make a mockup before building.

4. **Chat list next to the AI chat** (mockup made 2026-10-22): several saved chats, each with a title (made from the first question, or a short AI-written title), listed on the left grouped Today / Yesterday / Earlier, with + New chat and Search chats. A "..." menu on each chat: Rename, Pin to top, Save as a note, Delete chat (asks once). "Delete all chats..." at the bottom. The open chat's title is shown at the top. Needs a new storage format: today there is one chat in chat.json (capped at 100 messages, cleared when "Remember chat history" is off); the old chat must move into the list as the first entry, and the history switch in Settings must still delete everything. Chats stay on this PC.

## Next
1. Finish Select mode in Home: Export, Colour, Open/Close/Pin, Trash-tab Restore/Delete forever, drag a chosen group onto a folder or Trash.
2. More tests (search, AI, update handlers).
3. Home window speed-up: only if Alex has hundreds or thousands of notes.
4. Alex's further ideas. Quiet notes (1.14.53): change only after Alex has used it and reports what feels wrong.

(Print several notes at once: done in 1.14.48.)

## Done 2026-10-21/22 (v1.14.44 to v1.14.47)
- Ctrl+Alt+F reliable (focus kept, cannot stay hidden); more actions in the search window; windows always appear and come to the front at start-up; "When StickyPad starts" works when started again from the tray.

## Done 2026-10-22 (v1.14.56)
- Polish: screen-reader names for Settings controls, "All notes" renamed to Home, darker grey text, smoother tour, scroll thumb closer to the edge. Left out on purpose: note titles in Alt+Tab. Optional, not done: say why printing did not start.

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
- Note title in Alt+Tab: dropped by Alex (2026-10-22): many notes would clutter Alt+Tab; pinning a note is the way to keep one in view.
- Quiet notes extras (2026-10-22): no hide-while-typing, Home window never fades, no per-note switch.
- Greeting hours: dropped by Alex on 2026-10-22 (no change).
- Accessibility tab: shortcuts row removed (1.14.43).
- Trash drag and drop (delete by dropping on Trash, restore by dropping on Notes): done in 1.14.43.
