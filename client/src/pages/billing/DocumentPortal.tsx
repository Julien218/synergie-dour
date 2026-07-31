import { useCallback, useEffect, useState } from "react";

interface PortalData {
  documentType: "quote" | "invoice";
  document: any;
  lines: any[];
  payments?: any[];
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(cents || 0) / 100);

async function readApiError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.message || "Une erreur est survenue";
}

export default function DocumentPortal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAccept, setShowAccept] = useState(false);
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryRole, setSignatoryRole] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const loadDocument = useCallback(async () => {
    const response = await fetch(`/api/documents/${token}`);
    if (!response.ok) throw new Error(await readApiError(response));
    const payload = await response.json();
    setData(payload);
    return payload as PortalData;
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "cancelled") {
      setNotice("Paiement annulé : aucun montant n'a été prélevé.");
    }

    let cancelled = false;
    const initialLoad = async () => {
      try {
        let payload = await loadDocument();
        if (params.get("payment") === "success" && payload.documentType === "invoice") {
          setNotice("Paiement reçu par Stripe. Confirmation en cours…");
          for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
            if (payload.document.status === "paid") {
              setNotice("Paiement confirmé. Votre reçu est disponible ci-dessous.");
              break;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 2_000));
            payload = await loadDocument();
          }
        }
      } catch (caught: any) {
        if (!cancelled) setError(caught.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void initialLoad();
    return () => {
      cancelled = true;
    };
  }, [loadDocument]);

  const accept = async () => {
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatoryName,
          signatoryRole,
          consentProof: consentChecked ? "accepted" : "",
          userAgent: navigator.userAgent,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setNotice("Le devis a été accepté avec succès.");
      await loadDocument();
      setShowAccept(false);
    } catch (caught: any) {
      setError(caught.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    if (!window.confirm("Confirmer le refus de ce devis ?")) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setNotice("Le devis a été refusé.");
      await loadDocument();
    } catch (caught: any) {
      setError(caught.message);
    } finally {
      setActionLoading(false);
    }
  };

  const payInvoice = async () => {
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = await response.json();
      if (!payload.url) throw new Error("Lien de paiement indisponible");
      window.location.assign(payload.url);
    } catch (caught: any) {
      setError(caught.message);
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement du document…</div>;
  }
  if (error && !data) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl text-red-600">Document non disponible</h1>
        <p className="mt-2 text-gray-500">{error}</p>
      </div>
    );
  }

  const doc = data?.document;
  const isQuote = data?.documentType === "quote";
  const canAnswerQuote = isQuote && ["sent", "viewed"].includes(doc.status);
  const isPaid = !isQuote && doc.status === "paid";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-5 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b-2 border-[#001533] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo-sd-transparent.png" alt="Synergie Dour" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-[#001533]">
                Synergie <span className="text-[#C99722]">Dour</span>
              </h1>
              <p className="text-sm text-gray-500">ASBL — Grand'Place 9, 7370 Dour</p>
            </div>
          </div>
          <div className="sm:text-right">
            <h2 className="text-2xl font-bold text-[#001533]">{isQuote ? "Devis" : "Facture"}</h2>
            <p className="text-[#C99722] font-bold">{doc.number}</p>
            <p className="text-sm text-gray-500">
              Date : {new Date(doc.issueDate).toLocaleDateString("fr-BE")}
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase">Destinataire</p>
            <p className="font-semibold">{doc.clientName}</p>
            <p className="text-sm">{doc.clientAddress}</p>
            {doc.clientVatNumber && <p className="text-sm">TVA : {doc.clientVatNumber}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Statut</p>
            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
              doc.status === "paid" || doc.status === "accepted"
                ? "bg-green-100 text-green-700"
                : doc.status === "rejected" || doc.status === "overdue"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}>
              {doc.status}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full mb-6 min-w-[680px]">
            <thead className="bg-[#001533] text-[#E8C547]">
              <tr>
                <th className="p-2 text-left text-sm">#</th>
                <th className="p-2 text-left text-sm">Description</th>
                <th className="p-2 text-center text-sm">Qté</th>
                <th className="p-2 text-right text-sm">P.U.</th>
                <th className="p-2 text-center text-sm">TVA</th>
                <th className="p-2 text-right text-sm">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {data?.lines.map((line, index) => (
                <tr key={line.id} className="border-b">
                  <td className="p-2 text-sm">{index + 1}</td>
                  <td className="p-2 text-sm">{line.description}</td>
                  <td className="p-2 text-center text-sm">{line.quantity}</td>
                  <td className="p-2 text-right text-sm">{formatEuro(line.unitPriceCents)}</td>
                  <td className="p-2 text-center text-sm">{line.vatRate}%</td>
                  <td className="p-2 text-right text-sm font-medium">{formatEuro(line.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-full sm:w-72 mb-6">
          <div className="flex justify-between py-1"><span>Sous-total HT</span><span>{formatEuro(doc.subtotalCents)}</span></div>
          <div className="flex justify-between py-1"><span>TVA</span><span>{formatEuro(doc.vatTotalCents)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-[#001533] font-bold text-lg">
            <span>Total TTC</span><span>{formatEuro(doc.totalCents)}</span>
          </div>
          {!isQuote && Number(doc.paidAmountCents || 0) > 0 && (
            <>
              <div className="flex justify-between py-1 text-green-700">
                <span>Déjà payé</span><span>{formatEuro(doc.paidAmountCents)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold">
                <span>Solde</span><span>{formatEuro(doc.outstandingCents)}</span>
              </div>
            </>
          )}
        </div>

        {canAnswerQuote && (
          <div className="border-t-2 pt-6">
            {!showAccept ? (
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setShowAccept(true)} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium">
                  Accepter le devis
                </button>
                <button onClick={reject} disabled={actionLoading} className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-medium disabled:opacity-50">
                  Refuser
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h3 className="font-bold text-[#001533]">Accepter le devis</h3>
                <div>
                  <label className="text-sm font-medium">Nom du signataire *</label>
                  <input value={signatoryName} onChange={(event) => setSignatoryName(event.target.value)} className="w-full border rounded-lg p-2" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Fonction</label>
                  <input value={signatoryRole} onChange={(event) => setSignatoryRole(event.target.value)} className="w-full border rounded-lg p-2" />
                </div>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} className="mt-1" />
                  <span className="text-sm">J'accepte ce devis en mon nom et engage l'organisation représentée.</span>
                </label>
                <button
                  onClick={accept}
                  disabled={!signatoryName || !consentChecked || actionLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  {actionLoading ? "Confirmation…" : "Confirmer l'acceptation"}
                </button>
              </div>
            )}
          </div>
        )}

        {isQuote && doc.status === "accepted" && (
          <div className="bg-green-50 p-4 rounded-lg text-green-700">
            Ce devis a été accepté{doc.acceptedAt ? ` le ${new Date(doc.acceptedAt).toLocaleDateString("fr-BE")}` : ""}.
          </div>
        )}
        {isQuote && doc.status === "rejected" && (
          <div className="bg-red-50 p-4 rounded-lg text-red-700">Ce devis a été refusé.</div>
        )}

        {!isQuote && (
          <div className="border-t-2 pt-6 space-y-4">
            {doc.stripeAvailable ? (
              <div className="rounded-xl border border-[#E8C547] bg-amber-50 p-5">
                <h3 className="font-bold text-[#001533]">Payer cette facture en ligne</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Paiement sécurisé par Stripe, par carte ou Bancontact. Solde à payer :{" "}
                  <strong>{formatEuro(doc.outstandingCents)}</strong>.
                </p>
                <button
                  onClick={payInvoice}
                  disabled={actionLoading}
                  className="mt-4 w-full sm:w-auto px-6 py-3 rounded-lg bg-[#001533] text-[#E8C547] font-semibold disabled:opacity-50"
                >
                  {actionLoading ? "Ouverture du paiement…" : `Payer ${formatEuro(doc.outstandingCents)}`}
                </button>
              </div>
            ) : isPaid ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
                Facture payée. Merci pour votre règlement.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-gray-700">
                Le paiement en ligne n'est pas disponible pour cette facture. Contactez Synergie Dour pour convenir du règlement.
              </div>
            )}

            {!!data?.payments?.length && (
              <div>
                <h3 className="font-semibold text-[#001533] mb-2">Paiements enregistrés</h3>
                <div className="space-y-2">
                  {data.payments.map((payment) => (
                    <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                      <span>
                        {new Date(payment.paymentDate).toLocaleDateString("fr-BE")} — {formatEuro(payment.amountCents)}
                      </span>
                      {payment.receiptUrl && (
                        <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">
                          Voir le reçu Stripe
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-4 border-t text-xs text-gray-400">
          <p>Synergie Dour ASBL — Grand'Place 9, 7370 Dour — BCE 1036.801.623</p>
          <p>Lien d'accès personnel — ne le partagez pas.</p>
        </div>
      </div>
    </div>
  );
}
