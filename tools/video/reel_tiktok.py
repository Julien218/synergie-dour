#!/usr/bin/env python3
"""Reel moderne style TikTok : sous-titres en gros, mot par mot, plans dynamiques, voix + musique.

Usage :
  reel_tiktok.py config.json align.json source.mp4 voix.wav musique.mp3 sortie.mp4
                 [--font-dir DIR] [--font Poppins] [--logo PNG] [--preset ultrafast]

config.json : {"music_start": s, "clips": [{"start": s_source, "dur": secondes, "avail": optionnel, "trans": "slideleft"}...]}
              la somme des durées = durée de la voix. La transition [i] relie le plan i-1 au plan i.
align.json  : sortie de align_voice.py (mots + temps).

Sous-titres : groupes de 1 à 3 mots, MAJUSCULES, blanc + contour épais, le mot dit passe en or et "pop".
Pas de bandeau. Position centre-bas, marge de sécurité 6 %.
"""
import argparse, json, os, re, subprocess, sys, tempfile

GOLD = "&H37AFD4&"
WHITE = "&HFFFFFF&"
T = 0.22


def ts(t):
    t = max(0.0, t)
    return "%d:%02d:%05.2f" % (int(t // 3600), int(t % 3600 // 60), t % 60)


def chunks(words, maxw=3, maxch=20):
    out, cur = [], []
    for w in words:
        if cur and len(" ".join(x["w"] for x in cur + [w])) > maxch + 2:   # jamais plus large que l'écran
            out.append(cur); cur = []
        cur.append(w)
        txt = " ".join(x["w"] for x in cur)
        end = bool(re.search(r"[.?!…:,]$", w["w"]))
        if len(cur) >= maxw or len(txt) >= maxch or end:
            out.append(cur); cur = []
    if cur: out.append(cur)
    # évite les groupes d'un mot isolé quand on peut fusionner avec le suivant
    merged = []
    for c in out:
        if merged and len(c) == 1 and len(merged[-1]) < maxw and not re.search(r"[.?!…]$", merged[-1][-1]["w"]) \
           and len(" ".join(x["w"] for x in merged[-1] + c)) <= maxch + 4 and c[0]["s"] - merged[-1][-1]["e"] < 0.25:
            merged[-1] += c
        else:
            merged.append(c)
    return merged


def clean(w):
    return re.sub(r"[,:;]$", "", w).upper()


def build_ass(words, font, total, path, emphasis, labels=(), cap_y=1250):
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lab,{font},74,&H0037AFD4,&H0037AFD4,&H00331A00,&H80000000,-1,0,0,0,100,100,2,0,1,8,4,5,65,65,0,1
Style: Cap,{font},92,&H00FFFFFF,&H00FFFFFF,&H00331A00,&H80000000,-1,0,0,0,100,100,1,0,1,9,4,5,65,65,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for ch in chunks(words):
        a = ch[0]["s"]
        nxt_gap = 0.12
        b = min(total, ch[-1]["e"] + nxt_gap)
        parts = []
        for w in ch:
            rs = int((w["s"] - a) * 1000)
            re_ = int((w["e"] - a) * 1000)
            col = GOLD if clean(w["w"]) in emphasis else WHITE
            parts.append(
                "{\\c%s\\fscx100\\fscy100\\t(%d,%d,\\c%s\\fscx118\\fscy118)\\t(%d,%d,\\c%s\\fscx100\\fscy100)}%s"
                % (WHITE, max(0, rs - 30), rs + 60, GOLD, re_, re_ + 120, col if col == GOLD else WHITE, clean(w["w"])))
        text = " ".join(parts)
        tag = "{\\an5\\pos(540,%d)\\fscx70\\fscy70\\alpha&HFF&\\t(0,110,\\fscx100\\fscy100\\alpha&H00&)\\fad(0,70)}"
        ev.append("Dialogue: 0,%s,%s,Cap,,0,0,0,,%s%s" % (ts(a), ts(b), tag % cap_y, text))
    for lb in labels:
        tag = "{\\an5\\pos(540,400)\\fscx85\\fscy85\\alpha&HFF&\\t(0,200,\\fscx100\\fscy100\\alpha&H00&)\\fad(0,200)}"
        ev.append("Dialogue: 1,%s,%s,Lab,,0,0,0,,%s%s" % (ts(lb["s"]), ts(lb["e"]), tag, lb["text"]))
    open(path, "w", encoding="utf-8").write(header + "\n".join(ev) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config"); ap.add_argument("align"); ap.add_argument("source")
    ap.add_argument("voice"); ap.add_argument("music"); ap.add_argument("output")
    ap.add_argument("--font", default="Poppins")
    ap.add_argument("--font-dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts"))
    ap.add_argument("--logo")
    ap.add_argument("--preset", default="veryfast")
    ap.add_argument("--credit-script", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "credit_jsinnovia.py"))
    a = ap.parse_args()

    cfg = json.load(open(a.config, encoding="utf-8"))
    al = json.load(open(a.align, encoding="utf-8"))
    clips = cfg["clips"]
    n = len(clips)
    durs = [c["dur"] for c in clips]
    total = round(sum(durs), 3)
    emphasis = set(x.upper() for x in cfg.get("emphasis", []))

    with tempfile.TemporaryDirectory() as d:
        ass = os.path.join(d, "subs.ass")
        labels, t0 = [], 0.0
        for i, c in enumerate(clips):
            lb = c.get("label")
            if isinstance(lb, str):
                labels.append({"text": lb, "s": t0 + 0.25, "e": t0 + durs[i] - 0.05})
            elif isinstance(lb, list):                            # plusieurs étiquettes : [{"text","s","e"}] relatifs au plan
                for x in lb:
                    labels.append({"text": x["text"], "s": t0 + x["s"], "e": t0 + x["e"]})
            t0 += durs[i]
        delay = float(cfg.get("voice_delay", 0))               # intro avant la voix : on décale la voix et les sous-titres
        words = [dict(w, s=w["s"] + delay, e=w["e"] + delay) for w in al["words"]]
        build_ass(words, a.font, total, ass, emphasis, labels, int(cfg.get("cap_y", 1250)))
        inputs, chains = [], []
        for i, c in enumerate(clips):
            length = durs[i] + (T if i < n - 1 else 0)
            speed = c.get("speed", cfg.get("speed", 1.0))          # <1 : ralenti (0.7 = 70 % de la vitesse)
            take_src = min(length * speed, c.get("avail", length * speed))
            take = take_src / speed                               # durée obtenue en sortie
            if c.get("image"):                                    # photo fixe animée (zoom lent)
                take = length
                inputs += ["-loop", "1", "-framerate", "30", "-t", str(round(length, 3)), "-i", c["image"]]
                speed = 1.0
            else:
                inputs += ["-ss", str(c["start"]), "-t", str(round(take_src, 3)), "-i", a.source]
            slow = f"(PTS-STARTPTS)/{speed}" if speed != 1.0 else "PTS-STARTPTS"
            hold = f",tpad=stop_mode=clone:stop_duration={length - take:.3f}" if length - take > 0.01 else ""
            z0, z1 = (1.00, 1.10) if i % 2 == 0 else (1.10, 1.00)      # zoom avant / arrière en alternance
            chains.append(
                f"[{i}:v]setpts={slow},fps=30{hold},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                f"scale='trunc(1080*({z0}+({z1}-{z0})*t/{length})/2)*2':-2:eval=frame,"
                f"crop=1080:1920,setsar=1,format=yuv420p[v{i}]")
        cur, offset = "v0", 0.0
        for i in range(1, n):
            offset += durs[i - 1]
            chains.append(f"[{cur}][v{i}]xfade=transition={clips[i].get('trans', 'fade')}:duration={T}:offset={offset:.3f}[x{i}]")
            cur = f"x{i}"
        fontdir = f":fontsdir='{a.font_dir}'" if a.font_dir else ""
        chains.append(
            f"[{cur}]eq=contrast=1.08:saturation=1.18,subtitles='{ass}'{fontdir},"
            f"drawbox=x=0:y=0:w='iw*t/{total}':h=10:color=0xD4AF37@0.95:t=fill,format=yuv420p[vout]")
        vi, mi = n, n + 1
        inputs += ["-i", a.voice, "-ss", str(cfg.get("music_start", 0)), "-t", str(total + 0.5), "-i", a.music]
        chains.append(
            f"[{vi}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={int(delay*1000)}|{int(delay*1000)},asplit=2[vo][vsc];"
            f"[{mi}:a]volume=0.45,afade=t=in:d=0.3[mu];"
            f"[mu][vsc]sidechaincompress=threshold=0.04:ratio=10:attack=15:release=350[duck];"
            f"[vo][duck]amix=inputs=2:duration=first:normalize=0,apad,atrim=0:{total},afade=t=out:st={total - 1.2:.2f}:d=1.2,"
            f"loudnorm=I=-14:TP=-1.5[aout]")
        raw = os.path.join(d, "raw.mp4")
        cmd = (["ffmpeg", "-y", "-v", "error"] + inputs +
               ["-filter_complex", ";".join(chains), "-map", "[vout]", "-map", "[aout]", "-t", str(total),
                "-c:v", "libx264", "-preset", a.preset, "-crf", "19", "-c:a", "aac", "-b:a", "192k", raw])
        subprocess.check_call(cmd)
        if a.logo:
            subprocess.check_call([sys.executable, a.credit_script, raw, a.output, "--logo", a.logo, "--width-pct", "12"],
                                  env=dict(os.environ, PRESET=a.preset))
        else:
            os.replace(raw, a.output)
    print("OK", a.output, total)


if __name__ == "__main__":
    main()
