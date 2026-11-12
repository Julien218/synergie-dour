import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicLayout } from "@/components/PublicLayout";

export default function MembershipSuccess() {
  const session = new URLSearchParams(window.location.search).get("session") || "";
  const { data, isError } = trpc.memberships.checkoutStatus.useQuery(session, {
    enabled: Boolean(session), retry: false,
    refetchInterval: query => query.state.data?.active || query.state.data?.kind === "invoice" ? false : 3000,
  });
  return <PublicLayout><main className="max-w-xl mx-auto py-20 px-5 space-y-6">
    <h1 className="text-3xl font-bold">{data?.active ? "Votre adhésion est active" : data?.paid ? "Paiement reçu" : "Vérification du paiement"}</h1>
    <p role="status">{!session || isError ? "Nous ne pouvons pas vérifier ce paiement. Consultez votre email de confirmation ou contactez le bureau." :
      data?.active ? "Votre commerce est activé. L’email de confirmation contient le lien pour créer votre accès membre." :
      data?.kind === "invoice" && data.paid ? "Le règlement de votre facture a été reçu. Son traitement et l’envoi du reçu peuvent prendre quelques instants." :
      data?.paid ? "Le règlement est confirmé. L’activation de votre adhésion est en cours." : "La confirmation du prestataire de paiement est en attente. Vous recevrez un email après traitement."}</p>
    <p><Link href="/dashboard/members" className="underline">Mon espace membre</Link></p>
    <p><a href="mailto:contact@synergiedour.be" className="underline">Contacter Synergie Dour</a></p>
    <p><Link href="/" className="underline">Retour à l’accueil</Link></p>
  </main></PublicLayout>;
}
