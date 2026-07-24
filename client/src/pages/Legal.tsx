import { PublicLayout } from "@/components/PublicLayout";

export default function Legal() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 border-b-2 border-amber-400 pb-2">Mentions Légales</h1>
        
        <div className="prose prose-blue max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-blue-800">1. Éditeur du site</h2>
            <p>Le présent site est édité par l'ASBL <strong>Synergie Dour</strong>.</p>
            <p>Siège social : Grand'Place 9, 7370 Dour, Hainaut, Belgique</p>
            <p>Email : info@synergiedour.be</p>
            <p>Numéro d'entreprise (BCE) : BE 1036.801.623</p>
            <p>Responsable de la publication : Olivier Trévis, Président</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">2. Développeur et partenaire technique</h2>
            <p>Conception, développement et maintenance : <strong>Js-Innov.IA</strong></p>
            <p>Site web : www.jsinnovia.com</p>
            <p>Email : julien.pagin.pv@gmail.com</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">3. Hébergement</h2>
            <p>Le site est hébergé par <strong>Railway Corp</strong>, dont le siège est situé à :</p>
            <p>Railway Corporation</p>
            <p>450 Lexington Avenue, New York, NY 10017, États-Unis</p>
            <p>Site web : railway.app</p>
            <p>Les données sont traitées conformément au RGPD. Un accord de transfert de données vers les États-Unis est en place (Data Privacy Framework).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">4. Propriété Intellectuelle</h2>
            <p>L'ensemble de ce site, y compris les textes, logos, photos et codes sources, relève de la législation sur le droit d'auteur et la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans l'accord préalable de Synergie Dour ou de ses partenaires (Js-Innov.IA).</p>
            <p>Le logo Synergie Dour et le logo Js-Innov.IA sont la propriété respective de l'ASBL Synergie Dour et de Js-Innov.IA.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">5. Service transactionnel email</h2>
            <p>Les emails envoyés depuis le site (confirmations, notifications, réponses aux demandes) sont acheminés via le service <strong>Resend Inc.</strong> (resend.com), dont le siège est situé à San Francisco, Californie, États-Unis. Resend est certifié conforme au RGPD et au Data Privacy Framework.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">6. Responsabilité</h2>
            <p>L'ASBL Synergie Dour s'efforce de fournir des informations exactes et à jour sur ce site. Toutefois, elle ne saurait être tenue responsable des erreurs, omissions ou de l'indisponibilité temporaire du site. Les informations fournies sur ce site le sont à titre indicatif et ne sauraient dispenser l'utilisateur d'une analyse complémentaire et personnalisée.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">7. Liens utiles</h2>
            <p>
              <a href="/privacy" className="text-blue-900 underline hover:text-amber-600">Politique de confidentialité</a>
              {" · "}
              <a href="/legal" className="text-blue-900 underline hover:text-amber-600">Mentions légales</a>
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
