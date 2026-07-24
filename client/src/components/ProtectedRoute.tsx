import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
};

/**
 * Guard de route frontend.
 * - Redirige vers /login si non authentifie.
 * - Redirige vers /dashboard si authentifie mais sans le role requis.
 */
export function ProtectedRoute({ children, requireAdmin, requireSuperAdmin }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (requireSuperAdmin && user.role !== "super_admin") {
      setLocation("/dashboard");
      return;
    }
    if (requireAdmin && user.role !== "admin" && user.role !== "super_admin") {
      setLocation("/dashboard");
      return;
    }
  }, [user, loading, requireAdmin, requireSuperAdmin, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Synergie Dour" className="h-16 w-16 object-contain" />
          <p className="text-blue-900 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requireSuperAdmin && user.role !== "super_admin") return null;
  if (requireAdmin && user.role !== "admin" && user.role !== "super_admin") return null;

  return <>{children}</>;
}
