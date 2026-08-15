import { PublicLayout } from "@/components/PublicLayout";

export default function Legal() {
  return (
    <PublicLayout>
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-8 border-b-2 border-amber-400 pb-2 text-3xl font-bold text-blue-900">
          Mentions légales
        </h1>

        <div className="prose prose-blue max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-blue-800">1. Éditeur du site</h2>
            <p>
              Le site <strong>synergiedour.be</strong> est édité par <strong>Synergie Dour ASBL</strong>,
              association sans but lucratif constituée pour une durée indéterminée.
            </p>
            <address className="not-italic">
              Siège social : Grand&apos;Place 9, 7370 Dour, Belgique<br />
              Numéro d&apos;entreprise (BCE) : 1036.801.623<br />
              Courriel : <a href="mailto:info@synergiedour.be">info@synergiedour.be</a>
            </address>
            <p>La responsabilité éditoriale est exercée par l&apos;organe d&apos;administration de l&apos;ASBL.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">2. Hébergement</h2>
            <p>
              Le site et sa base de données sont hébergés sur l&apos;infrastructure de Railway Corporation.
              Les informations contractuelles et de confidentialité de l&apos;hébergeur sont disponibles sur{" "}
              <a href="https://railway.com/legal" target="_blank" rel="noreferrer">
                railway.com/legal
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">3. Conception et propriété intellectuelle</h2>
            <p>
              Sauf mention contraire, les textes, éléments graphiques, logos, photographies et composants
              propres à ce site appartiennent à Synergie Dour ou sont utilisés avec l&apos;autorisation de leurs
              titulaires. La conception technique est réalisée avec JS-Innov.IA.
            </p>
            <p>
              Toute reproduction ou adaptation substantielle requiert une autorisation écrite préalable,
              sous réserve des exceptions prévues par la loi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">4. Responsabilité et liens externes</h2>
            <p>
              Synergie Dour veille à l&apos;exactitude des informations publiées, sans pouvoir garantir leur
              exhaustivité permanente. Les sites externes accessibles par lien restent sous la responsabilité
              de leurs éditeurs respectifs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-blue-800">5. Droit applicable</h2>
            <p>Le présent site est régi par le droit belge.</p>
          </section>

          <p className="text-sm text-gray-500">Dernière mise à jour : 2 août 2026.</p>
        </div>
      </main>
    </PublicLayout>
  );
}
