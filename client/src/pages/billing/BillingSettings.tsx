import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const emptyProfile = {
  legalName: "Synergie Dour ASBL",
  tradeName: "Synergie Dour",
  address: "Grand'Place 9, 7370 Dour",
  bceNumber: "1036.801.623",
  vatNumber: "",
  vatExempt: true,
  iban: "",
  bic: "",
  email: "info@synergiedour.be",
  phone: "",
  signatoryName: "",
  signatoryRole: "",
  termsAndConditions: "",
  defaultPaymentDelay: 30,
  numberPrefix: "SD",
  taxRegime: "",
  legalMentions: "TVA non applicable",
  peppolId: "",
};

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.message || "Une erreur est survenue";
}

export default function BillingSettings() {
  const [profile, setProfile] = useState<any>(emptyProfile);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/billing/profile"), fetch("/api/billing/config")])
      .then(async ([profileResponse, configResponse]) => {
        if (!profileResponse.ok) throw new Error(await readError(profileResponse));
        if (!configResponse.ok) throw new Error(await readError(configResponse));
        const [profilePayload, configPayload] = await Promise.all([
          profileResponse.json(),
          configResponse.json(),
        ]);
        setProfile({ ...emptyProfile, ...(profilePayload.profile || {}) });
        setConfig(configPayload);
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/billing/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      setProfile({ ...emptyProfile, ...payload.profile });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3_000);
    } catch (caught: any) {
      setError(caught.message);
    }
  };

  if (loading) return <DashboardLayout><div className="p-8">Chargement…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#001533]">Paramètres de facturation</h1>
          <p className="mt-1 text-sm text-gray-600">Coordonnées reprises sur les devis, factures et emails envoyés aux clients.</p>
        </div>

        {config && (
          <div className="grid gap-3 md:grid-cols-4">
            <ConfigBadge label="Stripe" ok={config.stripeConfigured} detail={config.stripeConfigured ? `Mode ${config.stripeMode}` : "Clé absente"} />
            <ConfigBadge label="Webhook Stripe" ok={config.webhookConfigured} detail={config.webhookConfigured ? "Configuré" : "Secret absent"} />
            <ConfigBadge label="Emails" ok={config.emailConfigured} detail={config.emailConfigured ? "Resend configuré" : "Clé absente"} />
            <ConfigBadge label="Cotisation 2026" ok={!config.membershipFeesEnabled} detail={config.membershipFeesEnabled ? "Paiement activé" : "Gratuite"} />
          </div>
        )}

        {saved && <div className="bg-green-100 text-green-700 p-3 rounded-lg">Paramètres enregistrés.</div>}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}

        <form onSubmit={save} className="space-y-4 bg-white border rounded-xl p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Raison sociale" required value={profile.legalName || ""} onChange={(value) => setProfile({ ...profile, legalName: value })} />
            <Field label="Nom commercial" value={profile.tradeName || ""} onChange={(value) => setProfile({ ...profile, tradeName: value })} />
            <div className="md:col-span-2"><Field label="Adresse" required value={profile.address || ""} onChange={(value) => setProfile({ ...profile, address: value })} /></div>
            <Field label="Numéro BCE" value={profile.bceNumber || ""} onChange={(value) => setProfile({ ...profile, bceNumber: value })} />
            <Field label="Numéro TVA" value={profile.vatNumber || ""} onChange={(value) => setProfile({ ...profile, vatNumber: value })} />
            <label className="md:col-span-2 flex items-start gap-3 rounded-lg border bg-amber-50 p-4">
              <input type="checkbox" checked={Boolean(profile.vatExempt)} onChange={(event) => setProfile({ ...profile, vatExempt: event.target.checked })} className="mt-1" />
              <span>
                <strong className="block text-sm text-[#001533]">TVA non applicable</strong>
                <span className="text-xs text-gray-600">À conserver uniquement après validation du régime fiscal par le comptable de l'ASBL.</span>
              </span>
            </label>
            <Field label="IBAN" value={profile.iban || ""} onChange={(value) => setProfile({ ...profile, iban: value })} />
            <Field label="BIC" value={profile.bic || ""} onChange={(value) => setProfile({ ...profile, bic: value })} />
            <Field label="Email facturation" required type="email" value={profile.email || ""} onChange={(value) => setProfile({ ...profile, email: value })} />
            <Field label="Téléphone" value={profile.phone || ""} onChange={(value) => setProfile({ ...profile, phone: value })} />
            <Field label="Signataire" value={profile.signatoryName || ""} onChange={(value) => setProfile({ ...profile, signatoryName: value })} />
            <Field label="Fonction signataire" value={profile.signatoryRole || ""} onChange={(value) => setProfile({ ...profile, signatoryRole: value })} />
            <Field label="Préfixe numérotation" required value={profile.numberPrefix || "SD"} onChange={(value) => setProfile({ ...profile, numberPrefix: value.toUpperCase() })} />
            <div>
              <label className="text-sm font-medium">Délai de paiement (jours)</label>
              <input type="number" min="0" max="365" value={profile.defaultPaymentDelay ?? 30} onChange={(event) => setProfile({ ...profile, defaultPaymentDelay: Number(event.target.value) })} className="w-full border rounded-lg p-2" />
            </div>
            <Field label="Identifiant Peppol (si activé)" value={profile.peppolId || ""} onChange={(value) => setProfile({ ...profile, peppolId: value })} />
            <Field label="Régime fiscal" value={profile.taxRegime || ""} onChange={(value) => setProfile({ ...profile, taxRegime: value })} />
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Mentions légales</label>
              <textarea value={profile.legalMentions || ""} onChange={(event) => setProfile({ ...profile, legalMentions: event.target.value })} className="w-full border rounded-lg p-2" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Conditions générales</label>
              <textarea value={profile.termsAndConditions || ""} onChange={(event) => setProfile({ ...profile, termsAndConditions: event.target.value })} className="w-full border rounded-lg p-2" rows={4} />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-[#001533] text-[#E8C547] rounded-lg">Enregistrer</button>
        </form>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          <strong>Facturation électronique belge :</strong> le module conserve un statut Peppol, mais l'envoi structuré nécessite encore le raccordement à un point d'accès certifié et la validation du comptable.
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border rounded-lg p-2" />
    </div>
  );
}

function ConfigBadge({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className={`rounded-xl border p-4 ${ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 font-semibold ${ok ? "text-green-800" : "text-red-800"}`}>{detail}</p>
    </div>
  );
}
