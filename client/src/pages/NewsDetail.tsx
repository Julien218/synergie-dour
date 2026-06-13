import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";

export default function NewsDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const articleId = parseInt(params.id || "0", 10);

  const { data: article, isLoading } = trpc.news.getById.useQuery(articleId, {
    enabled: !!articleId,
  });

  const { data: allNews = [] } = trpc.news.list.useQuery();
  const related = allNews.filter((n: any) => n.id !== articleId).slice(0, 3);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-4 border-[#003d99] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement de l'article...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#001a3d] mb-4">Article introuvable</h1>
          <p className="text-gray-500 mb-8">Cet article n'existe pas ou a été supprimé.</p>
          <Button onClick={() => setLocation("/news")} className="bg-[#001a3d] hover:bg-[#003d99] text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux actualités
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001a3d] to-[#003d99] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => setLocation("/news")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux actualités
          </Button>
          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30 mb-4">
            Actualité
          </Badge>
          <h1
            className="text-3xl md:text-4xl font-bold leading-tight mb-4"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-blue-200 text-sm">
            {article.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(article.publishedAt).toLocaleDateString("fr-BE", {
                  timeZone: "Europe/Brussels",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {Math.max(1, Math.ceil((article.content?.length || 0) / 1000))} min de lecture
            </span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Article principal */}
          <div className="lg:col-span-2">
            {/* Image si disponible */}
            {article.image && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-md">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full object-cover max-h-72"
                />
              </div>
            )}

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-gray-600 font-medium border-l-4 border-[#D4AF37] pl-4 mb-8 italic">
                {article.excerpt}
              </p>
            )}

            {/* Contenu HTML ou texte */}
            {article.content && (
              <div
                className="prose prose-lg max-w-none text-gray-700 leading-relaxed
                  prose-headings:text-[#001a3d] prose-headings:font-bold
                  prose-a:text-[#003d99] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-[#001a3d]
                  prose-ul:list-disc prose-ul:pl-6
                  prose-li:mb-1"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            )}

            {/* Partager */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center gap-3">
              <span className="text-sm text-gray-500">Partager :</span>
              <Button
                size="sm"
                variant="outline"
                className="border-[#003d99] text-[#003d99] hover:bg-[#003d99] hover:text-white"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: article.title, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Lien copié !");
                  }
                }}
              >
                <Share2 className="w-3 h-3 mr-2" />
                Partager cet article
              </Button>
            </div>
          </div>

          {/* Sidebar — Articles récents */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h3
                className="text-sm font-semibold text-[#001a3d] uppercase tracking-wider mb-4"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Autres actualités
              </h3>
              <div className="space-y-4">
                {related.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => setLocation(`/news/${item.id}`)}
                    className="cursor-pointer group"
                  >
                    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-[#003d99]/30 transition-all">
                      <p className="text-sm font-semibold text-[#001a3d] group-hover:text-[#003d99] line-clamp-2 mb-2">
                        {item.title}
                      </p>
                      {item.publishedAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(item.publishedAt).toLocaleDateString("fr-BE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Europe/Brussels",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Adhésion */}
              <div className="mt-8 bg-gradient-to-br from-[#001a3d] to-[#003d99] rounded-xl p-5 text-white text-center">
                <p className="font-bold text-sm mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Rejoindre Synergie Dour
                </p>
                <p className="text-blue-200 text-xs mb-4">50 €/an — Adhésion 2026</p>
                <Button
                  size="sm"
                  className="bg-[#D4AF37] hover:bg-[#b8972e] text-[#001a3d] font-bold w-full"
                  onClick={() => setLocation("/membership")}
                >
                  Devenir membre
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
