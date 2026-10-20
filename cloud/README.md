# StickyPad sync server (prototype)

A tiny server on Cloudflare's free plan (a Worker plus a D1 database). It stores **encrypted** notes only. The passphrase and the encryption key never leave your PC; the server gets a login token and keeps just a hash of it.

Status: the server and the encryption are written and tested here. **StickyPad itself does not use it yet.** Step 7 below checks the live server from your PC.

## Deploy (about 10 minutes, free, no card)
Run these in a Command Prompt, inside the `cloud` folder of this repository. Needs Node.js 20 or newer.

1. `npx wrangler login` — opens your browser; allow access.
2. `npx wrangler d1 create stickypad-sync` — prints a `database_id`.
3. Open `wrangler.toml` and replace `PASTE-THE-ID-FROM-STEP-3-HERE` with that id.
4. `npx wrangler d1 execute stickypad-sync --remote --file=schema.sql`
5. `npx wrangler secret put REG_CODE` — type a long secret code of your own (this is what allows creating accounts; keep it private).
6. `npx wrangler deploy` — prints your address, like `https://stickypad-sync.NAME.workers.dev`.
7. Check it: `node smoke.mjs https://stickypad-sync.NAME.workers.dev YOUR-REG-CODE "any test passphrase"` — every line should say PASS.

## How it protects notes
- One passphrase makes (PBKDF2, 600,000 rounds) an AES-256-GCM key and a login token. Notes are encrypted before upload; the note id is part of the encryption, so the server cannot swap one note's data for another's.
- Every save carries the version it was based on. If another PC saved first, the server refuses (HTTP 409) and returns the newer copy, so the app can keep both. Nothing is silently overwritten.
- Only people with your registration code can create accounts. Limits: 300 KB per note, 5,000 notes per account.

## Not protected / known limits
- A forgotten passphrase cannot be recovered. The server cannot reset it, because it cannot read anything.
- The server sees how many notes you have, their sizes and when they change.
- No picture sync yet. No rate limiting beyond Cloudflare's own free-plan caps.
