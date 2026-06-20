import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Plus, Edit, Trash2, ArrowLeft, Check, X, ExternalLink, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const emptyForm = () => ({
  businessName: "",
  businessCategory: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  googleBusinessUrl: "",
  status: "approved" as "pending" | "approved" | "rejected",
});

export default function ManageMerchants() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: merchantsList = [], refetch } = trpc.merchants.listAll.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [searchQuery, setSearchQuery] = useState("");

  const [googleUrl, setGoogleUrl]   = React.useState("");
  const [isScraping, setIsScraping] = React.useState(false);
  const [scrapeMsg, setScrapeMsg]   = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const createMutation = trpc.merchants.create.useMutation({
    onSuccess: () => {
      toast.success("Commerçant ajouté avec succès");
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateMutation = trpc.merchants.update.useMutation({
    onSuccess: () => {
      toast.success("Commerçant mis à jour avec succès");
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = trpc.merchants.delete.useMutation({
    onSuccess: () => {
      toast.success("Commerçant supprimé");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleGoogleScrape = async () => {
    if (!googleUrl.trim()) {
      setScrapeMsg({ type: "err", text: "Collez d\'abord l\'URL Google Business" });
      return;
    }
    setIsScraping(true);
    setScrapeMsg(null);
    try {
      const resp = await fetch("/api/social/google-scrape", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googleUrl.trim() }),
      });
      const result = await resp.json() as any;
      if (!resp.ok) {
        setScrapeMsg({ type: "err", text: result.message || "Extraction impossible" });
        return;
      }
      const d = result.data || {};
      setFormData((prev: any) => ({
        ...prev,
        businessName:     d.businessName    || prev.businessName,
        address:          d.address         || prev.address,
        phone:            d.phone           || prev.phone,
        email:            d.email           || prev.email,
        website:          d.website         || prev.website,
        businessCategory: d.category        || prev.businessCategory,
        description:      d.description     || prev.description,
        googleBusinessUrl: googleUrl.trim(),
      }));
      const filled = Object.values(d).filter(Boolean).length;
      setScrapeMsg({ type: "ok", text: `${filled} champ(s) rempli(s) automatiquement` });
    } catch (err: any) {
      setScrapeMsg({ type: "err", text: err.message || "Erreur r\u00e9seau" });
    } finally {
      setIsScraping(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setIsCreating(false);
    setEditingId(null);
    setGoogleUrl("");
    setScrapeMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      // Création : userId = 0 (commerce ajouté manuellement par admin)
      createMutation.mutate({ ...formData, userId: 0 } as any);
    }
  };

  const handleEdit = (merchant: any) => {
    setFormData({
      businessName: merchant.businessName || "",
      businessCategory: merchant.businessCategory || "",
      description: merchant.description || "",
      address: merchant.address || "",
      phone: merchant.phone || "",
      email: merchant.email || "",
      website: merchant.website || "",
      googleBusinessUrl: merchant.googleBusinessUrl || "",
      status: merchant.status || "approved",
    });
    setEditingId(merchant.id);
    setIsCreating(true);
  };

  const handleApprove = (id: number) => {
    updateMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    if (confirm("Rejeter ce commerçant ?")) {
      updateMutation.mutate({ id, status: "rejected" });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Supprimer définitivement ce commerçant ?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600">Accès réservé aux administrateurs</p>
        </div>
      </DashboardLayout>
    );
  }

  const filtered = merchantsList.filter((m: any) =>
    !searchQuery ||
    m.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.businessCategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingMerchants  = filtered.filter((m: any) => m.status === "pending");
  const approvedMerchants = filtered.filter((m: any) => m.status === "approved");
  const rejectedMerchants = filtered.filter((m: any) => m.status === "rejected");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-[#001a3d]">Gestion des Commerçants</h1>
          </div>
          {!isCreating && (
            <Button
              onClick={() => { resetForm(); setIsCreating(true); }}
              className="bg-[#001a3d] hover:bg-[#002966] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un commerce
            </Button>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-amber-200 text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-amber-600">{merchantsList.filter((m: any) => m.status === "pending").length}</div>
              <p className="text-xs text-gray-500 mt-1">En attente</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-green-600">{merchantsList.filter((m: any) => m.status === "approved").length}</div>
              <p className="text-xs text-gray-500 mt-1">Approuvés</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-red-600">{merchantsList.filter((m: any) => m.status === "rejected").length}</div>
              <p className="text-xs text-gray-500 mt-1">Rejetés</p>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <div>
          <Input
            placeholder="Rechercher un commerce, une adresse, une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Formulaire création / édition */}
        {isCreating && (
          <Card className="border-[#001a3d]/20 shadow-md">
            <CardHeader className="bg-[#001a3d] text-white rounded-t-lg">
              <CardTitle className="text-lg">
                {editingId ? "✏️ Modifier le commerçant" : "➕ Ajouter un commerce"}
              </CardTitle>
              <CardDescription className="text-white/70">
                {editingId
                  ? "Modifiez les informations ci-dessous"
                  : "Remplissez les informations du nouveau commerce"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ─── BLOC GOOGLE BUSINESS (EN HAUT) ─── */}
                <div style={{
                  background: "linear-gradient(135deg, #001533 0%, #0d2260 100%)",
                  border: "2px solid rgba(232,197,71,0.40)",
                  borderRadius: 14, padding: "18px 20px", marginBottom: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "rgba(232,197,71,0.15)",
                      border: "1.5px solid rgba(232,197,71,0.50)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Wand2 size={18} color="#E8C547" />
                    </div>
                    <div>
                      <p style={{ color: "#E8C547", fontWeight: 700, fontSize: 14, margin: 0 }}>
                        Remplissage automatique via Google Business
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11.5, margin: 0 }}>
                        Collez l&apos;URL Google Maps/Business pour remplir les champs automatiquement
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="url"
                      value={googleUrl}
                      onChange={e => { setGoogleUrl(e.target.value); setScrapeMsg(null); }}
                      placeholder="https://maps.google.com/... ou https://g.page/..."
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.10)",
                        border: "1.5px solid rgba(255,255,255,0.20)", borderRadius: 10,
                        color: "#fff", fontSize: 13, padding: "10px 14px", outline: "none",
                      }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleGoogleScrape(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleGoogleScrape}
                      disabled={isScraping || !googleUrl.trim()}
                      style={{
                        padding: "10px 20px", borderRadius: 10,
                        background: isScraping || !googleUrl.trim() ? "rgba(232,197,71,0.25)" : "#E8C547",
                        border: "none", cursor: isScraping || !googleUrl.trim() ? "not-allowed" : "pointer",
                        color: "#001533", fontWeight: 700, fontSize: 13,
                        display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                      }}
                    >
                      {isScraping
                        ? <><Loader2 size={15} className="animate-spin" /> Extraction...</>
                        : <><Wand2 size={15} /> Remplir les champs</>
                      }
                    </button>
                  </div>

                  {scrapeMsg && (
                    <div style={{
                      marginTop: 10, padding: "9px 14px", borderRadius: 8, fontSize: 12.5,
                      background: scrapeMsg.type === "ok"
                        ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      border: scrapeMsg.type === "ok"
                        ? "1px solid rgba(34,197,94,0.40)" : "1px solid rgba(239,68,68,0.40)",
                      color: scrapeMsg.type === "ok" ? "#22c55e" : "#ef4444",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      {scrapeMsg.type === "ok" ? "✓" : "✗"} {scrapeMsg.text}
                    </div>
                  )}

                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10.5, marginTop: 10, margin: "10px 0 0" }}>
                    Comment trouver l&apos;URL : Google Maps → Rechercher le commerce → Partager → Copier le lien
                  </p>
                </div>

                {/* Nom + Catégorie */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#001a3d]">Nom du commerce *</label>
                    <Input
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="Ex : Boulangerie Dupont"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#001a3d]">Catégorie *</label>
                    <select
                      value={formData.businessCategory}
                      onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                      className="w-full border border-input rounded-md p-2 mt-1 text-sm"
                      required
                    >
                      <option value="">— Sélectionnez —</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">Adresse *</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ex : Grand'Place 5, 7370 Dour"
                    required
                    className="mt-1"
                  />
                </div>

                {/* Téléphone + Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#001a3d]">Téléphone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0475 xx xx xx"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#001a3d]">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="commerce@example.be"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Site web */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">Site web</label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.moncommerce.be"
                    className="mt-1"
                  />
                </div>

                {/* Google Business URL */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    Fiche Google Business
                  </label>
                  <Input
                    value={formData.googleBusinessUrl}
                    onChange={(e) => setFormData({ ...formData, googleBusinessUrl: e.target.value })}
                    placeholder="https://maps.google.com/?cid=... ou https://g.page/..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Copiez l'URL depuis Google Maps → Partager → Lien
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez le commerce en quelques lignes..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-input rounded-md p-2 mt-1 text-sm"
                  >
                    <option value="approved">✅ Approuvé</option>
                    <option value="pending">⏳ En attente</option>
                    <option value="rejected">❌ Rejeté</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    className="bg-[#D4AF37] hover:bg-[#c49c2a] text-[#001a3d] font-semibold"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingId ? "Mettre à jour" : "Ajouter le commerce"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Demandes en attente */}
        {pendingMerchants.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-amber-700 flex items-center gap-2">
              ⏳ Demandes en attente ({pendingMerchants.length})
            </h2>
            {pendingMerchants.map((merchant: any) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                onEdit={handleEdit}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                showApproveReject
              />
            ))}
          </div>
        )}

        {/* Commerçants approuvés */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#001a3d] flex items-center gap-2">
            ✅ Commerçants approuvés ({approvedMerchants.length})
          </h2>
          {approvedMerchants.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucun commerçant approuvé{searchQuery ? " pour cette recherche" : ""}.</p>
          ) : (
            approvedMerchants.map((merchant: any) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                onEdit={handleEdit}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Rejetés */}
        {rejectedMerchants.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
              ❌ Rejetés ({rejectedMerchants.length})
            </h2>
            {rejectedMerchants.map((merchant: any) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                onEdit={handleEdit}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Composant carte commerçant ───────────────────────────────────────────────
function MerchantCard({
  merchant,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  showApproveReject = false,
}: {
  merchant: any;
  onEdit: (m: any) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onDelete: (id: number) => void;
  showApproveReject?: boolean;
}) {
  const statusColor: Record<string, string> = {
    approved: "bg-green-600",
    pending: "bg-amber-500",
    rejected: "bg-red-600",
  };
  const statusLabel: Record<string, string> = {
    approved: "Approuvé",
    pending: "En attente",
    rejected: "Rejeté",
  };

  return (
    <Card className="border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {/* Infos */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-[#001a3d] text-base">{merchant.businessName}</span>
              <Badge className={`${statusColor[merchant.status]} text-white text-xs`}>
                {statusLabel[merchant.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{merchant.businessCategory} • {merchant.address}</p>
            {merchant.phone && <p className="text-sm text-gray-500">📞 {merchant.phone}</p>}
            {merchant.email && <p className="text-sm text-gray-500">✉️ {merchant.email}</p>}
            {merchant.website && (
              <a
                href={merchant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Site web
              </a>
            )}
            {merchant.googleBusinessUrl && (
              <a
                href={merchant.googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-600 hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" /> Fiche Google Business
              </a>
            )}
            {merchant.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">{merchant.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {showApproveReject && (
              <>
                <Button size="sm" onClick={() => onApprove(merchant.id)} className="bg-green-600 hover:bg-green-700 text-white">
                  <Check className="w-3 h-3 mr-1" /> Approuver
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onReject(merchant.id)}>
                  <X className="w-3 h-3 mr-1" /> Rejeter
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => onEdit(merchant)}>
              <Edit className="w-3 h-3 mr-1" /> Modifier
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => onDelete(merchant.id)}>
              <Trash2 className="w-3 h-3 mr-1" /> Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
