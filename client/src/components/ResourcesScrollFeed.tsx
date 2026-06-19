import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RESOURCES } from "@/data/resources";
import { BookOpen, ArrowRight } from "lucide-react";

const CARD_HEIGHT = 110; // px par carte
const GAP = 12;
const SPEED = 0.5; // px/frame
const VISIBLE_CARDS = 5;

const CATEGORY_COLORS: Record<string, string> = {
  starter:       "bg-blue-50 border-blue-200 text-blue-800",
  gestion:       "bg-amber-50 border-amber-200 text-amber-800",
  developpement: "bg-green-50 border-green-200 text-green-800",
  difficulte:    "bg-red-50 border-red-200 text-red-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  starter:       "Je me lance",
  gestion:       "Je gère",
  developpement: "Je développe",
  difficulte:    "Difficulté",
};

export function ResourcesScrollFeed() {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef    = useRef(0);
  const rafRef       = useRef<number>(0);
  const [paused, setPaused] = useState(false);

  // Tripler les ressources pour un défilement infini fluide
  const items = [...RESOURCES, ...RESOURCES, ...RESOURCES];
  const totalH = RESOURCES.length * (CARD_HEIGHT + GAP);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function tick() {
      if (!paused) {
        offsetRef.current += SPEED;
        if (offsetRef.current >= totalH) offsetRef.current -= totalH;
        if (el) el.style.transform = `translateY(-${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, totalH]);

  return (
    <div
      className="fixed left-0 top-1/2 -translate-y-1/2 z-30 w-[210px] hidden xl:flex flex-col"
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="bg-[#001a3d] text-white px-3 py-2 rounded-tr-xl flex items-center gap-2 shadow-lg">
        <BookOpen className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
        <span className="text-xs font-semibold tracking-wide uppercase">Ressources</span>
      </div>

      {/* Fenêtre de défilement */}
      <div
        className="overflow-hidden shadow-xl rounded-br-xl border-r border-b border-[#001a3d]/10"
        style={{ height: VISIBLE_CARDS * (CARD_HEIGHT + GAP) - GAP, background: "rgba(255,255,255,0.97)" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={containerRef} style={{ willChange: "transform" }}>
          {items.map((res, i) => {
            const colorClass = CATEGORY_COLORS[res.category] || "bg-gray-50 border-gray-200 text-gray-700";
            const catLabel   = CATEGORY_LABELS[res.category] || res.category;
            return (
              <div
                key={`${res.slug}-${i}`}
                onClick={() => setLocation(`/resources/${res.slug}`)}
                className={`cursor-pointer mx-2 mt-0 mb-0 border rounded-lg px-3 py-2.5 hover:shadow-md transition-shadow group ${colorClass}`}
                style={{ height: CARD_HEIGHT, marginBottom: GAP, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{catLabel}</span>
                  <p className="text-xs font-bold text-[#001a3d] leading-tight mt-0.5 line-clamp-2 group-hover:text-[#003d99]">
                    {res.title}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-gray-500 line-clamp-1">{res.summary?.slice(0, 55)}…</p>
                  <ArrowRight className="w-3 h-3 text-[#D4AF37] flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer lien */}
      <button
        onClick={() => setLocation("/resources")}
        className="bg-[#D4AF37] text-[#001a3d] text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-br-xl hover:bg-[#c49c2a] transition-colors text-left"
      >
        Toutes les fiches →
      </button>
    </div>
  );
}
