import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatRate: number;
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  merchantId?: string | null;
  clientName: string;
  clientEmail: string;
  clientAddress?: string | null;
  clientVat?: string | null;
  items: InvoiceItem[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  issueDate: string;
  dueDate: string;
  paymentReference: string;
  status: "draft" | "sent" | "paid" | "overdue";
  reminderCount: number;
  sentAt?: string | null;
  paidAt?: string | null;
  lastReminderAt?: string | null;
};

type BillingSettings = {
  issuerName: string;
  issuerAddress: string;
  issuerEmail: string;
  enterpriseNumber?: string | null;
  vatNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  defaultVatRate: number;
  paymentTermsDays: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const euro = (cents: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) throw new Error(data?.message || `Erreur ${response.status}`);
  return data as T;
}

const defaultInvoiceItem: InvoiceItem = { description: "Cotisation 2027", quantity: 1, unitPriceCents: 5000, vatRate: 0 };

const emptySettings: BillingSettings = {
  issuerName: "Synergie Dour ASBL",
  issuerAddress: "",
  issuerEmail: "contact@synergiedour.be",
  enterpriseNumber: "",
  vatNumber: "",
  iban: "",
  bic: "",
  defaultVatRate: 21,
  paymentTermsDays: 14,
};

export default function InvoicesPage() {
  const { data: merchants = [] } = trpc.merchants.listAll.useQuery();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BillingSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | "create" | "settings" | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Invoice["status"]>("all");
  const [pendingAction, setPendingAction] = useState<{ invoice: Invoice; kind: "send" | "remind" | "paid" | "receipt" } | null>(null);

  const [form, setForm] = useState({
    merchantId: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    clientVat: "",
    issueDate: today(),
    dueDate: addDays(today(), 14),
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { ...defaultInvoiceItem },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const [list, cfg] = await Promise.all([
        api<Invoice[]>("/api/invoices"),
        api<BillingSettings>("/api/invoices/settings"),
      ]);
      setInvoices(list);
      setSettings({ ...emptySettings, ...cfg });
      setForm((prev) => ({ ...prev, dueDate: addDays(prev.issueDate, Number(cfg.paymentTermsDays || 14)) }));
      setItems((prev) => prev.map((item) => ({ ...item, vatRate: Number(cfg.defaultVatRate ?? item.vatRate) })));
    } catch (error: any) {
      toast.error(error.message || "Impossible de charger la facturation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  }), [invoices]);

  const filtered = useMemo(() => invoices.filter((invoice) => {
    const q = search.trim().toLowerCase();
    const matchesText = !q || [invoice.invoiceNumber, invoice.clientName, invoice.clientEmail, invoice.paymentReference]
      .some((value) => String(value || "").toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesText && matchesStatus;
  }), [invoices, search, statusFilter]);

  const formTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Math.round(Number(item.quantity || 0) * Number(item.unitPriceCents || 0)), 0);
    const vat = items.reduce((sum, item) => sum + Math.round(Number(item.quantity || 0) * Number(item.unitPriceCents || 0) * Number(item.vatRate || 0) / 100), 0);
    return { subtotal, vat, total: subtotal + vat };
  }, [items]);

  const selectMerchant = (id: string) => {
    const merchant = merchants.find((m: any) => String(m.id) === id) as any;
    setForm((prev) => ({
      ...prev,
      merchantId: id,
      clientName: merchant?.businessName || "",
      clientEmail: merchant?.email || "",
      clientAddress: merchant?.address || "",
      clientVat: merchant?.vatNumber || "",
    }));
  };

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const createInvoice = async (sendNow: boolean) => {
    if (!form.clientName.trim() || !form.clientEmail.trim()) {
      toast.error("Le nom et l'email du client sont obligatoires");
      return;
    }
    if (items.some((item) => !item.description.trim() || item.unitPriceCents <= 0)) {
      toast.error("Complétez les lignes de facturation et leurs montants");
      return;
    }
    setBusy("create");
    try {
      const invoice = await api<Invoice>(editingId ? `/api/invoices/${editingId}` : "/api/invoices", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({ ...form, items }),
      });
      if (sendNow) {
        await api(`/api/invoices/${invoice.id}/send`, { method: "POST", body: "{}" });
        toast.success(`Facture ${invoice.invoiceNumber} créée et envoyée`);
      } else {
        toast.success(editingId ? `Brouillon ${invoice.invoiceNumber} modifié` : `Brouillon ${invoice.invoiceNumber} créé`);
      }
      setShowCreate(false);
      setEditingId(null);
      setForm({ merchantId: "", clientName: "", clientEmail: "", clientAddress: "", clientVat: "", issueDate: today(), dueDate: addDays(today(), Number(settings.paymentTermsDays || 14)) });
      setItems([{ ...defaultInvoiceItem }]);
      await load();
    } catch (error: any) {
      toast.error(error.message || "Création impossible");
    } finally {
      setBusy(null);
    }
  };

  const editDraft = (invoice: Invoice) => {
    if (invoice.status !== "draft") return toast.error("Seuls les brouillons peuvent être modifiés");
    setEditingId(invoice.id);
    setForm({ merchantId: invoice.merchantId || "", clientName: invoice.clientName, clientEmail: invoice.clientEmail, clientAddress: invoice.clientAddress || "", clientVat: invoice.clientVat || "", issueDate: String(invoice.issueDate).slice(0, 10), dueDate: String(invoice.dueDate).slice(0, 10) });
    setItems(invoice.items);
    setShowCreate(true);
  };

  const deleteDraft = async (invoice: Invoice) => {
    if (invoice.status !== "draft") return toast.error("Seuls les brouillons peuvent être supprimés");
    if (!window.confirm(`Supprimer définitivement le brouillon ${invoice.invoiceNumber} ?`)) return;
    setBusy(invoice.id);
    try { await api(`/api/invoices/${invoice.id}`, { method: "DELETE" }); toast.success(`Brouillon ${invoice.invoiceNumber} supprimé`); await load(); }
    catch (error: any) { toast.error(error.message || "Suppression impossible"); }
    finally { setBusy(null); }
  };

  const requestAction = (invoice: Invoice, kind: "send" | "remind" | "paid" | "receipt") => setPendingAction({ invoice, kind });

  const action = async (invoice: Invoice, kind: "send" | "remind" | "paid" | "receipt") => {
    setBusy(invoice.id);
    try {
      const result = await api<any>(`/api/invoices/${invoice.id}/${kind}`, { method: "POST", body: "{}" });
      if (kind === "paid") {
        if (result.emailSent === false) toast.warning(`Facture marquée payée, mais l'email acquitté n'a pas pu partir : ${result.emailError || "erreur inconnue"}`);
        else toast.success("Paiement enregistré et facture acquittée envoyée automatiquement");
      } else if (kind === "send") toast.success("Facture envoyée avec son PDF");
      else if (kind === "remind") toast.success("Rappel envoyé avec les informations de paiement");
      else toast.success("Facture acquittée renvoyée");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async () => {
    setBusy("settings");
    try {
      const saved = await api<BillingSettings>("/api/invoices/settings", { method: "PUT", body: JSON.stringify(settings) });
      setSettings({ ...emptySettings, ...saved });
      toast.success("Paramètres de facturation enregistrés");
    } catch (error: any) {
      toast.error(error.message || "Enregistrement impossible");
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = (status: Invoice["status"]) => {
    if (status === "paid") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Payée</Badge>;
    if (status === "overdue") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">En retard</Badge>;
    if (status === "sent") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Envoyée</Badge>;
    return <Badge variant="outline">Brouillon</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#001a3d] flex items-center gap-2"><FileText className="w-6 h-6 text-[#D4AF37]" /> Facturation</h1>
            <p className="text-sm text-gray-500 mt-1">Factures, PDF, emails, paiements et rappels depuis le cockpit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowSettings((v) => !v)}><Settings2 className="w-4 h-4 mr-2" /> Paramètres</Button>
            <Button onClick={() => setShowCreate(true)} className="bg-[#D4AF37] hover:bg-[#c7a32c] text-[#001a3d] font-semibold"><Plus className="w-4 h-4 mr-2" /> Nouvelle facture</Button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-950">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div><strong>Belgique 2026 :</strong> le PDF reste joint pour lecture et archivage, mais la facturation B2B doit aussi passer par une facture électronique structurée. Le module est préparé pour une connexion Peppol ; tant qu'un fournisseur Peppol n'est pas connecté, le PDF/email ne doit pas être considéré comme le canal B2B réglementaire complet.</div>
        </div>

        {showSettings && (
          <Card className="border-amber-200">
            <CardHeader><CardTitle className="text-lg">Coordonnées de facturation et paiement</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["issuerName", "Nom de l'émetteur"], ["issuerEmail", "Email facturation"], ["issuerAddress", "Adresse"],
                ["enterpriseNumber", "N° BCE"], ["vatNumber", "N° TVA"], ["iban", "IBAN"], ["bic", "BIC"],
              ].map(([key, label]) => (
                <label key={key} className={key === "issuerAddress" ? "md:col-span-2" : ""}>
                  <span className="text-xs font-medium text-gray-600">{label}</span>
                  <input value={String((settings as any)[key] || "")} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                </label>
              ))}
              <label><span className="text-xs font-medium text-gray-600">TVA par défaut (%)</span><input type="number" value={settings.defaultVatRate} onChange={(e) => setSettings((s) => ({ ...s, defaultVatRate: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label><span className="text-xs font-medium text-gray-600">Échéance par défaut (jours)</span><input type="number" value={settings.paymentTermsDays} onChange={(e) => setSettings((s) => ({ ...s, paymentTermsDays: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <div className="md:col-span-2 flex justify-end"><Button onClick={saveSettings} disabled={busy === "settings"}><Save className="w-4 h-4 mr-2" /> Enregistrer</Button></div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5"><div className="text-xs text-gray-500">À préparer</div><div className="text-2xl font-bold text-[#001a3d]">{counts.draft}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-gray-500">Envoyées</div><div className="text-2xl font-bold text-blue-700">{counts.sent}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-gray-500">En retard</div><div className="text-2xl font-bold text-red-600">{counts.overdue}</div></CardContent></Card>
          <Card><CardContent className="pt-5"><div className="text-xs text-gray-500">Payées</div><div className="text-2xl font-bold text-emerald-600">{counts.paid}</div></CardContent></Card>
        </div>

        {showCreate && (
          <Card className="border-2 border-[#D4AF37]/40">
            <CardHeader><CardTitle>{editingId ? "Modifier le brouillon" : "Nouvelle facture"}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="md:col-span-2"><span className="text-xs font-medium text-gray-600">Reprendre un commerçant</span><select value={form.merchantId} onChange={(e) => selectMerchant(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="">Client libre / rechercher...</option>{[...merchants].sort((a: any, b: any) => String(a.businessName).localeCompare(String(b.businessName))).map((m: any) => <option key={String(m.id)} value={String(m.id)}>{m.businessName}</option>)}</select></label>
                <label><span className="text-xs font-medium text-gray-600">Nom / société *</span><input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                <label><span className="text-xs font-medium text-gray-600">Email *</span><input type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                <label><span className="text-xs font-medium text-gray-600">Adresse</span><input value={form.clientAddress} onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                <label><span className="text-xs font-medium text-gray-600">TVA / BCE client</span><input value={form.clientVat} onChange={(e) => setForm((f) => ({ ...f, clientVat: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                <label><span className="text-xs font-medium text-gray-600">Date facture</span><input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value, dueDate: addDays(e.target.value, Number(settings.paymentTermsDays || 14)) }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                <label><span className="text-xs font-medium text-gray-600">Échéance</span><input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><h3 className="font-semibold text-[#001a3d]">Prestations</h3><Button variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPriceCents: 0, vatRate: Number(settings.defaultVatRate || 21) }])}><Plus className="w-4 h-4 mr-1" /> Ligne</Button></div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end rounded-lg bg-slate-50 p-3">
                    <label className="col-span-12 md:col-span-5"><span className="text-xs text-gray-500">Description</span><input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" /></label>
                    <label className="col-span-3 md:col-span-2"><span className="text-xs text-gray-500">Qté</span><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" /></label>
                    <label className="col-span-5 md:col-span-2"><span className="text-xs text-gray-500">PU HTVA €</span><input type="number" min="0" step="0.01" value={(item.unitPriceCents / 100).toFixed(2)} onChange={(e) => updateItem(index, { unitPriceCents: Math.round(Number(e.target.value) * 100) })} className="w-full rounded-lg border px-3 py-2 text-sm" /></label>
                    <label className="col-span-3 md:col-span-2"><span className="text-xs text-gray-500">TVA %</span><input type="number" min="0" max="100" step="0.01" value={item.vatRate} onChange={(e) => updateItem(index, { vatRate: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm" /></label>
                    <Button variant="ghost" size="icon" className="col-span-1 text-red-500" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t pt-4">
                <div className="text-sm"><span className="text-gray-500">HTVA {euro(formTotals.subtotal)} · TVA {euro(formTotals.vat)}</span><div className="text-xl font-bold text-[#001a3d]">Total {euro(formTotals.total)}</div></div>
                <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button><Button variant="outline" onClick={() => createInvoice(false)} disabled={busy === "create"}>Créer brouillon</Button></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher facture, client, email..." className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm" /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-lg border px-3 py-2 text-sm"><option value="all">Tous les statuts</option><option value="draft">Brouillons</option><option value="sent">Envoyées</option><option value="overdue">En retard</option><option value="paid">Payées</option></select>
              <Button variant="outline" onClick={load}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead><tr className="border-b bg-slate-50"><th className="text-left px-3 py-3">Facture</th><th className="text-left px-3 py-3">Client</th><th className="text-left px-3 py-3">Échéance</th><th className="text-right px-3 py-3">Total</th><th className="text-center px-3 py-3">Statut</th><th className="text-center px-3 py-3">Payée</th><th className="text-right px-3 py-3">Actions</th></tr></thead>
                <tbody>{filtered.map((invoice) => (
                  <tr key={invoice.id} className={`border-b ${invoice.status === "overdue" ? "bg-red-50/40" : ""}`}>
                    <td className="px-3 py-3"><div className="font-semibold text-[#001a3d]">{invoice.invoiceNumber}</div><div className="text-xs text-gray-400">{String(invoice.issueDate).slice(0, 10)}</div></td>
                    <td className="px-3 py-3"><div className="font-medium">{invoice.clientName}</div><div className="text-xs text-gray-500">{invoice.clientEmail}</div></td>
                    <td className="px-3 py-3">{String(invoice.dueDate).slice(0, 10)}{invoice.reminderCount > 0 && <div className="text-xs text-amber-600">{invoice.reminderCount} rappel{invoice.reminderCount > 1 ? "s" : ""}</div>}</td>
                    <td className="px-3 py-3 text-right font-bold">{euro(invoice.totalCents)}</td>
                    <td className="px-3 py-3 text-center">{statusBadge(invoice.status)}</td>
                    <td className="px-3 py-3 text-center"><div className="inline-flex items-center gap-2"><Switch checked={invoice.status === "paid"} disabled={invoice.status === "paid" || busy === invoice.id} onCheckedChange={(checked) => checked && requestAction(invoice, "paid")} className="data-[state=checked]:bg-emerald-500" />{invoice.status === "paid" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}</div></td>
                    <td className="px-3 py-3"><div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}><Download className="w-4 h-4" /></Button>{invoice.status === "draft" && <><Button size="sm" variant="outline" disabled={busy === invoice.id} onClick={() => editDraft(invoice)}>Modifier</Button><Button size="sm" variant="outline" className="text-red-600" disabled={busy === invoice.id} onClick={() => deleteDraft(invoice)}>Supprimer</Button></>}
                      {invoice.status === "draft" && <Button size="sm" variant="outline" disabled={busy === invoice.id} onClick={() => requestAction(invoice, "send")}><Mail className="w-4 h-4 mr-1" /> Envoyer</Button>}
                      {(invoice.status === "sent" || invoice.status === "overdue") && <Button size="sm" variant="outline" disabled={busy === invoice.id} onClick={() => requestAction(invoice, "remind")}><Mail className="w-4 h-4 mr-1" /> Rappel</Button>}
                      {invoice.status === "paid" && <Button size="sm" variant="outline" disabled={busy === invoice.id} onClick={() => requestAction(invoice, "receipt")}><Send className="w-4 h-4 mr-1" /> Acquittée</Button>}
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {!loading && filtered.length === 0 && <div className="py-14 text-center text-gray-400">Aucune facture trouvée.</div>}
          </CardContent>
        </Card>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="invoice-send-confirmation">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b px-6 py-5">
              <h2 id="invoice-send-confirmation" className="text-lg font-semibold text-[#001a3d]">Confirmer l’envoi</h2>
              <p className="mt-1 text-sm text-gray-500">Vérifiez le récapitulatif avant toute transmission.</p>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="font-semibold text-[#001a3d]">{pendingAction.invoice.invoiceNumber}</div>
                <div className="mt-2 grid grid-cols-2 gap-y-2">
                  <span className="text-gray-500">Destinataire</span><span className="text-right font-medium break-all">{pendingAction.invoice.clientName}</span>
                  <span className="text-gray-500">Email</span><span className="text-right break-all">{pendingAction.invoice.clientEmail}</span>
                  <span className="text-gray-500">Montant</span><span className="text-right font-semibold">{euro(pendingAction.invoice.totalCents)}</span>
                  <span className="text-gray-500">Échéance</span><span className="text-right">{String(pendingAction.invoice.dueDate).slice(0, 10)}</span>
                  <span className="text-gray-500">Statut</span><span className="text-right">{pendingAction.invoice.status}</span>
                </div>
              </div>
              <p className="text-gray-600">Le PDF sera joint lorsque l’action le prévoit. L’action sera enregistrée dans le suivi de facturation.</p>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setPendingAction(null)}>Annuler</Button>
              <Button className="bg-[#D4AF37] text-[#001a3d] hover:bg-[#c7a32c]" disabled={busy === pendingAction.invoice.id} onClick={async () => { const current = pendingAction; setPendingAction(null); await action(current.invoice, current.kind); }}><Send className="mr-2 h-4 w-4" /> Confirmer l’envoi</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
