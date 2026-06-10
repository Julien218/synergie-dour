import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Send,
  Calendar,
} from "lucide-react";

export default function MembershipRequestsAdmin() {
  const [, setLocation] = useLocation();
  // À adapter selon votre routeur tRPC : créer membershipRequests.listPending
  const { data: requests = [], refetch } = trpc.membershipRequests.listPending.useQuery();

  return (
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
            Examinez et validez les demandes d'adhésion. Une fois validée, le candidat
            reçoit automatiquement le lien de paiement Stripe.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl py-8 px-4">
        {requests.length === 0 ? (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-700 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-900 mb-2">Aucune candidature en attente</h2>
              <p className="text-green-800">Toutes les demandes ont été traitées.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700 mb-2">
              <strong>{requests.length}</strong> candidature{requests.length > 1 ? "s" : ""} en attente.
            </p>
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} onAction={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RequestData {
  id: number;
  businessName: string;
  businessCategory: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  message: string | null;
  createdAt: Date;
}

function RequestCard({ request, onAction }: { request: RequestData; onAction: () => void }) {
  const [rejectionNote, setRejectionNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approveMutation = trpc.memberships.approveAndSendCheckout.useMutation({
    onSuccess: () => {
      toast.success("Candidature approuvée, lien Stripe envoyé par email.");
      onAction();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const rejectMutation = trpc.membershipRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Candidature rejetée.");
      onAction();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  return (
    <Card className="border-amber-200 bg-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 mb-2">
              {request.businessCategory}
            </Badge>
            <CardTitle className="text-[#001a3d]">{request.businessName}</CardTitle>
            <CardDescription>Demande de {request.contactName}</CardDescription>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(request.createdAt).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", day: "numeric",
                month: "long",
                year: "numeric", })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-[#D4AF37] mt-0.5" />
            <a href={`mailto:${request.email}`} className="text-gray-800 hover:text-[#003d99]">
              {request.email}
            </a>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-[#D4AF37] mt-0.5" />
            <a href={`tel:${request.phone}`} className="text-gray-800 hover:text-[#003d99]">
              {request.phone}
            </a>
          </div>
          <div className="flex items-start gap-2 md:col-span-2">
            <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5" />
            <span className="text-gray-800">{request.address}</span>
          </div>
        </div>

        {request.message && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">Message du candidat</p>
            <p className="text-sm text-gray-800 italic">"{request.message}"</p>
          </div>
        )}

        {!showReject ? (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => approveMutation.mutate(request.id)}
              disabled={approveMutation.isPending}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              <Send className="mr-2 w-4 h-4" />
              Approuver et envoyer le lien Stripe
            </Button>
            <Button
              onClick={() => setShowReject(true)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle className="mr-2 w-4 h-4" />
              Refuser
            </Button>
          </div>
        ) : (
          <div className="space-y-2 bg-red-50 border border-red-200 rounded p-3">
            <label className="text-sm font-medium text-red-900">
              Motif du refus (sera communiqué au candidat par email)
            </label>
            <Textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Ex: votre activité ne correspond pas au territoire de l'ASBL, ou tout autre motif..."
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!rejectionNote.trim()) {
                    toast.error("Le motif est obligatoire.");
                    return;
                  }
                  rejectMutation.mutate({ id: request.id, note: rejectionNote });
                }}
                disabled={rejectMutation.isPending}
                variant="destructive"
              >
                Confirmer le refus
              </Button>
              <Button onClick={() => setShowReject(false)} variant="outline">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
