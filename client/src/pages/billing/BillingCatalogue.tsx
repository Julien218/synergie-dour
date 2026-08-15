import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const formatEuro = (cents: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function BillingCatalogue() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reference: "", description: "", type: "service", unitPriceCents: 0, unit: "unité", vatRate: "0", category: "" });

  useEffect(() => { fetch("/api/billing/catalog").then(r => r.json()).then(data => setItems(data.items || [])); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/billing/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    const res = await fetch("/api/billing/catalog"); const data = await res.json(); setItems(data.items || []);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Catalogue</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg">{showForm ? "Annuler" : "Nouvel article"}</button>
        </div>
        {showForm && (
          <form onSubmit={submit} className="bg-white border rounded-xl p-6 grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Référence</label><input required value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg p-2"><option value="service">Service</option><option value="product">Produit</option></select></div>
            <div className="col-span-2"><label className="text-sm font-medium">Description</label><input required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Prix unitaire (cents)</label><input type="number" value={form.unitPriceCents} onChange={e => setForm({...form, unitPriceCents: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Unité</label><input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">TVA (%)</label><input value={form.vatRate} onChange={e => setForm({...form, vatRate: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="text-sm font-medium">Catégorie</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div className="col-span-2"><button type="submit" className="px-6 py-2 bg-[#001533] text-[#E8C547] rounded-lg">Ajouter</button></div>
          </form>
        )}
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#001533] text-[#E8C547] text-sm"><tr><th className="p-3 text-left">Réf.</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Prix</th><th className="p-3 text-center">TVA</th></tr></thead>
            <tbody>
              {items.map(i => (<tr key={i.id} className="border-t hover:bg-gray-50"><td className="p-3 font-mono text-sm">{i.reference}</td><td className="p-3">{i.description}</td><td className="p-3">{i.type}</td><td className="p-3 text-right">{formatEuro(i.unitPriceCents)}</td><td className="p-3 text-center">{i.vatRate}%</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
