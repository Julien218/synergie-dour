#!/usr/bin/env python3
"""Fond animé de la série à partir d'une vidéo générée (WaveSpeed Seedance 2.0 Fast, 9:16, sans texte ni logo).

Usage : make_bg_video.py fond_seedance_serie.mp4 sortie.mp4 [--secs 33] [--dark 0.08]
Boucle aller-retour (pas de saut), agrandissement Lanczos 1080x1920, dégradé sombre en bas pour la lisibilité des sous-titres.
"""
import argparse, os, subprocess, tempfile
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--secs", type=float, default=33)
ap.add_argument("--dark", type=float, default=0.08)
a = ap.parse_args()

with tempfile.TemporaryDirectory() as d:
    g = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0)); px = g.load()
    for y in range(1920):
        k = max(0.0, (y - 1150) / 770.0)            # 0 jusqu'à y=1150, puis monte jusqu'à 0,6
        top = max(0.0, (260 - y) / 260.0) * 0.35     # léger assombrissement tout en haut
        al = int(255 * min(0.62, 0.62 * k ** 1.2 + top))
        for x in range(1080): px[x, y] = (0, 6, 30, al)
    gp = os.path.join(d, "grad.png"); g.save(gp)
    pal = os.path.join(d, "pal.mp4")
    subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-i", a.video, "-filter_complex",
        "[0:v]fps=30,scale=1080:1920:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,format=yuv420p",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "14", pal])
    subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1", "-i", pal, "-i", gp, "-filter_complex",
        f"[0:v]eq=brightness=-{a.dark}[v];[v][1:v]overlay=format=auto,format=yuv420p", "-t", str(a.secs),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "16", a.out])
print("OK", a.out)
