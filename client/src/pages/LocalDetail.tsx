import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Maximize2, ExternalLink, Building2, Phone, Mail, ChevronRight, Share2 } from "lucide-react";
import NotFound from "./NotFound";

// Bouton de partage natif ou copie du lien
function ShareButton({ url, title }: { url: string; title: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copié !");
    }
  };
  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
    >
      <Share2 className="w-4 h-4" />
      Partager
    </button>
  );
}

export default function LocalDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/locaux/:id");
  const id = params?.id ?? "";

  const { data: locals, isLoading } = trpc.locaux.listPublished.useQuery();
  const local = locals?.find((l: any) => l.id === id);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (!local) {
    return <NotFound />;
  }

  // ===== OG Meta Tags dynamiques =====
  const ogTitle = `${local.titre} | Synergie Dour`;
  const ogDesc = local.description || `Local commercial à louer à ${local.village || "Dour"} — ${local.surface || ""} ${local.loyer ? `— ${local.loyer}` : ""}`.trim();
  const ogImage = "https://www.synergiedour.be/og-image-new.jpg";
  const ogUrl = `https://www.synergiedour.be/locaux/${local.id}`;

  if (typeof document !== "undefined") {
    document.title = ogTitle;
    const setMeta = (prop: string, val: string, attr = "property") => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`) as HTMLMetaElement | null;
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
    <PublicLayout>
      <div className="min-h-screen bg-slate-50">

        {/* BREADCRUMB */}
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="container mx-auto max-w-4xl flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={() => setLocation("/locaux")}
              className="text-slate-700 hover:text-[#001a3d] hover:underline font-medium transition-colors"
            >
              Locaux à louer
            </button>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-900 font-medium truncate max-w-[200px]">{local.titre}</span>
          </div>
        </nav>

        {/* HEADER NAVY */}
        <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <Button
              onClick={() => setLocation("/locaux")}
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 mb-6 -ml-2 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux locaux
            </Button>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {local.statut && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  local.statut === "Disponible"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                }`}>
                  {local.statut}
                </span>
              )}
              {local.type_bien && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-white/10 text-white/80 border border-white/20">
                  {local.type_bien}
                </span>
              )}
              {local.village && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {local.village}
                </span>
              )}
            </div>

            {/* Titre */}
            <h1 className="text-3xl md:text-4xl font-bold text-[#D4AF37] leading-tight mb-3">
              {local.titre}
            </h1>

            {/* Adresse */}
            {local.adresse && (
              <p className="text-blue-100 text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#D4AF37]" />
                {local.adresse}
              </p>
            )}

            {/* Prix + Surface */}
            <div className="flex flex-wrap gap-6 mt-6">
              {local.loyer && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Loyer mensuel</div>
                  <div className="text-[#D4AF37] font-bold text-2xl">{local.loyer}</div>
                </div>
              )}
              {local.surface && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Surface</div>
                  <div className="text-white font-bold text-2xl flex items-center gap-1">
                    <Maximize2 className="w-5 h-5 text-[#D4AF37]" />
                    {local.surface}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENU */}
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <div className="grid md:grid-cols-3 gap-8">

            {/* Colonne principale */}
            <div className="md:col-span-2 space-y-6">
              {local.description && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#001a3d] mb-3">Description</h2>
                  <p className="text-slate-700 leading-relaxed">{local.description}</p>
                </div>
              )}

              {/* Note admin si présente */}
              {local.note_admin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                  <strong>Note :</strong> {local.note_admin}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex flex-wrap gap-3 pt-2">
                {local.url_source && (
                  <a
                    href={local.url_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#001a3d] hover:bg-[#003d99] text-white font-bold px-5 py-3 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir l'annonce source
                  </a>
                )}
                <ShareButton url={ogUrl} title={ogTitle} />
              </div>
            </div>

            {/* Colonne contact */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-[#001a3d] mb-4">Contact</h2>
                <div className="space-y-3 text-sm text-slate-700">
                  {local.agence && (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                      <span>{local.agence}</span>
                    </div>
                  )}
                  {local.telephone_proprietaire && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                      <a href={`tel:${local.telephone_proprietaire}`} className="hover:underline">
                        {local.telephone_proprietaire}
                      </a>
                    </div>
                  )}
                  {local.email_proprietaire && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                      <a href={`mailto:${local.email_proprietaire}`} className="hover:underline break-all">
                        {local.email_proprietaire}
                      </a>
                    </div>
                  )}
                  {local.contact && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                      <span>{local.contact}</span>
                    </div>
                  )}
                  {!local.agence && !local.telephone_proprietaire && !local.email_proprietaire && !local.contact && (
                    <p className="text-slate-400 italic">Contact via l'annonce source</p>
                  )}
                </div>
              </div>

              {/* CTA propriétaire */}
              <div className="bg-gradient-to-br from-[#001a3d] to-[#003d99] rounded-2xl p-5 text-white">
                <Building2 className="w-7 h-7 text-[#D4AF37] mb-2" />
                <p className="font-bold mb-1 text-sm">Vous avez un local ?</p>
                <p className="text-blue-100 text-xs mb-3">Publiez gratuitement sur Synergie Dour.</p>
                <a
                  href="/louer-mon-local"
                  className="block text-center bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Déposer mon annonce
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
