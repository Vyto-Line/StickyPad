-- StickyPad sync: the server only ever holds encrypted notes.
CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,           -- random id chosen by the app
  salt       TEXT NOT NULL,              -- public salt: lets a second PC derive the same keys from your passphrase
  token_hash TEXT NOT NULL,              -- SHA-256 of the login token (the passphrase and the token never reach the server)
  seq        INTEGER NOT NULL DEFAULT 0, -- counts every change in this account
  created    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  acct    TEXT NOT NULL,
  id      TEXT NOT NULL,
  version INTEGER NOT NULL,              -- grows by one on every save; used to detect two PCs editing at once
  seq     INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  blob    TEXT,                          -- encrypted note (the server cannot read it)
  PRIMARY KEY (acct, id)
);
CREATE INDEX IF NOT EXISTS notes_seq ON notes (acct, seq);
