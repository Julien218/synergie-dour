import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Annuaire", href: "/merchants" },
    { label: "Ressources", href: "/resources" },
    { label: "Actualités", href: "/news" },
    { label: "Événements", href: "/events" },
    { label: "L'association", href: "/about" },
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
                  onClick={() => setLocation("/login")}
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
                    onClick={() => setLocation("/login")}
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

      <Footer />
    </div>
    <CookieBanner />
  );
}
