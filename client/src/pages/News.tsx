import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Calendar, User, ArrowLeft, ArrowRight } from "lucide-react";

export default function News() {
  const { data: news = [], isLoading } = trpc.news.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-6">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2">Actualités</h1>
          <p className="text-blue-100">Restez informé des dernières nouvelles de Synergie Dour</p>
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
                <Link key={article.id} href={`/news/${article.id}`}>
                  <Card className="hover:shadow-lg transition-shadow border-amber-100 cursor-pointer overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
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
                                {new Date(article.publishedAt).toLocaleDateString("fr-FR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-gray-600 line-clamp-3">
                            {article.excerpt || article.content}
                          </p>
                          <Button
                            variant="outline"
                            className="border-amber-500 text-amber-600 hover:bg-amber-50"
                          >
                            Lire l'article
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
