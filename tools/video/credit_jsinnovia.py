#!/usr/bin/env python3
"""Ajoute le crédit « JS-Innov.IA » en hologramme discret + métadonnées à une vidéo.

Usage : credit_jsinnovia.py entree.mp4 sortie.mp4 [--logo logo_jsinnovia_transparent.png] [--font Montserrat-SemiBold.ttf]

Règles de la charte respectées : crédit petit (≤ 12 % de la largeur), en bas à droite,
dans la marge de sécurité (6 %), jamais fusionné avec le logo Synergie Dour.
Sans --logo, le crédit est un texte « JS-Innov.IA ». Le logo officiel JS-Innov.IA
(PNG transparent) doit être fourni par le titulaire : il n'est pas redessiné ici.
"""
import argparse, json, subprocess, tempfile, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SITE_1 = "https://www.jsinnovia.com"
SITE_2 = "https://villeconnect.com"
FONT_FALLBACKS = [
    "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def probe(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "json", path])
    s = json.loads(out)["streams"][0]
    return s["width"], s["height"]


def make_credit_png(target_w, out_png, logo=None, font=None):
    """PNG RGBA du crédit, largeur = target_w, avec léger halo cyan holographique."""
    if logo:
        img = Image.open(logo).convert("RGBA")
        h = round(img.height * target_w / img.width)
        img = img.resize((target_w, h), Image.LANCZOS)
    else:
        path = font or next((f for f in FONT_FALLBACKS if os.path.exists(f)), None)
        scale = 4  # rendu haute définition puis réduction
        size = 100 * scale
        f = ImageFont.truetype(path, size) if path else ImageFont.load_default()
        text = "JS-Innov.IA"
        probe_img = Image.new("RGBA", (10, 10))
        l, t, r, b = ImageDraw.Draw(probe_img).textbbox((0, 0), text, font=f)
        img = Image.new("RGBA", (r - l, b - t), (0, 0, 0, 0))
        # dégradé cyan -> blanc -> or (holographique)
        grad = Image.new("RGBA", img.size)
        gp = grad.load()
        for x in range(img.width):
            k = x / max(1, img.width - 1)
            c = (int(120 + 135 * k), int(220 - 30 * k), int(255 - 150 * k), 255)
            for y in range(img.height):
                gp[x, y] = c
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).text((-l, -t), text, font=f, fill=255)
        img.paste(grad, (0, 0), mask)
        h = round(img.height * target_w / img.width)
        img = img.resize((target_w, h), Image.LANCZOS)
    # halo
    pad = max(4, target_w // 14)
    canvas = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow.paste((110, 220, 255, 255), (pad, pad), img.split()[3])
    glow = glow.filter(ImageFilter.GaussianBlur(pad / 2))
    glow.putalpha(glow.split()[3].point(lambda a: int(a * 0.55)))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(img, (pad, pad))
    canvas.save(out_png)
    return canvas.size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--logo")
    ap.add_argument("--font")
    ap.add_argument("--width-pct", type=float, default=11.0, help="largeur du crédit en %% (max 12)")
    a = ap.parse_args()
    if a.width_pct > 12:
        sys.exit("La charte limite le crédit JS-Innov.IA à 12 % de la largeur.")

    W, H = probe(a.input)
    target_w = round(W * a.width_pct / 100)
    with tempfile.TemporaryDirectory() as d:
        png = os.path.join(d, "credit.png")
        cw, ch = make_credit_png(target_w, png, a.logo, a.font)
        margin = round(H * 0.06)  # marge de sécurité 6 %
        mx = round(W * 0.04)      # marge droite
        # Hologramme discret en bas à droite : très léger au repos (alpha ~0,55, respiration lente),
        # puis toutes les 6 s une animation de 1,2 s : reflet qui balaie + lignes de balayage + scintillement.
        P, D = 6, 1.2
        win = f"lt(mod(T,{P}),{D})"
        band = f"(X+0.6*Y-(mod(T,{P})/{D}*(W+0.6*H+120)-60))"
        sw = f"110*exp(-pow({band}/{max(10, cw // 7)},2))"
        scan = f"(1-0.18*{win}*(0.5+0.5*sin(Y*1.6+T*30)))"
        flick = f"(1+0.35*{win}*sin(PI*mod(T,{P})/{D}))"
        geq = (f"geq=r='min(255,r(X,Y)+{sw})':g='min(255,g(X,Y)+{sw})':b='min(255,b(X,Y)+{sw})':"
               f"a='min(255,alpha(X,Y)*(0.55+0.06*sin(2*PI*T/3))*{scan}*{flick})'")
        fc = (f"[1:v]format=rgba,{geq}[c];"
              f"[0:v][c]overlay=x=W-w-{mx}:y=H-h-{margin}:shortest=1,format=yuv420p[v]")
        comment = (f"Plateforme JS-Innov.IA - {SITE_1} - VilleConnect OS - {SITE_2}")
        cmd = [
            "ffmpeg", "-y", "-v", "error", "-i", a.input, "-loop", "1", "-i", png,
            "-filter_complex", fc, "-map", "[v]", "-map", "0:a?",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "copy", "-movflags", "+faststart+use_metadata_tags",
            "-metadata", "artist=Synergie Dour ASBL",
            "-metadata", "publisher=JS-Innov.IA",
            "-metadata", f"comment={comment}",
            "-metadata", f"description={comment}",
            "-metadata", "copyright=Synergie Dour ASBL - plateforme JS-Innov.IA",
            "-metadata", f"url={SITE_1}",
            "-metadata", f"website={SITE_2}",
            a.output,
        ]
        subprocess.check_call(cmd)
    print("OK", a.output)


if __name__ == "__main__":
    main()
