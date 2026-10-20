'use strict';
// Encryption for StickyPad sync (used by the app and by cloud/smoke.mjs; the server never sees any of this).
// One passphrase makes two things: a key that encrypts every note (AES-256-GCM) and a login token for the server.
// The passphrase and the key never leave the PC. The server only gets the token and stores a hash of it.
const nodeCrypto = require('crypto');
const subtle = nodeCrypto.webcrypto.subtle, getRandomValues = a => nodeCrypto.webcrypto.getRandomValues(a);
const enc = new TextEncoder(), dec = new TextDecoder();
const ITERATIONS = 600000;   // makes guessing a passphrase slow

const b64 = u8 => Buffer.from(u8).toString('base64');
const unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));
const b64url = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomId = (bytes = 16) => b64url(getRandomValues(new Uint8Array(bytes)));
const newSalt = () => b64(getRandomValues(new Uint8Array(16)));

// passphrase + the account's public salt -> 64 secret bytes (kept on this PC, protected by Windows)
async function deriveRaw(passphrase, saltB64, iterations = ITERATIONS) {
  const base = await subtle.importKey('raw', enc.encode(String(passphrase).normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, base, 512));
}
async function fromRaw(raw) {
  const key = await subtle.importKey('raw', raw.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { key, token: b64url(raw.slice(32, 64)) };
}
const deriveKeys = async (pass, salt, iterations) => fromRaw(await deriveRaw(pass, salt, iterations));

// The account and note id are bound into the encryption, so the server cannot hand one note's data back as another note.
const aadOf = (acct, id) => enc.encode(acct + '/' + id);
async function encryptNote(key, acct, id, obj) {
  const iv = getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aadOf(acct, id) }, key, enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return 'v1.' + b64(out);
}
async function decryptNote(key, acct, id, blob) {
  if (typeof blob !== 'string' || !blob.startsWith('v1.')) throw new Error('unknown format');
  const all = unb64(blob.slice(3));
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: aadOf(acct, id) }, key, all.slice(12));
  return JSON.parse(dec.decode(pt));
}
module.exports = { ITERATIONS, b64, unb64, b64url, randomId, newSalt, deriveRaw, fromRaw, deriveKeys, encryptNote, decryptNote };
