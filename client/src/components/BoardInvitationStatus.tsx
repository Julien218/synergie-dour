import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type Invitation = {
  status: string;
  sentAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  errorMessage: string | null;
};
const labels: Record<string, string> = {
  not_sent: "Invitation non envoyée",
  sending: "Envoi en cours",
  sent: "Invitation envoyée",
  failed: "Échec d'envoi",
  accepted: "Accès activé",
  expired: "Invitation expirée",
  revoked: "Invitation annulée",
};
const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", dateStyle: "medium", timeStyle: "short" })
  : "";

export default function BoardInvitationStatus({ memberId, active, invitation }: {
  memberId: number;
  active: boolean;
  invitation?: Invitation | null;
}) {
  const utils = trpc.useUtils();
  const resend = trpc.board.invitations.resend.useMutation({
    onSuccess: async (state) => {
      if (state.status === "sent") toast.success("Invitation acceptée par le service email. La réception n'est pas encore confirmée.");
      else toast.error(state.errorMessage || "L'invitation n'a pas été envoyée ou a été annulée. Actualisez la fiche.");
      await utils.board.snapshot.invalidate();
    },
    onError: (error) => toast.error(error.message || "Impossible d'envoyer l'invitation."),
  });
  const status = invitation?.status || "not_sent";
  const isError = status === "failed";
  const pending = resend.isPending || status === "sending";
  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs" aria-live="polite">
      <Badge variant="outline" className={isError ? "border-red-200 text-red-700" : status === "accepted" ? "border-emerald-200 text-emerald-700" : "text-slate-600"}>
        {labels[status] || "État inconnu"}
      </Badge>
      {invitation?.sentAt && <p className="text-slate-500">Envoi : {formatDate(invitation.sentAt)}</p>}
      {status === "sent" && invitation?.expiresAt && <p className="text-slate-500">À activer avant le {formatDate(invitation.expiresAt)}</p>}
      {status === "accepted" && invitation?.acceptedAt && <p className="text-slate-500">Activé le {formatDate(invitation.acceptedAt)}</p>}
      {isError && <p className="max-w-lg break-words text-red-700">{invitation?.errorMessage || "L'envoi n'a pas pu être confirmé. Renvoyez une invitation."}</p>}
      {active && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => resend.mutate({ memberId })} className="max-w-full whitespace-normal text-left">
          {pending ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Mail className="mr-2 h-4 w-4 shrink-0" />}
          {pending ? "Envoi en cours…" : status === "not_sent" ? "Envoyer l'invitation" : "Renvoyer l'invitation"}
        </Button>
      )}
      {status === "sent" && <p className="max-w-lg text-slate-500">Envoi accepté par le service email ; réception dans la boîte du membre non confirmée.</p>}
    </div>
  );
}
