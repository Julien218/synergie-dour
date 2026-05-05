import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Search, BookOpen } from "lucide-react";
import {
  RESOURCES,
  RESOURCE_CATEGORIES,
  searchResources,
  type ResourceCategory,
} from "@/data/resources";

const categoryStyles: Record<ResourceCategory, { bg: string; text: string; border: string; badge: string }> = {
  starter: {
    bg: "bg-teal-50",
    text: "text-teal-900",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-900 border-teal-300",
  },
  gestion: {
    bg: "bg-blue-50",
    text: "text-blue-900",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-900 border-blue-300",
  },
  developpement: {
    bg: "bg-purple-50",
    text: "text-purple-900",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-900 border-purple-300",
  },
  difficulte: {
    bg: "bg-orange-50",
    text: "text-orange-900",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-900 border-orange-300",
  },
};

export default function Resources() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | "all">("all");

  const filteredResources = useMemo(() => {
    let result = searchResources(query);
    if (activeCategory !== "all") {
      result = result.filter((r) => r.category === activeCategory);
    }
    return result;
  }, [query, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour
          </Button>
          <div className="flex items-start gap-4">
            <BookOpen className="w-10 h-10 text-[#D4AF37] mt-1" />
            <div>
              <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">Ressources</h1>
              <p className="text-[#F0E68C] max-w-2xl">
                Toute l'information administrative, fiscale et sociale dont vous avez besoin,
                centralisée et vérifiée. Plus besoin de chercher sur 20 sites différents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar + filters */}
      <div className="bg-white/95 border-b border-amber-100 py-6 px-4 sticky top-16 z-40">
        <div className="container mx-auto max-w-6xl space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Rechercher une démarche, une aide, un mot-clé..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 border-amber-200 focus-visible:ring-[#D4AF37]"
              aria-label="Rechercher une ressource"
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === "all"
                  ? "bg-[#001a3d] text-white border-[#001a3d]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-[#001a3d]"
              }`}
            >
              Tout ({RESOURCES.length})
            </button>
            {(Object.keys(RESOURCE_CATEGORIES) as ResourceCategory[]).map((cat) => {
              const count = RESOURCES.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    activeCategory === cat
                      ? "bg-[#001a3d] text-white border-[#001a3d]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#001a3d]"
                  }`}
                >
                  {RESOURCE_CATEGORIES[cat].label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Aucune fiche ne correspond à votre recherche.
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("all");
                }}
                className="text-[#D4AF37]"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((resource) => {
                const styles = categoryStyles[resource.category];
                return (
                  <Card
                    key={resource.slug}
                    onClick={() => setLocation(`/resources/${resource.slug}`)}
                    className={`cursor-pointer hover:shadow-lg transition-shadow border-amber-100 overflow-hidden flex flex-col`}
                  >
                    <div className={`h-2 ${styles.bg} border-b ${styles.border}`} aria-hidden="true" />
                    <CardHeader className="flex-grow">
                      <Badge variant="outline" className={`w-fit mb-2 ${styles.badge}`}>
                        {RESOURCE_CATEGORIES[resource.category].label}
                      </Badge>
                      <CardTitle className="text-[#001a3d] line-clamp-2">
                        {resource.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {resource.summary}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Vérifié le {formatDate(resource.verifiedAt)}</span>
                        <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer footer */}
      <div className="bg-amber-50 border-t border-amber-200 py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-sm text-gray-700">
            <strong className="text-[#001a3d]">Avertissement.</strong> Les informations
            publiées ici sont des synthèses à titre informatif. Elles ne remplacent ni un
            conseil personnalisé, ni la consultation des sources officielles. Pour votre
            situation propre, contactez votre comptable, votre caisse d'assurances sociales
            ou un conseiller juridique.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
}
