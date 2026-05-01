import { PublicLayout } from "@/components/PublicLayout";

export default function Privacy() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 border-b-2 border-amber-400 pb-2">Politique de Confidentialité</h1>
        
        <div className="prose prose-blue max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-blue-800">1. Collecte des données</h2>
            <p>Nous collectons les données que vous nous fournissez via nos formulaires de contact et d'adhésion : nom, email, téléphone, et informations professionnelles pour les commerçants.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">2. Utilisation des données</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6">
              <li>Traiter vos demandes de contact.</li>
              <li>Gérer votre adhésion à l'association Synergie Dour.</li>
              <li>Afficher votre commerce dans l'annuaire public (pour les membres approuvés).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">3. Vos droits (RGPD)</h2>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous à : <strong>privacy@synergiedour.be</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">4. Cookies</h2>
            <p>Ce site utilise des cookies essentiels au bon fonctionnement technique et, avec votre accord, des cookies de mesure d'audience anonymes.</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
