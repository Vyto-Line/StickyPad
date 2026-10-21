# Electron upgrade (33 -> 44), audit and trial results (2026-10-22)

StickyPad is on Electron 33.4.x (Chromium 130, Node 20). Electron supports the latest 3 majors and ships a new one every 8 weeks;
on 2026-10-20 the newest lines were 45.0.0, 44.9.3, 43.8.3, 42.11.18 (Electron release page).

## Breaking changes 34 to 45 that touch StickyPad
Checked against the code (source: Electron's breaking-changes list for 45.0).
| Change | Affects us? |
|---|---|
| 44: Windows x86 (ia32) binaries removed | No: the installer is x64 only (`package.json` build.win arch x64). 32-bit Windows could never run it newer than 43. |
| 44/45: `clipboard` removed from renderers; sandboxed-preload shims removed (events, timers, url, Buffer, setImmediate) | No: `preload.js` only requires `electron` (contextBridge, ipcRenderer, webUtils, webFrame); pages use `navigator.clipboard`; `clipboard` is used only in main.js. |
| 36: `app.commandLine` lowercases switches and arguments | Looked risky (our `disable-features` list has capitals), but the real run shows the value unchanged on 36, 40, 44, 45. |
| 43: dialog `defaultPath` defaults to Downloads | No visible effect (export passes its own path). |
| 42: the `electron` npm package downloads its binary on first run | Worked in CI (the build log showed "Downloading Electron binary..."). |
| 45: synchronous `safeStorage` methods deprecated, removed in **46** | Yes, later: `main.js` uses `isEncryptionAvailable/encryptString/decryptString` for the Claude API key. Fine up to 45; before 46 they must move to the async methods (data stays readable). **So stop at 44 for now.** |
| Everything else (webRequest, session, printers, nativeImage bitmaps, protocol, crashReporter, desktopCapturer, utility processes) | Not used. |

## Real-Electron smoke test (`smoke.js`, workflow "Electron smoke test")
It starts the real `main.js` on a Windows runner in a throw-away data folder, waits 12 s, and reports windows, shortcuts, switches and logs.
Same result on **33.4.11, 35.7.5, 36.9.5, 40.9.3, 44.9.3 and 45.0.0**: the tour and a note both open and are visible, all 6 global shortcuts register,
no crash.log, switches intact.
Also seen on every version, including 33: `ready-to-show` never arrived for the note and tour windows, they were shown by "page load"
(perf.log line `WINDOW ... was shown by page load`). This confirms the 1.14.47 fix (never wait for that one signal) was needed and works.

## Installer trial
Branch `electron-44` (package.json electron ^44.9.3, nothing else changed) builds fine with electron-builder 25 on GitHub (run 39680147086).
Cost: the build artifact (exe + blockmap + latest.yml) grows from about 75 MB to about 106 MB.

## What the smoke test cannot show (needs Alex's PC)
Focus and z-order (windows coming to the front), Ctrl+Alt+F feel, printing with a real printer, dragging, update install,
see-through note backgrounds (GPU off in low-memory mode), memory use and speed. See WINDOWS_CHECKLIST.md.

## Plan
1. Alex installs the `electron-44` build and runs the checklist. If something is wrong, bisect with the smoke workflow and builds at 40, 36 and 35.
2. If it is good: merge package.json (electron ^44) into main, bump the version, release. Install size grows by about 30 MB.
3. Later, before Electron 46: move `safeStorage` to the async methods; then 45, 46 and beyond.
4. Also consider electron-builder 26 (it works with 25 today; no hurry).
