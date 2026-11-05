#!/usr/bin/env python3
"""Reel professionnel Synergie Dour : transitions, sous-titres animés mot à mot, voix + musique.

Usage :
  reel_pro.py config.json source.mp4 voix.wav musique.mp3 sortie.mp4 [--font-dir DIR] [--font NOM]
              [--logo logo_jsinnovia.png] [--preset ultrafast]

Ce que fait l'outil :
  * découpe la source en plans calés sur les coupes de la voix (config "cuts"),
  * enchaîne les plans avec des transitions xfade (0,3 s) + travelling lent,
  * génère des sous-titres ASS animés : chaque mot apparaît et passe en or quand il est dit,
    le texte glisse et s'efface (timings estimés d'après l'énergie de la voix),
  * ajoute une barre de progression or en haut,
  * mixe la voix et la musique (la musique baisse sous la voix), loudnorm -14 LUFS,
  * ajoute le crédit JS-Innov.IA (credit_jsinnovia.py) et les métadonnées si --logo est donné.

Les faits (texte, horaires, téléphone) viennent du config.json, validé par l'utilisateur.
"""
import argparse, json, os, subprocess, sys, tempfile, wave
import struct

GOLD_BGR = "&H37AFD4&"      # #D4AF37 en ASS (BGR)
WHITE = "&HFFFFFF&"
NAVY_BOX = "&H333D1A00"     # #001a3d, 80 % opaque
T = 0.30                    # durée des transitions


def envelope(wav_path, win=0.01):
    with wave.open(wav_path) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        raw = w.readframes(n)
    samples = struct.unpack("<%dh" % (len(raw) // 2), raw)
    step = int(sr * win)
    env = []
    for i in range(0, len(samples) - step, step * ch):
        seg = samples[i:i + step * ch:ch]
        env.append(sum(abs(x) for x in seg) / max(1, len(seg)))
    return env, win


def word_times(words, s, e, env, win):
    """Découpe [s, e] en mots proportionnellement aux lettres, calé sur les minima d'énergie."""
    weights = [len(w.strip(".,:;!?")) + 1 for w in words]
    tot = float(sum(weights))
    bounds, acc = [s], 0.0
    for wgt in weights[:-1]:
        acc += wgt
        t = s + (e - s) * acc / tot
        lo, hi = int((t - 0.09) / win), int((t + 0.09) / win)
        lo, hi = max(0, lo), min(len(env) - 1, hi)
        best = min(range(lo, hi + 1), key=lambda k: env[k]) if hi > lo else int(t / win)
        bounds.append(best * win)
    bounds.append(e)
    return [(bounds[i], bounds[i + 1]) for i in range(len(words))]


def ts(t):
    t = max(0.0, t)
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return "%d:%02d:%05.2f" % (h, m, s)


def build_ass(cfg, env, win, font, path):
    cuts = cfg["cuts"]
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{font},60,&H00FFFFFF,&H00FFFFFF,{NAVY_BOX},&H00000000,-1,0,0,0,100,100,0,0,3,20,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for i, c in enumerate(cfg["clips"]):
        a, b = cuts[i] + 0.06, cuts[i + 1] - 0.06
        words_by_line = [ln.split() for ln in c["lines"]]
        flat = [w for ln in words_by_line for w in ln]
        times = word_times(flat, c["phrase"][0], c["phrase"][1], env, win)
        k = 0
        text_lines = []
        for ln in words_by_line:
            parts = []
            for w in ln:
                s, e = times[k]
                k += 1
                rs, re_ = int((s - a) * 1000), int((e - a) * 1000)
                parts.append(
                    "{\\1a&H80&\\c%s\\fscx100\\fscy100"
                    "\\t(%d,%d,\\1a&H00&\\c%s\\fscx114\\fscy114)"
                    "\\t(%d,%d,\\c%s\\fscx100\\fscy100)}%s" % (WHITE, rs, rs + 70, GOLD_BGR, re_, re_ + 120, WHITE, w))
            text_lines.append(" ".join(parts))
        y = 1170
        tag = "{\\an5\\move(540,%d,540,%d,0,200)\\fad(140,120)}" % (y + 70, y)
        ev.append("Dialogue: 0,%s,%s,Sub,,0,0,0,,%s%s" % (ts(a), ts(b), tag, "\\N".join(text_lines)))
    open(path, "w", encoding="utf-8").write(header + "\n".join(ev) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config"); ap.add_argument("source"); ap.add_argument("voice")
    ap.add_argument("music"); ap.add_argument("output")
    ap.add_argument("--font", default="Poppins")
    ap.add_argument("--font-dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts"))
    ap.add_argument("--logo")
    ap.add_argument("--preset", default="veryfast")
    ap.add_argument("--credit-script", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "credit_jsinnovia.py"))
    a = ap.parse_args()

    cfg = json.load(open(a.config, encoding="utf-8"))
    cuts, clips, trans = cfg["cuts"], cfg["clips"], cfg["transitions"]
    n = len(clips)
    total = cuts[-1]
    durs = [round(cuts[i + 1] - cuts[i], 3) for i in range(n)]
    env, win = envelope(a.voice)

    with tempfile.TemporaryDirectory() as d:
        ass = os.path.join(d, "subs.ass")
        build_ass(cfg, env, win, a.font, ass)

        inputs, chains = [], []
        for i, c in enumerate(clips):
            length = durs[i] + (T if i < n - 1 else 0)          # le plan déborde de T pour la transition
            take = min(length, c.get("avail", length))
            inputs += ["-ss", str(c["start"]), "-t", str(round(take, 3)), "-i", a.source]
            hold = f",tpad=stop_mode=clone:stop_duration={length - take:.3f}" if length - take > 0.01 else ""
            chains.append(
                f"[{i}:v]setpts=PTS-STARTPTS,fps=30{hold},scale=1166:2074,"
                f"crop=1080:1920:x='(iw-1080)*t/{length}':y='(ih-1920)/2',setsar=1,format=yuv420p[v{i}]")
        # chaîne xfade
        cur, offset = "v0", 0.0
        for i in range(1, n):
            offset += durs[i - 1]
            out = f"x{i}"
            chains.append(f"[{cur}][v{i}]xfade=transition={trans[(i - 1) % len(trans)]}:duration={T}:offset={offset:.3f}[{out}]")
            cur = out
        fontdir = f":fontsdir='{a.font_dir}'" if a.font_dir else ""
        chains.append(
            f"[{cur}]subtitles='{ass}'{fontdir},"
            f"drawbox=x=0:y=0:w='iw*t/{total}':h=10:color=0xD4AF37@0.95:t=fill,format=yuv420p[vout]")

        vi, mi = n, n + 1
        inputs += ["-i", a.voice, "-ss", str(cfg.get("music_start", 0)), "-t", str(total + 0.5), "-i", a.music]
        chains.append(
            f"[{vi}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,asplit=2[vo][vsc];"
            f"[{mi}:a]volume=0.55,afade=t=in:d=0.3[mu];"
            f"[mu][vsc]sidechaincompress=threshold=0.04:ratio=10:attack=15:release=350[duck];"
            f"[vo][duck]amix=inputs=2:duration=first:normalize=0,afade=t=out:st={total - 1.0:.2f}:d=1.0,"
            f"loudnorm=I=-14:TP=-1.5[aout]")
        raw = os.path.join(d, "raw.mp4")
        cmd = (["ffmpeg", "-y", "-v", "error"] + inputs +
               ["-filter_complex", ";".join(chains), "-map", "[vout]", "-map", "[aout]", "-t", str(total),
                "-c:v", "libx264", "-preset", a.preset, "-crf", "19", "-c:a", "aac", "-b:a", "192k", raw])
        subprocess.check_call(cmd)

        if a.logo:
            env2 = dict(os.environ, PRESET=a.preset)
            subprocess.check_call([sys.executable, a.credit_script, raw, a.output, "--logo", a.logo, "--width-pct", "12"], env=env2)
        else:
            os.replace(raw, a.output)
    print("OK", a.output, total)


if __name__ == "__main__":
    main()
