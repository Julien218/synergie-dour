/**
 * Synergie Dour — Module de Facturation — Dashboard
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface BillingStats {
  totalInvoicedCents: number;
  totalPaidCents: number;
  totalOutstandingCents: number;
  overdueCount: number;
  activeClientCount: number;
  activeQuoteCount: number;
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function BillingDashboard() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/billing/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <DashboardLayout><div className="p-8">Chargement...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Facturation</h1>
          <div className="flex gap-3">
            <a href="/dashboard/billing/quotes" className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg hover:opacity-90">Devis</a>
            <a href="/dashboard/billing/invoices" className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg hover:opacity-90">Factures</a>
            <a href="/dashboard/billing/clients" className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg hover:opacity-90">Clients</a>
            <a href="/dashboard/billing/catalogue" className="px-4 py-2 bg-[#001533] text-[#E8C547] rounded-lg hover:opacity-90">Catalogue</a>
            <a href="/dashboard/billing/settings" className="px-4 py-2 border border-[#001533] text-[#001533] rounded-lg hover:bg-gray-50">Paramètres</a>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total facturé" value={formatEuro(stats.totalInvoicedCents)} />
            <StatCard label="Encaissé" value={formatEuro(stats.totalPaidCents)} positive />
            <StatCard label="En attente" value={formatEuro(stats.totalOutstandingCents)} warning />
            <StatCard label="En retard" value={String(stats.overdueCount)} alert={stats.overdueCount > 0} />
            <StatCard label="Clients actifs" value={String(stats.activeClientCount)} />
            <StatCard label="Devis en cours" value={String(stats.activeQuoteCount)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-[#001533] mb-4">Actions rapides</h2>
            <div className="space-y-2">
              <a href="/dashboard/billing/quotes/new" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                📝 Créer un devis
              </a>
              <a href="/dashboard/billing/clients" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                👤 Ajouter un client
              </a>
              <a href="/dashboard/billing/catalogue" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                📦 Ajouter au catalogue
              </a>
              <a href="/dashboard/billing/invoices" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                💰 Consulter les paiements
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-[#001533] mb-4">Liens utiles</h2>
            <div className="space-y-2">
              <a href="/dashboard/billing/invoices" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                📋 Factures et notes de crédit
              </a>
              <a href="/dashboard/billing/settings" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                ⚙️ Paramètres de facturation
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, positive, warning, alert }: {
  label: string; value: string; positive?: boolean; warning?: boolean; alert?: boolean;
}) {
  const color = alert ? "text-red-600" : positive ? "text-green-600" : warning ? "text-orange-600" : "text-[#001533]";
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
