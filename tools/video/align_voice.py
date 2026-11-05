#!/usr/bin/env python3
"""Aligne un texte sur une voix off sans reconnaissance vocale.

Usage: align_voice.py voix.wav texte.txt sortie.json
Principe : le texte est découpé en mots (poids = syllabes estimées). Les pauses sont détectées dans l'audio
(ffmpeg silencedetect) puis appariées (programmation dynamique) aux signes de ponctuation du texte ; entre deux
points d'ancrage, les mots sont répartis sur le temps de parole réel. Précision typique : +-0,2 s.
"""
import json, re, subprocess, sys

def pauses(wav, noise="-35dB", d=0.25):
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", wav, "-af", f"silencedetect=n={noise}:d={d}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    s = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(s, e[:len(s)]))

def dur(wav):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav],
                                capture_output=True, text=True).stdout)

def syl(w):
    t = re.sub(r"[^a-zàâäéèêëîïôöùûüç0-9]", "", w.lower())
    if re.fullmatch(r"\d+", t): return 2 * len(t)
    g = re.findall(r"[aeiouyàâäéèêëîïôöùûü]+", t)
    n = len(g)
    if t.endswith("e") and n > 1: n -= 1
    return max(1, n)

def main():
    wav, txt, outp = sys.argv[1:4]
    text = open(txt, encoding="utf-8").read().replace("\n", " ")
    raw = text.split()
    words = [{"w": w, "wt": syl(w) + 0.35} for w in raw]
    brk = [i for i, w in enumerate(words) if re.search(r"[.,:;!?…]$", w["w"])]   # pause après le mot i
    T = dur(wav)
    P = pauses(wav)
    speech, cur = [], 0.0
    for s, e in P:
        if s > cur: speech.append((cur, s))
        cur = e
    if cur < T: speech.append((cur, T))
    sp_total = sum(b - a for a, b in speech)

    def axis_to_time(x):
        for a, b in speech:
            if x <= b - a: return a + x
            x -= b - a
        return speech[-1][1]

    cum = []
    c = 0.0
    for w in words:
        c += w["wt"]; cum.append(c)
    total = c
    anchors = {}                                      # index de mot -> temps de fin
    for _ in range(3):
        # temps prédit (axe parole) de chaque fin de mot, par segments entre ancres
        pts = [(-1, 0.0)] + sorted(anchors.items()) + [(len(words) - 1, None)]
        ends = [0.0] * len(words)
        starts = [0.0] * len(words)
        for (i0, t0), (i1, t1) in zip(pts, pts[1:]):
            lo = 0.0 if i0 < 0 else cum[i0]
            hi = total
            a0 = 0.0 if i0 < 0 else t0
            # axe parole du début/fin de segment
            def to_axis(t):
                x = 0.0
                for a, b in speech:
                    if t >= b: x += b - a
                    elif t > a: x += t - a; break
                    else: break
                return x
            x0 = 0.0 if i0 < 0 else to_axis(t0)
            x1 = sp_total if t1 is None else to_axis(t1)
            base = 0.0 if i0 < 0 else cum[i0]
            top = cum[i1]
            for k in range(i0 + 1, i1 + 1):
                ends[k] = axis_to_time(x0 + (x1 - x0) * (cum[k] - base) / (top - base))
        # DP appariement ponctuation / pauses
        pm = [(a + b) / 2 for a, b in P]
        K, M = len(brk), len(pm)
        INF = 1e9
        dp = [[INF] * (M + 1) for _ in range(K + 1)]
        bk = [[None] * (M + 1) for _ in range(K + 1)]
        dp[0][0] = 0
        for k in range(K + 1):
            for m in range(M + 1):
                if dp[k][m] >= INF: continue
                if k < K and dp[k][m] + 0.7 < dp[k + 1][m]:
                    dp[k + 1][m] = dp[k][m] + 0.7; bk[k + 1][m] = (k, m, 0)
                if m < M and dp[k][m] + 0.05 < dp[k][m + 1]:
                    dp[k][m + 1] = dp[k][m] + 0.05; bk[k][m + 1] = (k, m, 1)
                if k < K and m < M:
                    cst = abs(ends[brk[k]] - pm[m])
                    if cst < 1.5 and dp[k][m] + cst < dp[k + 1][m + 1]:
                        dp[k + 1][m + 1] = dp[k][m] + cst; bk[k + 1][m + 1] = (k, m, 2)
        k, m = K, M
        match = {}
        while (k, m) != (0, 0):
            pk, pmm, kind = bk[k][m]
            if kind == 2: match[brk[pk]] = P[pmm][0]       # le mot finit au début de la pause
            k, m = pk, pmm
        anchors = match
    # temps finaux
    pts = [(-1, 0.0)] + sorted(anchors.items()) + [(len(words) - 1, None)]
    res = []
    prev_end = 0.0
    for (i0, t0), (i1, t1) in zip(pts, pts[1:]):
        def to_axis(t):
            x = 0.0
            for a, b in speech:
                if t >= b: x += b - a
                elif t > a: x += t - a; break
                else: break
            return x
        x0 = 0.0 if i0 < 0 else to_axis(t0)
        x1 = sp_total if t1 is None else to_axis(t1)
        base = 0.0 if i0 < 0 else cum[i0]
        top = cum[i1]
        for k in range(i0 + 1, i1 + 1):
            xs = x0 + (x1 - x0) * ((cum[k - 1] if k > 0 else 0) - base) / (top - base)
            xe = x0 + (x1 - x0) * (cum[k] - base) / (top - base)
            res.append({"w": words[k]["w"], "s": round(axis_to_time(xs + 1e-6), 3), "e": round(axis_to_time(xe), 3)})
    # début de mot : après une pause, repartir à la fin de la pause
    for i, r in enumerate(res):
        if r["s"] >= r["e"]: r["s"] = max(0, r["e"] - 0.08)
    json.dump({"duration": T, "pauses": P, "anchors": len(anchors), "breaks": len(brk), "words": res}, open(outp, "w"), ensure_ascii=False, indent=1)
    print("durée", T, "pauses", len(P), "ponctuation", len(brk), "ancrées", len(anchors))

if __name__ == "__main__":
    main()
