import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Store,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  BookOpen,
  Bell,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { RESOURCES } from "@/data/resources";
import { LocalFlottant } from "@/components/LocalFlottant";
import { LiveFeedCarousel } from "@/components/LiveFeedCarousel";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: merchants = [] } = trpc.merchants.list.useQuery();
  const { data: news = [] } = trpc.news.list.useQuery();
  const { data: events = [] } = trpc.events.list.useQuery();

  return (
    <>
    <div className="min-h-screen bg-background">
      {/* Hero Section — repositionné sur la vraie mission */}
      <section className="relative bg-gradient-to-br from-[#001a3d] via-[#003d99] to-[#001a3d] text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight text-[#D4AF37]">
                  Synergie Dour
                </h1>
                <p className="text-xl text-[#D4AF37]">
                  L'info utile pour les indépendants de Dour, en un seul endroit.
                </p>
              </div>
              <p className="text-lg text-blue-50 leading-relaxed">
                Lois, démarches, aides, primes, contacts locaux : centralisés, vérifiés
                chaque semaine, et accessibles sans naviguer entre 20 sites différents.
                Pour les indépendants, par leur ASBL locale.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => setLocation("/resources")}
                  className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
                >
                  <BookOpen className="mr-2 w-5 h-5" />
                  Consulter les ressources
                </Button>
                <Button
                  size="lg"
                  onClick={() => setLocation("/membership")}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  Devenir membre
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div
                className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                style={{ minHeight: "340px", background: "linear-gradient(135deg, #001a3d 0%, #003d99 50%, #001a3d 100%)" }}
              >
                {/* Cercles animés en arrière-plan */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "radial-gradient(circle at 30% 40%, rgba(212,175,55,0.18) 0%, transparent 60%), radial-gradient(circle at 75% 65%, rgba(0,100,255,0.18) 0%, transparent 55%)",
                  animation: "pulse 4s ease-in-out infinite",
                }} />
                {/* Anneau animé */}
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "260px", height: "260px",
                  border: "2px solid rgba(212,175,55,0.3)",
                  borderRadius: "50%",
                  animation: "spin 12s linear infinite",
                }} />
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "200px", height: "200px",
                  border: "1.5px solid rgba(212,175,55,0.2)",
                  borderRadius: "50%",
                  animation: "spin 8s linear infinite reverse",
                }} />
                {/* Contenu central */}
                <div style={{
                  position: "relative", zIndex: 10,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  minHeight: "340px", padding: "40px 30px", textAlign: "center",
                }}>
                  {/* Logo/icône */}
                  <div style={{
                    width: "72px", height: "72px",
                    background: "linear-gradient(135deg, #D4AF37, #F0E68C)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "20px",
                    boxShadow: "0 0 30px rgba(212,175,55,0.4)",
                    fontSize: "32px",
                  }}>🏛️</div>
                  {/* Titre animé */}
                  <h2 style={{
                    color: "#D4AF37",
                    fontSize: "clamp(1.4rem, 4vw, 2rem)",
                    fontWeight: "800",
                    letterSpacing: "0.05em",
                    margin: "0 0 10px",
                    textShadow: "0 2px 12px rgba(212,175,55,0.4)",
                    animation: "fadeInUp 1s ease both",
                  }}>SYNERGIE DOUR</h2>
                  <p style={{
                    color: "rgba(240,230,140,0.85)",
                    fontSize: "clamp(0.8rem, 2vw, 1rem)",
                    fontWeight: "500",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: "0 0 20px",
                    animation: "fadeInUp 1.2s ease both",
                  }}>Commerçants &amp; Indépendants</p>
                  <div style={{
                    display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center",
                  }}>
                    {["Fédérer", "Soutenir", "Développer"].map((w) => (
                      <span key={w} style={{
                        background: "rgba(212,175,55,0.15)",
                        border: "1px solid rgba(212,175,55,0.35)",
                        color: "#D4AF37",
                        borderRadius: "20px",
                        padding: "4px 14px",
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        letterSpacing: "0.05em",
                      }}>{w}</span>
                    ))}
                  </div>
                  {/* Ligne décorative */}
                  <div style={{
                    width: "60px", height: "2px",
                    background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
                    margin: "20px auto 0",
                  }} />
                </div>
                {/* CSS animations inline */}
                <style>{`
                  @keyframes spin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
                  @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                  @keyframes pulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
                `}</style>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Engagements — la confiance avant les chiffres */}
      <section className="bg-amber-50/50 border-b border-amber-200 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-bold text-[#001a3d] mb-1">Information vérifiée</h3>
                <p className="text-sm text-gray-700">
                  Chaque fiche porte sa date de vérification et un lien vers la source officielle.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-bold text-[#001a3d] mb-1">Mise à jour hebdomadaire</h3>
                <p className="text-sm text-gray-700">
                  Un agent vérifie les sources officielles chaque semaine ; les changements
                  importants sont validés par le bureau de l'ASBL.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-bold text-[#001a3d] mb-1">Ancré à Dour</h3>
                <p className="text-sm text-gray-700">
                  Taxes communales, contacts locaux et écosystème du Cœur du Hainaut intégrés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white/95 py-12 px-4 border-b border-amber-200">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#D4AF37] mb-2">{RESOURCES.length}+</div>
              <p className="text-gray-600">Fiches d'information</p>
            </div>
            <div className="text-center">
              {merchants.length > 0 ? (
                <>
                  <div className="text-4xl font-bold text-[#001a3d] mb-2">{merchants.length}</div>
                  <p className="text-gray-600">Commerçants membres</p>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-[#001a3d] mb-2">🚀</div>
                  <p className="text-gray-600">Membres en cours d'inscription</p>
                </>
              )}
            </div>
            <div className="text-center">
              {events.length > 0 ? (
                <>
                  <div className="text-4xl font-bold text-[#D4AF37] mb-2">{events.length}</div>
                  <p className="text-gray-600">Événements à venir</p>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-[#D4AF37] mb-2">📅</div>
                  <p className="text-gray-600">Événements à venir</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Feed Carousel — Actualités + Locaux + Ressources */}
      <LiveFeedCarousel />

      {/* Featured Resources — le cœur de la proposition de valeur */}
      <section className="py-16 px-4 bg-gradient-to-b from-white/95 to-gray-50/95">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[#001a3d] mb-2">Ressources à la une</h2>
              <p className="text-gray-600">
                Les démarches les plus consultées par les indépendants de Dour
              </p>
            </div>
            <Button
              onClick={() => setLocation("/resources")}
              variant="outline"
              className="border-[#D4AF37] text-[#001a3d] hover:bg-[#D4AF37]/10"
            >
              Voir toutes les fiches
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RESOURCES.slice(0, 3).map((resource) => (
              <Card
                key={resource.slug}
                onClick={() => setLocation(`/resources/${resource.slug}`)}
                className="cursor-pointer hover:shadow-lg transition-shadow border-amber-100 bg-white/95 flex flex-col"
              >
                <CardHeader className="flex-grow">
                  <Badge variant="outline" className="w-fit mb-2 bg-amber-50 text-amber-900 border-amber-300">
                    {categoryLabel(resource.category)}
                  </Badge>
                  <CardTitle className="text-[#001a3d] line-clamp-2">{resource.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{resource.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Vérifié récemment</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Merchants */}
      {merchants.length > 0 && (
        <section className="py-16 px-4 bg-white/95">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-[#001a3d] mb-2">Nos commerçants</h2>
            <p className="text-gray-600 mb-8">Découvrez les commerces membres de l'association</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.slice(0, 3).map((merchant) => (
                <Card
                  key={merchant.id}
                  className="hover:shadow-lg transition-shadow border-[#D4AF37] cursor-pointer bg-white/95"
                  onClick={() => setLocation("/merchants")}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#001a3d]">{merchant.businessName}</CardTitle>
                    <CardDescription className="text-[#D4AF37]">
                      {merchant.businessCategory}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {merchant.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-[#D4AF37]" />
                        {merchant.phone}
                      </div>
                    )}
                    {merchant.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-[#D4AF37]" />
                        {merchant.email}
                      </div>
                    )}
                    {merchant.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-[#D4AF37]" />
                        {merchant.address}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={() => setLocation("/merchants")}
                variant="outline"
                className="border-[#D4AF37] text-[#001a3d] hover:bg-[#D4AF37]/10"
              >
                Voir l'annuaire complet
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Adhésion */}
      <section className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Bell className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4 text-[#D4AF37]">
            Devenez membre de Synergie Dour
          </h2>
          <p className="text-lg text-[#F0E68C] mb-2 max-w-2xl mx-auto">
            Soutenez l'ASBL, accédez aux services exclusifs membres
            (alertes personnalisées, accompagnement, événements réservés) et faites partie
            d'un réseau d'indépendants engagés dans le commerce local.
          </p>
          <p className="text-sm text-blue-100 mb-8">
            L'information de base reste accessible à tous, gratuitement.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/membership")}
            className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
          >
            Demander l'adhésion
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
    <LocalFlottant />
    </>
  );
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    starter: "Je me lance",
    gestion: "Je gère",
    developpement: "Je développe",
    difficulte: "Difficulté",
  };
  return labels[category] ?? category;
}

