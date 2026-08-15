import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface Quote {
  id: number; number: string; clientName: string; clientEmail: string;
  status: string; totalCents: number; issueDate: string;
}

const formatEuro = (cents: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", finalized: "bg-blue-100 text-blue-700",
  sent: "bg-yellow-100 text-yellow-700", viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700", converted: "bg-teal-100 text-teal-700",
};

export default function BillingQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/quotes").then(r => r.json()).then(data => { setQuotes(data.quotes || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Devis</h1>
          <button onClick={() => window.location.href = "/dashboard/billing/quotes/new"} className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg">Nouveau devis</button>
        </div>
        {loading ? <div>Chargement...</div> : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#001533] text-[#E8C547] text-sm"><tr>
                <th className="p-3 text-left">Numéro</th><th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Statut</th><th className="p-3 text-right">Total</th>
                <th className="p-3 text-left">Date</th><th className="p-3 text-left">Actions</th>
              </tr></thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{q.number}</td>
                    <td className="p-3">{q.clientName}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusColors[q.status] || "bg-gray-100"}`}>{q.status}</span></td>
                    <td className="p-3 text-right font-medium">{formatEuro(q.totalCents)}</td>
                    <td className="p-3 text-sm text-gray-500">{new Date(q.issueDate).toLocaleDateString("fr-BE")}</td>
                    <td className="p-3"><a href={`/dashboard/billing/quotes/${q.id}`} className="text-blue-600 hover:underline text-sm">Voir</a></td>
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
