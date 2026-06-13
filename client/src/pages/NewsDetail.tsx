import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Copy, Check, Facebook, Linkedin, Twitter, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";

// Icône WhatsApp (SVG inline)
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Icône X (Twitter)
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function NewsDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/news/:id");
  const articleId = parseInt(params?.id || "0", 10);
  const [copied, setCopied] = useState(false);

  const { data: article, isLoading } = trpc.news.getById.useQuery(articleId, {
    enabled: !!articleId,
  });
  const { data: allNews = [] } = trpc.news.list.useQuery();
  const related = allNews.filter((n: any) => n.id !== articleId).slice(0, 3);

  const pageUrl = typeof window !== "undefined" ? window.location.href : `https://www.synergiedour.be/news/${articleId}`;
  const pageTitle = article?.title || "Actualité Synergie Dour";
  const pageExcerpt = article?.excerpt || "Découvrez les dernières actualités de Synergie Dour, l'association des commerçants et indépendants de Dour.";

  const shareLinks = [
    {
      name: "Facebook",
      color: "bg-[#1877F2] hover:bg-[#166fe5]",
      icon: <Facebook className="w-4 h-4" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "WhatsApp",
      color: "bg-[#25D366] hover:bg-[#1ebe5d]",
      icon: <WhatsAppIcon />,
      url: `https://wa.me/?text=${encodeURIComponent(pageTitle + " — " + pageUrl)}`,
    },
    {
      name: "LinkedIn",
      color: "bg-[#0A66C2] hover:bg-[#095196]",
      icon: <Linkedin className="w-4 h-4" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "X",
      color: "bg-black hover:bg-gray-800",
      icon: <XIcon />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(pageTitle)}&url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "Email",
      color: "bg-gray-600 hover:bg-gray-700",
      icon: <Mail className="w-4 h-4" />,
      url: `mailto:?subject=${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(pageExcerpt + "\n\n" + pageUrl)}`,
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
          <div className="flex flex-wrap items-center gap-4 text-blue-200 text-sm">
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

          {/* Boutons de partage — dans le hero */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-blue-300 text-xs uppercase tracking-wider mr-1 font-medium">Partager :</span>
            {shareLinks.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all ${s.color}`}
                title={`Partager sur ${s.name}`}
              >
                {s.icon}
                {s.name}
              </a>
            ))}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20"
              title="Copier le lien"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié !" : "Copier le lien"}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Article principal */}
          <div className="lg:col-span-2">
            {article.image && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-md">
                <img src={article.image} alt={article.title} className="w-full object-cover max-h-72" />
              </div>
            )}

            {article.excerpt && (
              <p className="text-lg text-gray-600 font-medium border-l-4 border-[#D4AF37] pl-4 mb-8 italic">
                {article.excerpt}
              </p>
            )}

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

            {/* Barre de partage bas de page */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <p className="text-sm font-semibold text-[#001a3d] mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Cet article vous a plu ? Partagez-le !
              </p>
              <div className="flex flex-wrap gap-2">
                {shareLinks.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-all ${s.color}`}
                  >
                    {s.icon}
                    {s.name}
                  </a>
                ))}
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Lien copié !" : "Copier le lien"}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Autres articles */}
              {related.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#001a3d] uppercase tracking-wider mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
                    Autres actualités
                  </h3>
                  <div className="space-y-3">
                    {related.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => setLocation(`/news/${item.id}`)}
                        className="cursor-pointer group bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-[#003d99]/30 transition-all"
                      >
                        <p className="text-sm font-semibold text-[#001a3d] group-hover:text-[#003d99] line-clamp-2 mb-1">
                          {item.title}
                        </p>
                        {item.publishedAt && (
                          <p className="text-xs text-gray-400">
                            {new Date(item.publishedAt).toLocaleDateString("fr-BE", {
                              day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Brussels",
                            })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Adhésion */}
              <div className="bg-gradient-to-br from-[#001a3d] to-[#003d99] rounded-xl p-5 text-white text-center">
                <p className="font-bold text-sm mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
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
