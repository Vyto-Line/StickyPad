//! StickyPad on Tauri. Step 1: notes storage (same notes.json as the Electron version), note windows, pictures.
//! The pages talk to this through one command, `ipc`, whose channel names are the same as in the Electron app's main.js,
//! so the HTML/JS screens are reused unchanged. Channels that are not ported yet answer `null`.

mod update;

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde_json::{json, Map, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    AppHandle, LogicalSize, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};

const MIN_W: f64 = 260.0;
const MIN_H: f64 = 180.0;
const ROLL_H: f64 = 40.0;
const MAX_BLOCKS: usize = 50_000; // a long note must never lose its last lines
const MAX_TEXT: usize = 5_000_000;

/* ---------- small helpers ---------- */

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn base36(mut n: u128) -> String {
    const D: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if n == 0 {
        return "0".to_string();
    }
    let mut v = Vec::new();
    while n > 0 {
        v.push(D[(n % 36) as usize]);
        n /= 36;
    }
    v.reverse();
    String::from_utf8(v).unwrap_or_default()
}

/// Same shape as the Electron version's ids: base-36 time followed by six more base-36 characters.
fn rid() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(1);
    let c = COUNTER.fetch_add(1, Ordering::SeqCst) as u128;
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u128)
        .unwrap_or(0);
    let tail = (nanos.wrapping_mul(2_654_435_761) ^ c.wrapping_mul(7919)) % 2_176_782_336; // 36^6
    format!("{}{:0>6}", base36(now_ms() as u128), base36(tail))
}

fn truncate_chars(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        s.chars().take(max).collect()
    }
}

fn valid_img_id(id: &str) -> bool {
    let Some((stem, ext)) = id.rsplit_once('.') else {
        return false;
    };
    matches!(ext, "png" | "jpg" | "jpeg" | "webp" | "gif")
        && (6..=40).contains(&stem.len())
        && stem
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
}

fn write_atomic(file: &Path, text: &str) -> std::io::Result<()> {
    let tmp = file.with_extension("json.tmp");
    fs::write(&tmp, text)?;
    fs::rename(&tmp, file)
}

/* ---------- data folder (same place and pointer file as the Electron version) ---------- */

fn default_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("StickyPad")
}

fn resolve_dir(app: &AppHandle) -> PathBuf {
    let def = default_dir(app);
    if let Ok(txt) = fs::read_to_string(def.join("location.json")) {
        if let Ok(v) = serde_json::from_str::<Value>(&txt) {
            if let Some(d) = v["dir"].as_str() {
                let p = PathBuf::from(d);
                if p.is_absolute() && p.is_dir() {
                    return p;
                }
            }
        }
    }
    def
}

/* ---------- the data ---------- */

struct Store {
    notes: Map<String, Value>,
    trash: Vec<Value>,
    groups: Vec<Value>,
    settings: Value,
    dir: PathBuf,
}

struct AppState {
    store: Mutex<Store>,
    dirty: AtomicBool,
}

fn default_settings() -> Value {
    json!({
        "hideTaskbar": true, "snap": true, "launch": "notes", "splash": true, "name": "", "lang": "en", "theme": "classic",
        "snapDistance": 10, "defaultSize": 16, "trashDays": 30, "shortcuts": true, "chatHistory": true, "autoBackup": true,
        "lastBackup": 0, "ai": { "provider": "off", "model": "", "url": "http://localhost:11434", "keyEnc": "" }
    })
}

impl Store {
    fn file(&self) -> PathBuf {
        self.dir.join("notes.json")
    }
    fn img_dir(&self) -> PathBuf {
        self.dir.join("images")
    }
    fn serialize(&self) -> String {
        let doc = json!({ "version": 2, "notes": self.notes, "trash": self.trash, "groups": self.groups, "settings": self.settings });
        serde_json::to_string_pretty(&doc).unwrap_or_default()
    }
}

fn sanitize_blocks(arr: &Value) -> Vec<Value> {
    let mut out = Vec::new();
    let Some(list) = arr.as_array() else {
        return out;
    };
    for b in list.iter().take(MAX_BLOCKS) {
        match b["t"].as_str() {
            Some("text") => {
                if let Some(v) = b["v"].as_str() {
                    if !v.is_empty() {
                        out.push(json!({ "t": "text", "v": truncate_chars(v, MAX_TEXT) }));
                    }
                }
            }
            Some("check") => {
                if let Some(v) = b["v"].as_str() {
                    if !v.trim().is_empty() {
                        // empty checklist items are dropped
                        out.push(json!({ "t": "check", "v": truncate_chars(v, 20_000), "done": b["done"].as_bool().unwrap_or(false) }));
                    }
                }
            }
            Some("img") => {
                if let Some(id) = b["id"].as_str() {
                    if valid_img_id(id) {
                        out.push(json!({ "t": "img", "id": id }));
                    }
                }
            }
            _ => {}
        }
    }
    out
}

fn text_of(blocks: &[Value]) -> String {
    let mut lines: Vec<String> = Vec::new();
    for b in blocks {
        match b["t"].as_str() {
            Some("text") => lines.push(b["v"].as_str().unwrap_or("").to_string()),
            Some("check") => {
                let mark = if b["done"].as_bool().unwrap_or(false) {
                    "☑ "
                } else {
                    "☐ "
                };
                lines.push(format!("{}{}", mark, b["v"].as_str().unwrap_or("")));
            }
            _ => {}
        }
    }
    let joined = lines
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    truncate_chars(&joined, MAX_TEXT)
}

fn is_locked(n: &Value) -> bool {
    n.get("lock").map_or(false, |l| !l.is_null())
}

fn img_ids(n: &Value) -> Vec<String> {
    let mut ids = Vec::new();
    if is_locked(n) {
        if let Some(a) = n["lock"]["imgs"].as_array() {
            ids.extend(a.iter().filter_map(|v| v.as_str().map(String::from)));
        }
    } else if let Some(a) = n["blocks"].as_array() {
        ids.extend(
            a.iter()
                .filter(|b| b["t"] == "img")
                .filter_map(|b| b["id"].as_str().map(String::from)),
        );
    }
    ids
}

fn has_content(n: &Value) -> bool {
    is_locked(n)
        || !n["title"].as_str().unwrap_or("").trim().is_empty()
        || !n["text"].as_str().unwrap_or("").trim().is_empty()
        || !img_ids(n).is_empty()
}

fn load_store(dir: PathBuf) -> Store {
    let _ = fs::create_dir_all(&dir);
    let mut st = Store {
        notes: Map::new(),
        trash: Vec::new(),
        groups: Vec::new(),
        settings: default_settings(),
        dir,
    };
    if let Ok(txt) = fs::read_to_string(st.file()) {
        if let Ok(d) = serde_json::from_str::<Value>(&txt) {
            if d["version"] == 2 {
                st.notes = d["notes"].as_object().cloned().unwrap_or_default();
                st.trash = d["trash"].as_array().cloned().unwrap_or_default();
                st.groups = d["groups"].as_array().cloned().unwrap_or_default();
                if let Some(o) = d["settings"].as_object() {
                    for (k, v) in o {
                        st.settings[k.as_str()] = v.clone();
                    }
                }
            }
        }
    }
    // clean out empty checklist items that older versions saved
    for n in st.notes.values_mut() {
        if !is_locked(n) && n["blocks"].is_array() {
            let blocks = sanitize_blocks(&n["blocks"]);
            n["text"] = Value::String(text_of(&blocks));
            n["blocks"] = Value::Array(blocks);
        }
    }
    // empty notes are never kept between launches
    let empty: Vec<String> = st
        .notes
        .iter()
        .filter(|(_, n)| !has_content(n))
        .map(|(k, _)| k.clone())
        .collect();
    for k in empty {
        st.notes.remove(&k);
    }
    // the trash empties itself after trashDays
    let days = st.settings["trashDays"].as_u64().unwrap_or(30);
    let cutoff = now_ms().saturating_sub(days * 86_400_000);
    st.trash
        .retain(|t| t["deletedAt"].as_u64().unwrap_or(u64::MAX) >= cutoff);
    // notes in a folder that no longer exists go back to "no folder"
    let gids: Vec<String> = st
        .groups
        .iter()
        .filter_map(|g| g["id"].as_str().map(String::from))
        .collect();
    for n in st.notes.values_mut().chain(st.trash.iter_mut()) {
        if let Some(g) = n["group"].as_str() {
            if !gids.iter().any(|x| x == g) {
                n["group"] = Value::Null;
            }
        }
    }
    st
}

fn flush(app: &AppHandle, force: bool) {
    let state = app.state::<AppState>();
    if state.dirty.swap(false, Ordering::SeqCst) || force {
        if let Ok(st) = state.store.lock() {
            let _ = write_atomic(&st.file(), &st.serialize());
        }
    }
}

fn mark_dirty(state: &AppState) {
    state.dirty.store(true, Ordering::SeqCst);
}

/* ---------- pictures ---------- */

fn read_img(dir: &Path, id: &str) -> Option<String> {
    if !valid_img_id(id) {
        return None;
    }
    let bytes = fs::read(dir.join(id)).ok()?;
    let ext = id.rsplit('.').next().unwrap_or("png");
    let mime = if ext == "jpg" { "jpeg" } else { ext };
    Some(format!("data:image/{};base64,{}", mime, B64.encode(bytes)))
}

fn drop_images(st: &Store, n: &Value) {
    for id in img_ids(n) {
        if valid_img_id(&id) {
            let _ = fs::remove_file(st.img_dir().join(id));
        }
    }
}

fn save_image(st: &Store, data_url: &str) -> Value {
    let Some(rest) = data_url.strip_prefix("data:image/") else {
        return Value::Null;
    };
    let Some((kind, b64)) = rest.split_once(";base64,") else {
        return Value::Null;
    };
    if !matches!(kind, "png" | "jpeg" | "webp" | "gif") || b64.len() > 14_000_000 {
        return Value::Null;
    }
    let Ok(bytes) = B64.decode(b64.trim()) else {
        return Value::Null;
    };
    let id = format!("{}.{}", rid(), if kind == "jpeg" { "jpg" } else { kind });
    let _ = fs::create_dir_all(st.img_dir());
    match fs::write(st.img_dir().join(&id), bytes) {
        Ok(_) => Value::String(id),
        Err(_) => Value::Null,
    }
}

/* ---------- notes ---------- */

fn new_note(st: &Store, bounds: Value) -> Value {
    let size = st.settings["defaultSize"].as_u64().unwrap_or(16);
    json!({
        "id": rid(), "updated": now_ms(), "title": "", "group": null, "rolled": false, "text": "", "blocks": [],
        "color": "#FFF2A8", "font": "Segoe UI", "size": size, "pinned": false, "bounds": bounds
    })
}

fn note_get(st: &Store, id: &str) -> Value {
    let Some(n) = st.notes.get(id) else {
        return Value::Null;
    };
    let locked = is_locked(n);
    let mut out = n.as_object().cloned().unwrap_or_default();
    out.remove("lock");
    let mut blocks = Vec::new();
    if !locked {
        if let Some(list) = n["blocks"].as_array() {
            for b in list {
                if b["t"] == "img" {
                    if let Some(src) = b["id"].as_str().and_then(|i| read_img(&st.img_dir(), i)) {
                        blocks.push(json!({ "t": "img", "id": b["id"], "src": src }));
                    }
                } else {
                    blocks.push(b.clone());
                }
            }
        }
    }
    out.insert("blocks".into(), Value::Array(blocks));
    out.insert("locked".into(), Value::Bool(locked));
    out.insert("unlocked".into(), Value::Bool(false));
    Value::Object(out)
}

fn note_update(st: &mut Store, id: &str, p: &Value) {
    let Some(n) = st.notes.get_mut(id) else {
        return;
    };
    if !is_locked(n) && p["blocks"].is_array() {
        let blocks = sanitize_blocks(&p["blocks"]);
        n["text"] = Value::String(text_of(&blocks));
        n["blocks"] = Value::Array(blocks);
    }
    if let Some(t) = p["title"].as_str() {
        n["title"] = Value::String(truncate_chars(t, 60));
    }
    if let Some(c) = p["color"].as_str() {
        if c.len() == 7 && c.starts_with('#') && c[1..].bytes().all(|b| b.is_ascii_hexdigit()) {
            n["color"] = Value::String(c.to_string());
        }
    }
    if let Some(f) = p["font"].as_str() {
        let clean: String = f
            .chars()
            .filter(|ch| !matches!(ch, '"' | '\'' | '\\' | ';' | '{' | '}'))
            .take(60)
            .collect();
        n["font"] = Value::String(if clean.is_empty() {
            "Segoe UI".to_string()
        } else {
            clean
        });
    }
    if let Some(s) = p["size"].as_f64() {
        n["size"] = json!(s.round().clamp(8.0, 72.0) as u64);
    }
    n["updated"] = json!(now_ms());
}

/* ---------- windows ---------- */

fn capture_bounds(app: &AppHandle, w: &WebviewWindow, id: &str) {
    let (Ok(pos), Ok(size), Ok(sf)) = (w.outer_position(), w.inner_size(), w.scale_factor()) else {
        return;
    };
    let state = app.state::<AppState>();
    if let Ok(mut st) = state.store.lock() {
        if let Some(n) = st.notes.get_mut(id) {
            let rolled = n["rolled"].as_bool().unwrap_or(false);
            let height = if rolled {
                n["bounds"]["height"].as_f64().unwrap_or(320.0)
            } else {
                size.height as f64 / sf
            };
            n["bounds"] = json!({ "x": pos.x as f64 / sf, "y": pos.y as f64 / sf, "width": size.width as f64 / sf, "height": height });
        }
    }
    mark_dirty(&state);
}

fn open_note(app: &AppHandle, n: &Value) -> Result<(), String> {
    let id = n["id"].as_str().ok_or("note without id")?.to_string();
    let label = format!("note-{}", id);
    if let Some(w) = app.get_webview_window(&label) {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    let b = &n["bounds"];
    let rolled = n["rolled"].as_bool().unwrap_or(false);
    let width = b["width"].as_f64().unwrap_or(300.0).max(MIN_W);
    let height = if rolled {
        ROLL_H
    } else {
        b["height"].as_f64().unwrap_or(320.0).max(MIN_H)
    };
    let hide = {
        let state = app.state::<AppState>();
        let st = state.store.lock().map_err(|_| "lock".to_string())?;
        st.settings["hideTaskbar"].as_bool().unwrap_or(true)
    };
    let mut wb = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("note.html".into()))
        .title("StickyPad")
        .decorations(false)
        .inner_size(width, height)
        .min_inner_size(MIN_W, if rolled { ROLL_H } else { MIN_H })
        .maximizable(false)
        .always_on_top(n["pinned"].as_bool().unwrap_or(false))
        .skip_taskbar(hide);
    if rolled {
        wb = wb.max_inner_size(10_000.0, ROLL_H);
    }
    if let (Some(x), Some(y)) = (b["x"].as_f64(), b["y"].as_f64()) {
        wb = wb.position(x, y);
    }
    let w = wb.build().map_err(|e| e.to_string())?;
    let (h, w2, id2) = (app.clone(), w.clone(), id);
    w.on_window_event(move |ev| {
        if matches!(ev, WindowEvent::Moved(_) | WindowEvent::Resized(_)) {
            capture_bounds(&h, &w2, &id2);
        }
    });
    Ok(())
}

fn make_note(
    app: &AppHandle,
    state: &AppState,
    near: Option<&WebviewWindow>,
) -> Result<(), String> {
    let note = {
        let mut st = state.store.lock().map_err(|_| "lock".to_string())?;
        let k = (st.notes.len() % 8) as f64;
        let (mut x, mut y, mut w, mut h) = (80.0 + k * 28.0, 80.0 + k * 28.0, 300.0, 320.0);
        if let Some(win) = near {
            if let (Ok(pos), Ok(size), Ok(sf)) =
                (win.outer_position(), win.inner_size(), win.scale_factor())
            {
                x = pos.x as f64 / sf + 32.0;
                y = pos.y as f64 / sf + 32.0;
                w = size.width as f64 / sf;
                h = size.height as f64 / sf;
            }
        }
        let n = new_note(
            &st,
            json!({ "x": x, "y": y, "width": w, "height": h.max(MIN_H) }),
        );
        let id = n["id"].as_str().unwrap_or_default().to_string();
        st.notes.insert(id, n.clone());
        n
    };
    mark_dirty(state);
    open_note(app, &note)
}

fn delete_note(app: &AppHandle, state: &AppState, id: &str, win: Option<&WebviewWindow>) {
    let mut reopen = false;
    if let Ok(mut st) = state.store.lock() {
        if let Some(n) = st.notes.remove(id) {
            if has_content(&n) {
                let mut t = n.clone();
                t["deletedAt"] = json!(now_ms());
                st.trash.insert(0, t);
            } else {
                drop_images(&st, &n);
            }
        }
        reopen = st.notes.is_empty();
    }
    mark_dirty(state);
    if let Some(w) = win {
        let _ = w.close();
    }
    if reopen {
        let _ = make_note(app, state, None); // never leave the app without a note
    }
}

/* ---------- the single IPC command ---------- */

fn dispatch(
    app: &AppHandle,
    win: &WebviewWindow,
    state: &AppState,
    ch: &str,
    a: &[Value],
) -> Result<Value, String> {
    let id = win.label().strip_prefix("note-").unwrap_or("").to_string();
    let arg0 = a.first().cloned().unwrap_or(Value::Null);
    match ch {
        "note:get" => {
            let st = state.store.lock().map_err(|_| "lock".to_string())?;
            Ok(note_get(&st, &id))
        }
        "note:update" => {
            let mut st = state.store.lock().map_err(|_| "lock".to_string())?;
            note_update(&mut st, &id, &arg0);
            drop(st);
            mark_dirty(state);
            Ok(Value::Null)
        }
        "img:save" => {
            let st = state.store.lock().map_err(|_| "lock".to_string())?;
            Ok(save_image(&st, arg0.as_str().unwrap_or("")))
        }
        "note:pin" => {
            let pinned = arg0.as_bool().unwrap_or(false);
            {
                let mut st = state.store.lock().map_err(|_| "lock".to_string())?;
                if let Some(n) = st.notes.get_mut(&id) {
                    n["pinned"] = Value::Bool(pinned);
                }
            }
            let _ = win.set_always_on_top(pinned);
            mark_dirty(state);
            Ok(Value::Bool(pinned))
        }
        "note:roll" => {
            let roll = arg0.as_bool().unwrap_or(false);
            let (sf, size) = (win.scale_factor().unwrap_or(1.0), win.inner_size().ok());
            let full_h = {
                let mut st = state.store.lock().map_err(|_| "lock".to_string())?;
                let Some(n) = st.notes.get_mut(&id) else {
                    return Ok(Value::Bool(false));
                };
                if roll {
                    if let Some(s) = size {
                        n["bounds"]["height"] = json!(s.height as f64 / sf);
                    }
                }
                n["rolled"] = Value::Bool(roll);
                n["bounds"]["height"].as_f64().unwrap_or(320.0).max(MIN_H)
            };
            let width = size.map(|s| s.width as f64 / sf).unwrap_or(300.0);
            if roll {
                let _ = win.set_min_size(Some(LogicalSize::new(MIN_W, ROLL_H)));
                let _ = win.set_max_size(Some(LogicalSize::new(10_000.0, ROLL_H)));
                let _ = win.set_size(LogicalSize::new(width, ROLL_H));
            } else {
                let _ = win.set_max_size(None::<LogicalSize<f64>>);
                let _ = win.set_min_size(Some(LogicalSize::new(MIN_W, MIN_H)));
                let _ = win.set_size(LogicalSize::new(width, full_h));
            }
            mark_dirty(state);
            Ok(Value::Bool(roll))
        }
        "note:new" => {
            make_note(app, state, Some(win))?;
            Ok(Value::Null)
        }
        "note:close" => {
            let empty = {
                let st = state.store.lock().map_err(|_| "lock".to_string())?;
                st.notes.get(&id).map_or(false, |n| !has_content(n))
            };
            if empty {
                delete_note(app, state, &id, Some(win)); // closing an empty note throws it away
            } else {
                let _ = win.close();
            }
            Ok(Value::Null)
        }
        "note:delete" => {
            if !id.is_empty() {
                delete_note(app, state, &id, Some(win));
            }
            Ok(Value::Null)
        }
        "app:info" => {
            let st = state.store.lock().map_err(|_| "lock".to_string())?;
            Ok(json!({
                "packaged": true, "startup": false, "trash": st.trash.len(),
                "hideTaskbar": st.settings["hideTaskbar"], "snap": st.settings["snap"],
                "groups": st.groups, "theme": st.settings["theme"]
            }))
        }
        "theme:set" => {
            let mut st = state.store.lock().map_err(|_| "lock".to_string())?;
            if let Some(t) = arg0.as_str() {
                st.settings["theme"] = Value::String(t.to_string());
            }
            let theme = st.settings["theme"].clone();
            drop(st);
            mark_dirty(state);
            Ok(theme)
        }
        // The AI helper is not ported yet: it reports itself as off so the screens stay quiet.
        "ai:get" => Ok(
            json!({ "provider": "off", "model": "", "url": "http://localhost:11434", "hasKey": false, "secure": false, "defaultModel": "claude-haiku-5-5" }),
        ),
        "ai:set" => Ok(Value::Bool(true)),
        "ai:run" => Ok(
            json!({ "ok": false, "error": "The AI helper is not available in the Tauri preview yet." }),
        ),
        "ollama:status" => Ok(
            json!({ "running": false, "installed": false, "canInstall": false, "local": true, "models": [], "recommended": [], "pulling": [], "installing": false }),
        ),
        "update:state" => Ok(update::snapshot(app)),
        "update:check" => {
            update::check(app);
            Ok(update::snapshot(app))
        }
        "update:download" => {
            update::download(app);
            Ok(update::snapshot(app))
        }
        "update:install" => {
            flush(app, true);
            update::install(app);
            Ok(Value::Bool(true))
        }
        _ => Ok(Value::Null), // not ported yet
    }
}

#[tauri::command]
async fn ipc(
    app: AppHandle,
    window: WebviewWindow,
    state: State<'_, AppState>,
    channel: String,
    args: Vec<Value>,
) -> Result<Value, String> {
    dispatch(&app, &window, &state, &channel, &args)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![ipc])
        .setup(|app| {
            let handle = app.handle().clone();
            let store = load_store(resolve_dir(&handle));
            app.manage(AppState {
                store: Mutex::new(store),
                dirty: AtomicBool::new(false),
            });

            app.manage(update::UpdateState::new());
            let upd = handle.clone();
            update::schedule(handle.clone(), move || {
                let state = upd.state::<AppState>();
                let on = state.store.lock().map(|st| st.settings["autoUpdate"].as_bool().unwrap_or(true)).unwrap_or(true);
                on
            });

            // save in the background a moment after something changed
            let saver = handle.clone();
            thread::spawn(move || loop {
                thread::sleep(Duration::from_millis(500));
                flush(&saver, false);
            });

            let notes: Vec<Value> = {
                let state = handle.state::<AppState>();
                let st = state.store.lock().map_err(|_| "lock")?;
                st.notes.values().cloned().collect()
            };
            if notes.is_empty() {
                let state = handle.state::<AppState>();
                make_note(&handle, &state, None)?;
            } else {
                for n in &notes {
                    open_note(&handle, n)?;
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building StickyPad");

    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            flush(handle, true);
        }
    });
}
