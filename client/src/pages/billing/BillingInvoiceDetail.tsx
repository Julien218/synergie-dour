import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const formatEuro = (cents: number) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(cents || 0) / 100);

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.message || "Une erreur est survenue";
}

export default function BillingInvoiceDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch(`/api/billing/invoices/${id}`);
    if (!response.ok) throw new Error(await readError(response));
    const payload = await response.json();
    setData(payload);
    setPaymentAmount(
      ((Number(payload.invoice.totalCents) - Number(payload.invoice.paidAmountCents || 0)) / 100)
        .toFixed(2)
    );
  };

  useEffect(() => {
    load()
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [id]);

  const sendInvoice = async () => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/billing/invoices/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      setMessage(`Facture envoyée. Portail client : ${payload.portalUrl}`);
      await load();
    } catch (caught: any) {
      setError(caught.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const amountCents = Math.round(Number(paymentAmount.replace(",", ".")) * 100);
      const response = await fetch(`/api/billing/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          method: paymentMethod,
          reference: paymentReference || null,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setMessage("Paiement enregistré et solde recalculé.");
      setPaymentReference("");
      await load();
    } catch (caught: any) {
      setError(caught.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-8">Chargement…</div></DashboardLayout>;
  if (!data) return <DashboardLayout><div className="p-8 text-red-700">{error || "Facture introuvable"}</div></DashboardLayout>;

  const { invoice, lines, payments } = data;
  const outstanding = Math.max(0, Number(invoice.totalCents) - Number(invoice.paidAmountCents || 0));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/dashboard/billing/invoices" className="text-sm text-blue-700 hover:underline">← Retour aux factures</a>
            <h1 className="mt-1 text-2xl font-bold text-[#001533]">Facture {invoice.number}</h1>
            <p className="text-gray-600">{invoice.clientName} — {invoice.clientEmail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/billing/invoices/${id}/pdf`} target="_blank" rel="noreferrer" className="rounded-lg border px-4 py-2">
              Ouvrir le PDF
            </a>
            {!["draft", "void", "credited"].includes(invoice.status) && (
              <button onClick={sendInvoice} disabled={actionLoading} className="rounded-lg bg-[#001533] px-4 py-2 text-[#E8C547] disabled:opacity-50">
                Envoyer au client
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}
        {message && <div className="rounded-lg bg-green-50 p-4 text-green-800 break-all">{message}</div>}

        <div className="grid gap-4 md:grid-cols-4">
          <Info label="Statut" value={invoice.status} />
          <Info label="Total TTC" value={formatEuro(invoice.totalCents)} />
          <Info label="Payé" value={formatEuro(invoice.paidAmountCents)} />
          <Info label="Solde" value={formatEuro(outstanding)} />
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[680px]">
            <thead className="bg-[#001533] text-[#E8C547]">
              <tr>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Quantité</th>
                <th className="p-3 text-right">Prix unitaire</th>
                <th className="p-3 text-right">TVA</th>
                <th className="p-3 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any) => (
                <tr key={line.id} className="border-t">
                  <td className="p-3">{line.description}</td>
                  <td className="p-3 text-right">{line.quantity} {line.unit}</td>
                  <td className="p-3 text-right">{formatEuro(line.unitPriceCents)}</td>
                  <td className="p-3 text-right">{line.vatRate}%</td>
                  <td className="p-3 text-right">{formatEuro(line.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {outstanding > 0 && !["void", "credited"].includes(invoice.status) && (
          <form onSubmit={addPayment} className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-4">
            <div className="md:col-span-4">
              <h2 className="font-semibold text-[#001533]">Enregistrer un paiement hors ligne</h2>
              <p className="text-sm text-gray-500">Pour un virement, un paiement comptant ou un autre règlement reçu sans Stripe.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Montant (€)</label>
              <input required inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="w-full rounded-lg border p-2" />
            </div>
            <div>
              <label className="text-sm font-medium">Mode</label>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-lg border p-2">
                <option value="bank_transfer">Virement</option>
                <option value="cash">Comptant</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Référence</label>
              <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className="w-full rounded-lg border p-2" />
            </div>
            <div className="flex items-end">
              <button disabled={actionLoading} className="w-full rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">
                Enregistrer
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold text-[#001533] mb-3">Historique des paiements</h2>
          {!payments.length ? (
            <p className="text-sm text-gray-500">Aucun paiement enregistré.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment: any) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <span>{new Date(payment.paymentDate).toLocaleDateString("fr-BE")} — {formatEuro(payment.amountCents)} — {payment.method}</span>
                  {payment.receiptUrl && (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                      Reçu Stripe
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#001533]">{value}</p>
    </div>
  );
}
