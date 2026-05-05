import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Calendar, MapPin, AlertCircle } from "lucide-react";
import {
  getResourceBySlug,
  RESOURCE_CATEGORIES,
} from "@/data/resources";
import NotFound from "./NotFound";

export default function Resource() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ slug: string }>("/resources/:slug");
  const slug = params?.slug ?? "";
  const resource = getResourceBySlug(slug);

  if (!resource) {
    return <NotFound />;
  }

  const categoryInfo = RESOURCE_CATEGORIES[resource.category];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button
            onClick={() => setLocation("/resources")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Toutes les ressources
          </Button>
          <Badge className="mb-4 bg-[#D4AF37] text-[#001a3d] hover:bg-[#F0E68C]">
            {categoryInfo.label}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#D4AF37]">
            {resource.title}
          </h1>
          <p className="text-lg text-[#F0E68C] max-w-3xl">{resource.summary}</p>
          <div className="flex items-center gap-2 mt-6 text-sm text-blue-100">
            <Calendar className="w-4 h-4" />
            <span>Information vérifiée le {formatDate(resource.verifiedAt)}</span>
          </div>
        </div>
      </div>

      {/* Verification banner */}
      <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
        <div className="container mx-auto max-w-4xl flex items-start gap-2 text-sm text-gray-800">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <p>
            Cette fiche est une synthèse. Pour les montants exacts, dates limites et conditions
            précises, vérifiez toujours la source officielle liée en bas de page.
          </p>
        </div>
      </div>

      {/* Content */}
      <article className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="prose prose-lg max-w-none">
            {resource.content.split("\n\n").map((paragraph, idx) => (
              <p
                key={idx}
                className="text-gray-800 leading-relaxed mb-5"
                dangerouslySetInnerHTML={{ __html: renderInline(paragraph) }}
              />
            ))}
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-200">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </article>

      {/* Sources officielles */}
      <section className="bg-blue-50 border-y border-blue-200 py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-xl font-bold text-[#001a3d] mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Sources officielles
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            Toujours vérifier l'information à jour sur ces sites de référence :
          </p>
          <ul className="space-y-2">
            {resource.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#003d99] hover:text-[#001a3d] font-medium underline-offset-4 hover:underline"
                >
                  {link.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                  {link.type === "officiel" && (
                    <Badge variant="outline" className="ml-1 text-xs bg-blue-100 text-blue-900 border-blue-300">
                      officiel
                    </Badge>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Local contacts */}
      {resource.localContacts && resource.localContacts.length > 0 && (
        <section className="py-10 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-xl font-bold text-[#001a3d] mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Aide locale à Dour / Borinage
            </h2>
            <ul className="space-y-2 text-gray-800">
              {resource.localContacts.map((contact, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-[#D4AF37] font-bold">•</span>
                  <span>{contact}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Final disclaimer */}
      <div className="bg-gray-50 border-t border-gray-200 py-8 px-4">
        <div className="container mx-auto max-w-3xl text-center text-sm text-gray-700">
          <p>
            <strong className="text-[#001a3d]">Important.</strong> Cette fiche est fournie à
            titre informatif. Pour votre situation propre, consultez votre comptable, votre
            caisse d'assurances sociales ou un conseiller juridique.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Rend un sous-ensemble de markdown inline en HTML.
 * **gras** uniquement, pour rester safe et simple.
 * Les paragraphes sont déjà séparés par split("\n\n") en amont.
 */
function renderInline(text: string): string {
  // 1) Échappement HTML basique
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // 2) Conversion **gras** -> <strong>
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#001a3d]">$1</strong>');
}
