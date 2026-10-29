"""
Kinleo sprite generator (shared by every animation). Development tool, not loaded by the app.

Makes first-draft sprite sheets for one animation from the skeleton poses in
animations/<name>/pose.py, and writes them to animations/<name>/sprites/<part>/<variant>.png

    python character/core/generator/generate.py running
    python character/core/generator/generate.py running --force    (overwrite a locked animation)

Needs Python 3 and Pillow (pip install pillow).

If animations/<name>/animation.json has "locked": true (the sheets were hand
edited in Piskel), it refuses to run, so hand edits are never lost.

Sheet layout (must match character/manifest.js):
  columns = frames, rows = depths far, mid, near, front. One frame = 32 x 48.
Pixels are drawn in KEY colours only; the app recolours them per user.
"""
import importlib.util, json, math, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is missing. Run: pip install pillow')

HERE = os.path.dirname(os.path.abspath(__file__))
CHARACTER = os.path.normpath(os.path.join(HERE, '..', '..'))        # character/

FRAME_W, FRAME_H = 32, 48
DEPTHS = ['far', 'mid', 'near', 'front']

# Key colours. Must match keyColors in character/manifest.js exactly.
# Uppercase letter = base tone, lowercase = shade tone.
KEYS = {
    'S': (255, 0, 0),   's': (128, 0, 0),     # skin
    'H': (0, 255, 0),   'h': (0, 128, 0),     # hair
    'T': (0, 0, 255),   't': (0, 0, 128),     # top
    'P': (255, 255, 0), 'p': (128, 128, 0),   # bottom
    'B': (0, 255, 255), 'b': (0, 128, 128),   # shoes
    'O': (255, 0, 255), 'o': (128, 0, 128),   # sole
    'R': (255, 128, 0), 'r': (128, 64, 0),    # accessory
    'E': (28, 28, 28),                        # eye: fixed colour, never recoloured
}

# ------------------------------------------------------------------ helpers (also used by pose.py files)
class Layer:
    def __init__(self):
        self.px = {}
    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < FRAME_W and 0 <= y < FRAME_H:
            self.px[(x, y)] = c
    def get(self, x, y):
        return self.px.get((x, y))
    def stamp(self, x, y, s, c):
        x0 = int(round(x - (s - 1) / 2)); y0 = int(round(y - (s - 1) / 2))
        for j in range(s):
            for i in range(s):
                self.put(x0 + i, y0 + j, c)
    def seg(self, a, b, s, c):
        n = max(1, int(math.ceil(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2)))
        for i in range(n + 1):
            t = i / n
            self.stamp(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, s, c)
    def rect(self, x, y, w, h, c):
        for j in range(h):
            for i in range(w):
                self.put(x + i, y + j, c)
    def template(self, rows, x0, y0, letters):
        for j, row in enumerate(rows):
            for i, c in enumerate(row):
                if c in letters:
                    self.put(x0 + i, y0 + j, letters[c])

def polar(p, ang, length):
    """Point at `length` from p. ang in degrees: 0 = straight down, positive = forward (right)."""
    r = math.radians(ang)
    return (p[0] + math.sin(r) * length, p[1] + math.cos(r) * length)

def interp(keys, ph):
    """Smoothly interpolate keyframes [(phase, value, ...), ...] at phase ph (0 to 1)."""
    ph %= 1.0
    for (p0, *a), (p1, *b) in zip(keys, keys[1:]):
        if p0 <= ph <= p1:
            t = (ph - p0) / (p1 - p0)
            t = t * t * (3 - 2 * t)
            return [x + (y - x) * t for x, y in zip(a, b)]

# ------------------------------------------------------------------ head templates (side view, facing right)
# 14 x 13. Placed at x=10, y=1 (+ body bob).
HEAD_SHAPE = [
    "....SSSSSS....",
    "..SSSSSSSSSS..",
    ".SSSSSSSSSSSS.",
    "SSSSSSSSSSSSS.",
    "SSSSSSSSSSSSS.",
    "SSSSSSSSSSSSS.",
    "SSSSSSSSSSSSS.",
    "SSSeSSSSSSESS.",
    "SSSeSSSSSSESSS",
    "SSSSSSSSSSSSS.",
    ".SSSSSSSSSSSS.",
    "..SSSSSSSSSS..",
    "....SSSSSS....",
]
HAIR = {
    'short': [
        "....HHHHHH....",
        "..HHHHHHHHHH..",
        ".HHHHHHHHHHHH.",
        "HHHHHHHHHHHHH.",
        "HHHHHHHHHHHHH.",
        "HHHHH.........",
        "HHHH..........",
        "HHH...........",
        "HHH...........",
        "HHH...........",
        ".HH...........",
    ],
    'buzz': [
        "....HHHHHH....",
        "..HHHHHHHHHH..",
        ".HHHHHHHHHHHH.",
        "HHHHHHHHHHH...",
        "HHHHHHH.......",
        "HHH...........",
        "HH............",
    ],
}
HEADBAND_ROW = 4
HEADBAND_TAILS = [(9, 5), (8, 5), (8, 6), (7, 7)]

# ------------------------------------------------------------------ part painters (shared)
# A pose (from pose.py) is a dict with:
#   dy, hip, neck, shoulder, and per side ('far', 'near'): hip, knee, ankle, toe, elbow, hand
# Far side draws into 'far'. Near legs draw into 'near', near arm into 'front'.
def side_depth(side, limb):
    if side == 'far':
        return 'far'
    return 'front' if limb == 'arm' else 'near'

def thigh_mid(s):
    return ((s['hip'][0] * 2 + s['knee'][0] * 3) / 5, (s['hip'][1] * 2 + s['knee'][1] * 3) / 5)

def paint_body_standard(P, L):
    for side in ('far', 'near'):
        s = P[side]; S = 's' if side == 'far' else 'S'
        d = L[side_depth(side, 'leg')]
        d.seg(s['hip'], s['knee'], 4, S)
        d.seg(s['knee'], s['ankle'], 3, S)
        d.seg(s['ankle'], s['toe'], 3, S)              # bare foot (shoes cover it)
        a = L[side_depth(side, 'arm')]
        a.seg(P['shoulder'], s['elbow'], 2, S)
        a.seg(s['elbow'], s['hand'], 2, S)
    m = L['mid']; dy = P['dy']; hip = P['hip']
    m.seg((hip[0], hip[1] - 5), (P['neck'][0] - 0.5, P['neck'][1] + 3), 8, 'S')   # torso
    m.rect(int(hip[0]) - 4, int(hip[1]) - 3, 8, 5, 'S')                             # hips
    m.rect(15, 13 + dy, 3, 3, 'S')                                                  # neck
    m.template(HEAD_SHAPE, 10, 1 + dy, {'S': 'S', 'e': 's', 'E': 'E'})

def paint_top_singlet(P, L):
    hip = P['hip']
    L['mid'].seg((hip[0], hip[1] - 5), (P['neck'][0] - 0.5, P['neck'][1] + 3), 8, 'T')

def paint_bottom_shorts(P, L):
    hip = P['hip']
    L['mid'].rect(int(hip[0]) - 4, int(hip[1]) - 3, 8, 5, 'P')
    for side in ('far', 'near'):
        s = P[side]
        L[side_depth(side, 'leg')].seg(s['hip'], thigh_mid(s), 4, 'p' if side == 'far' else 'P')

def paint_shoes_trainers(P, L):
    for side in ('far', 'near'):
        s = P[side]; B, O = ('b', 'o') if side == 'far' else ('B', 'O')
        shoe = Layer(); shoe.seg(s['ankle'], s['toe'], 3, B)
        for (x, y), c in shoe.px.items():
            # sole: trainer pixels with nothing of the trainer underneath
            L[side_depth(side, 'leg')].put(x, y, O if shoe.get(x, y + 1) is None else c)

def paint_hair(style):
    def paint(P, L):
        L['mid'].template(HAIR[style], 10, 1 + P['dy'], {'H': 'H'})
    return paint

def paint_accessory_headband(P, L):
    m = L['mid']; dy = P['dy']
    m.rect(10, 1 + HEADBAND_ROW + dy, 13, 1, 'R')
    for (x, y) in HEADBAND_TAILS:
        m.put(x, y + dy, 'R')

# Side view painters (facing right). Used when pose.py sets VIEW = 'side'.
# Must list every part and variant in character/manifest.js (check.html flags gaps).
PAINTERS_SIDE = {
    'body':      {'standard': paint_body_standard},
    'top':       {'singlet': paint_top_singlet},
    'bottom':    {'shorts': paint_bottom_shorts},
    'shoes':     {'trainers': paint_shoes_trainers},
    'hair':      {'short': paint_hair('short'), 'buzz': paint_hair('buzz')},
    'accessory': {'headband': paint_accessory_headband},
}

# ------------------------------------------------------------------ front view (facing the viewer)
# The default view. A front pose (from pose.py) is a dict with:
#   dy, and per side ('left', 'right' as seen by the viewer):
#   shoulder, elbow, hand, hip, knee, ankle
# Head 14 x 13 at x=9, y=1 (+dy). Torso x11 to x20. Soles land on row 47 like the side view.
HEAD_FRONT = [
    "...SSSSSSSS...",
    ".SSSSSSSSSSSS.",
    "SSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSS",
    "SSSSSSSSSSSSSS",
    "eSSSSSSSSSSSSe",
    "eSSSESSSSESSSe",
    "eSSSESSSSESSSe",
    "SSSSSSSSSSSSSS",
    ".SSSSSEESSSSS.",
    "..SSSSSSSSSS..",
    "....SSSSSS....",
]
HAIR_FRONT = {
    'short': [
        "...HHHHHHHH...",
        ".HHHHHHHHHHHH.",
        "HHHHHHHHHHHHHH",
        "HHHHHHHHHHHHHH",
        "HHHHHHHHHHHHHH",
        "HHH........HHH",
        "HH..........HH",
        "H............H",
    ],
    'buzz': [
        "...HHHHHHHH...",
        ".HHHHHHHHHHHH.",
        "HHHHHHHHHHHHHH",
        "HH..........HH",
        "H............H",
    ],
}
HEAD_X = 9

def paint_body_front(P, L):
    m = L['mid']; dy = P['dy']
    m.template(HEAD_FRONT, HEAD_X, 1 + dy, {'S': 'S', 'e': 's', 'E': 'E'})
    m.rect(14, 14 + dy, 4, 2, 'S')                     # neck
    m.rect(11, 16 + dy, 10, 10, 'S')                   # torso
    m.rect(11, 25 + dy, 10, 4, 'S')                    # hips
    for side in ('left', 'right'):
        s = P[side]
        m.seg(s['hip'], s['knee'], 4, 'S')
        m.seg(s['knee'], s['ankle'], 4, 'S')
        m.rect(int(round(s['ankle'][0])) - 2, int(round(s['ankle'][1])) + 1, 5, 3, 'S')   # bare foot
        a = L['front']
        a.seg(s['shoulder'], s['elbow'], 3, 'S')
        a.seg(s['elbow'], s['hand'], 3, 'S')

def paint_top_singlet_front(P, L):
    dy = P['dy']
    L['mid'].rect(11, 16 + dy, 10, 11, 'T')
    L['mid'].rect(11, 16 + dy, 1, 2, 'S')              # armholes show the shoulders
    L['mid'].rect(20, 16 + dy, 1, 2, 'S')

def paint_bottom_shorts_front(P, L):
    m = L['mid']; dy = P['dy']
    m.rect(11, 25 + dy, 10, 4, 'P')
    for side in ('left', 'right'):
        s = P[side]
        m.seg(s['hip'], thigh_mid(s), 4, 'P')

def paint_shoes_trainers_front(P, L):
    for side in ('left', 'right'):
        ax, ay = int(round(P[side]['ankle'][0])), int(round(P[side]['ankle'][1]))
        L['mid'].rect(ax - 2, ay + 1, 5, 2, 'B')
        L['mid'].rect(ax - 2, ay + 3, 5, 1, 'O')       # sole

def paint_hair_front(style):
    def paint(P, L):
        L['mid'].template(HAIR_FRONT[style], HEAD_X, 1 + P['dy'], {'H': 'H'})
    return paint

def paint_accessory_headband_front(P, L):
    L['mid'].rect(HEAD_X, 1 + HEADBAND_ROW + P['dy'], 14, 1, 'R')

PAINTERS_FRONT = {
    'body':      {'standard': paint_body_front},
    'top':       {'singlet': paint_top_singlet_front},
    'bottom':    {'shorts': paint_bottom_shorts_front},
    'shoes':     {'trainers': paint_shoes_trainers_front},
    'hair':      {'short': paint_hair_front('short'), 'buzz': paint_hair_front('buzz')},
    'accessory': {'headband': paint_accessory_headband_front},
}

# A pose.py can still override single painters with its own PAINTERS dict.
VIEWS = {'front': PAINTERS_FRONT, 'side': PAINTERS_SIDE}

# ------------------------------------------------------------------ run
def load_pose_module(folder):
    path = os.path.join(folder, 'pose.py')
    if not os.path.exists(path):
        sys.exit('No pose.py in ' + folder)
    spec = importlib.util.spec_from_file_location('pose', path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules['generate'] = sys.modules[__name__]   # lets pose.py do: from generate import polar, interp
    spec.loader.exec_module(mod)
    return mod

def write_sheet(path, frames, painter, pose):
    img = Image.new('RGBA', (FRAME_W * frames, FRAME_H * len(DEPTHS)), (0, 0, 0, 0))
    for i in range(frames):
        P = pose(i, frames)
        layers = {d: Layer() for d in DEPTHS}
        painter(P, layers)
        for row, d in enumerate(DEPTHS):
            for (x, y), c in layers[d].px.items():
                img.putpixel((i * FRAME_W + x, row * FRAME_H + y), KEYS[c] + (255,))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    if len(args) != 1:
        sys.exit('Usage: python character/core/generator/generate.py <animation> [--force]')
    name = args[0]
    folder = os.path.join(CHARACTER, 'animations', name)
    settings_path = os.path.join(folder, 'animation.json')
    if not os.path.exists(settings_path):
        sys.exit('Missing ' + settings_path)
    with open(settings_path) as f:
        settings = json.load(f)
    if settings.get('locked') and not force:
        sys.exit(name + ' is locked (hand edited). Nothing written. Use --force only if you mean to overwrite the edits.')

    mod = load_pose_module(folder)
    view = getattr(mod, 'VIEW', 'front')        # animations face the viewer unless pose.py says 'side'
    if view not in VIEWS:
        sys.exit('VIEW in ' + name + '/pose.py must be one of: ' + ', '.join(VIEWS))
    painters = {slot: dict(v) for slot, v in VIEWS[view].items()}
    for slot, variants in getattr(mod, 'PAINTERS', {}).items():
        painters.setdefault(slot, {}).update(variants)

    frames = int(settings['frames'])
    for slot, variants in painters.items():
        for variant, painter in variants.items():
            path = os.path.join(folder, 'sprites', slot, variant + '.png')
            write_sheet(path, frames, painter, mod.pose)
            print('wrote', os.path.relpath(path, CHARACTER).replace(os.sep, '/'))

if __name__ == '__main__':
    main()
