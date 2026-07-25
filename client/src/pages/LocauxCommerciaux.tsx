import { trpc } from "@/lib/trpc";
import { PublicLayout } from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, ExternalLink, Building2, Plus, Mail, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

// Génère l'URL de preview via microlink.io (gratuit, sans clé API)
function getPreviewUrl(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl || sourceUrl.includes("immoweb.be/a/fr-BE/123")) return null;
  try {
    const encoded = encodeURIComponent(sourceUrl);
    return `https://api.microlink.io/screenshot?url=${encoded}&embed=screenshot.url&type=png&viewport.width=800&viewport.height=500`;
  } catch {
    return null;
  }
}

// Thumbnail fallback par type de source
function SourceBadge({ source, url }: { source?: string; url?: string }) {
  const isImmoweb = source?.toLowerCase().includes("immoweb") || url?.includes("immoweb");
  const isLogissim = source?.toLowerCase().includes("logissim") || url?.includes("logissim");
  if (isImmoweb) return (
    <span className="text-[10px] font-bold uppercase tracking-wide bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30 px-2 py-0.5 rounded-full">
      Immoweb
    </span>
  );
  if (isLogissim) return (
    <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
      Logissim
    </span>
  );
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
      {source || "Annonce"}
    </span>
  );
}

function LocalCard({ local }: { local: any }) {
  const [imgError, setImgError] = useState(false);
  const previewUrl = getPreviewUrl(local.url_source);
  const hasValidUrl = local.url_source && !local.url_source.includes("immoweb.be/a/fr-BE/123");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden flex flex-col">

      {/* Zone image / aperçu du lien */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#001a3d] to-[#003d99]" style={{ height: 160 }}>
        {previewUrl && !imgError ? (
          <img
            src={previewUrl}
            alt={local.titre}
            className="w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          /* Fallback visuel élégant aux couleurs du site */
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <Building2 className="w-12 h-12 text-white/20 mb-2" />
            <span className="text-white/40 text-xs text-center px-4">{local.adresse || local.village || "Local commercial"}</span>
            {/* Lueur décorative */}
            <div style={{
              position: "absolute", right: -20, bottom: -20,
              width: 100, height: 100, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(232,197,71,0.15) 0%, transparent 70%)",
            }} />
          </div>
        )}

        {/* Overlay loyer en haut à droite */}
        {local.loyer && (
          <div className="absolute top-3 right-3 bg-[#001a3d]/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-lg">
            <span className="font-bold text-sm">{local.loyer}</span>
          </div>
        )}

        {/* Badge type bien en bas à gauche */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border border-white/20">
            {local.type_bien || "Commerce"}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Source + surface */}
        <div className="flex items-center justify-between">
          <SourceBadge source={local.source} url={local.url_source} />
          {local.surface && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              {local.surface} m²
            </span>
          )}
        </div>

        {/* Titre */}
        <h3 className="font-bold text-[#001a3d] text-sm leading-tight line-clamp-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
          {local.titre}
        </h3>

        {/* Adresse */}
        {(local.adresse || local.village) && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-[#003d99] flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">{local.adresse || local.village}</span>
          </div>
        )}

        {/* Description */}
        {local.description && !local.description.startsWith("Source:") && (
          <p className="text-xs text-gray-400 line-clamp-2">{local.description}</p>
        )}

        {/* Agence */}
        {local.agence && (
          <p className="text-[10px] text-gray-400 italic">Via {local.agence}</p>
        )}

        {/* Boutons — en bas */}
        <div className="mt-auto pt-2 border-t border-gray-50 flex flex-col gap-2">
          {/* Bouton détail + partage */}
          <div className="flex gap-2">
            <Link href={`/locaux/${local.id}`} className="flex-1">
              <Button size="sm" className="w-full bg-[#D4AF37] hover:bg-[#F0C040] text-[#001a3d] font-bold text-xs transition-colors">
                Voir le détail →
              </Button>
            </Link>
            <button
              onClick={async () => {
                const url = `https://www.synergiedour.be/locaux/${local.id}`;
                if (navigator.share) {
                  try { await navigator.share({ title: local.titre, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(url);
                  alert("Lien copié !");
                }
              }}
              className="px-3 py-1.5 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-md transition-colors"
              title="Partager"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Lien source secondaire */}
          {hasValidUrl ? (
            <a
              href={local.url_source}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="w-full border-slate-200 text-slate-500 hover:bg-slate-50 text-xs transition-colors">
                <ExternalLink className="w-3 h-3 mr-1.5" />
                Source originale
              </Button>
            </a>
          ) : (
            <Link href="/contact">
              <Button size="sm" variant="outline" className="w-full border-[#003d99] text-[#003d99] hover:bg-[#003d99] hover:text-white text-xs transition-colors">
                <Mail className="w-3 h-3 mr-1.5" />
                Demander infos
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LocauxCommerciaux() {
  const { data: locaux = [], isLoading } = trpc.locaux.listPublished.useQuery();

  const seen = new Set<string>();
  const locauxUniques = locaux.filter((l: any) => {
    const key = `${l.titre}-${l.loyer}-${l.surface}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <PublicLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001a3d] to-[#003d99] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Building2 className="w-4 h-4 text-[#E8C547]" />
            <span>Locaux commerciaux à louer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Trouvez votre local commercial
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Découvrez les espaces disponibles sur l'entité de Dour — commerces, surfaces professionnelles et espaces polyvalents.
          </p>
          <Link href="/louer-mon-local">
            <Button className="bg-[#E8C547] hover:bg-[#d4af37] text-[#001a3d] font-bold px-6 py-3 rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Déposer une annonce
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Annonces actives", value: locauxUniques.length },
            { label: "Communes", value: Array.from(new Set(locauxUniques.map((l: any) => l.village))).filter(Boolean).length },
            { label: "Dour centre", value: locauxUniques.filter((l: any) => l.village?.toLowerCase().includes("dour")).length },
            { label: "Gratuit", value: "Dépôt" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-[#001a3d]" style={{ fontFamily: "Montserrat, sans-serif" }}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grille */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : locauxUniques.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucune annonce disponible pour le moment.</p>
            <p className="text-sm mt-2">Revenez bientôt ou déposez votre annonce.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locauxUniques.map((local: any) => (
              <LocalCard key={local.id} local={local} />
            ))}
          </div>
        )}

        {/* CTA bas */}
        <div className="mt-16 bg-gradient-to-br from-[#001a3d] to-[#003d99] rounded-2xl p-8 text-center text-white">
          <Building2 className="w-10 h-10 text-[#E8C547] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Vous avez un local à louer ?
          </h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Déposez votre annonce gratuitement sur la plateforme Synergie Dour et touchez directement les commerçants et indépendants de l'entité.
          </p>
          <Link href="/louer-mon-local">
            <Button className="bg-[#E8C547] hover:bg-[#d4af37] text-[#001a3d] font-bold px-8 py-3 rounded-lg">
              Déposer mon annonce
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

