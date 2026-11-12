import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MemberAccount() {
  const profile = trpc.merchants.getMyProfile.useQuery();
  const payments = trpc.memberships.myPayments.useQuery();
  const membership = trpc.memberships.myStatus.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.merchants.updateMyProfile.useMutation({
    onSuccess: async () => { toast.success("Fiche mise à jour"); await utils.merchants.getMyProfile.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const portal = trpc.memberships.billingPortal.useMutation({
    onSuccess: result => { window.location.href = result.url; },
    onError: () => toast.error("La gestion de l’abonnement est indisponible. Contactez contact@synergiedour.be."),
  });
  return <main className="max-w-3xl mx-auto px-5 py-10 space-y-8">
    <Link href="/dashboard/members" className="underline">Retour à mon espace membre</Link>
    <h1 className="text-3xl font-bold">Mon commerce et mes paiements</h1>
    {profile.isLoading ? <p>Chargement de votre fiche…</p> : profile.error ? <p role="alert">Impossible de charger votre fiche. Réessayez ultérieurement.</p> : !profile.data ? <p>Votre fiche sera disponible après activation de votre adhésion.</p> :
      <form className="space-y-4" onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        update.mutate({ description: String(data.get("description") || ""), address: String(data.get("address") || ""), phone: String(data.get("phone") || ""), website: String(data.get("website") || "") });
      }}>
        <h2 className="text-xl font-semibold">{profile.data.businessName}</h2>
        <Label htmlFor="description">Description</Label><Textarea id="description" name="description" maxLength={10000} defaultValue={profile.data.description || ""} />
        <Label htmlFor="address">Adresse</Label><Input id="address" name="address" required maxLength={255} defaultValue={profile.data.address} />
        <Label htmlFor="phone">Téléphone</Label><Input id="phone" name="phone" maxLength={20} defaultValue={profile.data.phone || ""} />
        <Label htmlFor="website">Site web</Label><Input id="website" name="website" type="url" maxLength={255} defaultValue={profile.data.website || ""} />
        <Button disabled={update.isPending}>Enregistrer ma fiche</Button>
      </form>}
    <section className="space-y-4"><h2 className="text-xl font-semibold">Mes règlements</h2>
      {payments.isLoading ? <p>Chargement…</p> : payments.error ? <p role="alert">Impossible de charger vos paiements.</p> : !payments.data?.length ? <p>Aucun paiement en ligne enregistré. Pour un reçu de virement, contactez le bureau.</p> :
        <ul className="space-y-2">{payments.data.map(payment => <li key={payment.id}>{new Date(payment.paidAt).toLocaleDateString("fr-BE")} — {(payment.amountCents / 100).toFixed(2)} {payment.currency} — {payment.status === "succeeded" ? "Payé" : payment.status === "refunded" ? "Remboursé" : "Échoué"}</li>)}</ul>}
      {membership.data?.paymentMode === "subscription" && <Button disabled={portal.isPending} onClick={() => portal.mutate()}>Gérer mon abonnement et mes reçus Stripe</Button>}
    </section>
    <p>Pour modifier l’identité du commerce ou vos préférences : <a href="mailto:contact@synergiedour.be" className="underline">contact@synergiedour.be</a></p>
  </main>;
}
