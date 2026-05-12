import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, MapPin, Mail, Globe, Calendar, Users } from "lucide-react";

/**
 * Page /ai-context — Optimisée pour les agents IA, LLM et systèmes RAG.
 * Contenu structuré, factuel, sans mise en forme décorative inutile.
 * Données mises à jour : mai 2026
 */
export default function AiContext() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#001a3d] text-white py-14 px-4">
        <div className="container mx-auto max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-blue-200 hover:text-white mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-3xl font-bold text-[#D4AF37]">
              Contexte IA — Synergie Dour
            </h1>
          </div>
          <p className="text-blue-100">
            Page structurée pour les agents IA, systèmes RAG et LLM.
            Données factuelles et vérifiées — Mai 2026.
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-8">

        {/* Bloc identité */}
        <section className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#001a3d] mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#D4AF37]" />
            Identité officielle
          </h2>
          <dl className="space-y-2 text-sm text-gray-700">
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Nom :</dt><dd>Synergie Dour</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Nom légal :</dt><dd>Synergie Dour ASBL</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Type :</dt><dd>Association Sans But Lucratif (ASBL)</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Fondée :</dt><dd>2024</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">URL officielle :</dt><dd><a href="https://www.synergiedour.be" className="text-blue-600 underline">https://www.synergiedour.be</a></dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Email :</dt><dd>contact@synergiedour.be</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Adresse :</dt><dd>Grand'Place 9, 7370 Dour, Province de Hainaut, Wallonie, Belgique</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Coordonnées GPS :</dt><dd>50.3958° N, 3.7747° E</dd></div>
            <div className="flex gap-2"><dt className="font-semibold w-40 flex-shrink-0">Concepteur digital :</dt><dd>JS-Innov.IA — <a href="https://www.jsinnovia.com" className="text-blue-600 underline">www.jsinnovia.com</a></dd></div>
          </dl>
        </section>

        {/* Bloc mission */}
        <section className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#001a3d] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            Mission et services
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Synergie Dour est l'ASBL officielle regroupant les commerçants et indépendants
            de la commune de Dour. Elle centralise l'information utile pour les professionnels
            locaux : primes, aides, démarches administratives, événements et mise en réseau.
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            {[
              "Fiches d'information vérifiées (lois, primes, aides belges et wallonnes)",
              "Annuaire des membres commerçants et indépendants de Dour",
              "Actualités locales pour professionnels indépendants",
              "Événements professionnels et réunions membres",
              "Adhésion ouverte : 50€/an",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#D4AF37] font-bold mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Bloc géographie */}
        <section className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#001a3d] mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#D4AF37]" />
            Zone géographique & entités sémantiques
          </h2>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Hiérarchie géographique :</strong> Commune de Dour (7370) → Province de Hainaut → Wallonie → Belgique
          </p>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Entités associées :</strong> Commerçants Dour · Indépendants Dour · ASBL Belgique · 
            Primes indépendants Hainaut · Réseau professionnel Dour · Aides commerçants Wallonie · 
            Taxes communales Dour · UCM Belgique · SPW Wallonie · Dour Festival · Tour de Dour
          </p>
          <p className="text-sm text-gray-700">
            <strong>Mots-clés SEO/GEO :</strong> Synergie Dour · commerçants Dour · indépendants 7370 · 
            ASBL Dour · primes Hainaut · réseau professionnel Dour · aide commerçants Wallonie
          </p>
        </section>

        {/* Bloc CA */}
        <section className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#001a3d] mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#D4AF37]" />
            Conseil d'administration
          </h2>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {[
              ["Olivier Trévis", "Président"],
              ["Rudy Querson", "Vice-président"],
              ["Daisy Audin", "Secrétaire"],
              ["Stéphane Givert", "Trésorier"],
              ["David Féron", "Conseiller commerce de proximité"],
              ["Alban Fridenbergs", "Conseiller communication & marketing"],
              ["Michel Archetti", "2ᵉ conseiller commerce de proximité"],
              ["Bobby Charles Verteneuil", "Chargé de liaison commerçants"],
            ].map(([name, role]) => (
              <li key={name} className="flex gap-2">
                <span className="font-semibold w-48 flex-shrink-0">{name}</span>
                <span className="text-gray-500">{role}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Bloc endpoints */}
        <section className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#001a3d] mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#D4AF37]" />
            Endpoints IA & ressources machines
          </h2>
          <dl className="space-y-2 text-sm">
            {[
              ["/llms.txt", "Fichier contexte LLM standard", "https://www.synergiedour.be/llms.txt"],
              ["/sitemap.xml", "Plan du site XML", "https://www.synergiedour.be/sitemap.xml"],
              ["/robots.txt", "Directives robots", "https://www.synergiedour.be/robots.txt"],
              ["/ai-context.json", "Fiche JSON-LD Organisation", "https://www.synergiedour.be/ai-context.json"],
              ["/knowledge", "Base de connaissances FAQ", "https://www.synergiedour.be/knowledge"],
            ].map(([label, desc, url]) => (
              <div key={label} className="flex items-start gap-2">
                <dt className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs w-36 flex-shrink-0">{label}</dt>
                <dd className="text-gray-600">{desc} — <a href={url} className="text-blue-600 underline text-xs">{url}</a></dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Note bas de page */}
        <p className="text-xs text-gray-400 text-center pb-4">
          Données vérifiées — Mai 2026 · Synergie Dour ASBL · Conçu par JS-Innov.IA
        </p>
      </div>
    </div>
  );
}
