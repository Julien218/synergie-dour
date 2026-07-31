import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Info, RotateCcw, ArrowLeft } from "lucide-react";

export default function MembershipCancelled() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50 flex items-center justify-center px-4 py-12">
      <Card className="max-w-2xl w-full border-amber-200 bg-white shadow-lg">
        <CardContent className="py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Info className="w-12 h-12 text-amber-700" />
          </div>

          <h1 className="text-3xl font-bold text-[#001a3d] mb-3">
            Aucun paiement requis
          </h1>

          <p className="text-lg text-gray-700 mb-2">
            L'adhésion Synergie Dour est gratuite jusqu'au 31 décembre 2026.
          </p>
          <p className="text-gray-600 mb-8">
            Cette ancienne page de paiement n'est plus utilisée. Vous pouvez déposer votre
            candidature directement, sans carte bancaire.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left text-sm text-gray-700">
            <p className="mb-2">
              <strong className="text-[#001a3d]">Une question ?</strong>
            </p>
            <p>
              Si vous avez rencontré un problème ou si vous avez des questions sur
              l'adhésion, n'hésitez pas à nous contacter à
              <a href="mailto:contact@synergiedour.be" className="text-[#003d99] hover:underline ml-1">
                contact@synergiedour.be
              </a>
              . Le bureau se fera un plaisir de vous répondre.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setLocation("/membership")}
              className="bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
            >
              <RotateCcw className="mr-2 w-4 h-4" />
              Reprendre l'adhésion
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-[#001a3d] text-[#001a3d]"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
