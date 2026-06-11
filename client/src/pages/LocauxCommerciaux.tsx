import { trpc } from "@/lib/trpc";
import { PublicLayout } from "@/components/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Euro, Phone, Mail, ArrowRight, Building2, Plus } from "lucide-react";
import { Link } from "wouter";

export default function LocauxCommerciaux() {
  const { data: locaux = [], isLoading } = trpc.locaux.listPublished.useQuery();

  // Filtrer les doublons par titre+loyer
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
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
            <span>Locaux commerciaux à louer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Trouvez votre local commercial
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Découvrez les espaces disponibles sur l'entité de Dour — commerces, surfaces professionnelles et espaces polyvalents.
          </p>
          <Link href="/louer-mon-local">
            <Button className="bg-[#D4AF37] hover:bg-[#b8972e] text-[#001a3d] font-bold px-6 py-3 rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Déposer une annonce
            </Button>
          </Link>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Annonces actives", value: locauxUniques.length },
            { label: "Communes", value: [...new Set(locauxUniques.map((l: any) => l.village))].length },
            { label: "Dour centre", value: locauxUniques.filter((l: any) => l.village?.toLowerCase().includes("dour")).length },
            { label: "Gratuit", value: "Dépôt" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-[#001a3d]" style={{ fontFamily: "Montserrat, sans-serif" }}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grille annonces */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
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
              <Card key={local.id} className="border border-gray-100 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 rounded-xl overflow-hidden">
                {/* Header coloré */}
                <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] p-4">
                  <div className="flex justify-between items-start gap-2">
                    <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30 text-xs font-medium">
                      {local.type_bien || "Commerce"}
                    </Badge>
                    {local.loyer && (
                      <span className="text-[#D4AF37] font-bold text-lg" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        {Number(local.loyer).toLocaleString("fr-BE")} €<span className="text-xs font-normal text-blue-200">/mois</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mt-3 text-base leading-tight" style={{ fontFamily: "Montserrat, sans-serif" }}>
                    {local.titre}
                  </h3>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Adresse */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-[#003d99] flex-shrink-0 mt-0.5" />
                    <span>{local.adresse || local.village}</span>
                  </div>

                  {/* Surface */}
                  {local.surface && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Maximize2 className="w-4 h-4 text-[#003d99]" />
                      <span>{local.surface} m²</span>
                    </div>
                  )}

                  {/* Description courte */}
                  {local.description && !local.description.startsWith("Source:") && (
                    <p className="text-sm text-gray-500 line-clamp-2">{local.description}</p>
                  )}

                  {/* Source Immoweb */}
                  {local.description && local.description.includes("immoweb.be") && (
                    <div className="pt-1">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Via Immoweb</span>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-xs text-gray-400">
                    Ajouté le {new Date(local.createdAt).toLocaleString("fr-BE", {
                      timeZone: "Europe/Brussels",
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </p>

                  {/* CTA */}
                  <div className="pt-2 border-t border-gray-100">
                    <Link href="/contact">
                      <Button variant="outline" size="sm" className="w-full border-[#003d99] text-[#003d99] hover:bg-[#003d99] hover:text-white transition-colors">
                        <Mail className="w-3 h-3 mr-2" />
                        Demander infos
                        <ArrowRight className="w-3 h-3 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA bas de page */}
        <div className="mt-16 bg-gradient-to-br from-[#001a3d] to-[#003d99] rounded-2xl p-8 text-center text-white">
          <Building2 className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Vous avez un local à louer ?
          </h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Déposez votre annonce gratuitement sur la plateforme Synergie Dour et touchez directement les commerçants et indépendants de l'entité.
          </p>
          <Link href="/louer-mon-local">
            <Button className="bg-[#D4AF37] hover:bg-[#b8972e] text-[#001a3d] font-bold px-8 py-3 rounded-lg">
              Déposer mon annonce
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
