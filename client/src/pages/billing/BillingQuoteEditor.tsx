import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

interface QuoteLine {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  discountPercent: number;
  vatRate: number;
}

const emptyLine = (): QuoteLine => ({
  description: "",
  quantity: 1,
  unit: "unité",
  unitPriceCents: 0,
  discountPercent: 0,
  vatRate: 0,
});

const formatEuro = (cents: number) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.message || "Une erreur est survenue";
}

export default function BillingQuoteEditor({ id }: { id?: string }) {
  const [, setLocation] = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isNew = !id || id === "new";

  useEffect(() => {
    const load = async () => {
      try {
        const [clientResponse, catalogResponse] = await Promise.all([
          fetch("/api/billing/clients"),
          fetch("/api/billing/catalog"),
        ]);
        if (!clientResponse.ok) throw new Error(await readError(clientResponse));
        if (!catalogResponse.ok) throw new Error(await readError(catalogResponse));
        const [clientPayload, catalogPayload] = await Promise.all([
          clientResponse.json(),
          catalogResponse.json(),
        ]);
        setClients(clientPayload.clients || []);
        setCatalog(catalogPayload.items || []);

        if (!isNew) {
          const response = await fetch(`/api/billing/quotes/${id}`);
          if (!response.ok) throw new Error(await readError(response));
          const payload = await response.json();
          setQuote(payload.quote);
          setClientId(String(payload.quote.clientId));
          setValidUntil(payload.quote.validUntil ? String(payload.quote.validUntil).slice(0, 10) : "");
          setNotes(payload.quote.notes || "");
          setConditions(payload.quote.conditions || "");
          setLines(
            (payload.lines || []).map((line: any) => ({
              description: line.description,
              quantity: Number(line.quantity),
              unit: line.unit || "unité",
              unitPriceCents: Number(line.unitPriceCents),
              discountPercent: Number(line.discountPercent || 0),
              vatRate: Number(line.vatRate || 0),
            }))
          );
        }
      } catch (caught: any) {
        setError(caught.message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, isNew]);

  const totalCents = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const gross = line.quantity * line.unitPriceCents;
        const discounted = Math.round(gross * (1 - line.discountPercent / 100));
        return sum + discounted + Math.round(discounted * line.vatRate / 100);
      }, 0),
    [lines]
  );

  const updateLine = (index: number, field: keyof QuoteLine, value: string | number) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  };

  const addCatalogItem = (catalogId: string) => {
    const item = catalog.find((entry) => String(entry.id) === catalogId);
    if (!item) return;
    setLines((current) => [
      ...current,
      {
        description: item.description,
        quantity: 1,
        unit: item.unit || "unité",
        unitPriceCents: Number(item.unitPriceCents),
        discountPercent: 0,
        vatRate: Number(item.vatRate || 0),
      },
    ]);
  };

  const createQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          validUntil: validUntil || null,
          notes: notes || null,
          conditions: conditions || null,
          lines,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      setLocation(`/dashboard/billing/quotes/${payload.quoteId}`);
    } catch (caught: any) {
      setError(caught.message);
      setActionLoading(false);
    }
  };

  const runAction = async (action: "finalize" | "send" | "convert") => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/billing/quotes/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      if (action === "convert") {
        setLocation(`/dashboard/billing/invoices/${payload.invoiceId}`);
        return;
      }
      setMessage(
        action === "send"
          ? `Devis envoyé. Portail client : ${payload.portalUrl}`
          : "Devis finalisé et prêt à être envoyé."
      );
      const refreshed = await fetch(`/api/billing/quotes/${id}`).then((response) => response.json());
      setQuote(refreshed.quote);
    } catch (caught: any) {
      setError(caught.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-8">Chargement…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/dashboard/billing/quotes" className="text-sm text-blue-700 hover:underline">← Retour aux devis</a>
            <h1 className="mt-1 text-2xl font-bold text-[#001533]">
              {isNew ? "Nouveau devis" : `Devis ${quote?.number || ""}`}
            </h1>
          </div>
          {!isNew && (
            <div className="flex flex-wrap gap-2">
              {quote?.status === "draft" && (
                <button onClick={() => runAction("finalize")} disabled={actionLoading} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
                  Finaliser
                </button>
              )}
              {["finalized", "sent", "viewed"].includes(quote?.status) && (
                <button onClick={() => runAction("send")} disabled={actionLoading} className="rounded-lg bg-[#001533] px-4 py-2 text-[#E8C547] disabled:opacity-50">
                  Envoyer au client
                </button>
              )}
              {quote?.status === "accepted" && (
                <button onClick={() => runAction("convert")} disabled={actionLoading} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">
                  Convertir en facture
                </button>
              )}
            </div>
          )}
        </div>

        {error && <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}
        {message && <div className="rounded-lg bg-green-50 p-4 text-green-800 break-all">{message}</div>}

        <form onSubmit={createQuote} className="space-y-5">
          <div className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Client *</label>
              <select required disabled={!isNew} value={clientId} onChange={(event) => setClientId(event.target.value)} className="w-full rounded-lg border p-2 disabled:bg-gray-100">
                <option value="">Sélectionner un client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name} — {client.email}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Valable jusqu'au</label>
              <input type="date" disabled={!isNew} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="w-full rounded-lg border p-2 disabled:bg-gray-100" />
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h2 className="font-semibold text-[#001533]">Lignes du devis</h2>
              {isNew && (
                <div className="flex gap-2">
                  <select defaultValue="" onChange={(event) => { addCatalogItem(event.target.value); event.target.value = ""; }} className="rounded-lg border p-2 text-sm">
                    <option value="">Ajouter depuis le catalogue…</option>
                    {catalog.map((item) => <option key={item.id} value={item.id}>{item.reference} — {item.description}</option>)}
                  </select>
                  <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="rounded-lg border px-3 py-2 text-sm">
                    Ligne libre
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
                  <input required disabled={!isNew} aria-label="Description" value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} placeholder="Description" className="rounded border p-2 md:col-span-4 disabled:bg-gray-50" />
                  <input required disabled={!isNew} aria-label="Quantité" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, "quantity", Number(event.target.value))} className="rounded border p-2 md:col-span-1 disabled:bg-gray-50" />
                  <input required disabled={!isNew} aria-label="Unité" value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)} className="rounded border p-2 md:col-span-1 disabled:bg-gray-50" />
                  <input required disabled={!isNew} aria-label="Prix en cents" type="number" min="0" value={line.unitPriceCents} onChange={(event) => updateLine(index, "unitPriceCents", Number(event.target.value))} className="rounded border p-2 md:col-span-2 disabled:bg-gray-50" title="Prix unitaire en cents" />
                  <input disabled={!isNew} aria-label="Remise en pourcentage" type="number" min="0" max="100" step="0.01" value={line.discountPercent} onChange={(event) => updateLine(index, "discountPercent", Number(event.target.value))} className="rounded border p-2 md:col-span-1 disabled:bg-gray-50" title="Remise %" />
                  <input disabled={!isNew} aria-label="TVA en pourcentage" type="number" min="0" max="100" step="0.01" value={line.vatRate} onChange={(event) => updateLine(index, "vatRate", Number(event.target.value))} className="rounded border p-2 md:col-span-1 disabled:bg-gray-50" title="TVA %" />
                  <div className="flex items-center justify-end font-medium md:col-span-1">{formatEuro(Math.round(line.quantity * line.unitPriceCents))}</div>
                  {isNew && (
                    <button type="button" aria-label="Supprimer la ligne" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="text-red-700 disabled:opacity-30 md:col-span-1">
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-right text-xl font-bold text-[#001533]">Total TTC estimé : {formatEuro(totalCents)}</div>
          </div>

          <div className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea disabled={!isNew} value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-lg border p-2 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="text-sm font-medium">Conditions</label>
              <textarea disabled={!isNew} value={conditions} onChange={(event) => setConditions(event.target.value)} rows={4} className="w-full rounded-lg border p-2 disabled:bg-gray-100" />
            </div>
          </div>

          {isNew && (
            <button type="submit" disabled={actionLoading} className="rounded-lg bg-[#001533] px-6 py-3 font-semibold text-[#E8C547] disabled:opacity-50">
              {actionLoading ? "Création…" : "Créer le brouillon"}
            </button>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
