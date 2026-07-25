import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Calendar, ArrowLeft, ArrowRight, Facebook, Linkedin, Mail, Copy, Check } from "lucide-react";
import { useState } from "react";

// Icône WhatsApp
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Icône X (Twitter)
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// Boutons de partage pour un article (format compact, liste)
function ShareButtons({ articleId, title, excerpt }: { articleId: number; title: string; excerpt?: string }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = `https://www.synergiedour.be/news/${articleId}`;
  const text = excerpt || title;

  const links = [
    {
      name: "Facebook",
      color: "bg-[#1877F2] hover:bg-[#166fe5]",
      icon: <Facebook className="w-3.5 h-3.5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "WhatsApp",
      color: "bg-[#25D366] hover:bg-[#1ebe5d]",
      icon: <WhatsAppIcon />,
      url: `https://wa.me/?text=${encodeURIComponent(title + " — " + pageUrl)}`,
    },
    {
      name: "LinkedIn",
      color: "bg-[#0A66C2] hover:bg-[#095196]",
      icon: <Linkedin className="w-3.5 h-3.5" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "X",
      color: "bg-black hover:bg-gray-800",
      icon: <XIcon />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "Email",
      color: "bg-gray-500 hover:bg-gray-600",
      icon: <Mail className="w-3.5 h-3.5" />,
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + "\n\n" + pageUrl)}`,
    },
  ];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 mt-3">
      <span className="text-xs text-gray-400 font-medium mr-1">Partager :</span>
      {links.map((s) => (
        <a
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-xs font-semibold transition-all ${s.color}`}
          title={`Partager sur ${s.name}`}
        >
          {s.icon}
          <span className="hidden sm:inline">{s.name}</span>
        </a>
      ))}
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-all border border-gray-200"
        title="Copier le lien"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{copied ? "Copié !" : "Copier"}</span>
      </button>
    </div>
  );
}

export default function News() {
  const [, setLocation] = useLocation();
  const { data: news = [], isLoading } = trpc.news.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">Actualités</h1>
          <p className="text-[#F0E68C]">Restez informé des dernières nouvelles de Synergie Dour</p>
        </div>
      </div>

      {/* News List */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des actualités...</p>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucune actualité pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {news.map((article) => (
                <Card
                  key={article.id}
                  className="hover:shadow-lg transition-shadow border-amber-100 overflow-hidden"
                >
                  <div
                    className="grid grid-cols-1 md:grid-cols-3 gap-0 cursor-pointer"
                    onClick={() => setLocation(`/news/${article.id}`)}
                  >
                    {article.image && (
                      <div className="h-48 md:h-auto bg-gradient-to-br from-amber-200 to-blue-200 overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className={`col-span-1 ${article.image ? "md:col-span-2" : "md:col-span-3"}`}>
                      <CardHeader>
                        <CardTitle className="text-blue-900 line-clamp-2">{article.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(article.publishedAt).toLocaleDateString("fr-BE", {
                                timeZone: "Europe/Brussels",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-gray-600 line-clamp-3">
                          {article.excerpt || article.content}
                        </p>
                        <Button
                          variant="outline"
                          className="border-amber-500 text-amber-600 hover:bg-amber-50"
                          onClick={(e) => { e.stopPropagation(); setLocation(`/news/${article.id}`); }}
                        >
                          Lire l'article
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        {/* Boutons de partage */}
                        <ShareButtons
                          articleId={article.id}
                          title={article.title}
                          excerpt={article.excerpt ?? undefined}
                        />
                      </CardContent>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
