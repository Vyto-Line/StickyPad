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

5. **Rename the sidebar item "Ask the AI" to "AI chat"** (chosen by Alex, 2026-10-22; it matches the chat window title, the shortcut list and the search command). Tests that look for "Ask the AI" (tests/ui/t_home.py) and the README need the new name.

7. **Round ticks instead of box characters for checklist items** in search results and cards. The Finder part is already built and tested on branch `finder-checks` (merge it into 1.15.0); the Home window's note cards show the same "☑ / ☐" characters and still need the same treatment (draw the round ticks, keep the stored text copy unchanged).
8. **Make "> actions" easier to find in the Finder (Ctrl+Alt+F)**: when the box is empty show a short line such as "Type > for actions" (the footer hint is only a key hint, not a button). Keep the 37 actions as they are.

9. **Double-click selects the word only, not the space after it** (Alex, 2026-10-23). On Windows the browser engine selects a word plus its trailing space; macOS and Linux do not. Fix: after a double-click in the note text (and the topic box), trim trailing spaces off the selection. Only for double-click (triple-click still selects the whole line; keyboard selection is left alone). I cannot reproduce the Windows behaviour in the Linux test browser, so the test sets a selection with a trailing space and checks that the double-click handler trims it; Alex checks it on his PC.

6. **Text formatting: Bold, Italic, Underline, Strikethrough, Highlight, Clear** (idea from Alex 2026-10-22, mockup made; proposed for its own release, 1.16.0, not 1.15.0). Plan: keep the plain text in `v` exactly as today (search, AI, print, export, history, word counts and old versions keep working) and add an optional list of marks to text and checklist blocks, e.g. `m: [[start, end, "b"], ...]`. A small toolbar appears over selected text (flips below when there is no room above); Ctrl+B / Ctrl+I / Ctrl+U shortcuts; Clear formatting. Things to handle: pasting (keep plain text, or keep bold and italic only), Find highlights, the huge-note drawing shortcut, AI edits (formatting in changed parts is dropped), print and Markdown export (**bold**), locked notes, history, .stickypad import and export, and tests for the new format. Lists and headings later, only if asked. This changes the notes format, so it needs a backup-safe migration test first (older versions must still open the note as plain text).

## Planned for 1.15.1 (Alex, 2026-10-23; planning only, nothing built)
1. **AI and note interaction polish.** Alex will send his list of what felt rough; then a plan (and a mockup first where the look changes).
2. **Make the snapping switch easier to find** (Settings > Notes, "Snap to sides"; off by default). Idea only so far: decide where it should be reachable from (for example a hint where snapping would help, or a quick link) and send a small mockup before building.
3. **Printer error reason (optional small improvement):** when printing fails, say why (no printer, printer offline, cancelled) instead of a general message. Diagnose first: see what Electron reports on failure.
4. **Measure the main process memory** (163 MB at rest in 1.15) before changing anything.
5. **Performance log trimming:** when the log passes its size limit, cut at a whole line (never in the middle of one) and keep the header (version, Windows, RAM). Check that the AI log trims the same way. Small test for both.
6. Anything found while testing 1.15.0 that is not a release blocker.
Not yet: updating the GitHub build helpers (Node 20 warning); Alex said "not yet".

## Planned for 1.16.0 (Alex, 2026-10-23; planning only, nothing built)
1. **Text formatting** (Bold, Italic and so on): see item 6 under 1.15.0 above.
2. **New note colour palettes** (Alex agreed to all of these): clearer separation between the six colours in each theme (Paper, Forest, Midnight and Mono are too alike); a clear default set (yellow, pink, blue, green, orange, purple, white, graphite); a computed contrast check so text is readable on every colour in light and dark; a colour-blind friendly set (differs in lightness as well as hue); colour names on hover; and **custom palettes**: people save their own six colours with a colour picker (the biggest part: the slot system in themes.js and theme switching must handle it). Rules: every option off by default, existing notes keep their colours, a small mockup from the real screens before building anything.

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
