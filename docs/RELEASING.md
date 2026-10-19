# Releasing

The installed app updates itself from this repo's GitHub Releases (electron-updater, `updater.js`).

1. Bump `version` in `package.json` (and `src-tauri/Cargo.toml` + `src-tauri/tauri.conf.json` for the Tauri preview). The version must be **higher** than the one users have, or nothing happens.
2. Update `CHANGELOG.md`, commit and push to `main`.
3. On GitHub: **Releases > Draft a new release**, tag `v<version>` (for example `v1.12.0`, same number as `package.json`), publish. Ticking "pre-release" is fine: the updater also accepts pre-releases.
4. The *Build installer* workflow builds on Windows and attaches `StickyPad-Setup-<version>.exe`, its `.blockmap` and **`latest.yml`** to the release. `latest.yml` is what installed apps read: if it is missing from the release, they cannot update.
5. Installed apps pick it up within a few hours of starting (or at once with Settings > About > Check now).

The app is not code-signed, so Windows SmartScreen may warn on a first manual install; auto-updates are verified with the SHA-512 in `latest.yml`.
The Tauri preview has its own workflow and is not part of auto-update yet (Tauri's updater needs a signing key).
