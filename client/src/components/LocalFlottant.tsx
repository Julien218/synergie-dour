import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, X, ArrowRight, Store } from "lucide-react";

export function LocalFlottant() {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-xs w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-500"
      role="complementary"
      aria-label="Annonce locale commerciale"
    >
      <div className="bg-gradient-to-br from-[#001a3d] to-[#003d99] rounded-2xl border border-amber-500/40 overflow-hidden">
        {/* Bande dorée top */}
        <div className="h-1 bg-gradient-to-r from-[#D4AF37] via-[#F0E68C] to-[#D4AF37]" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[#D4AF37] font-bold text-sm leading-tight">Local commercial à louer ?</p>
                <p className="text-blue-300 text-xs">Publiez gratuitement sur Synergie Dour</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-blue-400 hover:text-white transition-colors flex-shrink-0 -mt-1 -mr-1 p-1 rounded-lg hover:bg-white/10"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Corps */}
          <p className="text-blue-100 text-xs leading-relaxed mb-4">
            Votre annonce sera vérifiée et diffusée sur notre site et nos réseaux sociaux — Facebook, Instagram — sans frais.
          </p>

          {/* Badges */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5">Gratuit</span>
            <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5">Publication rapide</span>
          </div>

          {/* CTA */}
          <button
            onClick={() => setLocation("/louer-mon-local")}
            className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-bold text-sm py-2.5 px-4 rounded-xl transition-colors"
          >
            Déposer mon annonce
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
