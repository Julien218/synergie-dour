import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";
import { ArrowRight, Calendar, CreditCard, Mail, Search, Store, Users } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isMerchant = user?.role === "user";
  const [merchantSearch, setMerchantSearch] = useState("");

  const { data: adminMerchants = [] } = trpc.merchants.listAll.useQuery(undefined, { enabled: isAdmin });
  const { data: publicMerchants = [] } = trpc.merchants.list.useQuery(undefined, { enabled: !isAdmin });
  const merchants = isAdmin ? adminMerchants : publicMerchants;
  const { data: news = [] } = trpc.news.list.useQuery();
  const { data: events = [] } = trpc.events.list.useQuery();
  const { data: inboxCount = { contacts: 0, memberships: 0, total: 0 } } =
    trpc.inbox.unreadCount.useQuery(undefined, { enabled: isAdmin, refetchInterval: 30000 });

  const merchantResults = useMemo(() => {
    const q = merchantSearch.trim().toLowerCase();
    if (!q) return [];
    return merchants.filter((merchant: any) => [
      merchant.businessName,
      merchant.businessCategory,
      merchant.address,
      merchant.email,
      merchant.phone,
    ].some((value) => String(value || "").toLowerCase().includes(q))).slice(0, 10);
  }, [merchants, merchantSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-xl p-8">
          <h1 className="text-3xl font-bold mb-2">Bienvenue, {user?.name || "Utilisateur"} !</h1>
          <p className="text-blue-100">
            {isAdmin
              ? `Session Administrateur (${user?.role === "super_admin" ? "Super Admin" : "Admin"})`
              : "Gérez votre profil et votre présence sur Synergie Dour"}
          </p>
        </div>

        {isAdmin && (
          <Card className="border-amber-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-[#001a3d]">
                <Search className="w-5 h-5 text-[#D4AF37]" /> Rechercher un commerce ou commerçant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  placeholder="Nom du commerce, activité, adresse, email ou téléphone..."
                  className="w-full rounded-xl border border-amber-200 bg-white pl-12 pr-4 py-3 text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-amber-100"
                />
              </div>

              {merchantSearch.trim() && (
                <div className="mt-3 rounded-xl border bg-white overflow-hidden">
                  {merchantResults.length > 0 ? merchantResults.map((merchant: any) => (
                    <div key={String(merchant.id)} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-amber-50/40">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#001a3d] truncate">{merchant.businessName || "Sans nom"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[merchant.businessCategory, merchant.address].filter(Boolean).join(" · ") || "Aucune information complémentaire"}
                        </div>
                        {(merchant.email || merchant.phone) && (
                          <div className="text-xs text-gray-400 mt-0.5">{[merchant.email, merchant.phone].filter(Boolean).join(" · ")}</div>
                        )}
                      </div>
                      <Link href="/dashboard/merchants">
                        <Button variant="outline" size="sm" className="shrink-0">Gérer <ArrowRight className="ml-1 w-3 h-3" /></Button>
                      </Link>
                    </div>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">Aucun commerce trouvé pour « {merchantSearch} ».</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <Card className="border-amber-200">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Commerçants</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{merchants.length}</div>
                <Link href="/dashboard/merchants"><Button variant="link" className="px-0 text-amber-600 h-auto">Gérer <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Actualités</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{news.length}</div>
                <Link href="/dashboard/news"><Button variant="link" className="px-0 text-amber-600 h-auto">Gérer <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Événements</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{events.length}</div>
                <Link href="/dashboard/events"><Button variant="link" className="px-0 text-amber-600 h-auto">Gérer <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
              </CardContent>
            </Card>
            <Card className={`border-2 ${inboxCount.total > 0 ? "border-red-300 bg-red-50/40 shadow-md" : "border-amber-200"} relative`}>
              {inboxCount.total > 0 && <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse z-10">{inboxCount.total}</span>}
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" /><CardTitle className="text-sm font-medium text-gray-600">Réception</CardTitle></div></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${inboxCount.total > 0 ? "text-red-500" : "text-blue-900"}`}>{inboxCount.total > 0 ? `${inboxCount.total} non lu${inboxCount.total > 1 ? "s" : ""}` : "Aucun"}</div>
                <Link href="/dashboard/inbox"><Button variant="link" className="px-0 text-amber-600 h-auto">Ouvrir <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50">
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-600" /><CardTitle className="text-sm font-medium text-gray-600">Facturation</CardTitle></div></CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-blue-900">Factures & paiements</div>
                <Link href="/dashboard/facturation"><Button variant="link" className="px-0 text-amber-600 h-auto">Ouvrir <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
              </CardContent>
            </Card>
          </div>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-amber-200">
              <CardHeader><div className="flex items-center gap-2"><Store className="w-5 h-5 text-amber-600" /><CardTitle>CRM commerçants</CardTitle></div></CardHeader>
              <CardContent><Link href="/dashboard/merchants"><Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Accéder au CRM</Button></Link></CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader><div className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-600" /><CardTitle>Adhésions</CardTitle></div></CardHeader>
              <CardContent><Link href="/dashboard/membership-requests"><Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Voir les demandes</Button></Link></CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader><div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-600" /><CardTitle>Communication</CardTitle></div></CardHeader>
              <CardContent><Link href="/dashboard/posts"><Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900">Posts & publications</Button></Link></CardContent>
            </Card>
          </div>
        )}

        {isMerchant && (
          <Card className="border-amber-200">
            <CardHeader><CardTitle>Votre Espace Commerçant</CardTitle></CardHeader>
            <CardContent><p>Bienvenue dans votre espace dédié. Utilisez le menu latéral pour gérer vos informations.</p></CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
