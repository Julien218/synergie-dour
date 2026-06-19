import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  ImageIcon, Share2, Calendar as CalendarIcon, Facebook,
  Instagram, Linkedin, Clock, Plus, Trash2, Send, Sparkles,
  Eye, Edit3, CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";
import { trpc } from "@/lib/trpc";

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

// ─── Composant Aperçu Visuel ─────────────────────────────────
function PostPreview({ template, data }: { template: string; data: any }) {
  const tpl = POST_TEMPLATES.find(t => t.id === template) ?? POST_TEMPLATES[0];
  return (
    <div className={`relative w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${tpl.color} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-blue-900">SD</div>
        <div>
          <p className="text-white font-bold text-xs">Synergie Dour</p>
          <p className="text-blue-200 text-[10px]">Association des commerçants</p>
        </div>
        <div className="ml-auto">
          <span className="bg-amber-400 text-blue-900 text-[9px] font-black px-2 py-0.5 rounded">NOUVELLE OPPORTUNITÉ</span>
        </div>
      </div>
      {/* Titre */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-2">
          <ImageIcon className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-white font-black text-lg leading-tight">
          {data.title || tpl.label}
        </h2>
        {data.subtitle && (
          <p className="text-blue-200 text-xs mt-1">{data.subtitle}</p>
        )}
      </div>
      {/* Contenu */}
      {data.content && (
        <div className="mx-4 mb-3 bg-white/10 rounded-lg px-3 py-2">
          <p className="text-white text-xs leading-relaxed line-clamp-3">{data.content}</p>
        </div>
      )}
      {/* Footer */}
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

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    content: "",
    image_url: "",
    post_type: "nouveau_membre",
  });

  // Données mock pour le calendrier (en attendant l'API Facebook)
  const scheduledPosts: ScheduledPost[] = [
    {
      id: 1,
      title: "Nouveau membre — Boulangerie Martin",
      content: "Nous accueillons un nouveau membre dans notre réseau !",
      platforms: ["facebook", "instagram"],
      scheduled_at: new Date().toISOString(),
      status: "scheduled",
      post_type: "nouveau_membre",
    },
    {
      id: 2,
      title: "Local disponible — Grand'Place 12",
      content: "Un local commercial de 80m² est disponible.",
      platforms: ["facebook", "linkedin"],
      scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: "scheduled",
      post_type: "local_commercial",
    },
  ];

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    navigate("/dashboard");
    return null;
  }

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleSchedule = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Titre et contenu requis");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Sélectionnez au moins une plateforme");
      return;
    }
    if (!selectedDate) {
      toast.error("Sélectionnez une date");
      return;
    }
    setIsLoading(true);
    try {
      const scheduled_at = new Date(selectedDate);
      const [h, m] = scheduledTime.split(":").map(Number);
      scheduled_at.setHours(h, m, 0, 0);

      // Appel API pour programmer le post Facebook
      const response = await fetch("/api/social/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          platforms,
          scheduled_at: scheduled_at.toISOString(),
          post_type: template,
        }),
      });

      if (response.ok) {
        toast.success("Post programmé avec succès !");
        setFormData({ title: "", subtitle: "", content: "", image_url: "", post_type: template });
        setActiveTab("calendar");
      } else {
        const err = await response.json();
        toast.error(err.message ?? "Erreur lors de la programmation");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Titre et contenu requis");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, platforms, post_type: template }),
      });
      if (response.ok) {
        toast.success("Post publié sur les réseaux sociaux !");
      } else {
        const err = await response.json();
        toast.error(err.message ?? "Erreur de publication");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
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
            <p className="text-gray-500 text-sm">Créez et programmez vos publications</p>
          </div>
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Facebook connecté
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="create">✏️ Créer</TabsTrigger>
            <TabsTrigger value="calendar">📅 Calendrier</TabsTrigger>
            <TabsTrigger value="history">📋 Historique</TabsTrigger>
          </TabsList>

          {/* ─── ONGLET CRÉER ─────────────────────────────────── */}
          <TabsContent value="create" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Formulaire */}
              <div className="space-y-4">

                {/* Sélection template */}
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
                          onClick={() => { setTemplate(t.id); setFormData(f => ({...f, post_type: t.id})); }}
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
                      placeholder="Titre du post"
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
                      placeholder="Contenu du post..."
                      rows={4}
                      value={formData.content}
                      onChange={e => setFormData(f => ({...f, content: e.target.value}))}
                    />
                    <Input
                      placeholder="URL image (optionnel)"
                      value={formData.image_url}
                      onChange={e => setFormData(f => ({...f, image_url: e.target.value}))}
                    />
                  </CardContent>
                </Card>

                {/* Plateformes */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Plateformes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
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

                {/* Programmation */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      Programmer
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
                        variant="outline"
                        className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Publier maintenant
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Aperçu */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      Aperçu du visuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PostPreview template={template} data={formData} />
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Format carré 1080×1080 · Facebook & Instagram
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── ONGLET CALENDRIER ────────────────────────────── */}
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Posts programmés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700">
                      Posts du {selectedDate?.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}
                    </h3>
                    {scheduledPosts.filter(p => {
                      const d = new Date(p.scheduled_at);
                      return selectedDate &&
                        d.getDate() === selectedDate.getDate() &&
                        d.getMonth() === selectedDate.getMonth();
                    }).map(post => (
                      <div key={post.id} className="p-3 rounded-lg border bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-800 truncate">{post.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(post.scheduled_at).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <Badge className={`${STATUS_CONFIG[post.status].color} flex items-center gap-1 text-xs`}>
                            {STATUS_CONFIG[post.status].icon}
                            {STATUS_CONFIG[post.status].label}
                          </Badge>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {post.platforms.map(p => (
                            <span key={p} className={`${PLATFORM_CONFIG[p].color} text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1`}>
                              {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {scheduledPosts.filter(p => {
                      const d = new Date(p.scheduled_at);
                      return selectedDate &&
                        d.getDate() === selectedDate.getDate() &&
                        d.getMonth() === selectedDate.getMonth();
                    }).length === 0 && (
                      <p className="text-gray-400 text-sm">Aucun post programmé ce jour</p>
                    )}
                  </div>
                </div>

                {/* Liste tous les posts */}
                <h3 className="font-semibold text-gray-700 mb-3">Tous les posts à venir</h3>
                <div className="space-y-2">
                  {scheduledPosts.map(post => (
                    <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{post.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.scheduled_at).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })} à{" "}
                          {new Date(post.scheduled_at).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {post.platforms.map(p => (
                          <span key={p} className={`${PLATFORM_CONFIG[p].color} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                            {PLATFORM_CONFIG[p].label}
                          </span>
                        ))}
                      </div>
                      <Badge className={`${STATUS_CONFIG[post.status].color} flex items-center gap-1 text-xs whitespace-nowrap`}>
                        {STATUS_CONFIG[post.status].icon}
                        {STATUS_CONFIG[post.status].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ONGLET HISTORIQUE ────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des publications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Historique vide</p>
                  <p className="text-sm">Vos publications apparaîtront ici</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
