// Encryption for StickyPad sync. Runs in the app and in the test script (Node 20+ / Electron); the server never uses it.
// One passphrase makes two things: a key that encrypts every note (AES-256-GCM), and a login token for the server.
// The passphrase and the key never leave the PC. The server only gets the token, and stores just a hash of it.
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();
export const ITERATIONS = 600000;   // makes guessing a passphrase slow

const b64 = u8 => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const b64url = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const randomId = (bytes = 16) => b64url(globalThis.crypto.getRandomValues(new Uint8Array(bytes)));
export const newSalt = () => b64(globalThis.crypto.getRandomValues(new Uint8Array(16)));

// passphrase + the account's public salt -> { key, token }
export async function deriveKeys(passphrase, saltB64, iterations = ITERATIONS) {
  const base = await subtle.importKey('raw', enc.encode(String(passphrase).normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, base, 512));
  const key = await subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { key, token: b64url(bits.slice(32, 64)) };
}

// The note id is bound into the encryption, so the server cannot hand one note's data back as another note.
const aadOf = (acct, id) => enc.encode(acct + '/' + id);
export async function encryptNote(key, acct, id, obj) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aadOf(acct, id) }, key, enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return 'v1.' + b64(out);
}
export async function decryptNote(key, acct, id, blob) {
  if (typeof blob !== 'string' || !blob.startsWith('v1.')) throw new Error('unknown format');
  const all = unb64(blob.slice(3));
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: aadOf(acct, id) }, key, all.slice(12));
  return JSON.parse(dec.decode(pt));
}
