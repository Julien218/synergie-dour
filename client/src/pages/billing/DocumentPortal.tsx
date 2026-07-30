import { useState, useEffect } from "react";

interface PortalData {
  documentType: "quote" | "invoice";
  document: any;
  lines: any[];
  payments?: any[];
}

const formatEuro = (cents: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function DocumentPortal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAccept, setShowAccept] = useState(false);
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryRole, setSignatoryRole] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${token}`)
      .then(r => { if (!r.ok) throw new Error("Document non trouvé"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token]);

  const accept = async () => {
    const res = await fetch(`/api/documents/${token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatoryName, signatoryRole, consentProof: consentChecked ? "accepted" : "", userAgent: navigator.userAgent }),
    });
    if (res.ok) { alert("Devis accepté !"); window.location.reload(); }
  };

  const reject = async () => {
    if (!confirm("Êtes-vous sûr de refuser ce devis ?")) return;
    const res = await fetch(`/api/documents/${token}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) { alert("Devis refusé"); window.location.reload(); }
  };

  if (loading) return <div className="p-8 text-center">Chargement du document...</div>;
  if (error) return <div className="p-8 text-center"><h1 className="text-2xl text-red-600">Document non disponible</h1><p className="mt-2 text-gray-500">{error}</p></div>;

  const doc = data?.document;
  const isQuote = data?.documentType === "quote";
  const docTitle = isQuote ? "Devis" : "Facture";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center border-b-2 border-[#001533] pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#001533]">Synergie <span className="text-[#E8C547]">Dour</span></h1>
            <p className="text-sm text-gray-500">ASBL — Grand'Place 9, 7370 Dour</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-[#001533]">{docTitle}</h2>
            <p className="text-[#E8C547] font-bold">{doc.number}</p>
            <p className="text-sm text-gray-500">Date: {new Date(doc.issueDate).toLocaleDateString("fr-BE")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><p className="text-xs text-gray-400 uppercase">Destinataire</p><p className="font-semibold">{doc.clientName}</p><p className="text-sm">{doc.clientAddress}</p>{doc.clientVatNumber && <p className="text-sm">TVA: {doc.clientVatNumber}</p>}</div>
          <div><p className="text-xs text-gray-400 uppercase">Statut</p><span className={`px-3 py-1 rounded text-sm font-medium ${doc.status === "accepted" ? "bg-green-100 text-green-700" : doc.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{doc.status}</span></div>
        </div>

        <table className="w-full mb-6">
          <thead className="bg-[#001533] text-[#E8C547]"><tr><th className="p-2 text-left text-sm">#</th><th className="p-2 text-left text-sm">Description</th><th className="p-2 text-center text-sm">Qté</th><th className="p-2 text-right text-sm">P.U.</th><th className="p-2 text-center text-sm">TVA</th><th className="p-2 text-right text-sm">Total HT</th></tr></thead>
          <tbody>
            {data?.lines.map((l, i) => (<tr key={l.id} className="border-b"><td className="p-2 text-sm">{i+1}</td><td className="p-2 text-sm">{l.description}</td><td className="p-2 text-center text-sm">{l.quantity}</td><td className="p-2 text-right text-sm">{formatEuro(l.unitPriceCents)}</td><td className="p-2 text-center text-sm">{l.vatRate}%</td><td className="p-2 text-right text-sm font-medium">{formatEuro(l.lineTotalCents)}</td></tr>))}
          </tbody>
        </table>

        <div className="ml-auto w-64 mb-6">
          <div className="flex justify-between py-1"><span>Sous-total HT</span><span>{formatEuro(doc.subtotalCents)}</span></div>
          <div className="flex justify-between py-1"><span>TVA</span><span>{formatEuro(doc.vatTotalCents)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-[#001533] font-bold text-lg"><span>Total TTC</span><span>{formatEuro(doc.totalCents)}</span></div>
        </div>

        {isQuote && doc.status === "sent" && (
          <div className="border-t-2 pt-6">
            {!showAccept ? (
              <div className="flex gap-4">
                <button onClick={() => setShowAccept(true)} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium">Accepter le devis</button>
                <button onClick={reject} className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-medium">Refuser</button>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h3 className="font-bold text-[#001533]">Accepter le devis</h3>
                <div><label className="text-sm font-medium">Nom du signataire *</label><input value={signatoryName} onChange={e => setSignatoryName(e.target.value)} className="w-full border rounded-lg p-2" required /></div>
                <div><label className="text-sm font-medium">Fonction</label><input value={signatoryRole} onChange={e => setSignatoryRole(e.target.value)} className="w-full border rounded-lg p-2" /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} /> <span className="text-sm">J'accepte ce devis en mon nom et l'engage l'organisation représentée.</span></label>
                <button onClick={accept} disabled={!signatoryName || !consentChecked} className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Confirmer l'acceptation</button>
              </div>
            )}
          </div>
        )}

        {doc.status === "accepted" && <div className="bg-green-50 p-4 rounded-lg text-green-700">✅ Ce devis a été accepté le {new Date(doc.acceptedAt).toLocaleDateString("fr-BE")}.</div>}
        {doc.status === "rejected" && <div className="bg-red-50 p-4 rounded-lg text-red-700">❌ Ce devis a été refusé.</div>}

        <div className="mt-8 pt-4 border-t text-xs text-gray-400">
          <p>Synergie Dour ASBL — Grand'Place 9, 7370 Dour — BE 1036.801.623</p>
          <p>Document sécurisé — Token d'accès protégé</p>
        </div>
      </div>
    </div>
  );
}
