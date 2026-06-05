import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

const DAYS: Record<number, string> = { 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi" };
const STATUS_LABELS: Record<string, string> = {
  draft: "En attente",
  approved: "Approuvé",
  published: "Publié",
  rejected: "Refusé",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  published: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ManagePosts() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    day_of_week: 1,
    scheduled_time: "09:00",
    platforms: "facebook,instagram",
    source_type: "manual",
  });

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    navigate("/dashboard");
    return null;
  }

  const { data: allPostsRaw, refetch } = trpc.posts.listAll.useQuery();
  const { data: pendingPostsRaw } = trpc.posts.listPending.useQuery();
  const updateStatus = trpc.posts.updateStatus.useMutation({ onSuccess: () => refetch() });
  const createPost = trpc.posts.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setNewPost({ title: "", content: "", day_of_week: 1, scheduled_time: "09:00", platforms: "facebook,instagram", source_type: "manual" });
    },
  });
  const deletePost = trpc.posts.delete.useMutation({ onSuccess: () => refetch() });

  const allPosts: any[] = Array.isArray(allPostsRaw) ? allPostsRaw : (allPostsRaw as any)?.[0] ?? [];
  const pendingPosts: any[] = Array.isArray(pendingPostsRaw) ? pendingPostsRaw : (pendingPostsRaw as any)?.[0] ?? [];
  const postList = activeTab === "pending" ? pendingPosts : allPosts;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0D1B3E] text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => navigate("/dashboard")} className="text-blue-300 text-sm mb-2 hover:underline">← Dashboard</button>
            <h1 className="text-2xl font-bold">Posts Réseaux Sociaux</h1>
            <p className="text-blue-200 text-sm mt-1">Validation et planification hebdomadaire</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Nouveau post
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Formulaire création */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 border-amber-500">
            <h2 className="text-lg font-bold text-[#0D1B3E] mb-4">Créer un nouveau post</h2>
            <div className="grid grid-cols-1 gap-4">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Titre du post"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 text-sm h-32"
                placeholder="Contenu du post (Facebook/Instagram)..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={newPost.day_of_week}
                  onChange={(e) => setNewPost({ ...newPost, day_of_week: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>{DAYS[d]}</option>
                  ))}
                </select>
                <input
                  type="time"
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={newPost.scheduled_time}
                  onChange={(e) => setNewPost({ ...newPost, scheduled_time: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => createPost.mutate(newPost)}
                  className="bg-[#0D1B3E] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 transition"
                >
                  Enregistrer en brouillon
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "pending" ? "bg-[#0D1B3E] text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            En attente
            {pendingPosts.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingPosts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "all" ? "bg-[#0D1B3E] text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            Tous les posts
          </button>
        </div>

        {/* Liste */}
        {postList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-lg">Aucun post à afficher</p>
          </div>
        ) : (
          <div className="space-y-4">
            {postList.map((post: any) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[#0D1B3E] text-white text-xs font-bold px-3 py-1 rounded-full">
                      {DAYS[post.day_of_week] ?? `Jour ${post.day_of_week}`}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{post.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {String(post.scheduled_time ?? "").slice(0, 5)} · {post.platforms}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLORS[post.status] ?? ""}`}>
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                    <span className="text-gray-400 text-sm">{expandedId === post.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {expandedId === post.id && (
                  <div className="border-t px-5 py-4 bg-gray-50 rounded-b-xl">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{post.content}</p>
                    <div className="flex gap-2 flex-wrap">
                      {post.status === "draft" && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ id: post.id, status: "approved" })}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                          >
                            ✅ Approuver
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: post.id, status: "rejected" })}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                          >
                            ❌ Refuser
                          </button>
                        </>
                      )}
                      {post.status === "approved" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: post.id, status: "published" })}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                        >
                          🚀 Marquer publié
                        </button>
                      )}
                      {post.status !== "draft" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: post.id, status: "draft" })}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition"
                        >
                          Remettre en brouillon
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Supprimer ce post définitivement ?")) deletePost.mutate({ id: post.id });
                        }}
                        className="ml-auto bg-gray-100 hover:bg-red-100 text-red-500 px-4 py-2 rounded-lg text-sm transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
