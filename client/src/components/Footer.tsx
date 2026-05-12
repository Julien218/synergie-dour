/**
 * Footer du site — ajoute un crédit pour JS-Innov.IA et les liens utilitaires.
 *
 * À intégrer dans PublicLayout.tsx :
 *   import { Footer } from "@/components/Footer";
 *   ...juste avant la fermeture de la div principale, après le {children}.
 */

import { useLocation } from "wouter";
import { Mail, MapPin, ExternalLink } from "lucide-react";

export function Footer() {
  const [, setLocation] = useLocation();

  return (
    <footer className="bg-[#001a3d] text-white">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Colonne 1 : ASBL */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Synergie Dour" className="h-12 w-12 object-contain" />
              <div>
                <p className="font-bold text-[#D4AF37] leading-tight">Synergie Dour</p>
                <p className="text-xs text-blue-100">ASBL</p>
              </div>
            </div>
            <p className="text-sm text-blue-100 leading-relaxed">
              Au service des commerçants et indépendants de la commune de Dour, dans le
              Cœur du Hainaut.
            </p>
          </div>

          {/* Colonne 2 : Navigation */}
          <div>
            <h3 className="font-semibold text-[#D4AF37] mb-3">Le site</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => setLocation("/resources")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Ressources
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/merchants")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Annuaire
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/news")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Actualités
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/events")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Événements
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/about")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  L'association
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/knowledge")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Base de connaissances
                </button>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Mentions */}
          <div>
            <h3 className="font-semibold text-[#D4AF37] mb-3">Informations</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => setLocation("/legal")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Mentions légales
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/privacy")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Politique de confidentialité
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/contact")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Contact
                </button>
              </li>
              <li>
                <button onClick={() => setLocation("/membership")} className="text-blue-100 hover:text-[#D4AF37] transition-colors">
                  Devenir membre — 50€/an
                </button>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Contact */}
          <div>
            <h3 className="font-semibold text-[#D4AF37] mb-3">Nous contacter</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-blue-100">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#D4AF37]" />
                <span>Dour, Belgique</span>
              </li>
              <li className="flex items-start gap-2 text-blue-100">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#D4AF37]" />
                <a href="mailto:contact@synergiedour.be" className="hover:text-[#D4AF37] transition-colors">
                  contact@synergiedour.be
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Avertissement */}
        <div className="mt-10 pt-8 border-t border-blue-800/50">
          <p className="text-xs text-blue-200 leading-relaxed max-w-3xl">
            <strong className="text-[#D4AF37]">Avertissement.</strong> Les informations
            publiées sur ce site sont des synthèses fournies à titre informatif. Elles
            ne remplacent ni un conseil personnalisé ni la consultation des sources
            officielles. Pour votre situation propre, consultez votre comptable, votre
            caisse d'assurances sociales ou un conseiller juridique.
          </p>
        </div>

        {/* Crédits */}
        <div className="mt-8 pt-6 border-t border-blue-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-blue-200">
            © {new Date().getFullYear()} Synergie Dour ASBL — Tous droits réservés
          </p>
          <p className="text-xs text-blue-200 flex items-center gap-2">
            <span>Plateforme conçue par</span>
            <a
              href="https://www.jsinnovia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4AF37] hover:text-[#F0E68C] font-medium inline-flex items-center gap-1 transition-colors"
            >
              JS-Innov.IA
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
