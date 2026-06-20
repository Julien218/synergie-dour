import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import {
  Rocket, Building2, Calculator, FileText, Megaphone,
  TrendingUp, ShieldAlert, BookOpen, Landmark, Briefcase
} from "lucide-react";

// Icône par slug ou catégorie
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

// Badges — couleurs site officiel Navy/Steel, accent or discret
const BADGE: Record<string, { label: string; bg: string; text: string }> = {
  starter:       { label: "JE ME LANCE",  bg: "rgba(0,61,153,0.6)",  text: "#a8c4ff" },
  gestion:       { label: "JE GÈRE",      bg: "rgba(0,26,61,0.8)",   text: "#8ab4e8" },
  developpement: { label: "JE DÉVELOPPE", bg: "rgba(0,40,100,0.7)",  text: "#b0ccf5" },
  difficulte:    { label: "DIFFICULTÉ",   bg: "rgba(80,0,0,0.6)",    text: "#ffaaaa" },
};

// Couleur icône cercle par catégorie — navy/steel principalement, or en accent discret
const ICON_RING: Record<string, { bg: string; shadow: string; color: string }> = {
  starter:       { bg: "linear-gradient(135deg, #003d99 0%, #001a3d 100%)", shadow: "0 0 10px rgba(0,61,153,0.7)", color: "#E8C547" },
  gestion:       { bg: "linear-gradient(135deg, #001a3d 0%, #003060 100%)", shadow: "0 0 10px rgba(0,26,61,0.8)",  color: "#8ab4e8" },
  developpement: { bg: "linear-gradient(135deg, #002266 0%, #003d99 100%)", shadow: "0 0 10px rgba(0,34,102,0.7)", color: "#E8C547" },
  difficulte:    { bg: "linear-gradient(135deg, #5a0000 0%, #990000 100%)", shadow: "0 0 10px rgba(153,0,0,0.5)",  color: "#ffaaaa" },
};

const CARD_H   = 155;
const CARD_GAP = 14;
const SPEED    = 0.45;
const N_CARDS  = 5;

export function ResourcesScrollFeed() {
  const [, setLocation] = useLocation();
  const wrapRef   = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef    = useRef<number>(0);
  const [paused, setPaused] = useState(false);

  const items = [...RESOURCES, ...RESOURCES, ...RESOURCES];
  const loopH = RESOURCES.length * (CARD_H + CARD_GAP);
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
      style={{ width: 228 }}
    >
      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const badge = BADGE[res.category] || { label: res.category.toUpperCase(), bg: "rgba(0,26,61,0.8)", text: "#8ab4e8" };
            const ring  = ICON_RING[res.category] || ICON_RING.gestion;
            const Icon  = getIcon(res);

            return (
              <div
                key={`${res.slug}-${i}`}
                onClick={() => setLocation(`/resources/${res.slug}`)}
                className="cursor-pointer relative overflow-hidden"
                style={{
                  height: CARD_H,
                  marginBottom: CARD_GAP,
                  borderRadius: 14,
                  // Fond principal : dégradé navy officiel
                  background: "linear-gradient(145deg, #001533 0%, #002060 55%, #001a3d 100%)",
                  border: "1px solid rgba(168,196,255,0.2)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(168,196,255,0.08)",
                  padding: "13px 13px 11px 13px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "box-shadow 0.2s, transform 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 8px 28px rgba(0,0,0,0.65), 0 0 16px rgba(0,61,153,0.3), inset 0 1px 0 rgba(168,196,255,0.15)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(168,196,255,0.08)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Lueur bleue décorative background */}
                <div style={{
                  position: "absolute", right: -15, top: -15,
                  width: 70, height: 70, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(0,61,153,0.25) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                {/* Header : icône + badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {/* Cercle icône — navy/steel, couleur du site */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: ring.bg,
                    boxShadow: ring.shadow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(168,196,255,0.25)",
                  }}>
                    <Icon size={17} color={ring.color} strokeWidth={2} />
                  </div>

                  {/* Badge catégorie */}
                  <span style={{
                    fontSize: 8.5, fontWeight: 700, letterSpacing: "0.07em",
                    padding: "3px 8px", borderRadius: 20,
                    background: badge.bg, color: badge.text,
                    border: "1px solid rgba(168,196,255,0.15)",
                    whiteSpace: "nowrap",
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Titre */}
                <p style={{
                  color: "#f0f4ff",
                  fontWeight: 700,
                  fontSize: 12.5,
                  lineHeight: 1.35,
                  marginTop: 8,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {res.title}
                </p>

                {/* Footer — "Synergie Dour" steel blue + flèche accent or */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ color: "#8ab4e8", fontSize: 9.5, fontWeight: 500, letterSpacing: "0.02em" }}>
                    Synergie Dour
                  </span>
                  <span style={{ color: "#E8C547", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton tout voir — couleurs officielles */}
      <button
        onClick={() => setLocation("/resources")}
        style={{
          marginTop: 10, width: "100%",
          background: "linear-gradient(135deg, #001a3d 0%, #003d99 100%)",
          border: "1px solid rgba(168,196,255,0.25)",
          borderRadius: 10, padding: "7px 0",
          color: "#E8C547", fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        }}
      >
        Toutes les fiches ›
      </button>
    </div>
  );
}
