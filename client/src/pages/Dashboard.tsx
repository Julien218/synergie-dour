import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";
import { Users, FileText, Calendar, Store, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: merchants = [] } = trpc.merchants.list.useQuery();
  const { data: news = [] } = trpc.news.list.useQuery();
  const { data: events = [] } = trpc.events.list.useQuery();

  // Correction : Autoriser admin ET super_admin
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
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
              ? `Session Administrateur (${user?.role === 'super_admin' ? 'Super Admin' : 'Admin'})`
              : "Gérez votre profil et votre présence sur Synergie Dour"}
          </p>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Commerçants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{merchants.length}</div>
                <Link href="/dashboard/merchants">
                  <Button variant="link" className="px-0 text-amber-600 h-auto">Gérer <ArrowRight className="ml-1 w-3 h-3"/></Button>
                </Link>
              </CardContent>
            </Card>
            {/* ... on peut simplifier ou garder les autres stats ... */}
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Actualités</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{news.length}</div>
                <Link href="/dashboard/news">
                  <Button variant="link" className="px-0 text-amber-600 h-auto">Gérer <ArrowRight className="ml-1 w-3 h-3"/></Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Événements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{events.length}</div>
                <Link href="/dashboard/events">
                  <Button variant="link" className="px-0 text-amber-600 h-auto">Gérer <ArrowRight className="ml-1 w-3 h-3"/></Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Demandes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">Action requise</div>
                <Link href="/dashboard/requests">
                  <Button variant="link" className="px-0 text-amber-600 h-auto">Voir <ArrowRight className="ml-1 w-3 h-3"/></Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Management Sections for Admin */}
        {isAdmin && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-amber-600" />
                    <CardTitle>Commerçants</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/merchants">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Accéder à la gestion</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-600" />
                    <CardTitle>Demandes d'adhésion</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/requests">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Voir les demandes</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-xl">📱</span>
                    <CardTitle>Posts Réseaux Sociaux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/posts">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Valider les posts</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-xl">🏪</span>
                    <CardTitle>Locaux Commerciaux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/locaux">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Gérer les annonces</Button>
                  </Link>
                </CardContent>
              </Card>
           </div>
        )}

        {isMerchant && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Votre Espace Commerçant</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Bienvenue dans votre espace dédié. Utilisez le menu latéral pour gérer vos informations.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
