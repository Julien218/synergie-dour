import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Calendar, MapPin, AlertCircle, ChevronRight } from "lucide-react";
import {
  getResourceBySlug,
  RESOURCE_CATEGORIES,
} from "@/data/resources";
import NotFound from "./NotFound";

/**
 * FIX LISIBILITÉ — page détail d'une fiche.
 *
 * Principe : sur le HEADER BLEU MARINE, tout le texte est BLANC.
 * Seul le titre principal reste en doré (#D4AF37) pour l'impact visuel.
 * Sur le CONTENU (fond blanc), tout le texte est en slate-900 (presque noir).
 */

const categoryStyles: Record<
  string,
  { bandColor: string; chipBg: string; chipText: string }
> = {
  starter: { bandColor: "#1D9E75", chipBg: "bg-emerald-50", chipText: "text-emerald-900" },
  gestion: { bandColor: "#378ADD", chipBg: "bg-blue-50", chipText: "text-blue-900" },
  developpement: { bandColor: "#7F77DD", chipBg: "bg-violet-50", chipText: "text-violet-900" },
  difficulte: { bandColor: "#D85A30", chipBg: "bg-orange-50", chipText: "text-orange-900" },
};

export default function Resource() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ slug: string }>("/resources/:slug");
  const slug = params?.slug ?? "";
  const resource = getResourceBySlug(slug);

  if (!resource) {
    return <NotFound />;
  }

  const categoryInfo = RESOURCE_CATEGORIES[resource.category];
  const styles = categoryStyles[resource.category] ?? categoryStyles.starter;


  // ===== OG Meta Tags dynamiques =====
  const ogImage = resource.ogImage
    ? \`https://www.synergiedour.be/og-ressources/\${resource.ogImage}\`
    : "https://www.synergiedour.be/og-image-new.jpg";
  const ogUrl = \`https://www.synergiedour.be/resources/\${resource.slug}\`;
  const ogTitle = resource.title + " | Synergie Dour";
  const ogDesc = resource.summary;

  // Inject meta tags
  if (typeof document !== "undefined") {
    document.title = ogTitle;
    const setMeta = (prop: string, val: string, attr = "property") => {
      let el = document.querySelector(\`meta[\${attr}="\${prop}"]\`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    setMeta("og:title", ogTitle);
    setMeta("og:description", ogDesc);
    setMeta("og:image", ogImage);
    setMeta("og:url", ogUrl);
    setMeta("og:type", "article");
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", ogTitle, "name");
    setMeta("twitter:description", ogDesc, "name");
    setMeta("twitter:image", ogImage, "name");
  }
  // ===== Fin OG Meta Tags =====

  return (
    <div className="min-h-screen bg-slate-50">
      {/* BREADCRUMB — texte foncé sur fond blanc */}
      <nav
        aria-label="Fil d'Ariane"
        className="bg-white border-b border-slate-200 px-4 py-3"
      >
        <div className="container mx-auto max-w-4xl flex items-center gap-2 text-sm flex-wrap">
          <button
            onClick={() => setLocation("/resources")}
            className="text-slate-700 hover:text-[#001a3d] hover:underline font-medium transition-colors"
          >
            Toutes les ressources
          </button>
          <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="text-slate-900 font-medium">{categoryInfo.label}</span>
        </div>
      </nav>

      {/* HEADER BLEU — TEXTE EN BLANC sauf le titre en doré */}
      <div
        className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4"
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <div className="container mx-auto max-w-4xl">
          <Button
            onClick={() => setLocation("/resources")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-6 print:hidden"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Toutes les ressources
          </Button>

          <Badge className="mb-4 bg-[#D4AF37] text-[#001a3d] hover:bg-[#F0E68C] font-semibold">
            {categoryInfo.label}
          </Badge>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#D4AF37] leading-tight">
            {resource.title}
          </h1>

          {/* SOUS-TITRE EN BLANC PUR — bien lisible sur le bleu */}
          <p className="text-lg text-white max-w-3xl leading-relaxed">
            {resource.summary}
          </p>

          <div className="flex items-center gap-2 mt-6 text-sm text-white/90">
            <Calendar className="w-4 h-4" />
            <span>Information vérifiée le {formatDate(resource.verifiedAt)}</span>
          </div>
        </div>
      </div>

      <div
        className="h-1 w-full"
        style={{ backgroundColor: styles.bandColor }}
        aria-hidden="true"
      />

      {/* AVERTISSEMENT */}
      <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
        <div className="container mx-auto max-w-4xl flex items-start gap-2 text-sm text-slate-800">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <p>
            Cette fiche est une synthèse. Pour les montants exacts, dates limites et conditions
            précises, vérifiez toujours la source officielle liée en bas de page.
          </p>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <article className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <div className="prose prose-lg max-w-none">
            {resource.content.split("\n\n").map((paragraph, idx) => (
              <p
                key={idx}
                className="text-slate-900 leading-relaxed mb-5 text-base md:text-lg"
                dangerouslySetInnerHTML={{ __html: renderInline(paragraph) }}
              />
            ))}
          </div>

          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200">
              {resource.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-slate-100 text-slate-700 border-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </article>

      {/* SOURCES OFFICIELLES */}
      <section className="bg-blue-50 border-y border-blue-200 py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[#003d99]" />
            Sources officielles
          </h2>
          <p className="text-sm text-slate-700 mb-4">
            Toujours vérifier l'information à jour sur ces sites de référence :
          </p>
          <ul className="space-y-2">
            {resource.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#003d99] hover:text-[#001a3d] font-medium hover:underline underline-offset-4"
                >
                  {link.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                  {link.type === "officiel" && (
                    <Badge
                      variant="outline"
                      className="ml-1 text-xs bg-blue-100 text-blue-900 border-blue-300"
                    >
                      officiel
                    </Badge>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONTACTS LOCAUX */}
      {resource.localContacts && resource.localContacts.length > 0 && (
        <section className="py-10 px-4 bg-white">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Aide locale à Dour / Borinage
            </h2>
            <ul className="space-y-2 text-slate-800">
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

      {/* DISCLAIMER FINAL */}
      <div className="bg-slate-100 border-t border-slate-200 py-8 px-4">
        <div className="container mx-auto max-w-3xl text-center text-sm text-slate-700">
          <p>
            <strong className="text-slate-900">Important.</strong> Cette fiche est fournie à
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

function renderInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="text-[#001a3d] font-semibold">$1</strong>'
  );
}
