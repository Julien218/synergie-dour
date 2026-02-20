import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Store, Users, Zap, ArrowRight, MapPin, Phone, Mail } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: merchants = [] } = trpc.merchants.list.useQuery();
  const { data: news = [] } = trpc.news.list.useQuery();
  const { data: events = [] } = trpc.events.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#001a3d] via-[#003d99] to-[#001a3d] text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight text-[#D4AF37]">
                  Synergie Dour
                </h1>
                <p className="text-xl text-[#D4AF37]">Commerçants & Indépendants Réunis</p>
              </div>
              <p className="text-lg text-blue-50 leading-relaxed">
                Découvrez une plateforme dédiée à la valorisation du commerce local à Dour. Connectez-vous avec les commerçants de votre région et participez à la dynamique économique locale.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  onClick={() => setLocation("/merchants")}
                  className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
                >
                  Découvrir l'Annuaire
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => setLocation("/membership")}
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                >
                  Rejoindre l'Association
                </Button>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <img 
                src="/logo-full.png" 
                alt="Synergie Dour" 
                className="h-80 w-80 object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white/95 py-12 px-4 border-b border-[#D4AF37]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#D4AF37] mb-2">{merchants.length}+</div>
              <p className="text-gray-600">Commerçants Membres</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#001a3d] mb-2">{events.length}</div>
              <p className="text-gray-600">Événements Organisés</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#D4AF37] mb-2">100%</div>
              <p className="text-gray-600">Engagement Local</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Merchants */}
      <section className="py-16 px-4 bg-gradient-to-b from-white/95 to-gray-50/95">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-[#001a3d] mb-2">Nos Commerçants</h2>
          <p className="text-gray-600 mb-8">Découvrez les meilleurs commerces de Dour</p>
          
          {merchants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucun commerçant pour le moment. Revenez bientôt !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.slice(0, 3).map((merchant) => (
                <Card 
                  key={merchant.id} 
                  className="hover:shadow-lg transition-shadow border-[#D4AF37] cursor-pointer bg-white/95"
                  onClick={() => setLocation("/merchants")}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#001a3d]">{merchant.businessName}</CardTitle>
                    <CardDescription className="text-[#D4AF37]">{merchant.businessCategory}</CardDescription>
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
          )}
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 px-4 bg-white/95">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-[#001a3d] mb-2">Dernières Actualités</h2>
          <p className="text-gray-600 mb-8">Restez informé des nouvelles de Synergie Dour</p>
          
          {news.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucune actualité pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {news.slice(0, 2).map((article) => (
                <Card 
                  key={article.id}
                  className="hover:shadow-lg transition-shadow border-[#D4AF37] cursor-pointer overflow-hidden bg-white/95"
                  onClick={() => setLocation("/news")}
                >
                  {article.image && (
                    <div className="h-40 bg-gradient-to-br from-[#D4AF37] to-[#001a3d] overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-[#001a3d] line-clamp-2">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 line-clamp-2">{article.excerpt || article.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold mb-4 text-[#D4AF37]">Rejoignez Synergie Dour</h2>
          <p className="text-lg text-[#F0E68C] mb-8 max-w-2xl mx-auto">
            Faites partie de notre communauté de commerçants et indépendants. Ensemble, valorisons le commerce local !
          </p>
          <Button 
            size="lg"
            onClick={() => setLocation("/membership")}
            className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
          >
            Demander l'Adhésion
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
