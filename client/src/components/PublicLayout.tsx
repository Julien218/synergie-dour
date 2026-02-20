import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Annuaire", href: "/merchants" },
    { label: "Actualités", href: "/news" },
    { label: "Événements", href: "/events" },
    { label: "Adhésion", href: "/membership" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-amber-200 sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img 
                src="/logo.png" 
                alt="Synergie Dour" 
                className="h-14 w-14 object-contain drop-shadow-md"
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className="text-gray-700 hover:text-amber-600 transition-colors font-medium"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Button 
                    onClick={() => setLocation("/dashboard")}
                    variant="outline" 
                    className="border-amber-500 text-amber-600"
                  >
                    Tableau de Bord
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => logout()}
                    className="text-gray-700 hover:text-red-600"
                  >
                    Déconnexion
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => window.location.href = getLoginUrl()}
                  className="bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
                >
                  Se Connecter
                </Button>
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
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-amber-50 rounded font-medium"
                >
                  {item.label}
                </button>
              ))}
              <div className="border-t border-amber-200 pt-2 mt-2">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setLocation("/dashboard");
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-amber-600 hover:bg-amber-50 rounded font-medium"
                    >
                      Tableau de Bord
                    </button>
                    <button
                      onClick={() => logout()}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded font-medium"
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <Button 
                    onClick={() => window.location.href = getLoginUrl()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
                  >
                    Se Connecter
                  </Button>
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
              <p className="text-[#D4AF37] text-sm">
                Commerçants & Indépendants Réunis. Valorisons ensemble le commerce local.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Liens Rapides</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                {navItems.slice(0, 3).map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => setLocation(item.href)}
                      className="hover:text-amber-400 transition-colors font-medium"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Adhésion</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <button
                    onClick={() => setLocation("/membership")}
                    className="hover:text-amber-400 transition-colors font-medium"
                  >
                    Rejoindre
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setLocation("/contact")}
                    className="hover:text-amber-400 transition-colors font-medium"
                  >
                    Nous Contacter
                  </button>
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
                <a href="#" className="hover:text-amber-400 transition-colors">
                  Mentions légales
                </a>
                <a href="#" className="hover:text-amber-400 transition-colors">
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
