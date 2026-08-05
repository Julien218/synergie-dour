import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  FileSignature,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

export default function MembershipRequestsAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: requests = [], refetch } = trpc.membership.listAll.useQuery();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-red-600 font-semibold">
          Accès réservé aux administrateurs.
        </div>
      </DashboardLayout>
    );
  }

  const pending   = requests.filter((r: any) => r.status === "pending");
  const approved  = requests.filter((r: any) => r.status === "approved");
  const rejected  = requests.filter((r: any) => r.status === "rejected");

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Tableau de bord
          </Button>
          <h1 className="text-3xl font-bold text-[#D4AF37]">Candidatures à l'adhésion</h1>
          <p className="text-[#F0E68C] mt-1">
            Validez les demandes du Conseil d'administration, puis envoyez la facture annuelle de 50 €.
          </p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="bg-white/10 px-3 py-1 rounded-full">
              {pending.length} en attente
            </span>
            <span className="bg-emerald-500/30 px-3 py-1 rounded-full">
              {approved.length} approuvées
            </span>
            <span className="bg-red-500/20 px-3 py-1 rounded-full">
              {rejected.length} refusées
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl py-8 px-4 space-y-8">
        {/* Demandes en attente */}
        <section>
          <h2 className="text-lg font-bold text-[#001a3d] mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            En attente ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-gray-400 text-sm italic">Aucune candidature en attente.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((req: any) => (
                <RequestCard key={req.id} request={req} onAction={refetch} />
              ))}
            </div>
          )}
        </section>

        {/* Demandes approuvées */}
        {approved.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#001a3d] mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Approuvées ({approved.length})
            </h2>
            <div className="space-y-3">
              {approved.map((req: any) => (
                <RequestCard key={req.id} request={req} onAction={refetch} />
              ))}
            </div>
          </section>
        )}

        {/* Demandes refusées */}
        {rejected.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#001a3d] mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Refusées ({rejected.length})
            </h2>
            <div className="space-y-3">
              {rejected.map((req: any) => (
                <RequestCard key={req.id} request={req} onAction={refetch} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}

function RequestCard({ request, onAction }: { request: any; onAction: () => void }) {
  const [rejectionNote, setRejectionNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const updateMutation = trpc.membership.update.useMutation({
    onSuccess: () => { toast.success("Mise à jour effectuée"); onAction(); },
    onError:   (e) => toast.error(e.message),
  });
  const approveMutation = trpc.membership.approveAndSendInvoice.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.invoiceNumber} ${result.reused ? "renvoyée" : "créée et envoyée"}`);
      onAction();
    },
    onError: (e) => toast.error(e.message),
  });
  const registerMutation = trpc.membership.markRegisterSigned.useMutation({
    onSuccess: () => {
      toast.success("Signature du registre enregistrée");
      onAction();
    },
    onError: (e) => toast.error(e.message),
  });

  const approve = () => {
    approveMutation.mutate({ id: request.id });
  };

  const reject = () => {
    updateMutation.mutate({ id: request.id, status: "rejected", reviewNote: rejectionNote });
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Infos commerce */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-[#D4AF37]" />
              <span className="font-bold text-[#001a3d] text-base">{request.businessName}</span>
              <Badge variant="outline" className="text-xs">{request.businessCategory}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {request.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {request.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {request.address}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(request.createdAt).toLocaleDateString("fr-BE")}
              </span>
            </div>
            {request.message && (
              <p className="mt-2 text-sm text-gray-500 italic bg-gray-50 rounded p-2">{request.message}</p>
            )}
            {request.reviewNote && (
              <p className="mt-2 text-sm text-red-700 bg-red-50 rounded p-2">Motif : {request.reviewNote}</p>
            )}
          </div>

          {/* Colonne statuts */}
          <div className="flex flex-col gap-3 min-w-[200px]">
            {/* Statut adhésion */}
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">Statut adhésion</p>
              <div className="flex gap-1.5">
                {request.status === "pending" && (
                  <>
                    <Button size="sm" onClick={approve} disabled={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approuver et facturer
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}
                      className="text-xs px-3">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Refuser
                    </Button>
                  </>
                )}
                {request.status === "approved" && (
                  <div className="space-y-2">
                    <span className="text-emerald-700 font-semibold text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Approuvé
                    </span>
                    {request.paiementStatut === "en_attente" && (
                      <Button size="sm" variant="outline" onClick={approve} disabled={approveMutation.isPending} className="text-xs">
                        Renvoyer la facture
                      </Button>
                    )}
                  </div>
                )}
                {request.status === "rejected" && (
                  <span className="text-red-600 font-semibold text-sm flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Refusé
                  </span>
                )}
              </div>
            </div>

            {/* Cotisation 2026 */}
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">Cotisation 2026</p>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                request.paiementStatut === "paye"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : request.paiementStatut === "gratuit"
                    ? "border-blue-300 bg-blue-100 text-blue-800"
                    : "border-amber-300 bg-amber-100 text-amber-800"
              }`}>
                <CreditCard className="w-3 h-3" />
                {request.paiementStatut === "paye" ? "Payée — 50 €" : request.paiementStatut === "gratuit" ? "Exonérée" : "En attente — 50 €"}
              </span>
              {request.billingInvoiceId && <p className="mt-1 text-xs text-gray-500">Facture #{request.billingInvoiceId}</p>}
            </div>
            {request.paiementStatut === "paye" && (
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Registre des membres</p>
                {request.memberRegisterSignedAt ? (
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                    <FileSignature className="w-3.5 h-3.5" /> Signé le {new Date(request.memberRegisterSignedAt).toLocaleDateString("fr-BE")}
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => registerMutation.mutate({ id: request.id })} disabled={registerMutation.isPending} className="text-xs">
                    <FileSignature className="w-3.5 h-3.5 mr-1" /> Confirmer la signature
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Zone refus */}
        {showReject && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium mb-2 text-gray-700">Motif du refus (optionnel)</p>
            <Textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Indiquez un motif..."
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={reject} disabled={updateMutation.isPending}>
                Confirmer le refus
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
