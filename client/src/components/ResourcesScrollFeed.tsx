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

// 5 icônes par carte, positions Y dispersées, vitesses et délais différents
const FLOAT_DEFS = [
  { topPct: 8,  size: 9,  opacity: 0.22, delay: 0,   dur: 6  },
  { topPct: 35, size: 7,  opacity: 0.18, delay: 2,   dur: 9  },
  { topPct: 58, size: 10, opacity: 0.20, delay: 0.8, dur: 7  },
  { topPct: 75, size: 8,  opacity: 0.16, delay: 3.5, dur: 8  },
  { topPct: 22, size: 6,  opacity: 0.15, delay: 1.5, dur: 11 },
];

const FLOAT_ICONS_LIST = [Star, Zap, Award, Target, Lightbulb, CheckCircle, Globe, Rocket];

// CSS global injecté une seule fois
const GLOBAL_CSS = `
@keyframes sd-glow-pulse {
  0%,100% { box-shadow: 0 6px 22px rgba(0,0,0,0.45), 0 0 0 rgba(232,197,71,0); border-color: rgba(255,255,255,0.13); }
  50%      { box-shadow: 0 6px 28px rgba(0,0,0,0.5), 0 0 20px rgba(232,197,71,0.4), 0 0 8px rgba(100,160,255,0.25); border-color: rgba(232,197,71,0.5); }
}
${Array.from({length: 8}, (_, ci) =>
  FLOAT_DEFS.map((f, fi) => `
@keyframes sd-fly-${ci}-${fi} {
  0%   { transform: translateX(-16px); opacity: 0; }
  5%   { opacity: ${f.opacity}; }
  95%  { opacity: ${f.opacity}; }
  100% { transform: translateX(248px); opacity: 0; }
}`).join('')
).join('')}
`;

const CARD_H   = 200;
const CARD_GAP = 12;
const SPEED    = 0.45;
const N_CARDS  = 4;

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
      {/* CSS global une seule fois */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const Icon    = getIcon(res);
            const label   = CAT_LABEL[res.category] || res.category;
            const ci      = i % RESOURCES.length; // index carte pour CSS
            const glowDelay = `${(ci * 0.7) % 4}s`;

            return (
              <div
                key={`${res.slug}-${i}`}
                style={{
                  position: "relative",
                  height: CARD_H,
                  marginBottom: CARD_GAP,
                }}
              >
                {/* ── LOGOS VOYAGEURS — en dehors du overflow:hidden ── */}
                {FLOAT_DEFS.map((f, fi) => {
                  const FIcon = FLOAT_ICONS_LIST[(ci * 2 + fi) % FLOAT_ICONS_LIST.length];
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
                        lineHeight: 1,
                      }}
                    >
                      <FIcon size={f.size} color="#E8C547" strokeWidth={1.8} />
                    </div>
                  );
                })}

                {/* ── CARTE — avec overflow:hidden pour le contenu ── */}
                <div
                  onClick={() => setLocation(`/resources/${res.slug}`)}
                  className="cursor-pointer"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 16,
                    background: "linear-gradient(160deg, #1e4bb8 0%, #1a3ba0 60%, #152f85 100%)",
                    border: "1.5px solid rgba(255,255,255,0.13)",
                    padding: "14px 14px 12px 14px",
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
                  {/* Reflets internes discrets */}
                  <div style={{
                    position: "absolute", top: -30, left: -30, width: 90, height: 90,
                    borderRadius: "50%", pointerEvents: "none",
                    background: "radial-gradient(circle, rgba(232,197,71,0.10) 0%, transparent 70%)",
                  }} />
                  <div style={{
                    position: "absolute", bottom: -20, right: -20, width: 70, height: 70,
                    borderRadius: "50%", pointerEvents: "none",
                    background: "radial-gradient(circle, rgba(100,160,255,0.08) 0%, transparent 70%)",
                  }} />

                  {/* Logo Synergie Dour — coin supérieur droit, semi-transparent */}
                  <img
                    src="/logo-sd-transparent.png"
                    alt="Synergie Dour"
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 8,
                      width: 36,
                      height: 36,
                      objectFit: "contain",
                      opacity: 0.55,
                      pointerEvents: "none",
                      zIndex: 2,
                      filter: "drop-shadow(0 0 4px rgba(232,197,71,0.4))",
                    }}
                  />

                  {/* HEADER */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, position: "relative", zIndex: 1 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(0,20,70,0.55)",
                      border: "1.5px solid rgba(232,197,71,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={19} color="#E8C547" strokeWidth={2.2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        color: "#E8C547", fontWeight: 700, fontSize: 13,
                        lineHeight: 1.3, margin: 0,
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {res.title}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, margin: "2px 0 0" }}>
                        Fiche pratique — Synergie Dour
                      </p>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <p style={{
                    color: "rgba(255,255,255,0.88)", fontSize: 10.5,
                    lineHeight: 1.5, margin: 0, position: "relative", zIndex: 1,
                    display: "-webkit-box", WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {res.summary}
                  </p>

                  {/* BADGES */}
                  <div style={{ display: "flex", gap: 6, position: "relative", zIndex: 1 }}>
                    <span style={{
                      background: "rgba(255,255,255,0.15)", color: "#fff",
                      fontSize: 9.5, fontWeight: 600, padding: "3px 11px",
                      borderRadius: 50, border: "1px solid rgba(255,255,255,0.28)",
                    }}>{label}</span>
                    <span style={{
                      background: "rgba(255,255,255,0.15)", color: "#fff",
                      fontSize: 9.5, fontWeight: 600, padding: "3px 11px",
                      borderRadius: 50, border: "1px solid rgba(255,255,255,0.28)",
                    }}>Gratuit</span>
                  </div>

                  {/* BOUTON */}
                  <div style={{
                    background: "#E8C547", borderRadius: 50,
                    padding: "7px 0", textAlign: "center",
                    position: "relative", zIndex: 1,
                  }}>
                    <span style={{ color: "#001a3d", fontWeight: 700, fontSize: 11 }}>
                      Lire la fiche &nbsp;→
                    </span>
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
