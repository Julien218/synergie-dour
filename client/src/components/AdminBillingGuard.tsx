import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function AdminBillingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Vérification de l'accès…</div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-[#001533]">Connexion requise</h1>
          <p className="mt-2 text-gray-600">Connectez-vous pour accéder à la facturation.</p>
          <a href={getLoginUrl()} className="mt-5 inline-block rounded-lg bg-[#001533] px-5 py-2 text-[#E8C547]">
            Se connecter
          </a>
        </div>
      </div>
    );
  }
  if (!["admin", "super_admin"].includes(user.role)) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-700">Accès refusé</h1>
          <p className="mt-2 text-gray-600">La facturation est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
