import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  ImageIcon, Share2, Calendar as CalendarIcon, Facebook,
  Instagram, Linkedin, Clock, Send, Sparkles,
  Eye, Edit3, CheckCircle2, AlertCircle, RefreshCw, Wand2, Download
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type Platform = "facebook" | "instagram" | "linkedin";
type PostStatus = "draft" | "scheduled" | "published" | "error";

interface ScheduledPost {
  id: number;
  title: string;
  content: string;
  platforms: Platform[];
  scheduled_at: string;
  status: PostStatus;
  image_url?: string;
  post_type: string;
}

// ─── Templates visuels ───────────────────────────────────────
const POST_TEMPLATES = [
  { id: "nouveau_membre",    label: "🎉 Nouveau Membre",        color: "from-blue-900 to-blue-700" },
  { id: "local_commercial",  label: "🏢 Local Commercial",      color: "from-blue-900 to-amber-700" },
  { id: "evenement",         label: "📅 Événement",             color: "from-indigo-900 to-blue-600" },
  { id: "actualite",         label: "📰 Actualité",             color: "from-blue-900 to-blue-800" },
  { id: "offre_emploi",      label: "💼 Offre d'emploi",       color: "from-blue-900 to-green-800" },
  { id: "promotion",         label: "🔥 Promotion",             color: "from-blue-900 to-red-700" },
];

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Brouillon",    color: "bg-gray-100 text-gray-700",   icon: <Edit3 className="w-3 h-3" /> },
  scheduled: { label: "Programmé",   color: "bg-blue-100 text-blue-700",   icon: <Clock className="w-3 h-3" /> },
  published: { label: "Publié",      color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  error:     { label: "Erreur",      color: "bg-red-100 text-red-700",     icon: <AlertCircle className="w-3 h-3" /> },
};

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: React.ReactNode }> = {
  facebook:  { label: "Facebook",  color: "bg-blue-600",  icon: <Facebook className="w-3 h-3" /> },
  instagram: { label: "Instagram", color: "bg-pink-600",  icon: <Instagram className="w-3 h-3" /> },
  linkedin:  { label: "LinkedIn",  color: "bg-blue-800",  icon: <Linkedin className="w-3 h-3" /> },
};

// ─── Aperçu visuel statique ──────────────────────────────────
function PostPreview({ template, data, generatedImage }: {
  template: string;
  data: { title?: string; subtitle?: string; content?: string };
  generatedImage?: string;
}) {
  const tpl = POST_TEMPLATES.find(t => t.id === template) ?? POST_TEMPLATES[0];
  if (generatedImage) {
    return (
      <div className="relative w-full aspect-square rounded-xl overflow-hidden">
        <img src={generatedImage} alt="Post généré" className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <span className="text-white text-xs font-bold">✅ Image générée par IA</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`relative w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${tpl.color} flex flex-col`}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-blue-900">SD</div>
        <div>
          <p className="text-white font-bold text-xs">Synergie Dour</p>
          <p className="text-blue-200 text-[10px]">Association des commerçants</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-2">
          <ImageIcon className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-white font-black text-lg leading-tight">
          {data.title || tpl.label}
        </h2>
        {data.subtitle && <p className="text-blue-200 text-xs mt-1">{data.subtitle}</p>}
      </div>
      {data.content && (
        <div className="mx-4 mb-3 bg-white/10 rounded-lg px-3 py-2">
          <p className="text-white text-xs leading-relaxed line-clamp-3">{data.content}</p>
        </div>
      )}
      <div className="border-t border-white/20 px-4 py-2 flex items-center justify-between">
        <span className="text-amber-400 font-bold text-[10px]">SYNERGIE DOUR</span>
        <span className="text-blue-200 text-[10px]">www.synergiedour.be</span>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────
export default function SocialMediaPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState("create");
  const [template, setTemplate] = useState("nouveau_membre");
  const [platforms, setPlatforms] = useState<Platform[]>(["facebook"]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string>("");
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    content: "",
    post_type: "nouveau_membre",
  });

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    navigate("/dashboard");
    return null;
  }

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  // ─── Générer image IA ───────────────────────────────────────
  const handleGenerateImage = async () => {
    if (!formData.title && !formData.content) {
      toast.error("Ajoutez un titre ou du contenu avant de générer l'image");
      return;
    }
    setIsGenerating(true);
    try {
      const resp = await fetch("/api/social/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...formData, template, post_type: template }),
      });
      const data = await resp.json();
      if (resp.ok && data.url) {
        setGeneratedImage(data.url);
        toast.success("Image générée avec succès !");
      } else {
        toast.error(data.message ?? "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Programmer post ────────────────────────────────────────
  const handleSchedule = async () => {
    if (!formData.content) { toast.error("Contenu requis"); return; }
    if (platforms.length === 0) { toast.error("Sélectionnez une plateforme"); return; }
    if (!selectedDate) { toast.error("Sélectionnez une date"); return; }
    setIsLoading(true);
    try {
      const scheduled_at = new Date(selectedDate);
      const [h, m] = scheduledTime.split(":").map(Number);
      scheduled_at.setHours(h, m, 0, 0);
      const resp = await fetch("/api/social/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          image_url: generatedImage || undefined,
          platforms,
          scheduled_at: scheduled_at.toISOString(),
          post_type: template,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success("Post programmé avec succès !");
        setFormData({ title: "", subtitle: "", content: "", post_type: template });
        setGeneratedImage("");
        setActiveTab("calendar");
      } else {
        toast.error(data.message ?? "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setIsLoading(false); }
  };

  // ─── Publier maintenant ─────────────────────────────────────
  const handlePublishNow = async () => {
    if (!formData.content) { toast.error("Contenu requis"); return; }
    if (platforms.length === 0) { toast.error("Sélectionnez une plateforme"); return; }
    setIsLoading(true);
    try {
      const resp = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          image_url: generatedImage || undefined,
          platforms,
          post_type: template,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast.success("Post publié sur Facebook !");
        setFormData({ title: "", subtitle: "", content: "", post_type: template });
        setGeneratedImage("");
      } else {
        toast.error(data.message ?? "Erreur de publication");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-blue-900 flex items-center gap-2">
              <Share2 className="w-6 h-6 text-amber-500" />
              Réseaux Sociaux
            </h1>
            <p className="text-gray-500 text-sm">Générez et publiez vos posts directement depuis le dashboard</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="create">✏️ Créer</TabsTrigger>
            <TabsTrigger value="calendar">📅 Calendrier</TabsTrigger>
            <TabsTrigger value="history">📋 Historique</TabsTrigger>
          </TabsList>

          {/* ─── CRÉER ─────────────────────────────────────────── */}
          <TabsContent value="create" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Formulaire */}
              <div className="space-y-4">

                {/* Type de post */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Type de publication
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {POST_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTemplate(t.id);
                            setFormData(f => ({...f, post_type: t.id}));
                            setGeneratedImage("");
                          }}
                          className={`text-left p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                            template === t.id
                              ? "border-amber-400 bg-amber-50 text-amber-800"
                              : "border-gray-200 hover:border-gray-300 text-gray-600"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Contenu */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      Contenu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Titre du post *"
                      value={formData.title}
                      onChange={e => setFormData(f => ({...f, title: e.target.value}))}
                      className="font-medium"
                    />
                    <Input
                      placeholder="Sous-titre (optionnel)"
                      value={formData.subtitle}
                      onChange={e => setFormData(f => ({...f, subtitle: e.target.value}))}
                    />
                    <Textarea
                      placeholder="Texte du post... *"
                      rows={4}
                      value={formData.content}
                      onChange={e => setFormData(f => ({...f, content: e.target.value}))}
                    />
                  </CardContent>
                </Card>

                {/* Plateformes */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Plateformes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => (
                        <button
                          key={p}
                          onClick={() => togglePlatform(p)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                            platforms.includes(p)
                              ? `${PLATFORM_CONFIG[p].color} text-white border-transparent`
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {PLATFORM_CONFIG[p].icon}
                          {PLATFORM_CONFIG[p].label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Programmer */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      Programmer la publication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={date => date < new Date(new Date().setHours(0,0,0,0))}
                      className="rounded-md border w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="max-w-[120px]"
                      />
                      <span className="text-sm text-gray-500">Heure de publication</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSchedule}
                        disabled={isLoading}
                        className="flex-1 bg-blue-900 hover:bg-blue-800"
                      >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
                        Programmer
                      </Button>
                      <Button
                        onClick={handlePublishNow}
                        disabled={isLoading}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Publier maintenant
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Aperçu + Génération IA */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      Aperçu du visuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <PostPreview
                      template={template}
                      data={formData}
                      generatedImage={generatedImage}
                    />

                    {/* Bouton génération IA */}
                    <Button
                      onClick={handleGenerateImage}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          ✨ Générer image avec IA
                        </>
                      )}
                    </Button>

                    {generatedImage && (
                      <div className="flex gap-2">
                        <a
                          href={generatedImage}
                          download="post-synergiedour.png"
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        </a>
                        <Button
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setGeneratedImage("")}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 text-center">
                      Format carré 1080×1080 · Facebook, Instagram & LinkedIn
                    </p>
                  </CardContent>
                </Card>

                {/* Info Facebook */}
                <Card className="border-blue-100 bg-blue-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Facebook className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Publication Facebook</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Les posts sont publiés directement sur la page Facebook de Synergie Dour via l'API Graph.
                          Configurez vos clés API dans les variables d'environnement Railway.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── CALENDRIER ────────────────────────────────────── */}
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Posts programmés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">
                      {selectedDate?.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}
                    </h3>
                    {scheduledPosts.filter(p => {
                      const d = new Date(p.scheduled_at);
                      return selectedDate &&
                        d.getDate() === selectedDate.getDate() &&
                        d.getMonth() === selectedDate.getMonth();
                    }).length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucun post programmé ce jour</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => setActiveTab("create")}
                        >
                          Créer un post
                        </Button>
                      </div>
                    ) : scheduledPosts.map(post => (
                      <div key={post.id} className="p-3 rounded-lg border bg-white shadow-sm mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-gray-800 truncate">{post.title}</p>
                          <Badge className={`${STATUS_CONFIG[post.status].color} flex items-center gap-1 text-xs`}>
                            {STATUS_CONFIG[post.status].icon}
                            {STATUS_CONFIG[post.status].label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(post.scheduled_at).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {post.platforms.map(p => (
                            <span key={p} className={`${PLATFORM_CONFIG[p].color} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                              {PLATFORM_CONFIG[p].label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── HISTORIQUE ────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des publications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Aucune publication pour le moment</p>
                  <p className="text-sm">Vos posts publiés apparaîtront ici</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
