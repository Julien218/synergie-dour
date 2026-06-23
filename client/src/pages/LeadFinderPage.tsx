import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Download, Upload, Send, Users, Mail, FileText, Search, RefreshCw, Loader2, Plus } from "lucide-react";

export default function LeadFinderPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "campaigns" | "compose">("contacts");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } =
    trpc.leadfinder.contacts.useQuery({});
  const { data: campaigns = [], isLoading: loadingCampaigns, refetch: refetchCampaigns } =
    trpc.leadfinder.campaigns.useQuery();
  const { data: templates = [] } = trpc.leadfinder.templates.useQuery();

  const importMutation = trpc.leadfinder.importToMerchants.useMutation({
    onSuccess: (result) => {
      toast.success(`Import terminé: ${result.inserted} ajouté(s), ${result.skipped} ignoré(s)`);
    },
    onError: (e) => toast.error(`Erreur import: ${e.message}`),
  });

  const createCampaignMutation = trpc.leadfinder.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campagne créée dans LeadFinder Pro");
      refetchCampaigns();
      setActiveTab("campaigns");
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const sendEmailMutation = trpc.leadfinder.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("Email envoyé via LeadFinder");
      setComposeTo(""); setComposeSubject(""); setComposeBody("");
    },
    onError: (e) => toast.error(`Erreur envoi: ${e.message}`),
  });

  // Filtrer les contacts
  const validContacts = contacts.filter((c: any) => c.email && c.email.includes("@"));
  const filtered = validContacts.filter((c: any) =>
    !searchQuery ||
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.profession?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["nom", "email", "profession", "entreprise", "localite", "confiance"].join(";"),
      ...filtered.map((c: any) => [
        c.full_name || "", c.email || "", c.profession || "",
        c.company || "", c.location || "", c.confidence || ""
      ].map(v => `"${v}"`).join(";"))
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leadfinder_contacts.csv";
    a.click();
    toast.success(`${filtered.length} contacts exportés`);
  };

  // Sélection masse
  const toggleSelect = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContacts.length === filtered.length)
      setSelectedContacts([]);
    else
      setSelectedContacts(filtered.map((c: any) => c.id));
  };

  // Campagne en masse
  const sendCampaign = async () => {
    if (!campaignName || !composeSubject || !composeBody) {
      toast.error("Nom, sujet et corps obligatoires"); return;
    }
    const recipients = filtered
      .filter((c: any) => selectedContacts.length === 0 || selectedContacts.includes(c.id))
      .map((c: any) => ({ email: c.email, name: c.full_name, status: "pending" }));

    await createCampaignMutation.mutateAsync({
      name: campaignName,
      subject: composeSubject,
      body: composeBody,
      recipients,
      status: "active",
      date_lancement: new Date().toISOString(),
    });
  };

  const confidenceColor = (conf: string) => {
    if (conf === "high") return "bg-green-100 text-green-800";
    if (conf === "medium") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#001533]">LeadFinder Pro</h1>
            <p className="text-gray-500 text-sm">
              {validContacts.length} contacts valides · {campaigns.length} campagnes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="border-[#E8C547] text-[#E8C547]">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => importMutation.mutate({})}
              disabled={importMutation.isPending}
              className="border-blue-400 text-blue-600"
            >
              {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              → CRM Commerçants
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: "contacts", label: "Contacts", icon: Users },
            { id: "campaigns", label: "Campagnes", icon: Mail },
            { id: "compose", label: "Composer Email", icon: Send },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id ? "bg-white shadow text-[#001533]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Onglet Contacts */}
        {activeTab === "contacts" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Rechercher nom, email, profession..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedContacts.length === filtered.length ? "Désélectionner tout" : `Tout sélectionner (${filtered.length})`}
              </Button>
              {selectedContacts.length > 0 && (
                <Badge className="bg-[#E8C547] text-[#001533]">{selectedContacts.length} sélectionné(s)</Badge>
              )}
            </div>

            {loadingContacts ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#001533]" /></div>
            ) : (
              <div className="grid gap-2">
                {filtered.slice(0, 100).map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContacts.includes(c.id) ? "border-[#E8C547] bg-yellow-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedContacts.includes(c.id) ? "border-[#E8C547] bg-[#E8C547]" : "border-gray-300"
                      }`}>
                        {selectedContacts.includes(c.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <p className="font-medium text-[#001533] text-sm">{c.full_name || c.company || "Sans nom"}</p>
                        <p className="text-gray-500 text-xs">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.profession && <span className="text-xs text-gray-500">{c.profession}</span>}
                      {c.location && <span className="text-xs text-gray-400">📍 {c.location.split(",")[0]}</span>}
                      {c.confidence && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor(c.confidence)}`}>
                          {c.confidence}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setComposeTo(c.email);
                          setActiveTab("compose");
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filtered.length > 100 && (
                  <p className="text-center text-sm text-gray-400 py-2">
                    Affichage des 100 premiers sur {filtered.length} résultats — affinez la recherche
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Onglet Campagnes */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-[#001533]">Campagnes Email</h2>
              <Button onClick={() => setActiveTab("compose")} className="bg-[#001533]">
                <Plus className="w-4 h-4 mr-2" /> Nouvelle campagne
              </Button>
            </div>
            {loadingCampaigns ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : campaigns.length === 0 ? (
              <Card className="p-8 text-center text-gray-400">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucune campagne — composez votre premier email</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {campaigns.map((c: any) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#001533]">{c.name}</p>
                          <p className="text-sm text-gray-500">{c.subject}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>📤 {c.sent_count ?? 0} envoyés</span>
                          <span>↩️ {c.reply_count ?? 0} réponses</span>
                          <span>📅 {c.rdv_count ?? 0} RDV</span>
                          <Badge className={
                            c.status === "active" ? "bg-green-100 text-green-800" :
                            c.status === "termine" ? "bg-gray-100 text-gray-600" :
                            "bg-yellow-100 text-yellow-800"
                          }>
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Composer */}
        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#001533]">Composer Email / Campagne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom de la campagne</label>
                  <Input
                    placeholder="Ex: Prospection Notaires Dour juin 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Destinataire(s)</label>
                  <Input
                    placeholder="email@exemple.be ou vide = tous les sélectionnés"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="mt-1"
                  />
                  {selectedContacts.length > 0 && (
                    <p className="text-xs text-[#E8C547] mt-1">
                      {selectedContacts.length} contact(s) sélectionné(s) dans l'onglet Contacts
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Objet</label>
                  <Input
                    placeholder="Objet de l'email"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Corps du message</label>
                  <Textarea
                    placeholder="Bonjour {{nom}},&#10;&#10;..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={10}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Variables: {"{{nom}}"} {"{{entreprise}}"} {"{{profession}}"}</p>
                </div>
                <div className="flex gap-3">
                  {composeTo ? (
                    <Button
                      className="bg-[#001533] flex-1"
                      onClick={() => sendEmailMutation.mutate({ to: composeTo, subject: composeSubject, body: composeBody })}
                      disabled={sendEmailMutation.isPending || !composeTo || !composeSubject || !composeBody}
                    >
                      {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Envoyer à {composeTo.split("@")[0]}
                    </Button>
                  ) : (
                    <Button
                      className="bg-[#E8C547] text-[#001533] flex-1 font-semibold"
                      onClick={sendCampaign}
                      disabled={createCampaignMutation.isPending || !campaignName || !composeSubject || !composeBody}
                    >
                      {createCampaignMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      Lancer la campagne ({selectedContacts.length > 0 ? selectedContacts.length : filtered.length} contacts)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#001533] text-base">Templates disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun template — vos campagnes créeront des modèles réutilisables</p>
                ) : (
                  <div className="space-y-2">
                    {templates.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3 border rounded-lg cursor-pointer hover:border-[#E8C547] transition-colors"
                        onClick={() => { setComposeSubject(t.subject); setComposeBody(t.body); }}
                      >
                        <p className="font-medium text-sm text-[#001533]">{t.name}</p>
                        <p className="text-xs text-gray-500 truncate">{t.subject}</p>
                        {t.category && (
                          <Badge className="mt-1 text-xs">{t.category}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
