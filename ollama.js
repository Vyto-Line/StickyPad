'use strict';
// Helpers for talking to a local Ollama: list models, download models, install and start Ollama itself.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

const DEFAULT_URL = 'http://localhost:11434';
const RECOMMENDED = [   // sizes are approximate; ordered from smallest to largest
  { name: 'gemma3:1b', label: 'Gemma 3 · 1B', size: '0.8 GB', note: 'Tiny and very fast' },
  { name: 'llama3.2:1b', label: 'Llama 3.2 · 1B', size: '1.3 GB', note: 'Fast, good for quick fixes' },
  { name: 'qwen2.5:3b', label: 'Qwen 2.5 · 3B', size: '1.9 GB', note: 'Light, decent Greek' },
  { name: 'llama3.2:3b', label: 'Llama 3.2 · 3B', size: '2.0 GB', note: 'Recommended balance' },
  { name: 'phi4-mini', label: 'Phi-4 mini · 3.8B', size: '2.5 GB', note: 'Sharp, English first' },
  { name: 'gemma3:4b', label: 'Gemma 3 · 4B', size: '3.3 GB', note: 'Very good Greek' },
  { name: 'mistral:7b', label: 'Mistral · 7B', size: '4.1 GB', note: 'Solid all-rounder' },
  { name: 'qwen2.5:7b', label: 'Qwen 2.5 · 7B', size: '4.7 GB', note: 'Strong Greek, slower' },
  { name: 'llama3.1:8b', label: 'Llama 3.1 · 8B', size: '4.9 GB', note: 'Best Llama, slower' },
  { name: 'gemma3:12b', label: 'Gemma 3 · 12B', size: '8.1 GB', note: 'Best Greek, needs 16 GB RAM' }
];
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._\-:/]{0,100}$/;
const validName = n => typeof n === 'string' && NAME_RE.test(n);
const baseOf = url => String(url || DEFAULT_URL).trim().replace(/\/+$/, '');

async function status(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(baseOf(url) + '/api/tags', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { running: false, models: [] };
    const d = await res.json();
    const models = (d.models || []).map(m => ({ name: m.name, size: m.size || 0 })).filter(m => m.name);
    return { running: true, models };
  } catch { return { running: false, models: [] }; }
}

// Streams /api/pull. onProgress({status, pct, done}) where pct is 0-100 or null.
async function pull(url, name, onProgress, signal, fetchImpl = fetch) {
  if (!validName(name)) throw new Error('That model name is not valid.');
  let res;
  try { res = await fetchImpl(baseOf(url) + '/api/pull', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, stream: true }), signal }); }
  catch (e) { if (signal && signal.aborted) throw e; throw new Error('Could not reach Ollama. Is it running?'); }
  if (!res.ok) { let d = null; try { d = await res.json(); } catch {} throw new Error((d && d.error) || `Ollama said HTTP ${res.status}`); }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '', ok = false;
  const line = raw => {
    raw = raw.trim(); if (!raw) return;
    let o; try { o = JSON.parse(raw); } catch { return; }
    if (o.error) throw new Error(o.error);
    const pct = o.total ? Math.min(100, Math.round((o.completed || 0) / o.total * 100)) : null;
    if (o.status === 'success') ok = true;
    onProgress && onProgress({ status: o.status || '', pct, done: o.status === 'success' });
  };
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); line(l); }
  }
  if (buf.trim()) line(buf);
  if (!ok) throw new Error('The download ended before it finished.');
  return true;
}

function ollamaPaths(env = process.env) {
  const l = env.LOCALAPPDATA || '', p = env.ProgramFiles || 'C:\\Program Files';
  return [path.join(l, 'Programs', 'Ollama', 'ollama app.exe'), path.join(l, 'Programs', 'Ollama', 'ollama.exe'), path.join(p, 'Ollama', 'ollama app.exe')];
}
function findOllama(env = process.env, exists = fs.existsSync) { return ollamaPaths(env).find(p => exists(p)) || null; }

function startOllama(env = process.env, spawnImpl = spawn, exists = fs.existsSync) {
  const exe = findOllama(env, exists); if (!exe) return false;
  const args = /ollama\.exe$/i.test(exe) ? ['serve'] : [];
  try { const c = spawnImpl(exe, args, { detached: true, stdio: 'ignore', windowsHide: true }); c.on && c.on('error', () => {}); c.unref && c.unref(); return true; }
  catch { return false; }
}

async function waitUntilRunning(url, tries = 30, delay = 1000, statusFn = status) {
  for (let i = 0; i < tries; i++) { if ((await statusFn(url)).running) return true; await new Promise(r => setTimeout(r, delay)); }
  return false;
}

const INSTALLER_URL = 'https://ollama.com/download/OllamaSetup.exe';
const HOST_OK = h => /(^|\.)ollama\.com$/.test(h) || /(^|\.)github\.com$/.test(h) || /(^|\.)githubusercontent\.com$/.test(h);

function downloadInstaller(dest, onProgress, signal, getImpl = https.get, url = INSTALLER_URL, hops = 0) {
  return new Promise((resolve, reject) => {
    let u; try { u = new URL(url); } catch { return reject(new Error('Bad download address.')); }
    if (u.protocol !== 'https:' || !HOST_OK(u.hostname)) return reject(new Error('Refusing to download from an unexpected address.'));
    if (hops > 5) return reject(new Error('Too many redirects.'));
    const req = getImpl(u, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadInstaller(dest, onProgress, signal, getImpl, new URL(res.headers.location, u).href, hops + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('Download failed (HTTP ' + res.statusCode + ').')); }
      const total = +res.headers['content-length'] || 0; let got = 0;
      const out = fs.createWriteStream(dest);
      const bail = e => { try { out.destroy(); fs.unlinkSync(dest); } catch {} reject(e); };
      res.on('data', c => { got += c.length; onProgress && onProgress({ pct: total ? Math.round(got / total * 100) : null }); });
      res.on('error', () => bail(new Error('The download was interrupted.')));
      res.pipe(out);
      out.on('finish', () => {
        if (got < 1024 * 1024) return bail(new Error('The downloaded file looks wrong.'));
        resolve(dest);
      });
    });
    req.on('error', () => reject(new Error('Could not download Ollama. Check your internet connection.')));
    if (signal) signal.addEventListener('abort', () => { req.destroy(); const e = new Error('Cancelled'); e.name = 'AbortError'; reject(e); }, { once: true });
  });
}

function runInstaller(file, spawnImpl = spawn) {
  return new Promise((resolve, reject) => {
    let c; try { c = spawnImpl(file, ['/SILENT'], { stdio: 'ignore', windowsHide: false }); } catch { return reject(new Error('Could not start the installer.')); }
    c.on('error', () => reject(new Error('Could not start the installer.')));
    c.on('exit', code => code === 0 ? resolve(true) : reject(new Error('The installer closed early (code ' + code + ').')));
  });
}

module.exports = { RECOMMENDED, validName, status, pull, findOllama, startOllama, waitUntilRunning, downloadInstaller, runInstaller, INSTALLER_URL, DEFAULT_URL };
