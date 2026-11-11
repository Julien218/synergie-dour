#!/usr/bin/env python3
"""Cartes 1080x1920 de la série « Devenir indépendant » — ADN visuel Synergie Dour (planche ADN 2026).

Palette officielle : bleu nuit #05032B, bleu institutionnel #023C90, bleu énergie #1D71BA, cyan #6AB6D1,
or #F7B630, or clair #FCD451, ivoire #F7F3E9. Police : Montserrat. 3 niveaux de texte maximum, titre <= 8 mots.
Le logo maître et la carte d'intro sont collés tels quels (jamais recadrés, étirés ni recolorés).

Usage : make_cards_serie.py cards.json sortie_dir --fonts DIR --logo LOGO_MAITRE.png --intro CARTE_INTRO.png
cards.json : [{"kind":"hook|step|end", "n":1, "title":"...", "sub":"...", "tag":"..."}, ...]
"""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
NIGHT, INST, ENERGY, CYAN = (5, 3, 43), (2, 60, 144), (29, 113, 186), (106, 182, 209)
GOLD, GOLD2, IVORY = (247, 182, 48), (252, 212, 81), (247, 243, 233)


def font(d, w, size):
    return ImageFont.truetype(os.path.join(d, "Montserrat-%d.ttf" % w), size)


def background():
    img = Image.new("RGB", (W, H), NIGHT)
    px = ImageDraw.Draw(img)
    for y in range(H):                       # dégradé vertical nuit -> bleu institutionnel (léger)
        k = (y / H) ** 1.6
        px.line([(0, y), (W, y)], fill=tuple(int(NIGHT[i] + (INST[i] - NIGHT[i]) * k * 0.75) for i in range(3)))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((140, 140, 940, 940), fill=(14, 40, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    img = Image.composite(img, Image.blend(img, glow, 0.6), Image.new("L", (W, H), 255))
    from PIL import ImageChops
    return ImageChops.add(img, glow.point(lambda v: int(v * 0.5)))


def centered(d, text, f, y, fill, spacing=0):
    w = d.textlength(text, font=f) + spacing * max(0, len(text) - 1)
    x = (W - w) / 2
    if spacing:
        for ch in text:
            d.text((x, y), ch, font=f, fill=fill)
            x += d.textlength(ch, font=f) + spacing
    else:
        d.text((x, y), text, font=f, fill=fill)


def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for wd in text.split():
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = wd
    if cur: lines.append(cur)
    return lines


def gold_ring(img, cy, diam, numeral, fdir):
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ring)
    cx, r = W // 2, diam // 2
    for i, t in enumerate(range(0, 26)):                       # anneau or avec dégradé
        k = i / 25
        col = tuple(int(GOLD[j] + (GOLD2[j] - GOLD[j]) * k) for j in range(3)) + (255,)
        d.ellipse((cx - r + i // 2, cy - r + i // 2, cx + r - i // 2, cy + r - i // 2), outline=col, width=2)
    glow = ring.filter(ImageFilter.GaussianBlur(22))
    img.paste(glow, (0, 0), glow)
    img.paste(ring, (0, 0), ring)
    d2 = ImageDraw.Draw(img)
    f = font(fdir, 800, int(diam * 0.62))
    bb = d2.textbbox((0, 0), numeral, font=f)
    d2.text((cx - (bb[0] + bb[2]) / 2, cy - (bb[1] + bb[3]) / 2), numeral, font=f, fill=GOLD2)


def dots(d, y, n, total=5):
    gap, r = 54, 11
    x0 = W / 2 - gap * (total - 1) / 2
    for i in range(total):
        x = x0 + i * gap
        on = i + 1 <= n
        d.ellipse((x - r, y - r, x + r, y + r), fill=GOLD if on else None, outline=GOLD if on else (60, 80, 140), width=3)


def make(cfg, out, fdir, logo, intro):
    for i, c in enumerate(cfg):
        img = background()
        d = ImageDraw.Draw(img)
        k = c["kind"]
        if k == "hook":
            lg = Image.open(logo).convert("RGB").resize((520, 520), Image.LANCZOS)
            frame = Image.new("RGB", (532, 532), GOLD)
            frame.paste(lg, (6, 6))
            img.paste(frame, ((W - 532) // 2, 300))
            f1 = font(fdir, 800, 100)
            for j, t in enumerate(c["title"].split("|")):
                centered(d, t, f1, 880 + j * 108, IVORY)
            centered(d, c["sub"], font(fdir, 600, 50), 1105, CYAN)
        elif k == "step":
            centered(d, c["tag"].upper(), font(fdir, 600, 30), 270, CYAN, spacing=4)
            gold_ring(img, 600, 380, str(c["n"]), fdir)
            d = ImageDraw.Draw(img)
            ft = font(fdir, 800, 74)
            y = 870
            for ln in wrap(d, c["title"], ft, 900):
                centered(d, ln, ft, y, IVORY); y += 90
            centered(d, c["sub"], font(fdir, 600, 40), y + 22, CYAN)
            dots(d, 1150, c["n"])
        elif k == "end":
            card = Image.open(intro).convert("RGB")
            card = card.resize((W, round(card.height * W / card.width)), Image.LANCZOS)   # pleine largeur, sans recadrage
            img.paste(card, (0, 330))
        img.save(os.path.join(out, "carte_%d.png" % i))
    print("OK", len(cfg), "cartes")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cards"); ap.add_argument("out")
    ap.add_argument("--fonts", required=True); ap.add_argument("--logo", required=True); ap.add_argument("--intro", required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    make(json.load(open(a.cards, encoding="utf-8")), a.out, a.fonts, a.logo, a.intro)
