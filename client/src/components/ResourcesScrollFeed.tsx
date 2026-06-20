import { useEffect, useRef, useState, memo } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import {
  Rocket, Building2, Calculator, FileText, Megaphone,
  TrendingUp, ShieldAlert, BookOpen, Star, Zap, Award,
  Target, Lightbulb, CheckCircle, Globe, TrendingDown
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

const FLOAT_ICONS = [Star, Zap, Award, Target, Lightbulb, Globe, CheckCircle, TrendingDown];
const FLOAT_POSITIONS = [
  { top: "12%", size: 10, opacity: 0.13, delay: 0,   duration: 7  },
  { top: "55%", size: 8,  opacity: 0.10, delay: 1.5, duration: 9  },
  { top: "30%", size: 11, opacity: 0.15, delay: 3,   duration: 6  },
  { top: "75%", size: 9,  opacity: 0.11, delay: 0.8, duration: 8  },
  { top: "20%", size: 7,  opacity: 0.09, delay: 2.2, duration: 11 },
];

const FloatingLogos = memo(({ cardIndex }: { cardIndex: number }) => (
  <>
    {FLOAT_POSITIONS.map((pos, j) => {
      const IconCmp = FLOAT_ICONS[(cardIndex * 3 + j) % FLOAT_ICONS.length];
      const animName = `floatX-${cardIndex}-${j}`;
      return (
        <span key={j} style={{
          position: "absolute", top: pos.top, left: 0,
          pointerEvents: "none", zIndex: 0,
          animation: `${animName} ${pos.duration}s linear ${pos.delay}s infinite`,
          opacity: pos.opacity,
        }}>
          <style>{`@keyframes ${animName}{0%{transform:translateX(-12px)}100%{transform:translateX(260px)}}`}</style>
          <IconCmp size={pos.size} color="#E8C547" strokeWidth={1.5} />
        </span>
      );
    })}
  </>
));

/* ── Style global pour l'animation de brillance ── */
const GLOW_STYLE = `
@keyframes cardGlow {
  0%   { box-shadow: 0 6px 22px rgba(0,0,0,0.45), 0 0 0px rgba(232,197,71,0); }
  40%  { box-shadow: 0 6px 28px rgba(0,0,0,0.5),  0 0 18px rgba(232,197,71,0.35), 0 0 6px rgba(100,160,255,0.2); }
  70%  { box-shadow: 0 6px 28px rgba(0,0,0,0.5),  0 0 22px rgba(100,160,255,0.3), 0 0 8px rgba(232,197,71,0.2); }
  100% { box-shadow: 0 6px 22px rgba(0,0,0,0.45), 0 0 0px rgba(232,197,71,0); }
}
@keyframes borderGlow {
  0%,100% { border-color: rgba(255,255,255,0.13); }
  50%     { border-color: rgba(232,197,71,0.55); }
}
.sd-card-glow {
  animation: cardGlow 4s ease-in-out infinite, borderGlow 4s ease-in-out infinite;
}
.sd-card-glow:hover {
  animation: none !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.6), 0 0 28px rgba(232,197,71,0.5) !important;
  border-color: rgba(232,197,71,0.7) !important;
  transform: translateY(-3px);
}
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
      {/* Injection CSS globale brillance */}
      <style>{GLOW_STYLE}</style>

      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const Icon     = getIcon(res);
            const label    = CAT_LABEL[res.category] || res.category;
            const cardIdx  = i % RESOURCES.length;
            /* Décalage de l'animation pour que chaque carte brille à un moment différent */
            const glowDelay = `${(cardIdx * 0.9) % 4}s`;

            return (
              <div
                key={`${res.slug}-${i}`}
                onClick={() => setLocation(`/resources/${res.slug}`)}
                className="cursor-pointer sd-card-glow"
                style={{
                  height: CARD_H,
                  marginBottom: CARD_GAP,
                  borderRadius: 16,
                  background: "linear-gradient(160deg, #1e4bb8 0%, #1a3ba0 60%, #152f85 100%)",
                  border: "1.5px solid rgba(255,255,255,0.13)",
                  padding: "14px 14px 12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                  animationDelay: glowDelay,
                  transition: "transform 0.15s",
                }}
              >
                {/* Reflet de brillance dans le coin supérieur gauche */}
                <div style={{
                  position: "absolute", top: -30, left: -30,
                  width: 90, height: 90, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(232,197,71,0.12) 0%, transparent 70%)",
                  pointerEvents: "none", zIndex: 0,
                }} />
                {/* Reflet coin inférieur droit */}
                <div style={{
                  position: "absolute", bottom: -20, right: -20,
                  width: 70, height: 70, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(100,160,255,0.1) 0%, transparent 70%)",
                  pointerEvents: "none", zIndex: 0,
                }} />

                {/* Logos flottants */}
                <FloatingLogos cardIndex={cardIdx} />

                {/* Contenu principal */}
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>

                  {/* HEADER */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
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
