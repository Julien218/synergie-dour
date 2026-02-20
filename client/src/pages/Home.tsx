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
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  Synergie Dour
                </h1>
                <p className="text-xl text-blue-100">Commerçants & Indépendants Réunis</p>
              </div>
              <p className="text-lg text-blue-50 leading-relaxed">
                Découvrez une plateforme dédiée à la valorisation du commerce local à Dour. Connectez-vous avec les commerçants de votre région et participez à la dynamique économique locale.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  onClick={() => setLocation("/merchants")}
                  className="bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
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
              <div className="w-64 h-64 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full opacity-20 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12 px-4 border-b border-amber-200">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">{merchants.length}+</div>
              <p className="text-gray-600">Commerçants Membres</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-900 mb-2">{events.length}</div>
              <p className="text-gray-600">Événements Organisés</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">100%</div>
              <p className="text-gray-600">Engagement Local</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-blue-900 mb-6">À Propos de Synergie Dour</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Synergie Dour est une association dédiée à la promotion et au développement du commerce local dans la commune de Dour. Notre mission est de créer une synergie entre les commerçants et indépendants pour renforcer le tissu économique local.
                </p>
                <p>
                  Nous croyons en la force de la collaboration et en l'importance de soutenir les entreprises locales. Grâce à cette plateforme, nous facilitons les échanges, partageons les bonnes pratiques et organisons des événements fédérateurs.
                </p>
                <p>
                  Engagés dans le développement durable, nous valorisons les initiatives écologiques et responsables de nos membres.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <CardHeader>
                  <Store className="w-8 h-8 text-amber-600 mb-2" />
                  <CardTitle className="text-blue-900">Commerce Local</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Soutenir les commerces de proximité et dynamiser l'économie locale.
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <Users className="w-8 h-8 text-blue-900 mb-2" />
                  <CardTitle className="text-blue-900">Collaboration</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Créer des synergies entre commerçants pour une meilleure visibilité.
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                <CardHeader>
                  <Zap className="w-8 h-8 text-green-600 mb-2" />
                  <CardTitle className="text-blue-900">Durabilité</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Promouvoir des pratiques commerciales durables et responsables.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Merchants */}
      {merchants.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-bold text-blue-900">Nos Commerçants</h2>
              <Button 
                onClick={() => setLocation("/merchants")}
                variant="outline" 
                className="border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                Voir l'Annuaire Complet
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.slice(0, 6).map((merchant) => (
                <div 
                  key={merchant.id} 
                  onClick={() => setLocation(`/merchants/${merchant.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-amber-100">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-blue-900">{merchant.businessName}</CardTitle>
                          <CardDescription className="text-amber-600">
                            {merchant.businessCategory}
                          </CardDescription>
                        </div>
                        {merchant.isVerified && (
                          <Badge className="bg-green-500 text-white ml-2">Vérifié</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{merchant.description}</p>
                      <div className="space-y-2 text-sm text-gray-500">
                        {merchant.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-600" />
                            <span>{merchant.address}</span>
                          </div>
                        )}
                        {merchant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-amber-600" />
                            <span>{merchant.phone}</span>
                          </div>
                        )}
                        {merchant.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-amber-600" />
                            <span className="truncate">{merchant.email}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest News */}
      {news.length > 0 && (
        <section className="py-16 px-4 bg-blue-50">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-bold text-blue-900">Actualités</h2>
              <Button 
                onClick={() => setLocation("/news")}
                variant="outline" 
                className="border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                Toutes les Actualités
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.slice(0, 3).map((article) => (
                <div 
                  key={article.id} 
                  onClick={() => setLocation(`/news/${article.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-amber-100 overflow-hidden">
                    {article.image && (
                      <div className="h-48 bg-gradient-to-br from-amber-200 to-blue-200 overflow-hidden">
                        <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-blue-900 line-clamp-2">{article.title}</CardTitle>
                      <CardDescription>
                        {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('fr-FR') : 'À venir'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">{article.excerpt || article.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-bold mb-6">Prêt à Rejoindre Synergie Dour ?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Que vous soyez commerçant, artisan ou indépendant, rejoignez notre communauté et bénéficiez de nos services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Button 
                size="lg" 
                onClick={() => setLocation("/dashboard")}
                className="bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
              >
                Accéder au Tableau de Bord
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            ) : (
              <Button 
                size="lg" 
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
              >
                Se Connecter
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            )}
            <Button 
              size="lg" 
              onClick={() => setLocation("/membership")}
              variant="outline" 
              className="border-white text-white hover:bg-white/10"
            >
              Demander l'Adhésion
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
