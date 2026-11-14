#!/usr/bin/env python3
"""Trace the keel mark in assets/logos/2.svg into vector outlines for the 3D keel.

The logo SVG wraps a raster image, so there are no paths to reuse. This script
decodes the embedded bitmap, splits the mark into two pieces (the hollow hull
outline and the solid fin) and writes their outlines to keel/keel-shape.js.

Usage:  python3 tools/trace_keel_logo.py
Needs:  Pillow
"""
import base64
import io
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "logos" / "2.svg"
OUT = ROOT / "keel" / "keel-shape.js"

CROP = (262, 317, 867, 757)   # region of the embedded bitmap that holds the mark
SCALE = 3                     # supersampling factor for smoother contours
HULL_STROKE = 17              # hull line thickness in source pixels
SLIVER = 5                    # fin parts thinner than 2x this (source px) go back to the hull
SIMPLIFY = 0.45              # outline simplification tolerance (supersampled px)


def load_mark():
    svg = SRC.read_text()
    b64 = re.search(r"base64,([A-Za-z0-9+/=]+)", svg).group(1)
    im = Image.open(io.BytesIO(base64.b64decode(b64))).convert("L").crop(CROP)
    im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
    return im.filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: 255 if v > 127 else 0)


def flood(mask, seed, value):
    out = mask.copy()
    ImageDraw.floodfill(out, seed, value)
    return out


def split(white):
    """Return (hull_mask, fin_mask) as binary L images."""
    w, h = white.size
    # Hole = black pixels the outside cannot reach.
    outside = flood(white, (0, 0), 128)
    hole = outside.point(lambda v: 255 if v == 0 else 0)

    # Grow the hole by the stroke thickness. Whatever white sits beyond that is fin.
    edge = hole.filter(ImageFilter.FIND_EDGES).load()
    grown = hole.copy()
    draw = ImageDraw.Draw(grown)
    r = HULL_STROKE * SCALE
    for y in range(h):
        for x in range(w):
            if edge[x, y]:
                draw.ellipse((x - r, y - r, x + r, y + r), fill=255)

    gp, wp = grown.load(), white.load()
    rest = Image.new("L", (w, h), 0)
    rp = rest.load()
    for y in range(h):
        for x in range(w):
            if wp[x, y] and not gp[x, y]:
                rp[x, y] = 255

    # Drop thin slivers (they stay with the hull) so the fin has clean, bevel-safe ends.
    k = 2 * SLIVER * SCALE + 1
    rest = rest.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))
    rp = rest.load()

    # Fin = the connected piece that contains the lowest white pixel.
    seed = None
    for y in range(h - 1, -1, -1):
        xs = [x for x in range(w) if rp[x, y]]
        if xs:
            seed = (xs[len(xs) // 2], y)
            break
    fin = flood(rest, seed, 200).point(lambda v: 255 if v == 200 else 0)

    fp = fin.load()
    hull = Image.new("L", (w, h), 0)
    hp = hull.load()
    for y in range(h):
        for x in range(w):
            if wp[x, y] and not fp[x, y]:
                hp[x, y] = 255
    return hull, fin


def contours(mask):
    """Marching squares with sub-pixel interpolation. Returns closed loops."""
    g = mask.filter(ImageFilter.GaussianBlur(2.0))
    w, h = g.size
    px = g.load()
    iso = 127.5

    def lerp(a, b, va, vb):
        t = (iso - va) / (vb - va)
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

    segs = {}
    for y in range(h - 1):
        for x in range(w - 1):
            v = (px[x, y], px[x + 1, y], px[x + 1, y + 1], px[x, y + 1])
            idx = sum(1 << i for i in range(4) if v[i] > iso)
            if idx in (0, 15):
                continue
            c = ((x, y), (x + 1, y), (x + 1, y + 1), (x, y + 1))
            e = {}
            for i in range(4):
                j = (i + 1) % 4
                if (v[i] > iso) != (v[j] > iso):
                    p = lerp(c[i], c[j], v[i], v[j])
                    e[i] = (round(p[0], 3), round(p[1], 3))
            keys = list(e)
            if len(keys) == 2:
                pairs = [(keys[0], keys[1])]
            else:  # saddle
                pairs = [(0, 1), (2, 3)] if idx == 5 else [(0, 3), (1, 2)]
            for a, b in pairs:
                segs.setdefault(e[a], []).append(e[b])
                segs.setdefault(e[b], []).append(e[a])

    loops, seen = [], set()
    for start in segs:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = [n for n in segs[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur)
            loop.append(cur)
        if len(loop) > 40:
            loops.append(loop)
    return loops


def simplify(pts, eps):
    """Douglas-Peucker on a closed loop."""
    def rdp(p):
        if len(p) < 3:
            return p
        (x1, y1), (x2, y2) = p[0], p[-1]
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy) or 1e-9
        best, bi = 0, 0
        for i in range(1, len(p) - 1):
            d = abs(dy * (p[i][0] - x1) - dx * (p[i][1] - y1)) / n
            if d > best:
                best, bi = d, i
        if best <= eps:
            return [p[0], p[-1]]
        return rdp(p[: bi + 1])[:-1] + rdp(p[bi:])

    far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
    return rdp(pts[: far + 1])[:-1] + rdp(pts[far:] + [pts[0]])[:-1]


def area(p):
    return 0.5 * sum(p[i][0] * p[i - 1][1] - p[i - 1][0] * p[i][1] for i in range(len(p)))


def main():
    white = load_mark()
    hull_mask, fin_mask = split(white)

    hull_loops = sorted(contours(hull_mask), key=lambda l: -abs(area(l)))[:2]
    fin_loop = max(contours(fin_mask), key=lambda l: abs(area(l)))
    raw = {"hullOuter": hull_loops[0], "hullInner": hull_loops[1], "fin": fin_loop}

    # Normalise: centre on the whole mark, flip Y up, scale so the mark is 1 unit tall.
    allpts = raw["hullOuter"] + raw["fin"]
    xs, ys = [p[0] for p in allpts], [p[1] for p in allpts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    size = max(ys) - min(ys)

    shape = {}
    for name, loop in raw.items():
        pts = simplify(loop, SIMPLIFY)
        if area(pts) < 0:
            pts.reverse()
        shape[name] = [[round((x - cx) / size, 4), round((cy - y) / size, 4)] for x, y in pts]

    shape["aspect"] = round((max(xs) - min(xs)) / size, 4)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "// Generated by tools/trace_keel_logo.py from assets/logos/2.svg. Do not edit by hand.\n"
        "// Outlines of the keel mark, 1 unit tall, centred, Y up.\n"
        "window.KEEL_SHAPE = " + json.dumps(shape, separators=(",", ":")) + ";\n"
    )
    print({k: len(v) for k, v in shape.items() if isinstance(v, list)}, "aspect", shape["aspect"])

    # Preview for a quick visual check.
    S = 700
    prev = Image.new("RGB", (int(S * shape["aspect"]) + 80, S + 80), (41, 16, 1))
    d = ImageDraw.Draw(prev)
    tr = lambda p: (prev.width / 2 + p[0] * S, prev.height / 2 - p[1] * S)
    d.polygon([tr(p) for p in shape["fin"]], fill=(225, 223, 219))
    d.polygon([tr(p) for p in shape["hullOuter"]], fill=(255, 89, 48))
    d.polygon([tr(p) for p in shape["hullInner"]], fill=(41, 16, 1))
    for p in shape["fin"] + shape["hullOuter"] + shape["hullInner"]:
        x, y = tr(p)
        d.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill=(0, 0, 0))
    tmp = ROOT / ".tmp"
    tmp.mkdir(exist_ok=True)
    prev.save(tmp / "keel-shape-preview.png")


if __name__ == "__main__":
    main()
