import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Newspaper, Building2, BookOpen, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { RESOURCES } from "@/data/resources";

type FeedItem = {
  id: string;
  type: "news" | "local" | "ressource";
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  href: string;
  date?: string;
};

export function LiveFeedCarousel() {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: news = [] } = trpc.news.list.useQuery();
  const { data: locaux = [] } = (trpc as any).locaux?.listPublished?.useQuery?.() ?? { data: [] };

  // Construire la liste mixée
  const items: FeedItem[] = [
    // News
    ...news.slice(0, 4).map((n: any) => ({
      id: `news-${n.id}`,
      type: "news" as const,
      title: n.title,
      subtitle: n.excerpt || "Dernière actualité Synergie Dour",
      badge: "Actualité",
      badgeColor: "bg-blue-600",
      icon: <Newspaper className="w-5 h-5" />,
      href: `/news/${n.id}`,
      date: n.publishedAt
        ? new Date(n.publishedAt).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", timeZone: "Europe/Brussels" })
        : undefined,
    })),
    // Locaux
    ...locaux.slice(0, 3).map((l: any) => ({
      id: `local-${l.id}`,
      type: "local" as const,
      title: l.titre || "Local commercial disponible",
      subtitle: [l.village || l.adresse, l.surface ? `${l.surface} m²` : null, l.loyer ? `${l.loyer} €/mois` : null]
        .filter(Boolean)
        .join(" · "),
      badge: "Local à louer",
      badgeColor: "bg-[#D4AF37]",
      icon: <Building2 className="w-5 h-5" />,
      href: "/locaux",
      date: l.createdAt
        ? new Date(l.createdAt).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", timeZone: "Europe/Brussels" })
        : undefined,
    })),
    // Ressources légales (3 premières)
    ...RESOURCES.slice(0, 3).map((r: any) => ({
      id: `res-${r.slug}`,
      type: "ressource" as const,
      title: r.title,
      subtitle: r.summary?.slice(0, 90) + (r.summary?.length > 90 ? "…" : ""),
      badge: "Ressource",
      badgeColor: "bg-emerald-600",
      icon: <BookOpen className="w-5 h-5" />,
      href: `/resources/${r.slug}`,
      date: "Mis à jour",
    })),
  ].slice(0, 10);

  const total = items.length;

  // Auto-scroll
  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, 4000);
  };

  useEffect(() => {
    if (!paused && total > 0) startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, total]);

  const prev = () => {
    setCurrent((c) => (c - 1 + total) % total);
  };
  const next = () => {
    setCurrent((c) => (c + 1) % total);
  };

  if (total === 0) return null;

  // Calculer les indices visibles (sliding window de 3 cards)
  const visibleCount = Math.min(3, total);
  const visibleIndices = Array.from({ length: visibleCount }, (_, i) => (current + i) % total);

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-[#001a3d]/5 to-white/80 overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2
              className="text-2xl font-bold text-[#001a3d]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              En ce moment à Dour
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Actualités · Locaux disponibles · Ressources pour indépendants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { prev(); setPaused(true); }}
              className="w-9 h-9 rounded-full border border-[#001a3d]/20 flex items-center justify-center hover:bg-[#001a3d] hover:text-white transition-all text-[#001a3d]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 tabular-nums">{current + 1} / {total}</span>
            <button
              onClick={() => { next(); setPaused(true); }}
              className="w-9 h-9 rounded-full border border-[#001a3d]/20 flex items-center justify-center hover:bg-[#001a3d] hover:text-white transition-all text-[#001a3d]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {visibleIndices.map((idx, pos) => {
            const item = items[idx];
            return (
              <div
                key={item.id}
                onClick={() => setLocation(item.href)}
                className={`
                  cursor-pointer group relative bg-white rounded-2xl border border-gray-100
                  shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden
                  hover:-translate-y-1
                  ${pos === 0 ? "opacity-100" : pos === 1 ? "opacity-100" : "opacity-70 hidden md:block"}
                `}
              >
                {/* Barre couleur top */}
                <div
                  className={`h-1 w-full ${item.badgeColor}`}
                />
                <div className="p-5">
                  {/* Badge + date */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-white text-xs font-semibold px-2.5 py-1 rounded-full ${item.badgeColor}`}
                    >
                      {item.icon}
                      {item.badge}
                    </span>
                    {item.date && (
                      <span className="text-xs text-gray-400">{item.date}</span>
                    )}
                  </div>

                  {/* Titre */}
                  <h3
                    className="font-bold text-[#001a3d] text-base leading-snug line-clamp-2 mb-2 group-hover:text-[#003d99] transition-colors"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {item.title}
                  </h3>

                  {/* Sous-titre */}
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    {item.subtitle}
                  </p>

                  {/* Lien */}
                  <div className="flex items-center gap-1 text-xs font-semibold text-[#003d99] group-hover:gap-2 transition-all">
                    <span>
                      {item.type === "news" ? "Lire l'article" : item.type === "local" ? "Voir le local" : "Consulter la fiche"}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrent(idx); setPaused(true); }}
              className={`rounded-full transition-all ${
                idx === current
                  ? "w-6 h-2 bg-[#001a3d]"
                  : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
