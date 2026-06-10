import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, MapPin, Euro, Phone, Mail,
  Check, X, Share2, Clock, Eye, Trash2
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente",  color: "bg-amber-100 text-amber-800 border-amber-300" },
  published: { label: "Publié",      color: "bg-green-100 text-green-800 border-green-300" },
  rejected:  { label: "Refusé",      color: "bg-red-100 text-red-800 border-red-300" },
};

export default function ManageLocaux() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<any | null>(null);

  const { data: annonces = [], refetch } = trpc.locaux.listAll.useQuery();

  const updateMutation = trpc.locaux.updateStatus.useMutation({
    onSuccess: () => { refetch(); setSelected(null); },
    onError: (e) => toast.error("Erreur : " + e.message),
  });

  const pending   = annonces.filter((a: any) => a.status === "pending");
  const published = annonces.filter((a: any) => a.status === "published");
  const rejected  = annonces.filter((a: any) => a.status === "rejected");

  const approve = (id: number) => {
    updateMutation.mutate({ id, status: "published" });
    toast.success("Annonce approuvée et publiée !");
  };

  const reject = (id: number) => {
    if (confirm("Refuser et archiver cette annonce ?")) {
      updateMutation.mutate({ id, status: "rejected" });
    }
  };

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-red-600">Accès réservé aux administrateurs</div>
      </DashboardLayout>
    );
  }

  const AnnonceCard = ({ annonce }: { annonce: any }) => {
    const st = STATUS_LABELS[annonce.status] ?? STATUS_LABELS.pending;
    return (
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer border-amber-100"
        onClick={() => setSelected(annonce)}
      >
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#001a3d] truncate">{annonce.titre}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {annonce.adresse} — {annonce.village}
              </p>
            </div>
            <Badge className={`text-xs border flex-shrink-0 ${st.color}`}>{st.label}</Badge>
          </div>
          <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />{annonce.type_bien}
            </span>
            {annonce.surface && <span>{annonce.surface} m²</span>}
            {annonce.loyer && (
              <span className="flex items-center gap-1">
                <Euro className="w-3 h-3" />{annonce.loyer} €/mois
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(annonce.createdAt).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#001a3d] flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#D4AF37]" />
              Locaux Commerciaux à Louer
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gérez les annonces soumises par les propriétaires
            </p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "En attente",  count: pending.length,   color: "text-amber-600",  bg: "bg-amber-50"  },
            { label: "Publiées",    count: published.length, color: "text-green-700",  bg: "bg-green-50"  },
            { label: "Refusées",    count: rejected.length,  color: "text-red-600",    bg: "bg-red-50"    },
          ].map(s => (
            <Card key={s.label} className={`${s.bg} border-0 shadow-sm`}>
              <CardContent className="pt-4 pb-3 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">En attente ({pending.length})</TabsTrigger>
            <TabsTrigger value="published">Publiées ({published.length})</TabsTrigger>
            <TabsTrigger value="rejected">Refusées ({rejected.length})</TabsTrigger>
          </TabsList>

          {[
            { key: "pending",   list: pending   },
            { key: "published", list: published },
            { key: "rejected",  list: rejected  },
          ].map(tab => (
            <TabsContent key={tab.key} value={tab.key} className="space-y-3 mt-4">
              {tab.list.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Aucune annonce</div>
              ) : (
                tab.list.map((a: any) => <AnnonceCard key={a.id} annonce={a} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Modal détail / actions */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <Card
            className="max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <CardHeader className="pb-3 border-b border-amber-100">
              <div className="flex items-start justify-between">
                <CardTitle className="text-[#001a3d] text-lg leading-tight pr-4">{selected.titre}</CardTitle>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Badge className={`w-fit text-xs border mt-2 ${(STATUS_LABELS[selected.status] ?? STATUS_LABELS.pending).color}`}>
                {(STATUS_LABELS[selected.status] ?? STATUS_LABELS.pending).label}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Infos bien */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Adresse</p>
                  <p className="font-medium text-gray-800">{selected.adresse}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Village</p>
                  <p className="font-medium text-gray-800">{selected.village}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Type de bien</p>
                  <p className="font-medium text-gray-800">{selected.type_bien}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Surface</p>
                  <p className="font-medium text-gray-800">{selected.surface ? `${selected.surface} m²` : "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Loyer</p>
                  <p className="font-semibold text-[#D4AF37]">{selected.loyer ? `${selected.loyer} €/mois` : "Non précisé"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Soumis le</p>
                  <p className="font-medium text-gray-800">{new Date(selected.createdAt).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

              {selected.description && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  {selected.description}
                </div>
              )}

              {/* Coordonnées propriétaire */}
              <div className="border border-amber-100 rounded-lg p-3 space-y-2 bg-amber-50/50">
                <p className="text-xs font-semibold text-[#001a3d] uppercase tracking-wide">Contact propriétaire</p>
                <p className="text-sm font-medium text-gray-800">{selected.nom_proprietaire}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <a href={`tel:${selected.telephone_proprietaire}`} className="flex items-center gap-1 hover:text-[#001a3d]">
                    <Phone className="w-3 h-3" />{selected.telephone_proprietaire}
                  </a>
                  <a href={`mailto:${selected.email_proprietaire}`} className="flex items-center gap-1 hover:text-[#001a3d]">
                    <Mail className="w-3 h-3" />{selected.email_proprietaire}
                  </a>
                </div>
              </div>

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={() => approve(selected.id)}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                    Approuver & Publier
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                    onClick={() => reject(selected.id)}
                    disabled={updateMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                    Refuser
                  </Button>
                </div>
              )}

              {selected.status === "published" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-[#001a3d] hover:bg-[#003d99] text-white gap-2"
                    onClick={() => {
                      const msg = `🏪 *Local commercial à louer — Synergie Dour*\n\n📍 ${selected.adresse}, ${selected.village}\n🏷️ ${selected.type_bien}${selected.surface ? ` • ${selected.surface} m²` : ''}${selected.loyer ? `\n💶 ${selected.loyer} €/mois` : ''}\n${selected.description ? `\n${selected.description}\n` : ''}\n📞 Infos & contact : www.synergiedour.be/louer-mon-local`;
                      navigator.clipboard.writeText(msg);
                      toast.success("Texte copié — collez-le dans Facebook/WhatsApp !");
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Copier pour réseaux
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                    onClick={() => reject(selected.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Dépublier
                  </Button>
                </div>
              )}

              {selected.status === "rejected" && (
                <Button
                  className="w-full bg-[#001a3d] hover:bg-[#003d99] text-white gap-2"
                  onClick={() => approve(selected.id)}
                >
                  <Check className="w-4 h-4" />
                  Repasser en "Publié"
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
