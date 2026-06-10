import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Building2,
  Phone,
  Globe,
  Share2,
  UsersRound,
  Megaphone,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";

type PaymentMode = "one_time" | "subscription";

const STRUCTURE_TYPES = [
  "Indépendant(e)",
  "PME (Petite/Moyenne Entreprise)",
  "ASBL / Association",
  "Profession libérale",
  "Grande entreprise",
  "Autre",
];

const SECTORS = [
  "Alimentation / Épicerie",
  "Horeca (restaurant, café, traiteur)",
  "Mode / Beauté / Bien-être",
  "Services aux entreprises",
  "Santé / Médical / Paramédical",
  "Construction / Rénovation",
  "Commerce de détail",
  "Art / Culture / Événementiel",
  "Tech / Digital / Informatique",
  "Immobilier",
  "Éducation / Formation",
  "Autre",
];

const EMPLOYEE_COUNTS = [
  "0 (solo)",
  "1 à 5",
  "6 à 20",
  "21 à 50",
  "50+",
];

const HOW_DID_YOU_HEAR = [
  "Bouche à oreille",
  "Réseaux sociaux",
  "Événement Synergie Dour",
  "Presse locale",
  "Site web",
  "Autre",
];

export default function Membership() {
  const [, setLocation] = useLocation();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("one_time");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    // Section 1 — Informations entreprise
    businessName: "",
    structureType: "",
    vatNumber: "",
    businessCategory: "",
    sector: "",
    website: "",
    socialMedia: "",
    employeeCount: "",
    // Section 2 — Coordonnées
    contactName: "",
    email: "",
    phone: "",
    address: "",
    // Section 3 — Votre activité
    message: "",
    howDidYouHear: "",
    // Section 4 — Finalisation
    acceptsEmailContact: false,
    rgpdConsent: false,
  });

  const requestMutation = trpc.membership.request.useMutation({
    onSuccess: () => {
      toast.success("Demande envoyée ! Vous recevrez un email de validation sous 7 jours.");
      setLocation("/");
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`);
      setSubmitting(false);
    },
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName || !form.contactName || !form.email || !form.phone || !form.address) {
      toast.error("Merci de remplir tous les champs obligatoires (*).");
      return;
    }
    if (!form.rgpdConsent) {
      toast.error("Vous devez accepter la politique de confidentialité (RGPD) pour continuer.");
      return;
    }
    setSubmitting(true);
    requestMutation.mutate({
      ...form,
      paymentMode,
      acceptsEmailContact: form.acceptsEmailContact ? 1 : 0,
      rgpdConsent: form.rgpdConsent ? 1 : 0,
    });
  }

  // Composant section header interne
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
  }) => (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-amber-100">
      <div className="w-9 h-9 rounded-lg bg-[#001a3d] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#D4AF37]" />
      </div>
      <div>
        <h3 className="font-semibold text-[#001a3d] text-base">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  const SelectField = ({
    id, label, value, onChange, options, required = false, placeholder = "Sélectionner..."
  }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; options: string[];
    required?: boolean; placeholder?: string;
  }) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">

        {/* ── HERO HEADER ── */}
        <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-14 px-4">
          <div className="container mx-auto max-w-4xl">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              className="text-white hover:bg-white/10 mb-6"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour
            </Button>
            <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 mb-3">
              Adhésion 2026
            </Badge>
            <h1 className="text-4xl font-bold mb-3 text-[#D4AF37]">Rejoindre Synergie Dour</h1>
            <p className="text-[#F0E68C] text-lg max-w-2xl">
              50€/an pour accéder à l'ensemble des services membres — annuaire, événements,
              visibilité, outils digitaux.
            </p>
          </div>
        </div>

        {/* ── AVANTAGES ── */}
        <section className="py-12 px-4 bg-amber-50/50">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-[#001a3d] mb-6">Ce que comprend l'adhésion</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Store, title: "Apparition dans l'annuaire", desc: "Votre commerce visible sur l'annuaire public, avec coordonnées et description." },
                { icon: Users, title: "Conférences et networking", desc: "Invitations aux événements de l'ASBL, rencontres entre indépendants." },
                { icon: Video, title: "Mini-vidéo promotionnelle", desc: "Une vidéo de présentation de votre activité diffusée sur nos réseaux sociaux." },
                { icon: Sparkles, title: "Espace personnel + week-end client", desc: "Tableau de bord dédié et participation aux week-ends commerciaux." },
              ].map((adv) => (
                <Card key={adv.title} className="border-amber-200 bg-white/95 hover:shadow-md transition-shadow">
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

        {/* ── MODE DE PAIEMENT ── */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-[#001a3d] mb-2">Choisissez votre formule</h2>
            <p className="text-gray-600 mb-6">Paiement unique ou renouvellement automatique — annulable à tout moment.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paiement annuel */}
              <button
                type="button"
                onClick={() => setPaymentMode("one_time")}
                className={`text-left p-6 rounded-xl border-2 transition-all ${
                  paymentMode === "one_time"
                    ? "border-[#D4AF37] bg-amber-50/60 shadow-md"
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
                  Vous payez une seule fois. Rappel envoyé avant expiration.
                </p>
              </button>

              {/* Abonnement */}
              <button
                type="button"
                onClick={() => setPaymentMode("subscription")}
                className={`text-left p-6 rounded-xl border-2 transition-all ${
                  paymentMode === "subscription"
                    ? "border-[#D4AF37] bg-amber-50/60 shadow-md"
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
                  Renouvelé chaque année. Annulable depuis votre espace membre.
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* ── FORMULAIRE ── */}
        <section className="py-12 px-4 bg-gray-50/95">
          <div className="container mx-auto max-w-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-[#001a3d]">Votre candidature</h2>
              <p className="text-gray-600 mt-1 text-sm">
                Le bureau examine chaque dossier — vous recevrez un email de validation sous 7 jours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── SECTION 1 : Informations entreprise ── */}
              <Card className="border-amber-100 shadow-sm">
                <CardContent className="pt-6">
                  <SectionHeader
                    icon={Building2}
                    title="Informations entreprise"
                    subtitle="Décrivez votre structure"
                  />
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Nom du commerce / entreprise <span className="text-red-500">*</span></Label>
                      <Input
                        id="businessName"
                        required
                        placeholder="Ex: Boulangerie Dupont, ASBL Les Amis..."
                        value={form.businessName}
                        onChange={(e) => set("businessName", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField
                        id="structureType"
                        label="Type de structure"
                        value={form.structureType}
                        onChange={(v) => set("structureType", v)}
                        options={STRUCTURE_TYPES}
                        placeholder="Choisir..."
                      />
                      <SelectField
                        id="sector"
                        label="Secteur d'activité"
                        value={form.sector}
                        onChange={(v) => set("sector", v)}
                        options={SECTORS}
                        placeholder="Choisir..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="vatNumber">Numéro TVA / BCE <span className="text-gray-400 font-normal text-xs">(optionnel)</span></Label>
                      <Input
                        id="vatNumber"
                        placeholder="BE0xxx.xxx.xxx"
                        value={form.vatNumber}
                        onChange={(e) => set("vatNumber", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="website" className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          Site web <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                        </Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://monsite.be"
                          value={form.website}
                          onChange={(e) => set("website", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="socialMedia" className="flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-gray-400" />
                          Réseaux sociaux <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                        </Label>
                        <Input
                          id="socialMedia"
                          placeholder="@monbusiness ou URL"
                          value={form.socialMedia}
                          onChange={(e) => set("socialMedia", e.target.value)}
                        />
                      </div>
                    </div>

                    <SelectField
                      id="employeeCount"
                      label="Nombre d'employés"
                      value={form.employeeCount}
                      onChange={(v) => set("employeeCount", v)}
                      options={EMPLOYEE_COUNTS}
                      placeholder="Choisir..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── SECTION 2 : Coordonnées ── */}
              <Card className="border-amber-100 shadow-sm">
                <CardContent className="pt-6">
                  <SectionHeader
                    icon={Phone}
                    title="Coordonnées"
                    subtitle="Pour vous contacter et vous afficher dans l'annuaire"
                  />
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contactName">Nom du responsable <span className="text-red-500">*</span></Label>
                      <Input
                        id="contactName"
                        required
                        placeholder="Prénom et nom"
                        value={form.contactName}
                        onChange={(e) => set("contactName", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder="contact@monentreprise.be"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Téléphone <span className="text-red-500">*</span></Label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          placeholder="0491 00 00 00"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address">Adresse du commerce <span className="text-red-500">*</span></Label>
                      <Input
                        id="address"
                        required
                        placeholder="Rue, numéro, code postal, ville"
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── SECTION 3 : Votre activité ── */}
              <Card className="border-amber-100 shadow-sm">
                <CardContent className="pt-6">
                  <SectionHeader
                    icon={Megaphone}
                    title="Votre activité"
                    subtitle="Aidez-nous à mieux vous connaître"
                  />
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="message">Décrivez votre activité <span className="text-gray-400 font-normal text-xs">(optionnel)</span></Label>
                      <Textarea
                        id="message"
                        rows={3}
                        placeholder="Quelques mots sur votre métier, vos produits/services, ce que vous attendez de Synergie Dour..."
                        value={form.message}
                        onChange={(e) => set("message", e.target.value)}
                      />
                    </div>
                    <SelectField
                      id="howDidYouHear"
                      label="Comment avez-vous connu Synergie Dour ?"
                      value={form.howDidYouHear}
                      onChange={(v) => set("howDidYouHear", v)}
                      options={HOW_DID_YOU_HEAR}
                      placeholder="Choisir..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── SECTION 4 : Finalisation ── */}
              <Card className="border-amber-100 shadow-sm">
                <CardContent className="pt-6">
                  <SectionHeader
                    icon={ShieldCheck}
                    title="Finalisation"
                    subtitle="Consentements et envoi"
                  />

                  <div className="space-y-4">
                    {/* Procédure */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-800">
                      <p className="font-semibold text-[#001a3d] mb-2 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Procédure d'adhésion
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        <li>Vous soumettez votre candidature</li>
                        <li>Le bureau de l'ASBL examine et valide</li>
                        <li>Vous recevez un email avec le lien de paiement</li>
                        <li>Après paiement, votre adhésion est active immédiatement</li>
                      </ol>
                    </div>

                    {/* Checkbox email contact */}
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <Checkbox
                        id="acceptsEmailContact"
                        checked={form.acceptsEmailContact}
                        onCheckedChange={(v) => set("acceptsEmailContact", !!v)}
                        className="mt-0.5"
                      />
                      <div>
                        <label htmlFor="acceptsEmailContact" className="text-sm font-medium text-gray-800 cursor-pointer flex items-center gap-1.5">
                          <UsersRound className="w-4 h-4 text-[#001a3d]" />
                          J'accepte d'être contacté(e) par Synergie Dour par email
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Actualités membres, événements exclusifs, opportunités networking.
                        </p>
                      </div>
                    </div>

                    {/* Checkbox RGPD obligatoire */}
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                      <Checkbox
                        id="rgpdConsent"
                        checked={form.rgpdConsent}
                        onCheckedChange={(v) => set("rgpdConsent", !!v)}
                        className="mt-0.5 border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:border-[#D4AF37]"
                        required
                      />
                      <div>
                        <label htmlFor="rgpdConsent" className="text-sm font-medium text-gray-800 cursor-pointer flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#001a3d]" />
                          J'accepte la politique de confidentialité (RGPD) <span className="text-red-500 ml-1">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Vos données sont utilisées uniquement dans le cadre de votre adhésion à Synergie Dour et ne sont pas transmises à des tiers.
                        </p>
                      </div>
                    </div>

                    {/* Bouton submit */}
                    <Button
                      type="submit"
                      disabled={submitting || !form.rgpdConsent}
                      className="w-full bg-[#D4AF37] hover:bg-[#c9a42e] text-[#001a3d] font-semibold py-6 text-base rounded-xl shadow-md disabled:opacity-50 transition-all"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Envoi en cours...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Soumettre ma candidature
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                    <p className="text-center text-xs text-gray-500">
                      Validation sous 7 jours · Aucun paiement maintenant
                    </p>
                  </div>
                </CardContent>
              </Card>

            </form>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
