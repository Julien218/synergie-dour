import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import {
  Rocket, Building2, Calculator, FileText, Megaphone,
  TrendingUp, ShieldAlert, BookOpen, Star, Zap, Award,
  Target, Lightbulb, CheckCircle, Globe, Flame, Sparkles
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

const FLOAT_ICONS_LIST = [Star, Zap, Award, Target, Lightbulb, CheckCircle, Globe, Rocket, Flame];

const FLOAT_DEFS = [
  { topPct: 5,  size: 11, opacity: 0.55, delay: 0,   dur: 5.5 },
  { topPct: 28, size: 8,  opacity: 0.45, delay: 1.8, dur: 8   },
  { topPct: 52, size: 13, opacity: 0.60, delay: 0.6, dur: 6.5 },
  { topPct: 70, size: 9,  opacity: 0.50, delay: 3.2, dur: 7   },
  { topPct: 18, size: 7,  opacity: 0.40, delay: 2.5, dur: 10  },
  { topPct: 85, size: 10, opacity: 0.48, delay: 1.1, dur: 9   },
];

/* ──────────────────────────────────────────────────────────────
   8 EFFETS VISUELS UNIQUES — un par position dans la rotation
   0: Glow ambre pulsé           (standard)
   1: Scan line horizontal       (cyber)
   2: Particules montantes       (feu de camp)
   3: Contour arc-en-ciel rotatif(hologramme)
   4: Shimmer diagonal           (métal brossé)
   5: Lueur bleue neon           (électrique)
   6: Bruit de fond animé        (statique)
   7: Reflet spotlight           (projecteur)
────────────────────────────────────────────────────────────── */
const CARD_EFFECTS = [
  // 0 — Glow ambre pulsé (base)
  {
    bg: "linear-gradient(160deg, #1e4bb8 0%, #1a3ba0 60%, #152f85 100%)",
    glowAnim: "sd-glow-amber",
    glowDur: "4s",
    scanLine: false,
    particles: false,
    rainbow: false,
    shimmer: false,
    neon: false,
    spotlight: false,
    accentColor: "#E8C547",
    iconBg: "rgba(0,20,70,0.55)",
  },
  // 1 — Scan line cyber (liseré blanc qui remonte)
  {
    bg: "linear-gradient(160deg, #0e3a7a 0%, #1a3ba0 50%, #0a2d6b 100%)",
    glowAnim: "sd-glow-cyber",
    glowDur: "3.5s",
    scanLine: true,
    particles: false,
    rainbow: false,
    shimmer: false,
    neon: false,
    spotlight: false,
    accentColor: "#60b0ff",
    iconBg: "rgba(0,30,90,0.7)",
  },
  // 2 — Particules montantes (feu)
  {
    bg: "linear-gradient(160deg, #1a3ba0 0%, #1e2d80 50%, #0f1f60 100%)",
    glowAnim: "sd-glow-fire",
    glowDur: "5s",
    scanLine: false,
    particles: true,
    rainbow: false,
    shimmer: false,
    neon: false,
    spotlight: false,
    accentColor: "#ff8c42",
    iconBg: "rgba(60,20,0,0.55)",
  },
  // 3 — Contour hologramme (dégradé coloré animé)
  {
    bg: "linear-gradient(160deg, #10295c 0%, #1a3ba0 55%, #1b1060 100%)",
    glowAnim: "sd-glow-holo",
    glowDur: "6s",
    scanLine: false,
    particles: false,
    rainbow: true,
    shimmer: false,
    neon: false,
    spotlight: false,
    accentColor: "#a0f0ff",
    iconBg: "rgba(0,50,70,0.6)",
  },
  // 4 — Shimmer diagonal (métal)
  {
    bg: "linear-gradient(160deg, #152f85 0%, #1e4bb8 45%, #122880 100%)",
    glowAnim: "sd-glow-amber",
    glowDur: "4.5s",
    scanLine: false,
    particles: false,
    rainbow: false,
    shimmer: true,
    neon: false,
    spotlight: false,
    accentColor: "#E8C547",
    iconBg: "rgba(0,15,60,0.6)",
  },
  // 5 — Lueur bleue neon
  {
    bg: "linear-gradient(160deg, #0a1a4a 0%, #1a3ba0 55%, #071434 100%)",
    glowAnim: "sd-glow-neon",
    glowDur: "3s",
    scanLine: false,
    particles: false,
    rainbow: false,
    shimmer: false,
    neon: true,
    spotlight: false,
    accentColor: "#00e5ff",
    iconBg: "rgba(0,60,80,0.6)",
  },
  // 6 — Double reflet ambre + bleu
  {
    bg: "linear-gradient(160deg, #1a3ba0 0%, #132b80 55%, #0e1e60 100%)",
    glowAnim: "sd-glow-dual",
    glowDur: "5.5s",
    scanLine: false,
    particles: false,
    rainbow: false,
    shimmer: false,
    neon: false,
    spotlight: false,
    accentColor: "#E8C547",
    iconBg: "rgba(0,25,80,0.55)",
  },
  // 7 — Spotlight (cercle lumineux qui tourne)
  {
    bg: "linear-gradient(160deg, #18388a 0%, #1a3ba0 55%, #141e70 100%)",
    glowAnim: "sd-glow-spot",
    glowDur: "4.8s",
    scanLine: false,
    particles: false,
    rainbow: false,
    shimmer: false,
    neon: false,
    spotlight: true,
    accentColor: "#E8C547",
    iconBg: "rgba(0,20,70,0.55)",
  },
];

const CARD_H   = 210;
const CARD_GAP = 12;
const SPEED    = 0.45;
const N_CARDS  = 4;
const N_UNIQUE = CARD_EFFECTS.length;

function buildCSS(): string {
  let css = `
/* ── EFFETS COMMUNS ── */
@keyframes sd-glow-amber {
  0%,100% { box-shadow:0 6px 22px rgba(0,0,0,.45),0 0 0 rgba(232,197,71,0); border-color:rgba(255,255,255,.13); }
  50%      { box-shadow:0 8px 30px rgba(0,0,0,.55),0 0 22px rgba(232,197,71,.45),0 0 8px rgba(100,160,255,.2); border-color:rgba(232,197,71,.55); }
}
@keyframes sd-glow-cyber {
  0%,100% { box-shadow:0 6px 22px rgba(0,0,0,.45),0 0 0 rgba(96,176,255,0); border-color:rgba(255,255,255,.1); }
  50%      { box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 20px rgba(96,176,255,.5),0 0 40px rgba(96,176,255,.15); border-color:rgba(96,176,255,.6); }
}
@keyframes sd-glow-fire {
  0%,100% { box-shadow:0 6px 22px rgba(0,0,0,.45),0 0 0 rgba(255,140,66,0); border-color:rgba(255,255,255,.1); }
  50%      { box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 24px rgba(255,140,66,.55); border-color:rgba(255,140,66,.55); }
}
@keyframes sd-glow-holo {
  0%   { box-shadow:0 6px 22px rgba(0,0,0,.45),0 0 0 rgba(160,240,255,0); border-color:rgba(255,0,200,.25); }
  33%  { box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 20px rgba(0,200,255,.4); border-color:rgba(0,200,255,.5); }
  66%  { box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 20px rgba(200,0,255,.4); border-color:rgba(200,0,255,.4); }
  100% { box-shadow:0 6px 22px rgba(0,0,0,.45),0 0 0 rgba(160,240,255,0); border-color:rgba(255,0,200,.25); }
}
@keyframes sd-glow-neon {
  0%,100% { box-shadow:0 0 8px rgba(0,229,255,.3),0 0 20px rgba(0,229,255,.15),inset 0 0 12px rgba(0,229,255,.05); border-color:rgba(0,229,255,.4); }
  50%      { box-shadow:0 0 16px rgba(0,229,255,.7),0 0 40px rgba(0,229,255,.35),inset 0 0 20px rgba(0,229,255,.1); border-color:rgba(0,229,255,.9); }
}
@keyframes sd-glow-dual {
  0%,100% { box-shadow:0 6px 22px rgba(0,0,0,.45); border-color:rgba(255,255,255,.13); }
  25%     { box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 18px rgba(232,197,71,.4); border-color:rgba(232,197,71,.5); }
  75%     { box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 18px rgba(100,160,255,.4); border-color:rgba(100,160,255,.5); }
}
@keyframes sd-glow-spot {
  0%,100% { box-shadow:0 6px 22px rgba(0,0,0,.45); border-color:rgba(255,255,255,.13); }
  50%      { box-shadow:0 8px 30px rgba(0,0,0,.55),0 0 22px rgba(232,197,71,.4); border-color:rgba(232,197,71,.5); }
}
/* ── SCAN LINE ── */
@keyframes sd-scan {
  0%   { top: 100%; opacity: 0; }
  5%   { opacity: 0.6; }
  95%  { opacity: 0.5; }
  100% { top: -4px; opacity: 0; }
}
/* ── PARTICULES FEU ── */
@keyframes sd-particle-rise {
  0%   { transform: translateY(0) scale(1); opacity: 0.7; }
  100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
}
/* ── HOLOGRAMME CONTOUR ── */
@keyframes sd-holo-border {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
/* ── SHIMMER DIAGONAL ── */
@keyframes sd-shimmer {
  0%   { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(350%) skewX(-20deg); }
}
/* ── SPOTLIGHT ROTATIF ── */
@keyframes sd-spot-rotate {
  0%   { transform: rotate(0deg) translateX(60px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
}`;

  /* Keyframes voyageurs par carte */
  for (let ci = 0; ci < N_UNIQUE; ci++) {
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

/* ── Overlay Scan Line ── */
function ScanLine() {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, height: 3,
      background: "linear-gradient(90deg, transparent, rgba(96,176,255,0.8), rgba(255,255,255,0.9), rgba(96,176,255,0.8), transparent)",
      animation: "sd-scan 3.2s linear infinite",
      pointerEvents: "none", zIndex: 3, borderRadius: 2,
    }} />
  );
}

/* ── Particles feu ── */
function FireParticles({ color }: { color: string }) {
  const particles = [
    { left: "20%", delay: "0s",   dur: "2.2s", size: 4 },
    { left: "45%", delay: "0.7s", dur: "1.8s", size: 3 },
    { left: "65%", delay: "1.3s", dur: "2.5s", size: 5 },
    { left: "80%", delay: "0.4s", dur: "2s",   size: 3 },
    { left: "10%", delay: "1.8s", dur: "1.6s", size: 4 },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", bottom: 8, left: p.left,
          width: p.size, height: p.size, borderRadius: "50%",
          background: color, opacity: 0.7,
          animation: `sd-particle-rise ${p.dur} ease-out ${p.delay} infinite`,
          filter: `drop-shadow(0 0 3px ${color})`,
          pointerEvents: "none", zIndex: 3,
        }} />
      ))}
    </>
  );
}

/* ── Hologramme — border gradient animé ── */
function HoloBorder() {
  return (
    <div style={{
      position: "absolute", inset: -2, borderRadius: 18,
      background: "linear-gradient(90deg, #ff00cc, #00ffee, #ffee00, #ff00cc, #00ffee)",
      backgroundSize: "200% 100%",
      animation: "sd-holo-border 3s linear infinite",
      pointerEvents: "none", zIndex: 0, opacity: 0.6,
    }}>
      <div style={{ position: "absolute", inset: 2, borderRadius: 16, background: "inherit" }} />
    </div>
  );
}

/* ── Shimmer diagonal ── */
function Shimmer() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: "none", zIndex: 3, overflow: "hidden", borderRadius: 16,
    }}>
      <div style={{
        position: "absolute", top: "-50%", width: "40px", height: "200%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
        animation: "sd-shimmer 2.8s ease-in-out infinite",
      }} />
    </div>
  );
}

/* ── Neon inner glow ── */
function NeonInner({ color }: { color: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none", zIndex: 3,
      background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 65%)`,
    }} />
  );
}

/* ── Spotlight rotatif ── */
function SpotlightRotate() {
  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      marginTop: -4, marginLeft: -4,
      width: 8, height: 8,
      pointerEvents: "none", zIndex: 3,
    }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%", marginTop: -4, marginLeft: -4,
        width: 8, height: 8, borderRadius: "50%",
        background: "rgba(232,197,71,0.8)",
        filter: "blur(6px)",
        animation: "sd-spot-rotate 4s linear infinite",
        boxShadow: "0 0 14px 6px rgba(232,197,71,0.45)",
      }} />
    </div>
  );
}

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
      <style dangerouslySetInnerHTML={{ __html: buildCSS() }} />

      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const Icon   = getIcon(res);
            const label  = CAT_LABEL[res.category] || res.category;
            const ci     = i % N_UNIQUE;
            const fx     = CARD_EFFECTS[ci];
            const glowDelay = `${(ci * 0.65) % 4}s`;

            return (
              <div
                key={`${res.slug}-${i}`}
                style={{ position: "relative", height: CARD_H, marginBottom: CARD_GAP }}
              >
                {/* ── Icônes voyageuses ── */}
                {FLOAT_DEFS.map((f, fi) => {
                  const FIcon = FLOAT_ICONS_LIST[(ci * 2 + fi + 1) % FLOAT_ICONS_LIST.length];
                  return (
                    <div key={fi} style={{
                      position: "absolute",
                      top: `${f.topPct}%`, left: 0, zIndex: 10002,
                      pointerEvents: "none",
                      animation: `sd-fly-${ci}-${fi} ${f.dur}s linear ${f.delay}s infinite`,
                      color: fx.accentColor,
                      filter: `drop-shadow(0 0 3px ${fx.accentColor}aa)`,
                      lineHeight: 1,
                    }}>
                      <FIcon size={f.size} strokeWidth={1.8} />
                    </div>
                  );
                })}

                {/* ── CARTE ── */}
                <div
                  onClick={() => setLocation(`/resources/${res.slug}`)}
                  className="cursor-pointer"
                  style={{
                    position: "absolute", inset: 0, borderRadius: 16,
                    background: fx.bg,
                    border: "1.5px solid rgba(255,255,255,0.13)",
                    padding: "13px 13px 11px 13px",
                    display: "flex", flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    animation: `${fx.glowAnim} ${fx.glowDur} ease-in-out ${glowDelay} infinite`,
                    transition: "transform 0.15s",
                    zIndex: 10000,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.animation = "none";
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow = `0 12px 36px rgba(0,0,0,0.6),0 0 28px ${fx.accentColor}88`;
                    el.style.borderColor = fx.accentColor;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.animation = `${fx.glowAnim} ${fx.glowDur} ease-in-out ${glowDelay} infinite`;
                    el.style.transform = "";
                    el.style.boxShadow = "";
                    el.style.borderColor = "";
                  }}
                >
                  {/* Reflet coin haut-gauche */}
                  <div style={{
                    position: "absolute", top: -30, left: -30,
                    width: 90, height: 90, borderRadius: "50%",
                    pointerEvents: "none",
                    background: `radial-gradient(circle, ${fx.accentColor}18 0%, transparent 70%)`,
                  }} />

                  {/* Effets spéciaux par type */}
                  {fx.scanLine   && <ScanLine />}
                  {fx.particles  && <FireParticles color={fx.accentColor} />}
                  {fx.rainbow    && <HoloBorder />}
                  {fx.shimmer    && <Shimmer />}
                  {fx.neon       && <NeonInner color={fx.accentColor} />}
                  {fx.spotlight  && <SpotlightRotate />}

                  {/* Logo Synergie */}
                  <img
                    src="/logo-sd-transparent.png"
                    alt=""
                    style={{
                      position: "absolute", top: 7, right: 8,
                      width: 34, height: 34, objectFit: "contain",
                      opacity: 0.65, pointerEvents: "none", zIndex: 2,
                      mixBlendMode: "screen",
                      filter: `drop-shadow(0 0 3px ${fx.accentColor}66)`,
                    }}
                  />

                  {/* Contenu */}
                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>

                    {/* HEADER */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: fx.iconBg,
                        border: `1.5px solid ${fx.accentColor}66`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={18} color={fx.accentColor} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1, paddingRight: 36 }}>
                        <p style={{
                          color: fx.accentColor, fontWeight: 700, fontSize: 12.5,
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
                        background: `${fx.accentColor}22`, color: fx.accentColor,
                        fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 50, border: `1px solid ${fx.accentColor}55`,
                      }}>{label}</span>
                      <span style={{
                        background: "rgba(255,255,255,0.15)", color: "#fff",
                        fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 50, border: "1px solid rgba(255,255,255,0.28)",
                      }}>Gratuit</span>
                    </div>

                    {/* BOUTON */}
                    <div style={{
                      background: fx.accentColor, borderRadius: 50,
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
