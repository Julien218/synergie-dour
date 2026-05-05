import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Bot, ExternalLink, RefreshCw } from "lucide-react";

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { data: pending = [], refetch } = trpc.pendingChanges.listPending.useQuery();
  const runManual = trpc.agent.runManual.useMutation({
    onSuccess: (stats) => {
      toast.success(`Vérification terminée : ${stats.minor} mineurs, ${stats.major} majeurs détectés`);
      refetch();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

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
          <div className="flex items-center gap-4 flex-wrap justify-between">
            <div className="flex items-start gap-3">
              <Bot className="w-8 h-8 text-[#D4AF37] mt-1" />
              <div>
                <h1 className="text-3xl font-bold text-[#D4AF37]">Validation de l'agent</h1>
                <p className="text-[#F0E68C]">
                  Changements proposés par l'agent de vérification — votre validation est requise.
                </p>
              </div>
            </div>
            <Button
              onClick={() => runManual.mutate()}
              disabled={runManual.isPending}
              className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${runManual.isPending ? "animate-spin" : ""}`} />
              {runManual.isPending ? "Vérification..." : "Lancer une vérification"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl py-8 px-4">
        {pending.length === 0 ? (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-700 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-900 mb-2">Tout est à jour</h2>
              <p className="text-green-800">
                L'agent n'a détecté aucun changement nécessitant votre validation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">
              <strong>{pending.length}</strong> changement{pending.length > 1 ? "s" : ""} en attente de votre validation.
            </p>
            {pending.map((change) => (
              <PendingChangeCard key={change.id} change={change} onAction={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PendingChangeData {
  id: number;
  resourceId: number;
  kind: "minor" | "major";
  proposal: string;
  createdAt: Date;
  resource?: { title: string; slug: string } | null;
}

function PendingChangeCard({
  change,
  onAction,
}: {
  change: PendingChangeData;
  onAction: () => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const proposal = JSON.parse(change.proposal) as {
    reason: string;
    patches: Array<{
      field: string;
      oldValue: string;
      newValue: string;
      sourceUrl: string;
      sourceQuote: string;
      justification: string;
    }>;
  };

  const approveMutation = trpc.pendingChanges.approve.useMutation({
    onSuccess: () => {
      toast.success("Changement appliqué.");
      onAction();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });
  const rejectMutation = trpc.pendingChanges.reject.useMutation({
    onSuccess: () => {
      toast.success("Changement rejeté.");
      onAction();
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const isMajor = change.kind === "major";

  return (
    <Card className={`border-2 ${isMajor ? "border-red-300 bg-red-50/30" : "border-blue-200 bg-blue-50/30"}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            {isMajor ? (
              <AlertTriangle className="w-6 h-6 text-red-700 mt-0.5" />
            ) : (
              <Bot className="w-6 h-6 text-blue-700 mt-0.5" />
            )}
            <div>
              <Badge className={isMajor ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"}>
                {isMajor ? "CHANGEMENT MAJEUR" : "Changement mineur"}
              </Badge>
              <CardTitle className="text-[#001a3d] mt-2">
                {change.resource?.title ?? `Fiche #${change.resourceId}`}
              </CardTitle>
              <CardDescription className="mt-1">
                Détecté le {new Date(change.createdAt).toLocaleDateString("fr-BE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Constat de l'agent</h4>
          <p className="text-gray-800 leading-relaxed">{proposal.reason}</p>
        </div>

        {!showDetails ? (
          <Button onClick={() => setShowDetails(true)} variant="outline" className="border-[#D4AF37]">
            Voir les modifications proposées ({proposal.patches.length})
          </Button>
        ) : (
          <div className="space-y-3">
            {proposal.patches.map((patch, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <Badge variant="outline">Champ : {patch.field}</Badge>
                  <a
                    href={patch.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#003d99] hover:underline inline-flex items-center gap-1"
                  >
                    Source officielle
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-semibold text-red-900 mb-1">AVANT</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6">
                      {patch.oldValue}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-xs font-semibold text-green-900 mb-1">APRÈS</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6">
                      {patch.newValue}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="italic">"{patch.sourceQuote}"</p>
                  <p className="text-xs text-gray-500 mt-1">{patch.justification}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={`note-${change.id}`} className="text-sm font-medium text-gray-700">
            Note de validation (facultative pour approuver, obligatoire pour rejeter)
          </label>
          <Textarea
            id={`note-${change.id}`}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Ex: validé après vérification sur le site officiel..."
            rows={2}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => approveMutation.mutate({ id: change.id, note: reviewNote || undefined })}
            disabled={approveMutation.isPending}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            <CheckCircle2 className="mr-2 w-4 h-4" />
            Approuver et appliquer
          </Button>
          <Button
            onClick={() => {
              if (!reviewNote.trim()) {
                toast.error("Une note est obligatoire pour rejeter.");
                return;
              }
              rejectMutation.mutate({ id: change.id, note: reviewNote });
            }}
            disabled={rejectMutation.isPending}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <XCircle className="mr-2 w-4 h-4" />
            Rejeter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
