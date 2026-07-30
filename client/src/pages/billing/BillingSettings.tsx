import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function BillingSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/billing/profile").then(r => r.json()).then(data => { setProfile(data.profile); setLoading(false); });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/billing/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <DashboardLayout><div className="p-8">Chargement...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-[#001533] mb-6">Paramètres de facturation</h1>
        {saved && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">Paramètres enregistrés</div>}
        <form onSubmit={save} className="space-y-4 bg-white border rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Raison sociale" value={profile?.legalName || ""} onChange={(v) => setProfile({...profile, legalName: v})} />
            <Field label="Nom commercial" value={profile?.tradeName || ""} onChange={(v) => setProfile({...profile, tradeName: v})} />
            <div className="col-span-2"><Field label="Adresse" value={profile?.address || ""} onChange={(v) => setProfile({...profile, address: v})} /></div>
            <Field label="Numéro BCE" value={profile?.bceNumber || ""} onChange={(v) => setProfile({...profile, bceNumber: v})} />
            <Field label="Numéro TVA" value={profile?.vatNumber || ""} onChange={(v) => setProfile({...profile, vatNumber: v})} />
            <Field label="IBAN" value={profile?.iban || ""} onChange={(v) => setProfile({...profile, iban: v})} />
            <Field label="BIC" value={profile?.bic || ""} onChange={(v) => setProfile({...profile, bic: v})} />
            <Field label="Email facturation" value={profile?.email || ""} onChange={(v) => setProfile({...profile, email: v})} />
            <Field label="Téléphone" value={profile?.phone || ""} onChange={(v) => setProfile({...profile, phone: v})} />
            <Field label="Signataire" value={profile?.signatoryName || ""} onChange={(v) => setProfile({...profile, signatoryName: v})} />
            <Field label="Fonction signataire" value={profile?.signatoryRole || ""} onChange={(v) => setProfile({...profile, signatoryRole: v})} />
            <Field label="Préfixe numérotation" value={profile?.numberPrefix || "SD"} onChange={(v) => setProfile({...profile, numberPrefix: v})} />
            <div><label className="text-sm font-medium">Délai paiement (jours)</label><input type="number" value={profile?.defaultPaymentDelay || 30} onChange={e => setProfile({...profile, defaultPaymentDelay: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Mentions légales</label><textarea value={profile?.legalMentions || ""} onChange={e => setProfile({...profile, legalMentions: e.target.value})} className="w-full border rounded-lg p-2" rows={3} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Conditions générales</label><textarea value={profile?.termsAndConditions || ""} onChange={e => setProfile({...profile, termsAndConditions: e.target.value})} className="w-full border rounded-lg p-2" rows={4} /></div>
          </div>
          <button type="submit" className="px-6 py-2 bg-[#001533] text-[#E8C547] rounded-lg">Enregistrer</button>
        </form>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="text-sm font-medium">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full border rounded-lg p-2" /></div>;
}
