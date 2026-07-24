import { PublicLayout } from "@/components/PublicLayout";

export default function Privacy() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 border-b-2 border-amber-400 pb-2">Politique de Confidentialité</h1>
        
        <div className="prose prose-blue max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-blue-800">1. Responsable du traitement</h2>
            <p>Le responsable du traitement des données personnelles est l'ASBL <strong>Synergie Dour</strong>, Grand'Place 9, 7370 Dour, Belgique — BE 1036.801.623.</p>
            <p>Contact RGPD : info@synergiedour.be</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">2. Données collectées</h2>
            <p>Nous collectons les données que vous nous fournissez via nos formulaires :</p>
            <ul className="list-disc pl-6">
              <li><strong>Formulaire de contact</strong> : nom, email, téléphone, sujet et message.</li>
              <li><strong>Formulaire d'adhésion</strong> : nom de l'entreprise, catégorie, nom du contact, email, téléphone, adresse, message, consentements RGPD et acceptation de recevoir des emails.</li>
              <li><strong>Compte utilisateur</strong> : nom, email, mot de passe (haché), rôle.</li>
              <li><strong>Annuaire public</strong> : pour les membres approuvés, le nom, catégorie, adresse, téléphone, site web et logo du commerce sont affichés publiquement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">3. Base légale et finalité</h2>
            <p>Nous traitons vos données sur la base de :</p>
            <ul className="list-disc pl-6">
              <li><strong>Votre consentement</strong> (art. 6 §1 a RGPD) : pour l'envoi d'emails, l'adhésion et le formulaire de contact.</li>
              <li><strong>L'exécution d'un contrat</strong> (art. 6 §1 b RGPD) : pour la gestion de l'adhésion (cotisation 50€/an).</li>
              <li><strong>L'intérêt légitime</strong> (art. 6 §1 f RGPD) : pour répondre à vos demandes et assurer le fonctionnement du site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">4. Durée de conservation</h2>
            <p>Les données sont conservées :</p>
            <ul className="list-disc pl-6">
              <li><strong>Demandes de contact</strong> : 3 ans après le dernier contact.</li>
              <li><strong>Demandes d'adhésion</strong> : 2 ans si non abouties, durée de l'adhésion + 1 an pour les membres.</li>
              <li><strong>Comptes utilisateurs</strong> : durée de l'adhésion + 1 an après la fin.</li>
              <li><strong>Logs de connexion</strong> : 6 mois.</li>
            </ul>
            <p>À l'expiration de ces délais, les données sont définitivement supprimées ou anonymisées.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">5. Destinataires des données</h2>
            <p>Vos données sont accessibles :</p>
            <ul className="list-disc pl-6">
              <li> Aux administrateurs autorisés de Synergie Dour (Président et administrateurs approuvés).</li>
              <li>Au développeur technique (Js-Innov.IA) pour la maintenance du site, sous accord de confidentialité.</li>
            </ul>
            <p>Nous ne vendons ni ne louons jamais vos données à des tiers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">6. Transferts hors UE</h2>
            <p>Certaines données sont traitées par des services tiers situés en dehors de l'Union Européenne :</p>
            <ul className="list-disc pl-6">
              <li><strong>Railway Corp</strong> (États-Unis) — hébergement du site et de la base de données. Conforme au Data Privacy Framework EU-États-Unis.</li>
              <li><strong>Resend Inc.</strong> (États-Unis) — envoi d'emails transactionnels. Conforme au Data Privacy Framework.</li>
              <li><strong>OpenAI</strong> (États-Unis) — génération de contenu IA pour le module social. Données uniquement traitées à la demande de l'administrateur, jamais de données personnelles de membres.</li>
            </ul>
            <p>Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types, certifications) conformément à l'article 46 du RGPD.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">7. Vos droits (RGPD)</h2>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6">
              <li><strong>Droit d'accès</strong> (art. 15) : obtenir une copie de vos données.</li>
              <li><strong>Droit de rectification</strong> (art. 16) : corriger des données inexactes.</li>
              <li><strong>Droit à l'effacement</strong> (art. 17) : demander la suppression de vos données.</li>
              <li><strong>Droit à la limitation</strong> (art. 18) : restreindre le traitement.</li>
              <li><strong>Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré.</li>
              <li><strong>Droit d'opposition</strong> (art. 21) : vous opposer au traitement.</li>
              <li><strong>Droit de retirer votre consentement</strong> à tout moment, sans rétroactivité.</li>
            </ul>
            <p>Pour exercer ces droits, contactez-nous à : <strong>info@synergiedour.be</strong>.</p>
            <p>Vous pouvez également introduire une <strong>réclamation auprès de l'Autorité de Protection des Données</strong> (APD/Garde des données) belge :</p>
            <p>Autorité de protection des données<br />
            Rue de la Presse 35, 1000 Bruxelles<br />
            Site web : www.autoriteprotectiondonnees.be<br />
            Email : contact@apd-gba.be</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">8. Cookies</h2>
            <p>Ce site utilise des cookies essentiels au bon fonctionnement technique (session d'authentification) et, avec votre accord explicite, des cookies de mesure d'audience anonymes. Le consentement est recueilli via une bannière et peut être retiré à tout moment.</p>
            <p>Le cookie de session (<code>synergie_session</code>) est strictement nécessaire et est déposé avant le consentement, conformément à l'article 5(3) de la directive ePrivacy. Il est supprimé à la déconnexion ou après 30 jours.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">9. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :</p>
            <ul className="list-disc pl-6">
              <li>Chiffrement des communications (HTTPS/TLS).</li>
              <li>Hachage des mots de passe (scrypt avec sel aléatoire).</li>
              <li>Contrôle d'accès basé sur les rôles (admin, super_admin, user).</li>
              <li>En-têtes de sécurité HTTP (CSP, HSTS, X-Frame-Options).</li>
              <li>Limitation du taux de requêtes (rate limiting) sur les endpoints sensibles.</li>
              <li>Journalisation des actions administratives.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">10. Notification de violation</h2>
            <p>En cas de violation de données à caractère personnel présentant un risque pour vos droits et libertés, Synergie Dour s'engage à notifier l'Autorité de Protection des Données dans les 72 heures suivant la découverte de la violation, conformément à l'article 33 du RGPD, et à informer les personnes concernées si le risque est élevé (art. 34).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">11. Mise à jour</h2>
            <p>Cette politique de confidentialité a été mise à jour le 25 juillet 2026. Toute modification sera publiée sur cette page.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">12. Liens utiles</h2>
            <p>
              <a href="/legal" className="text-blue-900 underline hover:text-amber-600">Mentions légales</a>
              {" · "}
              <a href="/privacy" className="text-blue-900 underline hover:text-amber-600">Politique de confidentialité</a>
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
