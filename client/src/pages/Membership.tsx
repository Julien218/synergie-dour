import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Calendar,
  RefreshCw,
  Store,
  Users,
  Video,
  Sparkles,
} from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

type PaymentMode = "one_time" | "subscription";

export default function Membership() {
  const [, setLocation] = useLocation();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("one_time");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    businessCategory: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    message: "",
  });

  // À adapter à votre routeur tRPC : créer une mutation membership.subscribe
  // qui retourne une URL Stripe Checkout selon le paymentMode choisi.
  const requestMutation = trpc.membership.request.useMutation({
    onSuccess: () => {
      toast.success("Demande envoyée. Vous serez redirigé vers le paiement après validation.");
      setLocation("/");
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`);
      setSubmitting(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName || !form.contactName || !form.email || !form.phone || !form.address) {
      toast.error("Merci de remplir les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    requestMutation.mutate({ ...form, paymentMode });
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              className="text-white hover:bg-white/10 mb-6"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour
            </Button>
            <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">Adhésion à Synergie Dour</h1>
            <p className="text-[#F0E68C] text-lg max-w-2xl">
              50€ par an pour rejoindre l'ASBL et bénéficier de l'ensemble des services
              membres.
            </p>
          </div>
        </div>

        {/* Avantages */}
        <section className="py-12 px-4 bg-amber-50/50">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-[#001a3d] mb-6">Ce que comprend l'adhésion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: Store,
                  title: "Apparition dans l'annuaire",
                  desc: "Votre commerce visible sur l'annuaire public, avec coordonnées et description.",
                },
                {
                  icon: Users,
                  title: "Conférences et networking",
                  desc: "Invitations aux événements de l'ASBL, rencontres entre indépendants.",
                },
                {
                  icon: Video,
                  title: "Mini-vidéo promotionnelle",
                  desc: "Une vidéo de présentation de votre activité diffusée sur nos réseaux sociaux.",
                },
                {
                  icon: Sparkles,
                  title: "Espace personnel + week-end client",
                  desc: "Tableau de bord dédié et participation aux week-ends commerciaux.",
                },
              ].map((adv) => (
                <Card key={adv.title} className="border-amber-200 bg-white/95">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
                        <adv.icon className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <CardTitle className="text-[#001a3d] text-base">{adv.title}</CardTitle>
                        <CardDescription className="mt-1">{adv.desc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Choix mode de paiement */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-[#001a3d] mb-2">Choisissez votre formule</h2>
            <p className="text-gray-600 mb-6">Vous pouvez payer pour un an, ou activer le renouvellement automatique.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMode("one_time")}
                className={`text-left p-6 rounded-lg border-2 transition-all ${
                  paymentMode === "one_time"
                    ? "border-[#D4AF37] bg-amber-50/50 shadow-md"
                    : "border-gray-200 bg-white hover:border-amber-200"
                }`}
                aria-pressed={paymentMode === "one_time"}
              >
                <div className="flex items-start justify-between mb-3">
                  <Calendar className="w-6 h-6 text-[#001a3d]" />
                  {paymentMode === "one_time" && (
                    <Badge className="bg-[#D4AF37] text-[#001a3d]">Sélectionné</Badge>
                  )}
                </div>
                <h3 className="font-bold text-[#001a3d] text-lg mb-1">Paiement annuel</h3>
                <p className="text-3xl font-bold text-[#001a3d] mb-2">50€</p>
                <p className="text-sm text-gray-600">
                  Vous payez une seule fois. Nous vous enverrons un mail de rappel à
                  l'approche de la fin de validité.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode("subscription")}
                className={`text-left p-6 rounded-lg border-2 transition-all ${
                  paymentMode === "subscription"
                    ? "border-[#D4AF37] bg-amber-50/50 shadow-md"
                    : "border-gray-200 bg-white hover:border-amber-200"
                }`}
                aria-pressed={paymentMode === "subscription"}
              >
                <div className="flex items-start justify-between mb-3">
                  <RefreshCw className="w-6 h-6 text-[#001a3d]" />
                  {paymentMode === "subscription" && (
                    <Badge className="bg-[#D4AF37] text-[#001a3d]">Sélectionné</Badge>
                  )}
                </div>
                <h3 className="font-bold text-[#001a3d] text-lg mb-1">Renouvellement automatique</h3>
                <p className="text-3xl font-bold text-[#001a3d] mb-2">
                  50€<span className="text-base font-normal text-gray-600">/an</span>
                </p>
                <p className="text-sm text-gray-600">
                  Renouvelé automatiquement chaque année. Annulable à tout moment depuis
                  votre espace membre.
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* Formulaire */}
        <section className="py-12 px-4 bg-gray-50/95">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-amber-100">
              <CardHeader>
                <CardTitle className="text-[#001a3d]">Vos informations</CardTitle>
                <CardDescription>
                  Le bureau examine chaque candidature avant d'activer le paiement.
                  Vous recevrez un email de validation sous 7 jours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessName">Nom du commerce *</Label>
                      <Input
                        id="businessName"
                        required
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessCategory">Secteur d'activité *</Label>
                      <Input
                        id="businessCategory"
                        required
                        placeholder="ex: HORECA, coiffure, services..."
                        value={form.businessCategory}
                        onChange={(e) => setForm({ ...form, businessCategory: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contactName">Nom du responsable *</Label>
                    <Input
                      id="contactName"
                      required
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse du commerce *</Label>
                    <Input
                      id="address"
                      required
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message (facultatif)</Label>
                    <Textarea
                      id="message"
                      rows={3}
                      placeholder="Quelques mots sur votre activité, ce que vous attendez de l'association..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-800">
                    <p className="font-semibold text-[#001a3d] mb-2 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Procédure
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Vous soumettez votre candidature ci-dessous</li>
                      <li>Le bureau de l'ASBL examine et valide</li>
                      <li>Vous recevez un email avec le lien de paiement</li>
                      <li>Après paiement, votre adhésion est active immédiatement</li>
                    </ol>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
                  >
                    {submitting ? "Envoi en cours..." : "Soumettre ma candidature"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
