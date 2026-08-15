import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function MembershipSuccess() {
  const [, setLocation] = useLocation();

  // Optionnel : faire un confetti ou un événement analytics ici
  useEffect(() => {
    document.title = "Paiement transmis — Synergie Dour";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <Card className="max-w-2xl w-full border-green-200 bg-white shadow-lg">
        <CardContent className="py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-700" />
          </div>

          <h1 className="text-3xl font-bold text-[#001a3d] mb-3">
            Paiement transmis
          </h1>

          <p className="text-lg text-gray-700 mb-2">
            Stripe nous a transmis votre paiement de cotisation.
          </p>
          <p className="text-gray-600 mb-8">
            Le webhook signé doit encore confirmer l'encaissement. Vous recevrez ensuite
            votre reçu et un lien sécurisé pour compléter la fiche de votre commerce.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-[#001a3d] mb-3">Vos prochaines étapes</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37] font-bold mt-0.5">1.</span>
                <span>Attendez l'email confirmant l'activation de votre adhésion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37] font-bold mt-0.5">2.</span>
                <span>Complétez ensuite les informations, photos ou vidéo de votre commerce.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37] font-bold mt-0.5">3.</span>
                <span>Un administrateur contrôle les informations et le montage proposé.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D4AF37] font-bold mt-0.5">4.</span>
                <span>La publication n'intervient qu'après validation administrative.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setLocation("/")}
              className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
            >
              Retour à l'accueil
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
