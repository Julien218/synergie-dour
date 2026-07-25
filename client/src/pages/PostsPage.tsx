import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Post {
  id: number;
  title: string;
  content: string;
  hashtags: string;
  platforms: string;
  post_type: string;
  review_status: "a_relire" | "approuve" | "publie";
  status: string;
  scheduled_at?: string;
  image_url?: string;
  source_type?: string;
  source_id?: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  nouveau_membre: "Nouveau membre",
  local_commercial: "Local commercial",
  evenement: "Événement",
  actualite: "Actualité",
  offre_emploi: "Offre emploi",
  promotion: "Promotion",
};

const REVIEW_COLORS: Record<string, string> = {
  a_relire: "bg-yellow-100 text-yellow-800 border-yellow-300",
  approuve: "bg-green-100 text-green-800 border-green-300",
  publie: "bg-blue-100 text-blue-800 border-blue-300",
};

const REVIEW_LABELS: Record<string, string> = {
  a_relire: "À relire",
  approuve: "Approuvé",
  publie: "Publié",
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterReview, setFilterReview] = useState("all");
  const [search, setSearch] = useState("");
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("post_type", filterType);
      if (filterReview !== "all") params.set("review_status", filterReview);
      params.set("limit", "100");
      const resp = await fetch(`/api/social/posts?${params}`);
      const data = await resp.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterReview]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const resp = await fetch("/api/social/posts/sync", { method: "POST" });
      const data = await resp.json();
      toast(`Sync terminée — ${data.created} nouveaux posts créés`);
      fetchPosts();
    } catch {
      toast.error("Erreur synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = () => {
    window.open("/api/social/posts/export-csv", "_blank");
  };

  const handleReviewChange = async (postId: number, review_status: string) => {
    try {
      await fetch(`/api/social/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status }),
      });
      fetchPosts();
      toast("Statut mis à jour");
    } catch {
      toast.error("Erreur mise à jour");
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("Supprimer ce post ?")) return;
    try {
      await fetch(`/api/social/posts/${postId}`, { method: "DELETE" });
      fetchPosts();
      toast("Post supprimé");
    } catch {
      toast.error("Erreur suppression");
    }
  };

  const handleSaveEdit = async () => {
    if (!editPost) return;
    try {
      await fetch(`/api/social/posts/${editPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPost),
      });
      setEditOpen(false);
      fetchPosts();
      toast("Post mis à jour");
    } catch {
      toast.error("Erreur sauvegarde");
    }
  };

  const filtered = posts.filter(p =>
    search === "" ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    a_relire: posts.filter(p => p.review_status === "a_relire").length,
    approuve: posts.filter(p => p.review_status === "approuve").length,
    publie: posts.filter(p => p.review_status === "publie").length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#001533]">Posts à publier</h1>
            <p className="text-gray-500 text-sm mt-1">
              {total} posts générés automatiquement depuis les membres et locaux
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSync} disabled={syncing}
              className="bg-[#001533] hover:bg-[#1a3ba0] text-white">
              {syncing ? "Synchronisation..." : "🔄 Sync membres & locaux"}
            </Button>
            <Button onClick={handleExportCSV} variant="outline"
              className="border-[#E8C547] text-[#001533] hover:bg-[#E8C547]/10">
              📥 Export CSV
            </Button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.a_relire}</div>
            <div className="text-sm text-yellow-600">À relire</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.approuve}</div>
            <div className="text-sm text-green-600">Approuvés</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.publie}</div>
            <div className="text-sm text-blue-600">Publiés</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 bg-white border rounded-lg p-4">
          <Input placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type de post" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterReview} onValueChange={setFilterReview}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="a_relire">À relire</SelectItem>
              <SelectItem value="approuve">Approuvés</SelectItem>
              <SelectItem value="publie">Publiés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste des posts */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">Aucun post trouvé</p>
            <p className="text-sm">Cliquez sur "Sync membres & locaux" pour générer les posts automatiquement</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(post => (
              <div key={post.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-medium bg-[#001533]/10 text-[#001533] px-2 py-0.5 rounded">
                        {TYPE_LABELS[post.post_type] || post.post_type}
                      </span>
                      <span className={`text-xs font-medium border px-2 py-0.5 rounded ${REVIEW_COLORS[post.review_status]}`}>
                        {REVIEW_LABELS[post.review_status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString("fr-BE")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[#001533] truncate">{post.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                    {post.hashtags && (
                      <p className="text-xs text-[#1a3ba0] mt-1 truncate">{post.hashtags}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      📱 {post.platforms?.split(",").join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-fit">
                    <Button size="sm" variant="outline"
                      onClick={() => { setEditPost(post); setEditOpen(true); }}>
                      ✏️ Modifier
                    </Button>
                    {post.review_status === "a_relire" && (
                      <Button size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleReviewChange(post.id, "approuve")}>
                        ✅ Approuver
                      </Button>
                    )}
                    {post.review_status === "approuve" && (
                      <Button size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleReviewChange(post.id, "publie")}>
                        📤 Marquer publié
                      </Button>
                    )}
                    <Button size="sm" variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(post.id)}>
                      🗑️ Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog édition */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le post</DialogTitle>
            </DialogHeader>
            {editPost && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Titre</label>
                  <Input value={editPost.title}
                    onChange={e => setEditPost({ ...editPost, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Contenu</label>
                  <Textarea value={editPost.content} rows={8}
                    onChange={e => setEditPost({ ...editPost, content: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Hashtags</label>
                  <Input value={editPost.hashtags || ""}
                    onChange={e => setEditPost({ ...editPost, hashtags: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Date de publication suggérée</label>
                  <Input type="date" value={editPost.scheduled_at?.slice(0, 10) || ""}
                    onChange={e => setEditPost({ ...editPost, scheduled_at: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
                  <Button onClick={handleSaveEdit}
                    className="bg-[#001533] hover:bg-[#1a3ba0] text-white">
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
