import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Store,
  Receipt,
  Settings,
  Bell,
} from "lucide-react";

export default function MemberDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { data: membership, isLoading } = trpc.memberships.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-amber-200">
          <CardHeader>
            <CardTitle className="text-[#001a3d]">Connexion requise</CardTitle>
            <CardDescription>
              Veuillez vous connecter pour accéder à votre espace membre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/")}
              className="w-full bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-gradient-to-r from-[#001a3d] to-[#003d99] text-white py-10 px-4">
        <div className="container mx-auto max-w-5xl">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-[#D4AF37]">Mon espace membre</h1>
          <p className="text-[#F0E68C] mt-1">
            Bonjour {user?.name ?? "membre"}, retrouvez ici l'état de votre adhésion et vos services.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
        <MembershipStatusCard membership={membership} onJoin={() => setLocation("/membership")} />

        {membership?.status === "active" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ServiceCard
                icon={Store}
                title="Mon commerce dans l'annuaire"
                description="Gérez la fiche de votre commerce visible sur le site."
                ctaLabel="Modifier ma fiche"
                onClick={() => setLocation("/dashboard/merchant")}
              />
              <ServiceCard
                icon={Bell}
                title="Mes événements"
                description="Conférences et networking auxquels vous êtes invité."
                ctaLabel="Voir l'agenda"
                onClick={() => setLocation("/events")}
              />
              <ServiceCard
                icon={Receipt}
                title="Mes paiements"
                description="Historique et téléchargement des reçus."
                ctaLabel="Voir l'historique"
                onClick={() => setLocation("/dashboard/payments")}
              />
              <ServiceCard
                icon={Settings}
                title="Mes informations"
                description="Modifier mes coordonnées et préférences."
                ctaLabel="Modifier"
                onClick={() => setLocation("/dashboard/profile")}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface MembershipData {
  status: "pending_payment" | "active" | "expired" | "cancelled";
  paymentMode: "one_time" | "subscription";
  expiresAt: Date | null;
  amountCents: number;
}

function MembershipStatusCard({
  membership,
  onJoin,
}: {
  membership: MembershipData | null | undefined;
  onJoin: () => void;
}) {
  if (!membership) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-700 mt-0.5" />
            <div>
              <CardTitle className="text-[#001a3d]">Vous n'êtes pas encore adhérent</CardTitle>
              <CardDescription>
                Rejoignez Synergie Dour pour bénéficier des services membres.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onJoin}
            className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
          >
            Devenir membre — 50€/an
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    pending_payment: {
      icon: AlertCircle,
      color: "amber",
      label: "Paiement en attente",
      desc: "Votre candidature est validée. Finalisez le paiement via le mail reçu.",
    },
    active: {
      icon: CheckCircle2,
      color: "green",
      label: "Adhésion active",
      desc: "Vous êtes membre de Synergie Dour. Profitez de tous les services.",
    },
    expired: {
      icon: AlertCircle,
      color: "red",
      label: "Adhésion expirée",
      desc: "Renouvelez votre adhésion pour continuer à bénéficier des services.",
    },
    cancelled: {
      icon: AlertCircle,
      color: "gray",
      label: "Adhésion annulée",
      desc: "Votre adhésion est annulée. Vous pouvez en redemander une à tout moment.",
    },
  }[membership.status];

  const StatusIcon = statusConfig.icon;
  const colorClasses = {
    green: { bg: "bg-green-50/70", border: "border-green-200", text: "text-green-900", iconBg: "bg-green-100", iconColor: "text-green-700" },
    amber: { bg: "bg-amber-50/70", border: "border-amber-200", text: "text-amber-900", iconBg: "bg-amber-100", iconColor: "text-amber-700" },
    red: { bg: "bg-red-50/70", border: "border-red-200", text: "text-red-900", iconBg: "bg-red-100", iconColor: "text-red-700" },
    gray: { bg: "bg-gray-50/70", border: "border-gray-200", text: "text-gray-900", iconBg: "bg-gray-100", iconColor: "text-gray-700" },
  }[statusConfig.color];

  return (
    <Card className={`${colorClasses.border} ${colorClasses.bg} border-2`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full ${colorClasses.iconBg} flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className={`w-6 h-6 ${colorClasses.iconColor}`} />
          </div>
          <div className="flex-grow">
            <Badge className={`${colorClasses.iconBg} ${colorClasses.text} mb-2`}>
              {statusConfig.label}
            </Badge>
            <CardTitle className="text-[#001a3d]">Statut de votre adhésion</CardTitle>
            <CardDescription className={colorClasses.text}>{statusConfig.desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {membership.status === "active" && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <CreditCard className="w-4 h-4 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Mode</p>
                <p className="text-sm font-medium text-[#001a3d]">
                  {membership.paymentMode === "subscription" ? "Renouvellement automatique" : "Paiement annuel"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-500">
                  {membership.paymentMode === "subscription" ? "Prochain renouvellement" : "Valable jusqu'au"}
                </p>
                <p className="text-sm font-medium text-[#001a3d]">
                  {membership.expiresAt
                    ? new Date(membership.expiresAt).toLocaleDateString("fr-BE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Receipt className="w-4 h-4 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Montant</p>
                <p className="text-sm font-medium text-[#001a3d]">
                  {(membership.amountCents / 100).toFixed(2)} €/an
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  return (
    <Card className="border-amber-100 hover:shadow-md transition-shadow bg-white">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#001a3d] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <CardTitle className="text-[#001a3d] text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onClick}
          variant="outline"
          className="w-full border-[#D4AF37] text-[#001a3d] hover:bg-[#D4AF37]/10"
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
