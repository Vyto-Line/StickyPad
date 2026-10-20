//! Auto-update for the Tauri build. Same states and messages as the Electron version's updater.js, so the pages (update bar, Settings) work unchanged:
//! idle, checking, available (waiting for Download), downloading, ready (waiting for Restart), none, error, unsupported.
//! Updates are signed: the app only installs a file whose signature matches the public key in tauri.conf.json (plugins.updater.pubkey).

use serde_json::{json, Value};
use std::{sync::Mutex, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

struct Inner {
    state: &'static str,
    version: Option<String>,
    pct: Option<u32>,
    error: String,
    checked_at: u64,
    update: Option<Update>,
    bytes: Option<Vec<u8>>,
}

pub struct UpdateState {
    inner: Mutex<Inner>,
}

impl UpdateState {
    pub fn new() -> Self {
        UpdateState {
            inner: Mutex::new(Inner { state: "idle", version: None, pct: None, error: String::new(), checked_at: 0, update: None, bytes: None }),
        }
    }
}

/// The public key is a placeholder until the signing key has been made; without a real key updates stay off.
fn has_key(app: &AppHandle) -> bool {
    let cfg = app.config().plugins.0.get("updater");
    let key = cfg.and_then(|c| c.get("pubkey")).and_then(|k| k.as_str()).unwrap_or("");
    key.len() > 40 && key != "UNSET"
}

fn view(g: &Inner, supported: bool) -> Value {
    json!({
        "state": if supported { g.state } else { "unsupported" }, "version": g.version, "pct": g.pct,
        "error": if supported { g.error.as_str() } else { "Updates are not set up in this build yet." }, "checkedAt": g.checked_at
    })
}

pub fn snapshot(app: &AppHandle) -> Value {
    let st = app.state::<UpdateState>();
    let g = match st.inner.lock() { Ok(g) => g, Err(_) => return Value::Null };
    view(&g, has_key(app))
}

/// Changes the state and tells every window.
fn set(app: &AppHandle, f: impl FnOnce(&mut Inner)) {
    let st = app.state::<UpdateState>();
    let snap = {
        let mut g = match st.inner.lock() { Ok(g) => g, Err(_) => return };
        f(&mut g);
        view(&g, true)
    };
    let _ = app.emit("update:event", snap);
}

fn friendly(e: &str) -> String {
    let l = e.to_lowercase();
    if l.contains("dns") || l.contains("connect") || l.contains("timed out") || l.contains("network") || l.contains("error sending request") {
        return "Could not reach GitHub. Check your internet connection.".into();
    }
    if l.contains("404") || l.contains("not found") || l.contains("could not fetch a valid release json") {
        return "No downloadable update was found on GitHub yet. If you just published a release, its files may still be uploading: try again in a few minutes.".into();
    }
    if l.contains("signature") {
        return "The downloaded update did not pass the safety check, so it was not installed.".into();
    }
    format!("The update check failed: {}", e.lines().next().unwrap_or("").chars().take(160).collect::<String>())
}

pub fn check(app: &AppHandle) {
    if !has_key(app) { return; }
    {
        let st = app.state::<UpdateState>();
        let busy = st.inner.lock().map(|g| ["checking", "available", "downloading", "ready"].contains(&g.state)).unwrap_or(true);
        if busy { return; }
    }
    set(app, |g| { g.state = "checking"; g.error.clear(); g.pct = None; });
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let found = match app.updater() {
            Ok(u) => u.check().await.map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        };
        let now = super::now_ms();
        match found {
            Ok(Some(up)) => { let v = up.version.clone(); set(&app, |g| { g.state = "available"; g.version = Some(v); g.pct = None; g.update = Some(up); }); }
            Ok(None) => set(&app, |g| { g.state = "none"; g.version = None; g.pct = None; g.checked_at = now; g.update = None; }),
            Err(e) => { let m = friendly(&e); set(&app, |g| { g.state = "error"; g.error = m; g.pct = None; g.checked_at = now; }); }
        }
    });
}

pub fn download(app: &AppHandle) {
    let up = {
        let st = app.state::<UpdateState>();
        let g = match st.inner.lock() { Ok(g) => g, Err(_) => return };
        if g.state != "available" { return; }
        g.update.clone()
    };
    let Some(up) = up else { return };
    set(app, |g| { g.state = "downloading"; g.pct = Some(0); g.error.clear(); });
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let (mut got, mut last) = (0u64, 0u32);
        let a2 = app.clone();
        let res = up
            .download(
                move |chunk, total| {
                    got += chunk as u64;
                    if let Some(t) = total.filter(|t| *t > 0) {
                        let p = ((got * 100) / t).min(100) as u32;
                        if p != last { last = p; set(&a2, |g| { g.state = "downloading"; g.pct = Some(p); }); }
                    }
                },
                || {},
            )
            .await;
        let now = super::now_ms();
        match res {
            Ok(bytes) => set(&app, |g| { g.state = "ready"; g.pct = Some(100); g.checked_at = now; g.bytes = Some(bytes); }),
            Err(e) => { let m = friendly(&e.to_string()); set(&app, |g| { g.state = "error"; g.error = m; g.pct = None; g.checked_at = now; }); }
        }
    });
}

/// Hands the downloaded installer over. On Windows the installer closes the app and starts the new version.
pub fn install(app: &AppHandle) {
    let (up, bytes) = {
        let st = app.state::<UpdateState>();
        let mut g = match st.inner.lock() { Ok(g) => g, Err(_) => return };
        if g.state != "ready" { return; }
        (g.update.clone(), g.bytes.take())
    };
    let (Some(up), Some(bytes)) = (up, bytes) else { return };
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = up.install(bytes) {
            let m = friendly(&e.to_string());
            set(&app, |g| { g.state = "error"; g.error = m; });
        }
    });
}

/// Looks shortly after start-up and then every few hours (the app can stay open in the tray for days).
pub fn schedule(app: AppHandle, enabled: impl Fn() -> bool + Send + 'static) {
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(15));
        loop {
            if enabled() { check(&app); }
            thread::sleep(Duration::from_secs(6 * 3600));
        }
    });
}
