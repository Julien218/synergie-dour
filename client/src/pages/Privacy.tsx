import { PublicLayout } from "@/components/PublicLayout";

export default function Privacy() {
  return (
    <PublicLayout>
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-8 border-b-2 border-amber-400 pb-2 text-3xl font-bold text-blue-900">
          Politique de confidentialité
        </h1>

        <div className="prose prose-blue max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-blue-800">1. Responsable du traitement</h2>
            <p>
              Synergie Dour ASBL (BCE 1036.801.623), Grand&apos;Place 9, 7370 Dour, Belgique, est responsable des traitements
              décrits ci-dessous. Pour toute question relative à vos données :{" "}
              <a href="mailto:info@synergiedour.be">info@synergiedour.be</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">2. Données, finalités et bases juridiques</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Contact :</strong> identité, coordonnées, sujet et message, afin de répondre à votre
                demande, sur la base de votre consentement et de l&apos;intérêt légitime à assurer le suivi des échanges.
              </li>
              <li>
                <strong>Adhésion :</strong> données d&apos;identification, informations professionnelles et choix
                de contact, afin d&apos;examiner puis gérer l&apos;adhésion et les services associés.
              </li>
              <li>
                <strong>Compte et sécurité :</strong> identifiants, rôle, sessions et traces techniques nécessaires
                à l&apos;authentification, au contrôle des accès et à la protection du service.
              </li>
              <li>
                <strong>Facturation :</strong> coordonnées de facturation, devis, factures et paiements, afin
                d&apos;exécuter les prestations et de respecter les obligations comptables et fiscales applicables.
              </li>
              <li>
                <strong>Annuaire et publications :</strong> informations professionnelles validées avant leur
                publication sur le site ou les réseaux sociaux de l&apos;association.
              </li>
            </ul>
            <p>Les champs obligatoires sont signalés dans les formulaires. L&apos;absence de ces données peut empêcher le traitement de la demande.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">3. Destinataires et prestataires</h2>
            <p>
              Les données sont accessibles aux administrateurs autorisés de Synergie Dour et, uniquement lorsque
              nécessaire, à ses prestataires techniques : Railway pour l&apos;hébergement, Resend pour les courriels et
              Stripe pour les paiements. Ces prestataires traitent les données dans le cadre de leurs services et de
              leurs engagements contractuels de sécurité et de confidentialité.
            </p>
            <p>Synergie Dour ne vend pas vos données personnelles.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">4. Durées de conservation</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Demandes de contact : au maximum 12 mois après le dernier échange utile.</li>
              <li>Demandes d&apos;adhésion non retenues : au maximum 24 mois après la décision.</li>
              <li>Dossiers des membres : pendant la relation associative, puis pendant les délais nécessaires à la défense des droits de l&apos;association.</li>
              <li>Pièces comptables, factures et preuves de paiement : pendant la durée imposée par la législation applicable.</li>
              <li>Journaux techniques et de sécurité : pendant la durée strictement nécessaire à la détection des incidents et à l&apos;audit.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">5. Vos droits</h2>
            <p>
              Selon les conditions du RGPD, vous pouvez demander l&apos;accès, la rectification, l&apos;effacement,
              la limitation ou la portabilité de vos données, vous opposer à certains traitements et retirer
              votre consentement à tout moment sans remettre en cause les traitements déjà effectués.
            </p>
            <p>
              Adressez votre demande à <a href="mailto:info@synergiedour.be">info@synergiedour.be</a>. Vous pouvez
              également introduire une réclamation auprès de l&apos;Autorité de protection des données :{" "}
              <a href="https://www.autoriteprotectiondonnees.be/citoyen" target="_blank" rel="noreferrer">
                autoriteprotectiondonnees.be
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">6. Cookies</h2>
            <p>
              Le site utilise uniquement les cookies techniques indispensables à l&apos;authentification, à la
              sécurité et au fonctionnement de l&apos;espace connecté. Aucun cookie publicitaire n&apos;est déposé par
              Synergie Dour. Si un outil de mesure d&apos;audience non essentiel est ajouté, votre choix sera recueilli au préalable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">7. Sécurité et mises à jour</h2>
            <p>
              Des mesures techniques et organisationnelles sont appliquées pour limiter l&apos;accès non autorisé,
              l&apos;altération ou la perte des données. Cette politique peut évoluer avec le service ou les exigences légales ;
              la date de mise à jour figure ci-dessous.
            </p>
          </section>

          <p className="text-sm text-gray-500">Dernière mise à jour : 2 août 2026.</p>
        </div>
      </main>
    </PublicLayout>
  );
}
