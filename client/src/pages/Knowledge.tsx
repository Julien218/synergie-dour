import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, HelpCircle, BookOpen, Building2, Euro, FileText, Users } from "lucide-react";
import { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  // À propos de Synergie Dour
  {
    category: "À propos",
    question: "Qu'est-ce que Synergie Dour ?",
    answer:
      "Synergie Dour est une ASBL (Association Sans But Lucratif) fondée en 2024, basée à Grand'Place 9, 7370 Dour, dans la Province de Hainaut (Wallonie, Belgique). Elle regroupe les commerçants et indépendants de la commune de Dour. Sa mission : centraliser l'information utile (lois, primes, aides, démarches), créer du lien entre professionnels locaux et dynamiser l'économie de proximité.",
  },
  {
    category: "À propos",
    question: "Qui dirige Synergie Dour ?",
    answer:
      "Le Conseil d'Administration est présidé par Olivier Trévis. Il est composé de : Rudy Querson (Vice-président), Daisy Audin (Secrétaire), Stéphane Givert (Trésorier), David Féron et Michel Archetti (conseillers commerce de proximité), Alban Fridenbergs (conseiller communication) et Bobby Charles Verteneuil (chargé de liaison commerçants).",
  },
  {
    category: "À propos",
    question: "Où se trouve Synergie Dour ?",
    answer:
      "Siège social : Grand'Place 9, 7370 Dour, Province de Hainaut, Wallonie, Belgique. Contact email : contact@synergiedour.be",
  },
  // Adhésion
  {
    category: "Adhésion",
    question: "Combien coûte l'adhésion à Synergie Dour ?",
    answer:
      "La cotisation annuelle est de 50€ par an. Elle donne accès aux services exclusifs membres : alertes personnalisées, accompagnement administratif prioritaire, participation aux événements réservés membres et intégration dans l'annuaire professionnel.",
  },
  {
    category: "Adhésion",
    question: "Qui peut devenir membre de Synergie Dour ?",
    answer:
      "Tout commerçant, indépendant, artisan ou professionnel établi sur la commune de Dour (7370) ou dans les entités voisines peut demander à adhérer. La demande est validée par le Conseil d'Administration.",
  },
  {
    category: "Adhésion",
    question: "Quels sont les avantages d'être membre ?",
    answer:
      "Les membres bénéficient de : fiches d'information vérifiées et actualisées, alertes sur les nouvelles primes et aides, accès au réseau professionnel local, visibilité dans l'annuaire public, participation aux événements et réunions de l'ASBL, et accompagnement dans les démarches administratives.",
  },
  // Primes & aides
  {
    category: "Primes & Aides",
    question: "Quelles primes existent pour les indépendants à Dour ?",
    answer:
      "Les indépendants de Dour (7370, Hainaut) peuvent accéder à plusieurs types d'aides : (1) Primes régionales wallonnes via le SPW Économie, (2) Aides de la Province de Hainaut, (3) Subsides communaux de la Commune de Dour, (4) Programmes UCM (Union des Classes Moyennes), (5) Aides à la numérisation des PME. Synergie Dour centralise et met à jour ces informations sur son site.",
  },
  {
    category: "Primes & Aides",
    question: "Comment trouver une aide pour créer mon activité à Dour ?",
    answer:
      "Pour créer une activité à Dour, consultez d'abord les ressources de Synergie Dour sur www.synergiedour.be/resources. Les principales démarches : inscription à la BCE (Banque-Carrefour des Entreprises), affiliation à une caisse d'assurances sociales, et enregistrement auprès de la TVA si applicable. Le Guichet d'Entreprises agréé le plus proche peut vous accompagner.",
  },
  {
    category: "Primes & Aides",
    question: "Y a-t-il des aides pour la rénovation d'une façade commerciale à Dour ?",
    answer:
      "Oui. La Région wallonne et la commune de Dour proposent des primes à la rénovation des façades et des espaces commerciaux. Les conditions varient selon la zone et le type de travaux. Consultez le service urbanisme de la Commune de Dour ou contactez Synergie Dour pour être orienté vers les bonnes ressources.",
  },
  // Démarches
  {
    category: "Démarches administratives",
    question: "Comment s'inscrire à la BCE en Belgique ?",
    answer:
      "L'inscription à la BCE (Banque-Carrefour des Entreprises) se fait via un Guichet d'Entreprises agréé. Vous devrez fournir : votre carte d'identité, le choix de la forme juridique (indépendant en personne physique ou en société), et les informations sur votre activité. Le coût est d'environ 90€ pour un indépendant en personne physique.",
  },
  {
    category: "Démarches administratives",
    question: "Quelles sont les cotisations sociales d'un indépendant en Belgique ?",
    answer:
      "En Belgique, un indépendant à titre principal paie des cotisations sociales trimestrielles à sa caisse d'assurances sociales. Le taux est de 20,5% sur les revenus professionnels nets. En début d'activité, des cotisations provisoires sont fixées (environ 875€/trimestre pour une 1ère année). Une régularisation a lieu après établissement du revenu réel.",
  },
  {
    category: "Démarches administratives",
    question: "Doit-on s'assujettir à la TVA en démarrant une activité ?",
    answer:
      "Pas obligatoirement. En Belgique, un indépendant dont le chiffre d'affaires annuel ne dépasse pas 25.000€ (seuil 2024) peut bénéficier du régime de franchise de la TVA. Au-delà, l'assujettissement est obligatoire. Certaines activités (professions libérales médicales, enseignement...) sont exonérées de TVA.",
  },
  // Commune de Dour
  {
    category: "Commune de Dour",
    question: "Quels sont les horaires de l'administration communale de Dour ?",
    answer:
      "La Maison communale de Dour se situe rue Albert 1er. Pour les horaires exacts et les services disponibles, consultez directement le site de la Commune de Dour ou contactez-les par téléphone. Synergie Dour maintient un annuaire des contacts utiles locaux sur son site.",
  },
  {
    category: "Commune de Dour",
    question: "Dour fait-elle partie d'une intercommunale économique ?",
    answer:
      "Dour fait partie de la Province de Hainaut et est intégrée dans diverses structures intercommunales wallonnes. Pour les questions économiques et de développement territorial, l'IDEA (Intercommunale de Développement Économique et d'Aménagement du territoire) est l'organisme de référence pour la région du Centre-Mons-Borinage.",
  },
];

const categories = ["Tous", ...Array.from(new Set(faqs.map((f) => f.category)))];

const categoryIcons: Record<string, React.ReactNode> = {
  "À propos": <Building2 className="w-4 h-4" />,
  Adhésion: <Users className="w-4 h-4" />,
  "Primes & Aides": <Euro className="w-4 h-4" />,
  "Démarches administratives": <FileText className="w-4 h-4" />,
  "Commune de Dour": <BookOpen className="w-4 h-4" />,
};

export default function Knowledge() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered =
    activeCategory === "Tous"
      ? faqs
      : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#001a3d] text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-blue-200 hover:text-white mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-3xl md:text-4xl font-bold text-[#D4AF37]">
              Base de connaissances
            </h1>
          </div>
          <p className="text-blue-100 text-lg max-w-2xl">
            Réponses aux questions fréquentes sur Synergie Dour, l'adhésion, les primes,
            les démarches administratives et la commune de Dour.
          </p>
        </div>
      </div>

      {/* Filtres catégories */}
      <div className="bg-white border-b border-amber-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-[#001a3d] text-white"
                    : "bg-amber-50 text-[#001a3d] hover:bg-amber-100 border border-amber-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ accordéon */}
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-3">
        {filtered.map((faq, idx) => (
          <Card
            key={idx}
            className="border-amber-100 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
          >
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[#D4AF37]">
                    {categoryIcons[faq.category] ?? <HelpCircle className="w-4 h-4" />}
                  </span>
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-2 text-xs bg-amber-50 text-amber-900 border-amber-200"
                    >
                      {faq.category}
                    </Badge>
                    <CardTitle className="text-[#001a3d] text-base leading-snug">
                      {faq.question}
                    </CardTitle>
                  </div>
                </div>
                <span className="text-[#D4AF37] text-xl font-light flex-shrink-0 mt-1">
                  {openIndex === idx ? "−" : "+"}
                </span>
              </div>
            </CardHeader>
            {openIndex === idx && (
              <CardContent className="pt-0 pb-5 pl-10 text-gray-700 leading-relaxed text-sm">
                {faq.answer}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* CTA bottom */}
      <div className="bg-[#001a3d] text-white py-12 px-4 mt-8">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[#D4AF37] mb-3">
            Vous ne trouvez pas votre réponse ?
          </h2>
          <p className="text-blue-100 mb-6">
            Contactez Synergie Dour directement — nous vous répondons dans les 48h.
          </p>
          <Button
            onClick={() => setLocation("/contact")}
            className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
          >
            Nous contacter
          </Button>
        </div>
      </div>
    </div>
  );
}
