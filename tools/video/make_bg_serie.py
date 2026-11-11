#!/usr/bin/env python3
"""Fond animé haute qualité pour la série : une image de la marque (sans texte) recadrée en 9:16, zoom lent + respiration lumineuse.

Usage : make_bg_serie.py image.png sortie.mp4 [--secs 33] [--crop X:Y:W:H] [--dark 0.30] [--blur 1.5]
Par défaut : « Elements site web/Teplate resources02.png » (1536x1024, emblème à droite, église de Dour de nuit).
L'image est agrandie en Lanczos (x3) avant le zoom pour éviter tout tremblement ; rien n'est recoloré ni redessiné.
"""
import argparse, os, subprocess, tempfile
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("image"); ap.add_argument("out")
ap.add_argument("--secs", type=float, default=33)
ap.add_argument("--crop", default="942:0:576:1024")
ap.add_argument("--dark", type=float, default=0.30)
ap.add_argument("--blur", type=float, default=1.5)
ap.add_argument("--zoom", type=float, default=0.14, help="zoom total sur la durée (0,14 = +14 %)")
a = ap.parse_args()

x, y, w, h = [int(v) for v in a.crop.split(":")]
im = Image.open(a.image).convert("RGB").crop((x, y, x + w, y + h))
im = im.resize((1620, 2880), Image.LANCZOS)
fps = 30
frames = int(a.secs * fps)
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, "bg.png"); im.save(p)
    z = f"1+{a.zoom}*on/{frames}"
    vf = (f"zoompan=z='{z}':x='(iw-iw/zoom)/2+sin(on/{fps}/6)*18':y='(ih-ih/zoom)/2-on*0.25':d={frames}:s=1080x1920:fps={fps},"
          f"gblur=sigma={a.blur},eq=brightness='-{a.dark}+0.03*sin(2*PI*t/5)':eval=frame:saturation=1.05,format=yuv420p")
    subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-i", p, "-vf", vf, "-t", str(a.secs),
                           "-c:v", "libx264", "-preset", "ultrafast", "-crf", "16", a.out])
print("OK", a.out)
