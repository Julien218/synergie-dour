import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import {
  Rocket, Building2, Calculator, FileText, Megaphone,
  TrendingUp, ShieldAlert, BookOpen, Landmark, Briefcase
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  "creer-activite-independant":    Rocket,
  "personne-physique-societe":     Building2,
  "cotisations-sociales":          Calculator,
  "tva-independant":               FileText,
  "marketing-local":               Megaphone,
  "reforme-fiscale":               TrendingUp,
  starter:                         Rocket,
  gestion:                         Calculator,
  developpement:                   Megaphone,
  difficulte:                      ShieldAlert,
};

function getIcon(res: { slug: string; category: string }): React.ElementType {
  return ICON_MAP[res.slug] || ICON_MAP[res.category] || BookOpen;
}

// Badges pills — style identique à "Gratuit" / "Publication rapide" de la carte référence
const BADGE: Record<string, { label: string; bg: string }> = {
  starter:       { label: "Je me lance",   bg: "rgba(255,255,255,0.18)" },
  gestion:       { label: "Je gère",       bg: "rgba(255,255,255,0.18)" },
  developpement: { label: "Je développe",  bg: "rgba(255,255,255,0.18)" },
  difficulte:    { label: "Difficulté",    bg: "rgba(220,30,30,0.35)"   },
};

const CARD_H   = 190;
const CARD_GAP = 14;
const SPEED    = 0.45;
const N_CARDS  = 4;

export function ResourcesScrollFeed() {
  const [, setLocation] = useLocation();
  const wrapRef   = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef<number>(0);
  const [paused, setPaused] = useState(false);

  const items = [...RESOURCES, ...RESOURCES, ...RESOURCES];
  const loopH  = RESOURCES.length * (CARD_H + CARD_GAP);
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
      className="fixed left-3 top-1/2 -translate-y-1/2 z-30 hidden xl:block"
      style={{ width: 240 }}
    >
      <div
        style={{ height: windowH, overflow: "hidden", borderRadius: 4 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const badge = BADGE[res.category] || { label: res.category, bg: "rgba(255,255,255,0.18)" };
            const Icon  = getIcon(res);

            return (
              <div
                key={`${res.slug}-${i}`}
                onClick={() => setLocation(`/resources/${res.slug}`)}
                className="cursor-pointer"
                style={{
                  height: CARD_H,
                  marginBottom: CARD_GAP,
                  borderRadius: 18,
                  // Fond bleu royal uni — identique à la carte référence
                  background: "#1a3ba0",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
                  padding: "16px 15px 14px 15px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: "transform 0.15s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = "translateY(-3px)";
                  el.style.boxShadow = "0 10px 32px rgba(0,0,0,0.55)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.45)";
                }}
              >
                {/* Header : icône + titre ambre */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {/* Cercle icône — fond sombre avec icône ambre */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(0,20,60,0.55)",
                    border: "1.5px solid rgba(232,197,71,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} color="#E8C547" strokeWidth={2} />
                  </div>

                  {/* Titre — ambre gras, comme "Local commercial à louer ?" */}
                  <p style={{
                    color: "#E8C547",
                    fontWeight: 700,
                    fontSize: 13.5,
                    lineHeight: 1.3,
                    margin: 0,
                    flex: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {res.title}
                  </p>
                </div>

                {/* Sous-titre / description — blanc */}
                <p style={{
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 11,
                  lineHeight: 1.45,
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {res.description || "Fiche pratique pour les indépendants de Dour."}
                </p>

                {/* Badges pills — style "Gratuit" / "Publication rapide" */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    background: badge.bg,
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}>
                    {badge.label}
                  </span>
                  <span style={{
                    background: "rgba(255,255,255,0.18)",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}>
                    Gratuit
                  </span>
                </div>

                {/* Bouton jaune arrondi — style "Déposer mon annonce →" */}
                <div style={{
                  background: "#E8C547",
                  borderRadius: 50,
                  padding: "7px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: "auto",
                }}>
                  <span style={{
                    color: "#001a3d",
                    fontWeight: 700,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}>
                    Lire la fiche →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton "Toutes les fiches" */}
      <button
        onClick={() => setLocation("/resources")}
        style={{
          marginTop: 10, width: "100%",
          background: "#E8C547",
          border: "none",
          borderRadius: 50,
          padding: "8px 0",
          color: "#001a3d",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.05em",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        Toutes les fiches ›
      </button>
    </div>
  );
}
