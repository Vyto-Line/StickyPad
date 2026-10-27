"""New README pictures: the hero, the 1.15 features and three short animations (docs/images/*.png, *.gif).
Run:  python tools/readme_pictures.py   (after tools/screenshots.py; needs Playwright + Pillow)
Everything is made from the real app screens and made-up sample notes."""
import os, io, json, base64, math
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'docs', 'images')
STUB = open(os.path.join(ROOT, 'tests', 'ui', 'stub.js'), encoding='utf-8').read()
SCALE = 2
def T(v): return {'t': 'text', 'v': v}
def C(v, done=False): return {'t': 'check', 'v': v, 'done': done}

def photo(w=600, h=380):
    """A made-up landscape (sky, sun, hills, lake) so no real photo is needed."""
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h; d.line([(0, y), (w, y)], fill=(int(120 + 110 * t), int(170 + 60 * t), int(235 - 20 * t)))
    d.ellipse((w * .70, h * .12, w * .70 + 70, h * .12 + 70), fill=(255, 226, 140))
    for i, (col, base, amp, ph) in enumerate([((120, 140, 175), .55, 50, 0), ((78, 120, 98), .64, 42, 2), ((44, 92, 70), .74, 34, 4)]):
        pts = [(0, h)] + [(x, h * base - amp * (0.5 + 0.5 * math.sin(x / 90 + ph)) - amp * .3 * math.sin(x / 33 + ph)) for x in range(0, w + 8, 8)] + [(w, h)]
        d.polygon(pts, fill=col)
    d.rectangle((0, h * .86, w, h), fill=(70, 130, 170))
    for k in range(7): d.line([(w * .15 + k * 60, h * .90 + (k % 2) * 8), (w * .15 + k * 60 + 36, h * .90 + (k % 2) * 8)], fill=(150, 200, 225), width=2)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=88); return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
PHOTO = photo()

NOTES = {
  'groceries': dict(title='Groceries', color='#FFF2A8', blocks=[T('For the weekend dinner'), C('Tomatoes and basil', True), C('Feta cheese', True), C('Olive oil'), C('Sourdough bread'), C('Lemons'), T('Ask Maria if she is coming!')]),
  'reise': dict(title='Reiseplan', color='#B9E4FF', blocks=[T('Fähre vor Freitag buchen.\nSamaria-Schlucht: früh los, Wasser und Hut mitnehmen.\n'), C('Hotel in Chania', True), C('Auto mieten'), C('Tickets drucken')]),
  'photo': dict(title='Hike', color='#D4F5C4', blocks=[T('Top of the ridge\n'), {'t': 'img', 'id': 'p1', 'src': PHOTO, 'w': 70}, T('Lunch by the lake.')]),
  'greek': dict(title='Σχέδιο', color='#FFD1E3', blocks=[T('Καλημέρα! Σήμερα έχουμε συνάντηση σήμερα το απόγευμα με την ομάδα.\nΝα ετοιμάσω την παρουσίαση και να στείλω το αρχείο πριν από τη συνάντηση.')]),
  'dark': dict(title='Meeting', color='#2E3440', blocks=[T('Agenda\n'), C('Budget review', True), C('Launch date'), C('Hiring plan'), T('\nBring the slides.')]),
}

def page(b, key, w=340, h=500, extra='', blocks=None, color=None, title=None):
    n = NOTES.get(key, {})
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=SCALE)
    pg = ctx.new_page(); pg.add_init_script(STUB)
    pg.add_init_script('window.__S.note.title=%s;window.__S.note.color=%s;window.__S.note.font="Segoe UI";window.__S.note.size=15;window.__S.note.blocks=%s;%s' % (
        json.dumps(title or n.get('title', '')), json.dumps(color or n.get('color', '#FFF2A8')), json.dumps(blocks or n.get('blocks', [])), extra))
    pg.goto('file://' + ROOT + '/note.html'); pg.wait_for_timeout(600); return pg
def fit(pg, extra=22, minh=150):
    pg.set_viewport_size({'width': pg.viewport_size['width'], 'height': 120}); pg.wait_for_timeout(250)   # small first: the text then decides the height
    h = pg.evaluate("(()=>{const e=document.querySelector('#ed');return Math.ceil(e.getBoundingClientRect().top+e.scrollHeight)})()")
    pg.set_viewport_size({'width': pg.viewport_size['width'], 'height': max(minh, h + extra)}); pg.wait_for_timeout(250)
def snap(pg, name): pg.screenshot(path=os.path.join(OUT, name + '.png'))

def rounded(im, r=14):
    im = im.convert('RGBA'); m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r * SCALE, fill=255); im.putalpha(m); return im
def shadow(im, blur=22, off=(0, 14), alpha=110):
    pad = blur * 3; sh = Image.new('RGBA', (im.size[0] + pad * 2, im.size[1] + pad * 2), (0, 0, 0, 0))
    a = Image.composite(Image.new('L', im.size, alpha), Image.new('L', im.size, 0), im.split()[3]); sh.paste((0, 0, 0, 255), (pad + off[0], pad + off[1]), a)
    return sh.filter(ImageFilter.GaussianBlur(blur)), pad
def wallpaper(W, H):
    bg = Image.new('RGB', (W, H)); d = ImageDraw.Draw(bg)
    for y in range(H):
        for x in range(0, W, 4):
            t = x / W * 0.6 + y / H * 0.4; d.rectangle([x, y, x + 3, y], fill=(int(30 + 70 * t), int(40 + 55 * t), int(98 + 100 * t)))
    return bg.convert('RGBA')

def gif(frames, name, ms=110, hold=(1200,), width=None):
    """frames: list of PIL images; hold: extra pause (ms) on the last frame."""
    fr = [f.convert('RGB') for f in frames]
    if width: fr = [f.resize((width, round(f.height * width / f.width)), Image.LANCZOS) for f in fr]
    q = [f.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.Dither.NONE) for f in fr]
    d = [ms] * len(q); d[-1] = ms + sum(hold)
    q[0].save(os.path.join(OUT, name + '.gif'), save_all=True, append_images=q[1:], duration=d, loop=0, optimize=True, disposal=1)
def grab(pg): return Image.open(io.BytesIO(pg.screenshot()))

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- the hero: five notes in different languages, each as tall as its words ----
    cards = []
    for key, w in (('groceries', 360), ('reise', 360), ('photo', 360), ('greek', 360), ('dark', 360)):
        pg = page(b, key, w, 500)
        if key == 'greek': pg.locator('#ed').click(); pg.keyboard.press('Control+f'); pg.keyboard.type('συναντηση'); pg.wait_for_timeout(400)
        fit(pg, 24 if key != 'greek' else 30, 190); cards.append(rounded(Image.open(io.BytesIO(pg.screenshot())))); pg.close()
    GAP, MARGIN = 26 * SCALE, 56 * SCALE
    tops = [70, 30, 96, 44, 80]
    W = MARGIN * 2 + sum(c.width for c in cards) + GAP * (len(cards) - 1); H = max(t * SCALE + c.height for t, c in zip(tops, cards)) + 70 * SCALE
    bg = wallpaper(W, H); x = MARGIN
    for c, t in zip(cards, tops):
        sh, pad = shadow(c); bg.alpha_composite(sh, (x - pad, t * SCALE - pad)); bg.alpha_composite(c, (x, t * SCALE)); x += c.width + GAP
    bg = bg.convert('RGB'); bg = bg.resize((1800, round(1800 * H / W)), Image.LANCZOS); bg.save(os.path.join(OUT, 'hero.png'), optimize=True)

    # ---- resize a picture (still) ----
    pg = page(b, 'photo', 340, 500, blocks=[T('Top of the ridge\n'), {'t': 'img', 'id': 'p1', 'src': PHOTO, 'w': 55}, T('Lunch by the lake.')])
    pg.click('#ed img'); pg.wait_for_timeout(300); fit(pg, 30, 200); pg.wait_for_timeout(200); snap(pg, 'feature_picture'); pg.close()

    # ---- the AI fixes a whole note (still + animation) ----
    bad = ['meeting with the dezign team at 3pm tomorow', 'bring the lapotp and the budjet report', 'Dont forget to confrim the room!']
    good = ['Meeting with the design team at 3pm tomorrow.', 'Bring the laptop and the budget report.', "Don't forget to confirm the room!"]
    aiblocks = [T(bad[0] + '\n' + bad[1] + '\n'), C('send the agenda', False), T(bad[2])]
    emap = {bad[0] + '\n' + bad[1] + '\n': good[0] + '\n' + good[1] + '\n', bad[2]: good[2], 'send the agenda': 'Send the agenda'}
    pg = page(b, None, 340, 330, blocks=aiblocks, color='#CDEFFF', title='Monday', extra='window.__S.editMap=%s;window.__S.editDelay=70;' % json.dumps(emap))
    pg.evaluate("document.querySelector('#ed').focus(); document.querySelector('#editMode').value='fix'")
    frames = [grab(pg) for _ in range(4)]
    pg.evaluate("document.querySelector('#aiEdit').click()")
    for _ in range(40):
        pg.wait_for_timeout(110); frames.append(grab(pg))
    pg.wait_for_timeout(500); frames.append(grab(pg)); pg.close()
    gif(frames, 'demo_ai_edit', ms=110, hold=(1800,), width=340)

    # ---- animation: tick a checklist, add an item ----
    pg = page(b, 'groceries', 340, 330)
    fit(pg, 24, 300); fr = [grab(pg) for _ in range(5)]
    for i in (3, 4, 5):
        pg.locator('.todo input').nth(i - 1).click() if False else pg.locator('.todo').nth(i - 3).locator('input').click()
        for _ in range(5): pg.wait_for_timeout(100); fr.append(grab(pg))
    pg.close(); gif(fr, 'demo_checklist', ms=110, hold=(1500,), width=340)

    # ---- animation: resize a picture by dragging the handle, then pick a size ----
    pg = page(b, 'photo', 340, 500, blocks=[T('Top of the ridge\n'), {'t': 'img', 'id': 'p1', 'src': PHOTO}, T('Lunch by the lake.')])
    fit(pg, 24, 200); fr = [grab(pg) for _ in range(5)]
    pg.click('#ed img'); pg.wait_for_timeout(250); fr += [grab(pg) for _ in range(5)]
    hb = pg.query_selector('.pichandle').bounding_box(); L = pg.evaluate("document.querySelector('#ed img').getBoundingClientRect().left")
    full = pg.evaluate("document.querySelector('#ed img').getBoundingClientRect().width")
    pg.mouse.move(hb['x'] + 9, hb['y'] + 9); pg.mouse.down()
    for k in range(1, 13):
        pg.mouse.move(L + full * (1 - 0.5 * k / 12), hb['y'] + 9 - 4 * k, steps=2); pg.wait_for_timeout(60); fr.append(grab(pg))
    pg.mouse.up(); pg.wait_for_timeout(200); fr += [grab(pg) for _ in range(6)]
    pg.close(); gif(fr, 'demo_picture', ms=100, hold=(1500,), width=340)
    # ---- snapping: two notes fill the two halves of the screen (made from real note windows) ----
    SW, SH, TB = 1280, 600, 44
    halves = []
    for key, w in (('groceries', SW // 2 - 8), ('reise', SW // 2 - 8)):
        more = {'groceries': [T('For the weekend dinner'), C('Tomatoes and basil', True), C('Feta cheese', True), C('Olive oil'), C('Sourdough bread'), C('Lemons'), C('Sparkling water'), C('Dark chocolate'), T('\nAsk Maria if she is coming!\nCook at 6, guests at 8.')],
                'reise': [T('Fähre vor Freitag buchen.\nSamaria-Schlucht: früh los, Wasser und Hut mitnehmen.\n'), C('Hotel in Chania', True), C('Auto mieten'), C('Tickets drucken'), C('Sonnencreme'), C('Kamera laden'), T('\nStrand am Nachmittag, Abendessen am Hafen.')]}[key]
        pg = page(b, key, w, SH - TB - 12, blocks=more); halves.append(rounded(Image.open(io.BytesIO(pg.screenshot())), 8)); pg.close()
    bg = wallpaper(SW * SCALE, SH * SCALE)
    for i, hv in enumerate(halves):
        x = (4 + i * (SW // 2)) * SCALE; sh, pad = shadow(hv, 14, (0, 8), 90); bg.alpha_composite(sh, (x - pad, 4 * SCALE - pad)); bg.alpha_composite(hv, (x, 4 * SCALE))
    d = ImageDraw.Draw(bg); d.rectangle([0, (SH - TB) * SCALE, SW * SCALE, SH * SCALE], fill=(24, 28, 48, 235))
    for k in range(5): d.rounded_rectangle([(SW // 2 - 110 + k * 46) * SCALE, (SH - TB + 9) * SCALE, (SW // 2 - 110 + k * 46 + 28) * SCALE, (SH - 9) * SCALE], 6 * SCALE, fill=(90 + k * 20, 100 + k * 14, 150))
    bg.convert('RGB').resize((1280, 600), Image.LANCZOS).save(os.path.join(OUT, 'feature_snap.png'), optimize=True)
    b.close()
print(sorted(f for f in os.listdir(OUT) if f.endswith('.gif')), [os.path.getsize(os.path.join(OUT, f)) // 1024 for f in sorted(os.listdir(OUT)) if f.endswith('.gif')])
