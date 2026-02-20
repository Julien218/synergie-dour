import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";
import { Users, FileText, Calendar, Store, TrendingUp, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: merchants = [] } = trpc.merchants.list.useQuery();
  const { data: news = [] } = trpc.news.list.useQuery();
  const { data: events = [] } = trpc.events.list.useQuery();

  const isAdmin = user?.role === "admin";
  const isMerchant = user?.role === "user";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, {user?.name || "Utilisateur"} !
          </h1>
          <p className="text-blue-100">
            {isAdmin
              ? "Gérez les commerçants, actualités et événements de Synergie Dour"
              : "Gérez votre profil et votre présence sur Synergie Dour"}
          </p>
        </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Commerçants Totaux</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{merchants.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Membres actifs</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Actualités</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{news.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Articles publiés</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Événements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{events.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Événements organisés</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Taux d'Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">95%</div>
                  <p className="text-xs text-gray-500 mt-1">Très actif</p>
                </CardContent>
              </Card>
            </div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Merchants Management */}
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-amber-600" />
                      <CardTitle>Gestion des Commerçants</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Gérez les profils et validations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {merchants.length} commerçants enregistrés sur la plateforme.
                  </p>
                  <Link href="/dashboard/merchants">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Gérer les Commerçants
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* News Management */}
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-600" />
                      <CardTitle>Actualités</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Créer et publier des actualités</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {news.length} articles publiés. Publiez de nouvelles actualités.
                  </p>
                  <Link href="/dashboard/news">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Gérer les Actualités
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Events Management */}
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <CardTitle>Événements</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Organiser les événements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {events.length} événements organisés. Créez de nouveaux événements.
                  </p>
                  <Link href="/dashboard/events">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Gérer les Événements
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Requests Management */}
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-600" />
                      <CardTitle>Demandes</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Gérer les demandes d'adhésion et de contact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Consultez et gérez les demandes d'adhésion et de contact.
                  </p>
                  <Link href="/dashboard/requests">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Gérer les Demandes
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Merchant Dashboard */}
        {isMerchant && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Profil</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Gérez votre profil professionnel</p>
                  <Link href="/dashboard/profile">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Modifier le Profil
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Galerie</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Gérez vos photos et images</p>
                  <Link href="/dashboard/gallery">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Gérer la Galerie
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Paramètres</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Paramètres du compte</p>
                  <Link href="/dashboard/settings">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Paramètres
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Profile Info */}
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle>Votre Profil</CardTitle>
                <CardDescription>Informations de votre commerce</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nom</label>
                      <p className="text-lg text-gray-900">{user?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-lg text-gray-900">{user?.email}</p>
                    </div>
                  </div>
                  <Link href="/dashboard/profile">
                    <Button className="bg-amber-500 hover:bg-amber-600 text-blue-900">
                      Compléter votre profil
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
