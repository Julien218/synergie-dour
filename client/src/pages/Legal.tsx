import { PublicLayout } from "@/components/PublicLayout";

export default function Legal() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 border-b-2 border-amber-400 pb-2">Mentions Légales</h1>
        
        <div className="prose prose-blue max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-blue-800">1. Éditeur du site</h2>
            <p>Le présent site est édité par l'association <strong>Synergie Dour</strong>.</p>
            <p>Siège social : [Adresse à Dour, Belgique]</p>
            <p>Email : info@synergiedour.be</p>
            <p>Numéro d'entreprise (BCE) : [Numéro à préciser]</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">2. Hébergement</h2>
            <p>Le site est hébergé par [Nom de l'hébergeur], dont le siège est situé à [Adresse].</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">3. Propriété Intellectuelle</h2>
            <p>L'ensemble de ce site, y compris les textes, logos, photos et codes sources, relève de la législation sur le droit d'auteur et la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans l'accord préalable de Synergie Dour ou de ses partenaires (Js-Innov.IA).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">4. Responsabilité</h2>
            <p>Synergie Dour décline toute responsabilité concernant l'exactitude, la complétude ou la pertinence des informations publiées sur ce site. L'utilisation de ce site est à vos risques et périls.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">5. Contact</h2>
            <p>Pour toute question concernant ces mentions légales, veuillez nous contacter à : <strong>info@synergiedour.be</strong></p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
