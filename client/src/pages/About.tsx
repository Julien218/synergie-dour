import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Award, Briefcase, Megaphone, Store, Link2, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BoardMember {
  name: string;
  role: string;
  fonction:
    | "president"
    | "vice-president"
    | "secretaire"
    | "tresorier"
    | "conseiller-commerce"
    | "conseiller-communication"
    | "conseiller-commerce-2"
    | "liaison";
  description?: string;
}

const board: BoardMember[] = [
  {
    name: "Olivier TREVIS",
    role: "Président",
    fonction: "president",
    description:
      "Représente légalement l'ASBL et préside les assemblées générales et le conseil d'administration.",
  },
  {
    name: "Rudy QUERSON",
    role: "Vice-président",
    fonction: "vice-president",
    description: "Seconde le président et le supplée en cas d'absence.",
  },
  {
    name: "Daisy AUDIN",
    role: "Secrétaire",
    fonction: "secretaire",
    description:
      "Assure la rédaction des PV, la tenue des registres et la correspondance officielle.",
  },
  {
    name: "Stéphane GIVERT",
    role: "Trésorier",
    fonction: "tresorier",
    description:
      "Gère la comptabilité, prépare le budget annuel et présente les comptes à l'assemblée générale.",
  },
  {
    name: "David FERON",
    role: "Conseiller en commerce de proximité",
    fonction: "conseiller-commerce",
    description:
      "Apporte son expertise sur les enjeux du commerce local à Dour.",
  },
  {
    name: "Alban FRIDENBERGS",
    role: "Conseiller en communication, marketing et management",
    fonction: "conseiller-communication",
    description:
      "Conseille l'association sur sa stratégie de communication et son développement.",
  },
  {
    name: "Michel ARCHETTI",
    role: "2ᵉ conseiller en commerce de proximité",
    fonction: "conseiller-commerce-2",
    description:
      "Complète l'expertise commerce de proximité au sein du conseil.",
  },
  {
    name: "Bobby Charles VERTENEUIL",
    role: "Chargé de liaison commerçants — association",
    fonction: "liaison",
    description:
      "Point de contact direct entre les commerçants membres et le conseil d'administration.",
  },
];

const iconMap: Record<BoardMember["fonction"], LucideIcon> = {
  president: Award,
  "vice-president": Award,
  secretaire: Briefcase,
  tresorier: Briefcase,
  "conseiller-commerce": Store,
  "conseiller-communication": Megaphone,
  "conseiller-commerce-2": Store,
  liaison: Link2,
};

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour
          </Button>
          <div className="flex items-start gap-4">
            <Users className="w-10 h-10 text-[#D4AF37] mt-1" />
            <div>
              <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">
                L'association
              </h1>
              <p className="text-[#F0E68C] max-w-2xl">
                Synergie Dour est une ASBL au service des commerçants et indépendants
                de la commune de Dour. Découvrez le bureau qui anime l'association.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mission */}
      <section className="py-12 px-4 bg-white/95">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-[#001a3d] mb-4">Notre mission</h2>
          <p className="text-gray-800 leading-relaxed mb-4">
            Synergie Dour rassemble les commerçants, artisans et indépendants de la
            commune autour d'un objectif simple : faire vivre le tissu économique local
            et faciliter la vie administrative de ses membres.
          </p>
          <p className="text-gray-800 leading-relaxed">
            La plateforme centralise l'information utile aux indépendants — démarches,
            aides régionales, contacts locaux — et propose un annuaire des commerces
            membres ainsi qu'un agenda des événements organisés sur le territoire.
          </p>
        </div>
      </section>

      {/* Board */}
      <section className="py-12 px-4 bg-amber-50/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-[#001a3d] mb-2">Le bureau</h2>
          <p className="text-gray-700 mb-8">
            Conseil d'administration de l'ASBL Synergie Dour.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {board.map((member) => {
              const Icon = iconMap[member.fonction];
              return (
                <Card
                  key={member.name}
                  className="border-amber-100 hover:shadow-lg transition-shadow bg-white/95"
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <CardTitle className="text-[#001a3d] text-lg leading-tight">
                          {member.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="mt-2 bg-amber-50 text-amber-900 border-amber-300"
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {member.description && (
                    <CardContent>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {member.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Legal info ASBL */}
      <section className="py-12 px-4 bg-white/95">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-[#001a3d] mb-4">
            Informations légales de l'ASBL
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-2 text-gray-800">
            <p>
              <strong className="text-[#001a3d]">Dénomination :</strong> Synergie Dour ASBL
            </p>
            <p>
              <strong className="text-[#001a3d]">Forme juridique :</strong> Association
              sans but lucratif (ASBL)
            </p>
            <p>
              <strong className="text-[#001a3d]">Siège social :</strong>{" "}
              Grand Place, 9 à 7370 Dour
            </p>
            <p>
              <strong className="text-[#001a3d]">Numéro d'entreprise :</strong>{" "}
              BE 1036.801.623
            </p>
            <p>
              <strong className="text-[#001a3d]">Publication des statuts :</strong>{" "}
              <a
                href="https://www.ejustice.just.fgov.be/cgi_tsv/article.pl?language=fr&btw_search=1036801623&page=1&la_search=f&caller=list&=0&view_numac=1036801623&view_numac=1036801623&btw=1036801623"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003d99] underline hover:text-[#001a3d] transition-colors"
              >
                Moniteur belge
              </a>
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            En tant qu'ASBL, Synergie Dour est tenue de publier ses statuts et la liste
            de ses administrateurs au Moniteur belge. Les informations de cette page sont
            une reprise simplifiée à titre informatif.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4 text-[#D4AF37]">
            Une question pour le bureau ?
          </h2>
          <p className="text-[#F0E68C] mb-6">
            Contactez-nous via le formulaire dédié ou rejoignez l'association.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/contact")}
              className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
            >
              <Mail className="mr-2 w-4 h-4" />
              Nous contacter
            </Button>
            <Button
              onClick={() => setLocation("/membership")}
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Demander l'adhésion
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
