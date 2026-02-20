import { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-amber-200 sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SD</span>
                </div>
                <span className="font-bold text-blue-900 hidden sm:inline">Synergie Dour</span>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/merchants">
                <a className="text-gray-700 hover:text-amber-600 transition-colors">Annuaire</a>
              </Link>
              <Link href="/news">
                <a className="text-gray-700 hover:text-amber-600 transition-colors">Actualités</a>
              </Link>
              <Link href="/events">
                <a className="text-gray-700 hover:text-amber-600 transition-colors">Événements</a>
              </Link>
              <Link href="/membership">
                <a className="text-gray-700 hover:text-amber-600 transition-colors">Adhésion</a>
              </Link>
              <Link href="/contact">
                <a className="text-gray-700 hover:text-amber-600 transition-colors">Contact</a>
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-amber-500 text-amber-600">
                      Tableau de Bord
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => logout()}
                    className="text-gray-700 hover:text-red-600"
                  >
                    Déconnexion
                  </Button>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold">
                    Se Connecter
                  </Button>
                </a>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <Link href="/merchants">
                <a className="block px-4 py-2 text-gray-700 hover:bg-amber-50 rounded">Annuaire</a>
              </Link>
              <Link href="/news">
                <a className="block px-4 py-2 text-gray-700 hover:bg-amber-50 rounded">Actualités</a>
              </Link>
              <Link href="/events">
                <a className="block px-4 py-2 text-gray-700 hover:bg-amber-50 rounded">Événements</a>
              </Link>
              <Link href="/membership">
                <a className="block px-4 py-2 text-gray-700 hover:bg-amber-50 rounded">Adhésion</a>
              </Link>
              <Link href="/contact">
                <a className="block px-4 py-2 text-gray-700 hover:bg-amber-50 rounded">Contact</a>
              </Link>
              <div className="border-t border-amber-200 pt-2 mt-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard">
                      <a className="block px-4 py-2 text-amber-600 hover:bg-amber-50 rounded">
                        Tableau de Bord
                      </a>
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold">
                      Se Connecter
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-12 px-4 mt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Synergie Dour</h3>
              <p className="text-blue-100 text-sm">
                Commerçants & Indépendants Réunis. Valorisons ensemble le commerce local.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Liens Rapides</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <Link href="/merchants">
                    <a className="hover:text-amber-400">Annuaire</a>
                  </Link>
                </li>
                <li>
                  <Link href="/news">
                    <a className="hover:text-amber-400">Actualités</a>
                  </Link>
                </li>
                <li>
                  <Link href="/events">
                    <a className="hover:text-amber-400">Événements</a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Adhésion</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <Link href="/membership">
                    <a className="hover:text-amber-400">Rejoindre</a>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <a className="hover:text-amber-400">Nous Contacter</a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Contact</h4>
              <p className="text-sm text-blue-100">
                <strong>Adresse :</strong> Dour, Belgique
              </p>
              <p className="text-sm text-blue-100 mt-2">
                <strong>Email :</strong> info@synergiedour.be
              </p>
            </div>
          </div>
          <div className="border-t border-blue-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-blue-100">
              <p>&copy; 2026 Synergie Dour. Tous droits réservés.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="hover:text-amber-400">
                  Mentions légales
                </a>
                <a href="#" className="hover:text-amber-400">
                  Politique de confidentialité
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
