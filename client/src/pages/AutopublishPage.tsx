import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Facebook, Instagram, Linkedin, Music2, Clock, CheckCircle2, AlertCircle,
  Edit3, Send, Calendar as CalendarIcon, Copy, Trash2, RefreshCw, Plus, Upload, FileEdit,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

type Platform = "facebook" | "instagram" | "tiktok" | "linkedin";
type Status = "draft" | "validated" | "scheduled" | "publishing" | "published" | "error";

interface AutopublishPost {
  id: number;
  title: string;
  content_facebook: string | null;
  content_instagram: string | null;
  content_tiktok: string | null;
  content_linkedin: string | null;
  hashtags: string | null;
  media_url: string | null;
  media_type: "image" | "video" | null;
  platforms: Platform[];
  scheduled_at: string | null;
  status: Status;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PublicationLog {
  id: number;
  platform: Platform;
  status: "success" | "error";
  external_post_url: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  draft:      { label: "Brouillon",  color: "bg-gray-100 text-gray-700 border-gray-300",     icon: <Edit3 className="w-3 h-3" /> },
  validated:  { label: "Validé",     color: "bg-indigo-100 text-indigo-700 border-indigo-300", icon: <CheckCircle2 className="w-3 h-3" /> },
  scheduled:  { label: "Programmé",  color: "bg-blue-100 text-blue-700 border-blue-300",     icon: <Clock className="w-3 h-3" /> },
  publishing: { label: "En cours",   color: "bg-amber-100 text-amber-700 border-amber-300",  icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  published:  { label: "Publié",     color: "bg-green-100 text-green-700 border-green-300",  icon: <CheckCircle2 className="w-3 h-3" /> },
  error:      { label: "Erreur",     color: "bg-red-100 text-red-700 border-red-300",        icon: <AlertCircle className="w-3 h-3" /> },
};

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: React.ReactNode }> = {
  facebook:  { label: "Facebook",  color: "bg-blue-600 text-white",  icon: <Facebook className="w-3 h-3" /> },
  instagram: { label: "Instagram", color: "bg-pink-600 text-white",  icon: <Instagram className="w-3 h-3" /> },
  tiktok:    { label: "TikTok",    color: "bg-black text-white",     icon: <Music2 className="w-3 h-3" /> },
  linkedin:  { label: "LinkedIn",  color: "bg-blue-800 text-white",  icon: <Linkedin className="w-3 h-3" /> },
};

const EMPTY_FORM = {
  id: 0,
  title: "",
  content_facebook: "",
  content_instagram: "",
  content_tiktok: "",
  content_linkedin: "",
  hashtags: "#SynergieDour #JsInnovIA",
  media_url: "",
  media_type: null as "image" | "video" | null,
  platforms: [] as Platform[],
  scheduled_at: "",
};

export default function AutopublishPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<AutopublishPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<{ post: AutopublishPost; logs: PublicationLog[] } | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<AutopublishPost | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const resp = await fetch(`/api/autopublish/posts?${params}`, { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) {
          toast.error("Session expirée ou accès non autorisé");
        } else if (resp.status >= 500) {
          toast.error("Erreur serveur AutoPublish");
        } else {
          toast.error(`Erreur de chargement (${resp.status})`);
        }
        return;
      }
      const data = await resp.json();
      setPosts(data.posts || []);
    } catch {
      toast.error("Erreur de chargement des posts");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-red-600">Accès réservé aux administrateurs</div>
      </DashboardLayout>
    );
  }

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (post: AutopublishPost) => {
    setForm({
      id: post.id,
      title: post.title,
      content_facebook: post.content_facebook || "",
      content_instagram: post.content_instagram || "",
      content_tiktok: post.content_tiktok || "",
      content_linkedin: post.content_linkedin || "",
      hashtags: post.hashtags || "",
      media_url: post.media_url || "",
      media_type: post.media_type,
      platforms: post.platforms,
      scheduled_at: post.scheduled_at ? post.scheduled_at.slice(0, 16) : "",
    });
    setFormOpen(true);
  };

  const togglePlatform = (p: Platform) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const resp = await fetch("/api/autopublish/media/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_base64: dataUrl,
          content_type: file.type,
          file_name: file.name,
          media_type: isVideo ? "video" : "image",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message);
      setForm(f => ({ ...f, media_url: data.media_url, media_type: data.media_type }));
      toast.success("Média hébergé — URL publique prête");
    } catch (err: any) {
      toast.error(err.message || "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const saveForm = async () => {
    if (!form.title) return toast.error("Le titre est requis");
    if (form.platforms.length === 0) return toast.error("Sélectionne au moins une plateforme");
    setSaving(true);
    try {
      const isEdit = form.id > 0;
      const resp = await fetch(isEdit ? `/api/autopublish/posts/${form.id}` : "/api/autopublish/posts", {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content_facebook: form.content_facebook || null,
          content_instagram: form.content_instagram || null,
          content_tiktok: form.content_tiktok || null,
          content_linkedin: form.content_linkedin || null,
          hashtags: form.hashtags || null,
          media_url: form.media_url || null,
          media_type: form.media_type,
          platforms: form.platforms,
          scheduled_at: form.scheduled_at || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message);
      toast.success(isEdit ? "Post mis à jour" : "Brouillon créé");
      setFormOpen(false);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.message || "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const callAction = async (id: number, action: string, method = "POST", body?: any) => {
    try {
      const resp = await fetch(`/api/autopublish/posts/${id}/${action}`, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message);
      return data;
    } catch (err: any) {
      toast.error(err.message || "Erreur");
      throw err;
    }
  };

  const doValidate = async (p: AutopublishPost) => {
    await callAction(p.id, "validate");
    toast.success("Post validé");
    fetchPosts();
  };

  const doDuplicate = async (p: AutopublishPost) => {
    await callAction(p.id, "duplicate");
    toast.success("Post dupliqué en brouillon");
    fetchPosts();
  };

  const doDelete = async (p: AutopublishPost) => {
    if (!confirm(`Supprimer le post "${p.title}" ?`)) return;
    await callAction(p.id, "", "DELETE");
    toast.success("Post supprimé");
    fetchPosts();
  };

  const doPublishNow = async (p: AutopublishPost) => {
    if (!confirm(`Publier "${p.title}" immédiatement sur ${p.platforms.join(", ")} ?`)) return;
    try {
      const data = await callAction(p.id, "publish-now");
      toast[data.overallSuccess ? "success" : "error"](
        data.overallSuccess ? "Publié avec succès sur toutes les plateformes" : "Publication partielle — voir les détails"
      );
      fetchPosts();
    } catch { /* toast déjà affiché */ }
  };

  const doRetry = async (p: AutopublishPost) => {
    const data = await callAction(p.id, "retry");
    toast[data.overallSuccess ? "success" : "error"](data.overallSuccess ? "Publication relancée avec succès" : "Toujours en échec sur certaines plateformes");
    fetchPosts();
  };

  const openSchedule = (p: AutopublishPost) => {
    setScheduleTarget(p);
    setScheduleValue(p.scheduled_at ? p.scheduled_at.slice(0, 16) : "");
  };

  const confirmSchedule = async () => {
    if (!scheduleTarget || !scheduleValue) return;
    await callAction(scheduleTarget.id, "schedule", "POST", { scheduled_at: scheduleValue.replace("T", " ") + ":00" });
    toast.success("Publication programmée");
    setScheduleTarget(null);
    fetchPosts();
  };

  const openDetail = async (p: AutopublishPost) => {
    try {
      const resp = await fetch(`/api/autopublish/posts/${p.id}`, { credentials: "include" });
      if (!resp.ok) {
        if (resp.status === 401) {
          toast.error("Session expirée ou accès non autorisé");
        } else if (resp.status >= 500) {
          toast.error("Erreur serveur AutoPublish");
        } else {
          toast.error(`Erreur de chargement des détails (${resp.status})`);
        }
        return;
      }
      const data = await resp.json();
      setDetail(data);
    } catch {
      toast.error("Impossible de charger les détails");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#001533]">Synergie AutoPublish</h1>
            <p className="text-sm text-gray-500">Programmation et publication automatique — Facebook, Instagram, TikTok, LinkedIn</p>
          </div>
          <Button onClick={openCreate} className="bg-[#001533] hover:bg-[#001533]/90">
            <Plus className="w-4 h-4 mr-1" /> Nouveau post
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm text-gray-600">Statut :</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchPosts}><RefreshCw className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : posts.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-gray-500">Aucun post pour ce filtre.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {posts.map(post => {
              const st = STATUS_CONFIG[post.status];
              return (
                <Card key={post.id} className="hover:shadow-md transition-shadow border-amber-100">
                  <CardContent className="py-4 flex flex-wrap items-center gap-3 justify-between">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openDetail(post)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#001533] truncate">{post.title}</p>
                        <Badge className={`text-xs border ${st.color}`}>{st.icon}<span className="ml-1">{st.label}</span></Badge>
                        {post.platforms.map(p => (
                          <Badge key={p} className={`text-xs ${PLATFORM_CONFIG[p].color}`}>{PLATFORM_CONFIG[p].icon}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {post.scheduled_at
                          ? new Date(post.scheduled_at).toLocaleString("fr-BE", { timeZone: "Europe/Brussels" })
                          : "Non programmé"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {post.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEdit(post)}><FileEdit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => doValidate(post)}>Valider</Button>
                        </>
                      )}
                      {post.status === "validated" && (
                        <Button size="sm" variant="outline" onClick={() => openSchedule(post)}>Programmer</Button>
                      )}
                      {(post.status === "validated" || post.status === "scheduled" || post.status === "error") && (
                        <Button size="sm" onClick={() => doPublishNow(post)} className="bg-[#001533]"><Send className="w-3.5 h-3.5 mr-1" />Publier maintenant</Button>
                      )}
                      {post.status === "error" && (
                        <Button size="sm" variant="outline" onClick={() => doRetry(post)}><RefreshCw className="w-3.5 h-3.5 mr-1" />Réessayer</Button>
                      )}
                      {post.status === "scheduled" && (
                        <Button size="sm" variant="outline" onClick={() => openSchedule(post)}>Reprogrammer</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => doDuplicate(post)}><Copy className="w-3.5 h-3.5" /></Button>
                      {post.status !== "published" && (
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => doDelete(post)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Dialog création / édition ─────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0D1B3E] text-white">
          <DialogHeader><DialogTitle className="text-white">{form.id ? "Modifier le post" : "Nouveau post"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Titre interne</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex : Vidéo — Réforme fiscale juillet" className="text-white placeholder:text-white/50 border-white/20 bg-white/10" />
            </div>

            <div>
              <Label className="text-white">Plateformes</Label>
              <div className="flex gap-4 mt-1">
                {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => (
                  <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer text-white">
                    <Checkbox checked={form.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                    {PLATFORM_CONFIG[p].label}
                  </label>
                ))}
              </div>
            </div>

            <Tabs defaultValue="facebook">
              <TabsList>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
                <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              </TabsList>
              <TabsContent value="facebook">
                <Textarea rows={4} value={form.content_facebook} onChange={e => setForm(f => ({ ...f, content_facebook: e.target.value }))} placeholder="Texte Facebook..." className="text-white placeholder:text-white/50 border-white/20 bg-white/10" />
              </TabsContent>
              <TabsContent value="instagram">
                <Textarea rows={4} value={form.content_instagram} onChange={e => setForm(f => ({ ...f, content_instagram: e.target.value }))} placeholder="Texte Instagram..." className="text-white placeholder:text-white/50 border-white/20 bg-white/10" />
              </TabsContent>
              <TabsContent value="tiktok">
                <Textarea rows={4} value={form.content_tiktok} onChange={e => setForm(f => ({ ...f, content_tiktok: e.target.value }))} placeholder="Texte TikTok..." className="text-white placeholder:text-white/50 border-white/20 bg-white/10" />
              </TabsContent>
              <TabsContent value="linkedin">
                <Textarea rows={4} value={form.content_linkedin} onChange={e => setForm(f => ({ ...f, content_linkedin: e.target.value }))} placeholder="Texte LinkedIn..." className="text-white placeholder:text-white/50 border-white/20 bg-white/10" />
              </TabsContent>
            </Tabs>

            <div>
              <Label className="text-white">Hashtags</Label>
              <Input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} className="text-white placeholder:text-white/50 border-white/20 bg-white/10" />
            </div>

            <div>
              <Label className="text-white">Média (image ou vidéo)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                />
                {uploading && <Upload className="w-4 h-4 animate-pulse text-amber-600" />}
              </div>
              {form.media_url && (
                <p className="text-xs text-green-700 mt-1 truncate">✓ Média hébergé : {form.media_url}</p>
              )}
            </div>

            <div>
              <Label className="text-white">Date/heure de programmation (optionnel à ce stade)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="text-white border-white/20 bg-white/10 [color-scheme:dark]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} className="border-white/30 text-white hover:bg-white/10">Annuler</Button>
            <Button onClick={saveForm} disabled={saving} className="bg-[#001533]">
              {saving ? "Enregistrement..." : "Enregistrer le brouillon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog programmation ──────────────────────────────────────── */}
      <Dialog open={!!scheduleTarget} onOpenChange={o => !o && setScheduleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Programmer "{scheduleTarget?.title}"</DialogTitle></DialogHeader>
          <Input type="datetime-local" value={scheduleValue} onChange={e => setScheduleValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleTarget(null)}>Annuler</Button>
            <Button onClick={confirmSchedule} className="bg-[#001533]">Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog détail (aperçus + logs) ────────────────────────────── */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.post.title}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {detail.post.platforms.map(p => (
                  <div key={p} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-1.5 mb-1 font-medium text-sm">
                      {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                      {(detail.post as any)[`content_${p}`] || <span className="italic text-gray-400">Pas de texte</span>}
                    </p>
                  </div>
                ))}
              </div>
              {detail.post.media_url && (
                detail.post.media_type === "video"
                  ? <video src={detail.post.media_url} controls className="w-full rounded-lg max-h-64" />
                  : <img src={detail.post.media_url} className="w-full rounded-lg max-h-64 object-cover" />
              )}
              <div>
                <p className="font-medium text-sm mb-2">Historique des publications</p>
                {detail.logs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune tentative pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between text-xs border-b pb-1.5">
                        <div className="flex items-center gap-2">
                          <Badge className={log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {PLATFORM_CONFIG[log.platform].label}
                          </Badge>
                          {log.status === "success"
                            ? (log.external_post_url ? <a href={log.external_post_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Voir le post</a> : "Publié")
                            : <span className="text-red-600">{log.error_message}</span>}
                        </div>
                        <span className="text-gray-400">{new Date(log.created_at).toLocaleString("fr-BE", { timeZone: "Europe/Brussels" })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
