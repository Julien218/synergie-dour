import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface Invoice {
  id: number; number: string; clientName: string; clientEmail: string;
  status: string; totalCents: number; paidAmountCents: number;
  issueDate: string; dueDate: string; peppolStatus: string; emailStatus: string;
}

const formatEuro = (cents: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", finalized: "bg-blue-100 text-blue-700",
  sent: "bg-yellow-100 text-yellow-700", delivered: "bg-green-100 text-green-700",
  partial: "bg-orange-100 text-orange-700", paid: "bg-green-600 text-white",
  overdue: "bg-red-600 text-white", reminded: "bg-orange-100 text-orange-700",
  credited: "bg-purple-100 text-purple-700", void: "bg-gray-200 text-gray-500",
};

export default function BillingInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch(`/api/billing/invoices${filter ? `?status=${filter}` : ""}`).then(r => r.json()).then(data => { setInvoices(data.invoices || []); setLoading(false); }).catch(() => setLoading(false));
  }, [filter]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Factures</h1>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2">
            <option value="">Toutes</option>
            <option value="draft">Brouillons</option>
            <option value="sent">Envoyées</option>
            <option value="paid">Payées</option>
            <option value="overdue">En retard</option>
            <option value="partial">Partiellement payées</option>
          </select>
        </div>
        {loading ? <div>Chargement...</div> : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#001533] text-[#E8C547] text-sm"><tr>
                <th className="p-3 text-left">Numéro</th><th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Statut</th><th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Payé</th><th className="p-3 text-left">Échéance</th>
                <th className="p-3 text-left">Email</th><th className="p-3 text-left">Peppol</th>
                <th className="p-3 text-left">Actions</th>
              </tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{inv.number}</td>
                    <td className="p-3">{inv.clientName}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusColors[inv.status] || "bg-gray-100"}`}>{inv.status}</span></td>
                    <td className="p-3 text-right font-medium">{formatEuro(inv.totalCents)}</td>
                    <td className="p-3 text-right text-green-600">{formatEuro(inv.paidAmountCents)}</td>
                    <td className="p-3 text-sm">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("fr-BE") : "—"}</td>
                    <td className="p-3"><span className="text-xs">{inv.emailStatus}</span></td>
                    <td className="p-3"><span className="text-xs">{inv.peppolStatus}</span></td>
                    <td className="p-3"><a href={`/dashboard/billing/invoices/${inv.id}`} className="text-blue-600 hover:underline text-sm">Voir</a></td>
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
