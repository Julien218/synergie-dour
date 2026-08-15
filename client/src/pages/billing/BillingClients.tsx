import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface Client {
  id: number; type: string; name: string; tradeName: string | null;
  address: string; email: string; phone: string | null;
  vatNumber: string | null; status: string; createdAt: string;
}

export default function BillingClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", type: "company", address: "", email: "", phone: "", vatNumber: "", postalCode: "", city: "", country: "BE" });

  useEffect(() => {
    fetch(`/api/billing/clients${search ? `?search=${search}` : ""}`)
      .then(r => r.json())
      .then(data => { setClients(data.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/billing/clients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ name: "", type: "company", address: "", email: "", phone: "", vatNumber: "", postalCode: "", city: "", country: "BE" }); window.location.reload(); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Clients de facturation</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg">
            {showForm ? "Annuler" : "Nouveau client"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="bg-white border rounded-xl p-6 grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg p-2"><option value="company">Entreprise</option><option value="individual">Particulier</option></select></div>
            <div><label className="text-sm font-medium">Nom / Raison sociale *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Adresse *</label><input required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Code postal</label><input value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Ville</label><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Email *</label><input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Téléphone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">TVA</label><input value={form.vatNumber} onChange={e => setForm({...form, vatNumber: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div className="col-span-2"><button type="submit" className="px-6 py-2 bg-[#001533] text-[#E8C547] rounded-lg">Créer</button></div>
          </form>
        )}

        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border rounded-lg p-2" />

        {loading ? <div>Chargement...</div> : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#001533] text-[#E8C547] text-sm">
                <tr><th className="p-3 text-left">Nom</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">TVA</th><th className="p-3 text-left">Statut</th><th className="p-3 text-left">Créé le</th></tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3">{c.vatNumber || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{c.status}</span></td>
                    <td className="p-3 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString("fr-BE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
