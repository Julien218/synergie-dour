import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";

// Couleurs de fond par catégorie — style carte flottante
const CARD_BG: Record<string, string> = {
  starter:       "from-[#001a3d] to-[#003d99]",
  gestion:       "from-[#7a3f00] to-[#D4AF37]",
  developpement: "from-[#014421] to-[#1a7a3f]",
  difficulte:    "from-[#6b0000] to-[#c0392b]",
};

const CARD_BADGE: Record<string, string> = {
  starter:       "bg-blue-400/20 text-blue-200 border-blue-400/30",
  gestion:       "bg-amber-400/20 text-amber-100 border-amber-400/30",
  developpement: "bg-green-400/20 text-green-100 border-green-400/30",
  difficulte:    "bg-red-400/20 text-red-100 border-red-400/30",
};

const CAT_LABEL: Record<string, string> = {
  starter:       "Je me lance",
  gestion:       "Je gère",
  developpement: "Je développe",
  difficulte:    "Difficulté",
};

const CARD_H   = 140;  // hauteur de chaque carte (px)
const CARD_GAP = 14;   // espace entre cartes (px)
const SPEED    = 0.55; // vitesse défilement px/frame
const CARDS_VISIBLE = 5;

export function ResourcesScrollFeed() {
  const [, setLocation] = useLocation();
  const wrapRef  = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef   = useRef<number>(0);
  const [hovered, setHovered] = useState(false);

  // On triple pour le défilement infini
  const items = [...RESOURCES, ...RESOURCES, ...RESOURCES];
  const loopH = RESOURCES.length * (CARD_H + CARD_GAP);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function tick() {
      if (!hovered) {
        offsetRef.current += SPEED;
        if (offsetRef.current >= loopH) offsetRef.current -= loopH;
        if (el) el.style.transform = `translateY(-${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hovered, loopH]);

  const windowH = CARDS_VISIBLE * (CARD_H + CARD_GAP) - CARD_GAP;

  return (
    <div
      className="fixed left-3 top-1/2 -translate-y-1/2 z-30 hidden xl:block"
      style={{ width: 200 }}
    >
      {/* Fenêtre de défilement — masque le débordement */}
      <div
        style={{ height: windowH, overflow: "hidden" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div ref={wrapRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const bg    = CARD_BG[res.category]   || "from-[#001a3d] to-[#002966]";
            const badge = CARD_BADGE[res.category] || "bg-white/10 text-white/80 border-white/20";
            const cat   = CAT_LABEL[res.category]  || res.category;

            return (
              <div
                key={`${res.slug}-${i}`}
                onClick={() => setLocation(`/resources/${res.slug}`)}
                className={`cursor-pointer rounded-2xl bg-gradient-to-br ${bg} shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden border border-white/10`}
                style={{
                  height: CARD_H,
                  marginBottom: CARD_GAP,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Badge catégorie */}
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${badge}`}
                >
                  {cat}
                </span>

                {/* Titre */}
                <p className="text-white font-bold text-[11px] leading-tight line-clamp-3 mt-1">
                  {res.title}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-white/50 text-[9px]">Synergie Dour</span>
                  <span className="text-[#D4AF37] text-[11px] font-bold">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lien tout voir */}
      <button
        onClick={() => setLocation("/resources")}
        className="mt-2 w-full text-center text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#001a3d] hover:bg-[#002966] transition-colors rounded-xl py-2 shadow-md border border-[#D4AF37]/20"
      >
        Toutes les fiches ›
      </button>
    </div>
  );
}
