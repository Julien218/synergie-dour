import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import {
  Rocket, Building2, Calculator, FileText, Megaphone,
  TrendingUp, ShieldAlert, BookOpen, Star, Zap, Award,
  Target, Lightbulb, CheckCircle, Globe
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  "creer-activite-independant": Rocket,
  "personne-physique-societe":  Building2,
  "cotisations-sociales":       Calculator,
  "tva-independant":            FileText,
  "marketing-local":            Megaphone,
  "reforme-fiscale":            TrendingUp,
  starter:                      Rocket,
  gestion:                      Calculator,
  developpement:                Megaphone,
  difficulte:                   ShieldAlert,
};
function getIcon(res: { slug: string; category: string }): React.ElementType {
  return ICON_MAP[res.slug] || ICON_MAP[res.category] || BookOpen;
}

const CAT_LABEL: Record<string, string> = {
  starter:       "Je me lance",
  gestion:       "Je gère",
  developpement: "Je développe",
  difficulte:    "Difficulté",
};

/* ── Icônes voyageuses — 6 par carte, positions Y très dispersées ── */
const FLOAT_ICONS_LIST = [Star, Zap, Award, Target, Lightbulb, CheckCircle, Globe, Rocket];

/* Chaque entrée = une icône voyageuse avec ses paramètres uniques */
const FLOAT_DEFS = [
  { topPct: 5,  size: 11, opacity: 0.55, delay: 0,   dur: 5.5 },
  { topPct: 28, size: 8,  opacity: 0.45, delay: 1.8, dur: 8   },
  { topPct: 52, size: 13, opacity: 0.60, delay: 0.6, dur: 6.5 },
  { topPct: 70, size: 9,  opacity: 0.50, delay: 3.2, dur: 7   },
  { topPct: 18, size: 7,  opacity: 0.40, delay: 2.5, dur: 10  },
  { topPct: 85, size: 10, opacity: 0.48, delay: 1.1, dur: 9   },
];

/* CSS global : keyframes pour les icônes voyageuses + glow pulsé */
function buildCSS(count: number): string {
  let css = `
@keyframes sd-glow-pulse {
  0%,100% { box-shadow: 0 6px 22px rgba(0,0,0,0.45), 0 0 0 rgba(232,197,71,0); border-color: rgba(255,255,255,0.13); }
  50%      { box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 22px rgba(232,197,71,0.45), 0 0 8px rgba(100,160,255,0.2); border-color: rgba(232,197,71,0.55); }
}`;
  for (let ci = 0; ci < count; ci++) {
    for (let fi = 0; fi < FLOAT_DEFS.length; fi++) {
      const f = FLOAT_DEFS[fi];
      css += `
@keyframes sd-fly-${ci}-${fi} {
  0%   { transform: translateX(-20px); opacity: 0; }
  8%   { opacity: ${f.opacity}; }
  92%  { opacity: ${f.opacity}; }
  100% { transform: translateX(256px); opacity: 0; }
}`;
    }
  }
  return css;
}

const CARD_H   = 210;
const CARD_GAP = 12;
const SPEED    = 0.45;
const N_CARDS  = 4;
const N_UNIQUE = 8; /* nombre de cartes uniques max pour les keyframes */

export function ResourcesScrollFeed() {
  const [, setLocation] = useLocation();
  const wrapRef   = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef<number>(0);
  const [paused, setPaused] = useState(false);

  const items = [...RESOURCES, ...RESOURCES, ...RESOURCES];
  const loopH   = RESOURCES.length * (CARD_H + CARD_GAP);
  const windowH = N_CARDS * (CARD_H + CARD_GAP) - CARD_GAP;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function tick() {
      if (!paused) {
        offsetRef.current += SPEED;
        if (offsetRef.current >= loopH) offsetRef.current -= loopH;
        if (el) el.style.transform = `translateY(-${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, loopH]);

  return (
    <div
      className="fixed left-3 top-1/2 -translate-y-1/2 hidden xl:block"
      style={{ width: 245, zIndex: 9999 }}
    >
      <style dangerouslySetInnerHTML={{ __html: buildCSS(N_UNIQUE) }} />

      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const Icon     = getIcon(res);
            const label    = CAT_LABEL[res.category] || res.category;
            const ci       = i % Math.min(RESOURCES.length, N_UNIQUE);
            const glowDelay = `${(ci * 0.65) % 4}s`;

            return (
              <div
                key={`${res.slug}-${i}`}
                style={{ position: "relative", height: CARD_H, marginBottom: CARD_GAP }}
              >

                {/* ══ LOGOS VOYAGEURS — hors overflow:hidden, z-index élevé ══ */}
                {FLOAT_DEFS.map((f, fi) => {
                  const FIcon = FLOAT_ICONS_LIST[(ci * 2 + fi + 1) % FLOAT_ICONS_LIST.length];
                  return (
                    <div
                      key={fi}
                      style={{
                        position: "absolute",
                        top: `${f.topPct}%`,
                        left: 0,
                        zIndex: 10002,
                        pointerEvents: "none",
                        animation: `sd-fly-${ci}-${fi} ${f.dur}s linear ${f.delay}s infinite`,
                        color: "#E8C547",
                        filter: "drop-shadow(0 0 3px rgba(232,197,71,0.7))",
                        lineHeight: 1,
                      }}
                    >
                      <FIcon size={f.size} strokeWidth={1.8} />
                    </div>
                  );
                })}

                {/* ══ CARTE ══ */}
                <div
                  onClick={() => setLocation(`/resources/${res.slug}`)}
                  className="cursor-pointer"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 16,
                    background: "linear-gradient(160deg, #1e4bb8 0%, #1a3ba0 60%, #152f85 100%)",
                    border: "1.5px solid rgba(255,255,255,0.13)",
                    padding: "13px 13px 11px 13px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    animation: `sd-glow-pulse 4s ease-in-out ${glowDelay} infinite`,
                    transition: "transform 0.15s",
                    zIndex: 10000,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.animation = "none";
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow = "0 12px 36px rgba(0,0,0,0.6), 0 0 28px rgba(232,197,71,0.5)";
                    el.style.borderColor = "rgba(232,197,71,0.7)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.animation = `sd-glow-pulse 4s ease-in-out ${glowDelay} infinite`;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "";
                    el.style.borderColor = "";
                  }}
                >
                  {/* Reflet ambre coin haut-gauche */}
                  <div style={{
                    position: "absolute", top: -30, left: -30, width: 90, height: 90,
                    borderRadius: "50%", pointerEvents: "none",
                    background: "radial-gradient(circle, rgba(232,197,71,0.10) 0%, transparent 70%)",
                  }} />

                  {/* Logo Synergie Dour — coin supérieur droit, TRANSPARENT (mix-blend-mode pour enlever fond blanc) */}
                  <img
                    src="/logo-sd-transparent.png"
                    alt=""
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 8,
                      width: 34,
                      height: 34,
                      objectFit: "contain",
                      opacity: 0.65,
                      pointerEvents: "none",
                      zIndex: 2,
                      mixBlendMode: "screen",
                      filter: "drop-shadow(0 0 3px rgba(232,197,71,0.35))",
                    }}
                  />

                  {/* Contenu */}
                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>

                    {/* HEADER */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: "rgba(0,20,70,0.55)",
                        border: "1.5px solid rgba(232,197,71,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={18} color="#E8C547" strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1, paddingRight: 36 }}>
                        <p style={{
                          color: "#E8C547", fontWeight: 700, fontSize: 12.5,
                          lineHeight: 1.3, margin: 0,
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>
                          {res.title}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 9.5, margin: "2px 0 0" }}>
                          Fiche pratique — Synergie Dour
                        </p>
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <p style={{
                      color: "rgba(255,255,255,0.90)", fontSize: 10.5,
                      lineHeight: 1.5, margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {res.summary}
                    </p>

                    {/* BADGES */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{
                        background: "rgba(255,255,255,0.15)", color: "#fff",
                        fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 50, border: "1px solid rgba(255,255,255,0.28)",
                      }}>{label}</span>
                      <span style={{
                        background: "rgba(255,255,255,0.15)", color: "#fff",
                        fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 50, border: "1px solid rgba(255,255,255,0.28)",
                      }}>Gratuit</span>
                    </div>

                    {/* BOUTON */}
                    <div style={{
                      background: "#E8C547", borderRadius: 50,
                      padding: "7px 0", textAlign: "center",
                    }}>
                      <span style={{ color: "#001a3d", fontWeight: 700, fontSize: 11 }}>
                        Lire la fiche &nbsp;→
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setLocation("/resources")}
        style={{
          marginTop: 10, width: "100%",
          background: "#E8C547", border: "none", borderRadius: 50,
          padding: "8px 0", color: "#001a3d", fontSize: 10.5,
          fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer",
          boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
        }}
      >
        Toutes les fiches ›
      </button>
    </div>
  );
}
