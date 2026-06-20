import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import {
  Rocket, Building2, Calculator, FileText, Megaphone,
  TrendingUp, ShieldAlert, BookOpen, Banknote, Briefcase
} from "lucide-react";

// Icône par slug ou catégorie
const ICON_MAP: Record<string, React.ElementType> = {
  "creer-activite-independant":    Rocket,
  "personne-physique-societe":     Building2,
  "cotisations-sociales":          Calculator,
  "tva-independant":               FileText,
  "marketing-local":               Megaphone,
  "reforme-fiscale":               TrendingUp,
  "difficulte":                    ShieldAlert,
  starter:                         Rocket,
  gestion:                         Calculator,
  developpement:                   Megaphone,
};

function getIcon(res: { slug: string; category: string }): React.ElementType {
  if (ICON_MAP[res.slug]) return ICON_MAP[res.slug];
  return ICON_MAP[res.category] || BookOpen;
}

// Badge catégorie
const BADGE: Record<string, { label: string; bg: string; text: string }> = {
  starter:       { label: "JE ME LANCE",   bg: "#7c4a00", text: "#f5c842" },
  gestion:       { label: "JE GÈRE",       bg: "#1a3a7c", text: "#a8c4ff" },
  developpement: { label: "JE DÉVELOPPE",  bg: "#3a1a7c", text: "#c8a4ff" },
  difficulte:    { label: "DIFFICULTÉ",    bg: "#7c1a1a", text: "#ffaaaa" },
};

const CARD_H   = 158;
const CARD_GAP = 16;
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
      style={{ width: 230 }}
    >
      {/* Fenêtre de défilement */}
      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const badge = BADGE[res.category] || { label: res.category.toUpperCase(), bg: "#001a3d", text: "#D4AF37" };
            const Icon  = getIcon(res);

            return (
              <div
                key={`${res.slug}-${i}`}
                onClick={() => setLocation(`/resources/${res.slug}`)}
                className="cursor-pointer relative overflow-hidden"
                style={{
                  height: CARD_H,
                  marginBottom: CARD_GAP,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #001533 0%, #002266 60%, #001a3d 100%)",
                  border: "1.5px solid rgba(212,175,55,0.35)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.1)",
                  padding: "14px 14px 12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.25), inset 0 1px 0 rgba(212,175,55,0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 4px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.1)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Lueur décorative bleue en fond */}
                <div style={{
                  position: "absolute", right: -20, top: -20,
                  width: 80, height: 80, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(30,80,200,0.3) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                {/* Header : icône + badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Cercle icône doré lumineux */}
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: "radial-gradient(circle at 40% 35%, #f5c842 0%, #D4AF37 40%, #a07800 100%)",
                    boxShadow: "0 0 12px rgba(212,175,55,0.6), 0 0 4px rgba(212,175,55,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} color="#001a3d" strokeWidth={2.2} />
                  </div>

                  {/* Badge catégorie */}
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "3px 8px", borderRadius: 20,
                    background: badge.bg, color: badge.text,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Titre */}
                <p style={{
                  color: "#ffffff", fontWeight: 700, fontSize: 13,
                  lineHeight: 1.35, marginTop: 8,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {res.title}
                </p>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ color: "#D4AF37", fontSize: 10, fontWeight: 500 }}>
                    Synergie Dour
                  </span>
                  <span style={{
                    color: "#D4AF37", fontSize: 16, fontWeight: 700, lineHeight: 1,
                  }}>
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton tout voir */}
      <button
        onClick={() => setLocation("/resources")}
        style={{
          marginTop: 10, width: "100%",
          background: "linear-gradient(135deg, #001a3d 0%, #002266 100%)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderRadius: 12, padding: "8px 0",
          color: "#D4AF37", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        Toutes les fiches ›
      </button>
    </div>
  );
}
