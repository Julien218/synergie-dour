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

/* Teintes subtiles par position — variation douce du fond bleu */
const CARD_TINTS = [
  "linear-gradient(160deg, #1e4bb8 0%, #1a3ba0 60%, #152f85 100%)",
  "linear-gradient(160deg, #163a9a 0%, #1a3ba0 55%, #0e2a75 100%)",
  "linear-gradient(160deg, #1a3ba0 0%, #162e8a 55%, #122470 100%)",
  "linear-gradient(160deg, #122880 0%, #1a3ba0 55%, #1a3ba0 100%)",
  "linear-gradient(160deg, #1e4bb8 0%, #163090 55%, #1a3ba0 100%)",
  "linear-gradient(160deg, #1a3ba0 0%, #1e4bb8 50%, #152f85 100%)",
];

/* CSS minimal — un seul glow pulsé très lent, discret */
const GLOBAL_CSS = `
@keyframes sd-card-glow {
  0%,100% {
    box-shadow: 0 4px 18px rgba(0,0,0,0.40);
    border-color: rgba(255,255,255,0.10);
  }
  50% {
    box-shadow: 0 6px 26px rgba(0,0,0,0.50), 0 0 16px rgba(232,197,71,0.18);
    border-color: rgba(232,197,71,0.28);
  }
}
`;

const CARD_H   = 210;
const CARD_GAP = 12;
const SPEED    = 0.40;
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
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const Icon   = getIcon(res);
            const label  = CAT_LABEL[res.category] || res.category;
            const tint   = CARD_TINTS[i % CARD_TINTS.length];
            const glowDelay = `${(i % 6) * 0.7}s`;

            return (
              <div
                key={`${res.slug}-${i}`}
                style={{ height: CARD_H, marginBottom: CARD_GAP }}
              >
                <div
                  onClick={() => setLocation(`/resources/${res.slug}`)}
                  className="cursor-pointer"
                  style={{
                    height: "100%",
                    borderRadius: 16,
                    background: tint,
                    border: "1.5px solid rgba(255,255,255,0.10)",
                    padding: "13px 13px 11px 13px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    position: "relative",
                    animation: `sd-card-glow 6s ease-in-out ${glowDelay} infinite`,
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.animation = "none";
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.55), 0 0 20px rgba(232,197,71,0.30)";
                    el.style.borderColor = "rgba(232,197,71,0.50)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.animation = `sd-card-glow 6s ease-in-out ${glowDelay} infinite`;
                    el.style.transform = "";
                    el.style.boxShadow = "";
                    el.style.borderColor = "";
                  }}
                >
                  {/* Reflet coin haut-gauche — très discret */}
                  <div style={{
                    position: "absolute", top: -25, left: -25,
                    width: 80, height: 80, borderRadius: "50%",
                    pointerEvents: "none",
                    background: "radial-gradient(circle, rgba(232,197,71,0.07) 0%, transparent 70%)",
                  }} />

                  {/* Logo Synergie Dour */}
                  <img
                    src="/logo-sd-transparent.png"
                    alt=""
                    style={{
                      position: "absolute", top: 8, right: 9,
                      width: 32, height: 32, objectFit: "contain",
                      opacity: 0.55, pointerEvents: "none", zIndex: 2,
                      mixBlendMode: "screen",
                    }}
                  />

                  {/* Contenu */}
                  <div style={{
                    position: "relative", zIndex: 1,
                    display: "flex", flexDirection: "column",
                    height: "100%", justifyContent: "space-between",
                  }}>
                    {/* HEADER */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: "rgba(0,20,70,0.50)",
                        border: "1.5px solid rgba(232,197,71,0.35)",
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
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5, margin: "2px 0 0" }}>
                          Fiche pratique — Synergie Dour
                        </p>
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <p style={{
                      color: "rgba(255,255,255,0.88)", fontSize: 10.5,
                      lineHeight: 1.5, margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {res.summary}
                    </p>

                    {/* BADGES */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{
                        background: "rgba(232,197,71,0.14)", color: "#E8C547",
                        fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 50, border: "1px solid rgba(232,197,71,0.30)",
                      }}>{label}</span>
                      <span style={{
                        background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.80)",
                        fontSize: 9.5, fontWeight: 600, padding: "3px 10px",
                        borderRadius: 50, border: "1px solid rgba(255,255,255,0.20)",
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
          boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
        }}
      >
        Toutes les fiches ›
      </button>
    </div>
  );
}
