import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Award, Briefcase, Megaphone, Store, Link2, Mail, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BoardMember {
  name: string;
  role: string;
  fonction:
    | "president"
    | "vice-president"
    | "administratrice"
    | "administrateur"
    | "conseiller-communication"
    | "liaison";
  description?: string;
  photo?: string;
}

const board: BoardMember[] = [
  {
    name: "Olivier TREVIS",
    role: "Président",
    fonction: "president",
    photo: "/equipe/olivier-trevis.jpg",
    description:
      "Représente légalement l'ASBL et préside les assemblées générales et le conseil d'administration.",
  },
  {
    name: "Rudy QUERSON",
    role: "Vice-Président",
    fonction: "vice-president",
    photo: "/equipe/rudy-querson.jpg",
    description: "Seconde le président et le supplée en cas d'absence.",
  },
  {
    name: "Daisy AUDIN",
    role: "Administratrice",
    fonction: "administratrice",
    photo: "/equipe/daisy-audin.jpg",
    description:
      "Membre active du conseil d'administration de l'ASBL Synergie Dour.",
  },
  {
    name: "Stéphane GIVERT",
    role: "Administrateur",
    fonction: "administrateur",
    photo: "/equipe/stephane-givert.jpg",
    description:
      "Membre actif du conseil d'administration de l'ASBL Synergie Dour.",
  },
  {
    name: "Alban FRIDENBERGS",
    role: "Administrateur",
    fonction: "conseiller-communication",
    photo: "/equipe/alban-fridenbergs.jpg",
    description:
      "Membre actif du conseil d'administration de l'ASBL Synergie Dour.",
  },
  {
    name: "Michel ARCHETTI",
    role: "Administrateur",
    fonction: "administrateur",
    photo: "/equipe/michel-archetti.jpg",
    description:
      "Membre actif du conseil d'administration de l'ASBL Synergie Dour.",
  },
  {
    name: "Bobby Charles VERTENEUIL",
    role: "Administrateur",
    fonction: "liaison",
    photo: "/equipe/bobby-verteneuil.jpg",
    description:
      "Membre actif du conseil d'administration de l'ASBL Synergie Dour.",
  },
];

const iconMap: Record<BoardMember["fonction"], LucideIcon> = {
  president: Award,
  "vice-president": Award,
  administratrice: ShieldCheck,
  administrateur: ShieldCheck,
  "conseiller-communication": Megaphone,
  liaison: Link2,
};

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — Photo de groupe officielle */}
      <div className="relative overflow-hidden">
        {/* Photo de groupe en fond */}
        <div className="relative h-[380px] md:h-[480px] w-full">
          <img
            src="/equipe/equipe-ca.jpg"
            alt="Conseil d'administration Synergie Dour"
            className="w-full h-full object-cover object-top"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#001a3d]/95 via-[#001a3d]/40 to-transparent" />
          {/* Contenu overlay */}
          <div className="absolute inset-0 flex flex-col justify-end pb-8 px-4">
            <div className="container mx-auto max-w-6xl">
              <Button
                onClick={() => setLocation("/")}
                variant="ghost"
                className="text-white hover:bg-white/10 mb-4 absolute top-4 left-4 md:left-8"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Retour
              </Button>
              <div className="flex items-end gap-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold text-[#D4AF37] mb-2 drop-shadow-lg">
                    Notre équipe
                  </h1>
                  <p className="text-white/90 text-lg max-w-2xl drop-shadow">
                    Le conseil d'administration de l'ASBL Synergie Dour —
                    commerçants et indépendants engagés pour Dour.
                  </p>
                </div>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {board.map((member) => {
              const Icon = iconMap[member.fonction];
              return (
                <Card
                  key={member.name}
                  className="border-amber-100 hover:shadow-lg transition-shadow bg-white/95 overflow-hidden"
                >
                  {/* Photo du membre */}
                  <div className="relative h-52 w-full bg-gradient-to-br from-[#001a3d] to-[#003d99] overflow-hidden">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-16 h-16 text-[#D4AF37] opacity-40" />
                      </div>
                    )}
                    {/* Badge rôle */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#001a3d]/90 to-transparent px-4 py-3">
                      <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">{member.role}</p>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#D4AF37]" />
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
              <strong className="text-[#001a3d]">Dénomination :</strong> SYNERGIE DOUR ASBL
            </p>
            <p>
              <strong className="text-[#001a3d]">Forme juridique :</strong> Association sans but lucratif (ASBL)
            </p>
            <p>
              <strong className="text-[#001a3d]">Numéro d'entreprise :</strong>{" "}
              <a
                href="https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?lang=fr&ondernemingsnummer=1036801623"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003d99] hover:underline font-mono"
              >
                BE 1036.801.623
              </a>
            </p>
            <p>
              <strong className="text-[#001a3d]">Siège social :</strong> Grand'Place 9, 7370 Dour
            </p>
            <p>
              <strong className="text-[#001a3d]">Date de constitution :</strong> 13 avril 2026
            </p>
            <p>
              <strong className="text-[#001a3d]">Statut BCE :</strong>{" "}
              <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Actif — situation normale
              </span>
            </p>
            <p>
              <strong className="text-[#001a3d]">Assemblée générale :</strong> Mai — Clôture comptable 31 décembre
            </p>
            <p>
              <strong className="text-[#001a3d]">Téléphone :</strong>{" "}
              <a href="tel:0475426942" className="text-[#003d99] hover:underline">
                0475 42 69 42
              </a>
            </p>
            <p>
              <strong className="text-[#001a3d]">Publication au Moniteur belge :</strong>{" "}
              <a
                href="https://ejustice.just.fgov.be/cgi_tsv/list.pl?language=fr&btw=1036801623&page=1&view_numac=1036801623#SUM"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003d99] hover:underline"
              >
                Rubrique Constitution — 6 mai 2026
              </a>
            </p>
            <p>
              <strong className="text-[#001a3d]">Statuts notariés :</strong>{" "}
              <a
                href="https://statuts.notaire.be/stapor_v1/enterprise/1036801623/statutes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#003d99] hover:underline"
              >
                Consulter les statuts officiels
              </a>
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Données issues de la <strong>Banque-Carrefour des Entreprises (BCE)</strong> — SPF Économie belge. Situation au 12 juin 2026.
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
