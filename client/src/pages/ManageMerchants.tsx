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
import { Plus, Edit, Trash2, ArrowLeft, Check, X, ExternalLink, MapPin, Wand2, Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const emptyForm = () => ({
  businessName: "",
  businessCategory: "",
  description: "",
  address: "",
  village: "",
  phone: "",
  email: "",
  website: "",
  googleBusinessUrl: "",
  logo: "",
  photos: [] as string[],
  videos: [] as string[],
  status: "approved" as "pending" | "approved" | "rejected",
});


// ─── Structure catégories & sous-catégories Synergie Dour ──────────────────
const CATEGORIES_SYNERGIE: Record<string, string[]> = {
  "Commerce de détail": [
    "Alimentation générale","Boucherie","Charcuterie","Boulangerie","Pâtisserie",
    "Chocolaterie","Poissonnerie","Fromagerie","Primeur","Caviste","Fleuriste",
    "Librairie","Papeterie","Presse","Tabac","Vêtements","Chaussures","Lingerie",
    "Maroquinerie","Bijouterie","Horlogerie","Optique","Parfumerie","Cosmétique",
    "Jouets","Articles de sport","Chasse et pêche","Informatique","Téléphonie",
    "Électroménager","Multimédia","Animalerie","Décoration","Ameublement","Literie",
    "Bricolage","Jardinage","Piscines et spas","Matériel médical","Cadeaux et souvenirs",
  ],
  "Horeca": [
    "Restaurant","Brasserie","Café","Bar","Snack","Friterie","Pizzeria",
    "Sandwicherie","Salon de thé","Glacier","Traiteur","Hôtel","Chambre d\'hôtes","Gîte",
  ],
  "Artisanat et métiers manuels": [
    "Menuisier","Ébéniste","Ferronnier","Serrurier","Plombier","Chauffagiste",
    "Électricien","Carreleur","Maçon","Couvreur","Peintre","Vitrier","Tapissier",
    "Couturier","Artisan d\'art",
  ],
  "Construction et bâtiment": [
    "Entrepreneur général","Architecte","Géomètre","Promoteur immobilier","Cuisiniste",
    "Façadier","Isolation","Terrassement","Aménagement extérieur",
  ],
  "Automobile et mobilité": [
    "Garage","Carrosserie","Vente de véhicules","Vente de motos","Pneus",
    "Contrôle technique","Auto-école","Location de véhicules","Vélo et mobilité douce",
  ],
  "Bien-être et beauté": [
    "Coiffure","Barbier","Institut de beauté","Onglerie","Pédicure",
    "Massage","Spa","Tatouage","Piercing",
  ],
  "Santé et professions médicales": [
    "Médecin généraliste","Médecin spécialiste","Dentiste","Kinésithérapeute",
    "Infirmier","Psychologue","Ostéopathe","Orthophoniste","Pharmacie",
    "Opticien","Audioprothésiste",
  ],
  "Professions libérales et services": [
    "Avocat","Notaire","Huissier","Comptable","Expert-comptable","Conseiller fiscal",
    "Courtier en assurances","Conseiller financier","Consultant","Secrétariat","Traduction",
  ],
  "Numérique, communication et médias": [
    "Développement web","Graphisme","Marketing digital","Communication","Publicité",
    "Impression","Photographie","Vidéo","Community management","Média local",
  ],
  "Sport, loisirs et culture": [
    "Salle de fitness","Club sportif","Danse","Arts martiaux","Musique",
    "Théâtre","Loisirs créatifs","Organisation de loisirs",
  ],
  "Services à la personne": [
    "Titres-services","Nettoyage","Jardinage","Aide à domicile",
    "Garde d\'enfants","Aide aux seniors","Pet-sitting",
  ],
};
const MAIN_CATEGORIES = Object.keys(CATEGORIES_SYNERGIE);

export default function ManageMerchants() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: merchantsList = [], refetch } = trpc.merchants.listAll.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [selectedMainCat, setSelectedMainCat] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [googleUrl, setGoogleUrl]   = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Import CSV
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("Le fichier CSV est vide ou mal formaté");
        setIsImporting(false);
        return;
      }

      // Détection auto du séparateur (virgule ou point-virgule)
      const sep = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));

      // Mapping flexible des colonnes
      const getCol = (row: string[], keys: string[]) => {
        for (const k of keys) {
          const idx = headers.findIndex(h => h.includes(k));
          if (idx !== -1) return row[idx]?.replace(/"/g, "").trim() ?? "";
        }
        return "";
      };

      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(sep);
        const nom = getCol(row, ["nom", "name", "commerce", "société", "societe", "entreprise"]);
        if (!nom) { skipped++; continue; }

        try {
          await createMutation.mutateAsync({
            businessName: nom,
            businessCategory: getCol(row, ["categorie", "catégorie", "category", "type", "secteur"]) || "Commerce",
            description: getCol(row, ["description", "activite", "activité", "info"]),
            address: getCol(row, ["adresse", "address", "rue", "localite", "localité"]),
            phone: getCol(row, ["telephone", "téléphone", "tel", "phone", "gsm"]),
            email: getCol(row, ["email", "mail", "courriel", "e-mail"]),
            website: getCol(row, ["site", "website", "web", "url"]),
            googleBusinessUrl: getCol(row, ["google", "gmb", "maps", "business_url"]),
            status: "approved",
          });
          inserted++;
        } catch (err: any) {
          errors.push(`Ligne ${i + 1} (${nom}): ${err.message}`);
          skipped++;
        }
      }

      setImportResult({ inserted, skipped, errors });
      if (inserted > 0) {
        toast.success(`${inserted} commerçant(s) importé(s) avec succès`);
        refetch();
      }
    } catch (err: any) {
      toast.error(`Erreur lecture CSV: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

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
      logo: merchant.logo || "",
      photos: Array.isArray(merchant.photos) ? merchant.photos : [],
      videos: Array.isArray(merchant.videos) ? merchant.videos : [],
      village: (merchant as any).village || "",
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

        {/* Recherche + Filtre village */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Rechercher un commerce, une adresse, une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <select
            value={filterVillage}
            onChange={(e) => setFilterVillage(e.target.value)}
            className="border border-input rounded-md p-2 text-sm bg-white min-w-[200px]"
          >
            <option value="">📍 Tous les villages</option>
            <optgroup label="7370 — Commune de Dour">
              <option value="7370 Dour">7370 Dour (centre)</option>
              <option value="7370 Elouges">7370 Élouges</option>
              <option value="7370 Wihéries">7370 Wihéries</option>
              <option value="7370 Blaugies">7370 Blaugies</option>
              <option value="7370 Douvrain">7370 Douvrain</option>
              <option value="7370 Petit-Dour">7370 Petit-Dour</option>
              <option value="7370 Wadelincourt">7370 Wadelincourt</option>
            </optgroup>
            <optgroup label="7380 — Commune de Quiévrain">
              <option value="7380 Quiévrain">7380 Quiévrain</option>
              <option value="7380 Audregnies">7380 Audregnies</option>
              <option value="7380 Baisieux">7380 Baisieux</option>
              <option value="7380 Erquennes">7380 Erquennes</option>
              <option value="7380 Honnelles">7380 Honnelles</option>
            </optgroup>
          </select>
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
                      value={selectedMainCat}
                      onChange={(e) => {
                        setSelectedMainCat(e.target.value);
                        setFormData({ ...formData, businessCategory: e.target.value });
                      }}
                      className="w-full border border-input rounded-md p-2 mt-1 text-sm"
                      required
                    >
                      <option value="">— Catégorie principale —</option>
                      {MAIN_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {selectedMainCat && CATEGORIES_SYNERGIE[selectedMainCat]?.length > 0 && (
                      <select
                        value={
                          formData.businessCategory.includes(" > ")
                            ? formData.businessCategory.split(" > ")[1]
                            : ""
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            businessCategory: e.target.value
                              ? `${selectedMainCat} > ${e.target.value}`
                              : selectedMainCat,
                          })
                        }
                        className="w-full border border-input rounded-md p-2 mt-1 text-sm"
                      >
                        <option value="">— Sous-catégorie (optionnel) —</option>
                        {CATEGORIES_SYNERGIE[selectedMainCat].map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Adresse + Village */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#001a3d]">Adresse *</label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ex : Grand'Place 5"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#001a3d]">Village / Localité *</label>
                    <select
                      value={(formData as any).village || ""}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value } as any)}
                      className="w-full border border-input rounded-md p-2 mt-1 text-sm"
                      required
                    >
                      <option value="">— Sélectionner —</option>
                      <optgroup label="7370 — Commune de Dour">
                        <option value="7370 Dour">7370 Dour (centre)</option>
                        <option value="7370 Elouges">7370 Élouges</option>
                        <option value="7370 Wihéries">7370 Wihéries</option>
                        <option value="7370 Blaugies">7370 Blaugies</option>
                        <option value="7370 Douvrain">7370 Douvrain</option>
                        <option value="7370 Petit-Dour">7370 Petit-Dour</option>
                        <option value="7370 Wadelincourt">7370 Wadelincourt</option>
                      </optgroup>
                      <optgroup label="7380 — Commune de Quiévrain">
                        <option value="7380 Quiévrain">7380 Quiévrain</option>
                        <option value="7380 Audregnies">7380 Audregnies</option>
                        <option value="7380 Baisieux">7380 Baisieux</option>
                        <option value="7380 Erquennes">7380 Erquennes</option>
                        <option value="7380 Honnelles">7380 Honnelles</option>
                      </optgroup>
                      <optgroup label="Autres communes">
                        <option value="7390 Quaregnon">7390 Quaregnon</option>
                        <option value="7300 Boussu">7300 Boussu</option>
                        <option value="7320 Bernissart">7320 Bernissart</option>
                        <option value="Autre">Autre (préciser dans l'adresse)</option>
                      </optgroup>
                    </select>
                  </div>
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


                {/* Photo du commerce */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">
                    Photo du commerce
                  </label>
                  {formData.logo && (
                    <div className="mt-2 mb-2 relative w-full" style={{ maxHeight: 180, overflow: "hidden", borderRadius: 10, border: "1.5px solid #e5e7eb" }}>
                      <img
                        src={formData.logo}
                        alt="Aperçu"
                        style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: "" })}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          background: "rgba(220,38,38,0.85)", color: "#fff",
                          border: "none", borderRadius: "50%", width: 26, height: 26,
                          cursor: "pointer", fontSize: 14, lineHeight: "26px", textAlign: "center",
                        }}
                        title="Supprimer la photo"
                      >✕</button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: formData.logo ? 0 : 6 }}>
                    <label
                      htmlFor="merchant-photo-upload"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                        background: "linear-gradient(135deg,#001533,#0d2260)",
                        color: "#E8C547", fontSize: 13, fontWeight: 600,
                        border: "1.5px solid rgba(232,197,71,0.5)",
                      }}
                    >
                      📷 Choisir une photo
                      <input
                        id="merchant-photo-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setFormData({ ...formData, logo: ev.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      value={formData.logo || ""}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      placeholder="ou collez une URL d'image..."
                      className="flex-1 border border-input rounded-md p-2 text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Téléversez depuis votre appareil ou collez un lien URL. Formats : JPG, PNG, WebP.
                  </p>
                </div>

                {/* Galerie photos */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">
                    Galerie photos <span style={{ fontWeight: 400, color: "#6b7280" }}>(plusieurs photos)</span>
                  </label>
                  {(formData.photos || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 }}>
                      {(formData.photos || []).map((url: string, i: number) => (
                        <div key={i} style={{ position: "relative" }}>
                          <img
                            src={url}
                            alt={`photo-${i}`}
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1.5px solid #e5e7eb" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newPhotos = [...(formData.photos || [])];
                              newPhotos.splice(i, 1);
                              setFormData({ ...formData, photos: newPhotos });
                            }}
                            style={{
                              position: "absolute", top: 2, right: 2,
                              background: "rgba(220,38,38,0.85)", color: "#fff",
                              border: "none", borderRadius: "50%", width: 20, height: 20,
                              cursor: "pointer", fontSize: 11, lineHeight: "20px", textAlign: "center",
                            }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <label
                      htmlFor="merchant-gallery-upload"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                        background: "linear-gradient(135deg,#1a4d2e,#2d7a4f)",
                        color: "#fff", fontSize: 13, fontWeight: 600,
                        border: "1.5px solid rgba(45,122,79,0.5)",
                      }}
                    >
                      🖼 Ajouter photos
                      <input
                        id="merchant-gallery-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach((file) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setFormData((prev: any) => ({
                                ...prev,
                                photos: [...(prev.photos || []), ev.target?.result as string],
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="URL d'une photo à ajouter..."
                      className="flex-1 border border-input rounded-md p-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            setFormData((prev: any) => ({ ...prev, photos: [...(prev.photos || []), val] }));
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload multiple photos ou ajoutez des URLs (Entrée pour valider chaque URL).
                  </p>
                </div>

                {/* Vidéos */}
                <div>
                  <label className="text-sm font-semibold text-[#001a3d]">
                    Vidéos <span style={{ fontWeight: 400, color: "#6b7280" }}>(MP4, YouTube, Facebook...)</span>
                  </label>
                  {(formData.videos || []).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, marginBottom: 8 }}>
                      {(formData.videos || []).map((url: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", borderRadius: 8, padding: "6px 10px", border: "1px solid #e5e7eb" }}>
                          <span style={{ fontSize: 18 }}>🎬</span>
                          <span style={{ flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newVideos = [...(formData.videos || [])];
                              newVideos.splice(i, 1);
                              setFormData({ ...formData, videos: newVideos });
                            }}
                            style={{ background: "rgba(220,38,38,0.85)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <label
                      htmlFor="merchant-video-upload"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                        background: "linear-gradient(135deg,#1e3a5f,#2563eb)",
                        color: "#fff", fontSize: 13, fontWeight: 600,
                        border: "1.5px solid rgba(37,99,235,0.5)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🎬 Upload vidéo
                      <input
                        id="merchant-video-upload"
                        type="file"
                        accept="video/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              videos: [...(prev.videos || []), ev.target?.result as string],
                            }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="URL YouTube, Facebook, ou lien direct MP4..."
                      className="flex-1 border border-input rounded-md p-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            setFormData((prev: any) => ({ ...prev, videos: [...(prev.videos || []), val] }));
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload un fichier vidéo ou collez un lien (YouTube, Facebook, MP4). Entrée pour valider l'URL.
                  </p>
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
          {/* Miniature photo */}
          {merchant.logo && (
            <div style={{ flexShrink: 0 }}>
              <img
                src={merchant.logo}
                alt={merchant.businessName}
                style={{
                  width: 64, height: 64, objectFit: "cover",
                  borderRadius: 10, border: "2px solid #e5e7eb",
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          {!merchant.logo && (
            <div style={{
              width: 64, height: 64, flexShrink: 0,
              borderRadius: 10, border: "2px dashed #d1d5db",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#f9fafb", color: "#9ca3af", fontSize: 24,
            }}>
              🏪
            </div>
          )}
          {/* Infos */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-[#001a3d] text-base">{merchant.businessName}</span>
              <Badge className={`${statusColor[merchant.status]} text-white text-xs`}>
                {statusLabel[merchant.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {merchant.businessCategory}
              {(merchant as any).village && <span className="text-[#001a3d] font-medium"> • 📍 {(merchant as any).village}</span>}
              {merchant.address && <span> • {merchant.address}</span>}
            </p>
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
            {/* Aperçu médias (galerie + vidéos) */}
            {((Array.isArray(merchant.photos) && merchant.photos.length > 0) || (Array.isArray(merchant.videos) && merchant.videos.length > 0)) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {(Array.isArray(merchant.photos) ? merchant.photos : []).slice(0, 4).map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1.5px solid #e5e7eb" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ))}
                {(Array.isArray(merchant.videos) ? merchant.videos : []).slice(0, 2).map((_: string, i: number) => (
                  <div key={i} style={{
                    width: 44, height: 44, borderRadius: 6, border: "1.5px solid #e5e7eb",
                    background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>🎬</div>
                ))}
                {(Array.isArray(merchant.photos) && merchant.photos.length > 4) && (
                  <div style={{
                    width: 44, height: 44, borderRadius: 6, border: "1.5px dashed #9ca3af",
                    background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#6b7280", fontWeight: 600,
                  }}>+{merchant.photos.length - 4}</div>
                )}
              </div>
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
