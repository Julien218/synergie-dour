#!/usr/bin/env python3
"""Fond vidéo moderne pour la série : le grand emblème doré/bleu d'une vidéo de la marque, flouté léger, assombri, en boucle sans coupure.

Usage : make_bg_serie.py video_marque.mp4 sortie.mp4 [--secs 33] [--crop W:H:X:Y]
Par défaut le recadrage vise « reforme fiscale 2026-2030.mp4 » (944x944) : colonne de droite sans texte incrusté.
La boucle est un aller-retour (lecture puis lecture inversée) : pas de saut visible.
"""
import argparse, os, subprocess, tempfile

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--secs", type=float, default=33)
ap.add_argument("--crop", default="425:755:519:0")
ap.add_argument("--blur", type=float, default=9)
ap.add_argument("--dark", type=float, default=0.38)
a = ap.parse_args()

with tempfile.TemporaryDirectory() as d:
    pal = os.path.join(d, "pal.mp4")
    subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-i", a.video, "-filter_complex",
        f"[0:v]fps=30,crop={a.crop},scale=1080:1920:flags=lanczos,gblur=sigma={a.blur},eq=brightness=-{a.dark}:saturation=1.05,split[a][b];"
        "[b]reverse[r];[a][r]concat=n=2:v=1,format=yuv420p", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", pal])
    subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1", "-i", pal,
        "-t", str(a.secs), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", a.out])
print("OK", a.out)
