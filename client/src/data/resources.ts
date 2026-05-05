/**
 * Données des ressources pour les indépendants et PME de Dour.
 *
 * RÈGLE D'OR JURIDIQUE :
 * - Toujours résumer, jamais reproduire un texte de loi
 * - Toujours indiquer la date de vérification (`verifiedAt`)
 * - Toujours pointer vers la source officielle
 * - Réviser tous les 6 mois minimum
 *
 * Pour ajouter une fiche : copier le format ci-dessous, dater, sourcer.
 */

export type ResourceCategory = "starter" | "gestion" | "developpement" | "difficulte";

export interface ResourceLink {
  label: string;
  url: string;
  /** "officiel" pour les sources gouvernementales, "partenaire" pour les autres */
  type?: "officiel" | "partenaire";
}

export interface Resource {
  /** Slug URL-friendly, ex: "cotisations-sociales" */
  slug: string;
  /** Titre court de la fiche */
  title: string;
  /** Sous-titre / résumé court (1 phrase) */
  summary: string;
  /** Catégorie/parcours utilisateur */
  category: ResourceCategory;
  /** Tags pour la recherche */
  tags: string[];
  /** Date de dernière vérification au format ISO YYYY-MM-DD */
  verifiedAt: string;
  /** Contenu en markdown léger (paragraphes séparés par \n\n) */
  content: string;
  /** Liens officiels et partenaires */
  links: ResourceLink[];
  /** Contacts locaux à Dour / Borinage si pertinent */
  localContacts?: string[];
}

export const RESOURCE_CATEGORIES: Record<ResourceCategory, { label: string; description: string; color: string }> = {
  starter: {
    label: "Je me lance",
    description: "Créer mon activité, choisir mon statut, m'inscrire à la BCE.",
    color: "teal",
  },
  gestion: {
    label: "Je gère au quotidien",
    description: "Cotisations sociales, TVA, facturation, taxes communales.",
    color: "blue",
  },
  developpement: {
    label: "Je développe mon activité",
    description: "Aides wallonnes, chèques-entreprises, primes, financement.",
    color: "purple",
  },
  difficulte: {
    label: "Je traverse une difficulté",
    description: "Droit passerelle, médiation de dettes, cesser son activité.",
    color: "coral",
  },
};

export const RESOURCES: Resource[] = [
  // =====================================================================
  // STARTER - Je me lance
  // =====================================================================
  {
    slug: "creer-mon-activite-independant",
    title: "Créer mon activité d'indépendant",
    summary: "Les 5 étapes essentielles avant d'émettre votre première facture.",
    category: "starter",
    tags: ["bce", "guichet", "starter", "création"],
    verifiedAt: "2026-05-04",
    content: `Avant d'exercer comme indépendant en Belgique, vous devez accomplir cinq démarches dans un ordre précis. Sauter une étape, c'est s'exposer à des amendes ou à un refus de couverture sociale.

**Étape 1 — Vérifier les compétences requises.** Certaines professions (HORECA, coiffure, électricien, etc.) demandent une preuve de gestion ou un accès à la profession. Le SPF Économie liste les professions réglementées.

**Étape 2 — Inscription à la BCE via un guichet d'entreprises agréé.** Vous choisissez librement votre guichet (Acerta, Liantis, Partena, Securex, Xerius, UCM...). Coût : environ 105,50 € (montant indicatif, à confirmer). Vous recevez un numéro d'entreprise.

**Étape 3 — Activer la TVA.** Si vous êtes assujetti, faites-le via le SPF Finances. Vous pouvez choisir le régime de la franchise pour les petites entreprises sous 25 000 € de chiffre d'affaires annuel.

**Étape 4 — Affiliation à une caisse d'assurances sociales.** Au plus tard le jour du début de l'activité. Cette caisse percevra vos cotisations sociales trimestrielles.

**Étape 5 — Mutuelle, assurances et compte bancaire.** Mutuelle obligatoire, assurances facultatives mais fortement recommandées (RC pro, hospitalisation, revenu garanti), compte bancaire séparé pour la comptabilité.`,
    links: [
      { label: "SPF Économie — Créer une entreprise", url: "https://economie.fgov.be/fr/themes/entreprises/creer-une-entreprise", type: "officiel" },
      { label: "Banque-Carrefour des Entreprises", url: "https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html", type: "officiel" },
      { label: "1890 — guichet wallon", url: "https://www.1890.be", type: "officiel" },
      { label: "INASTI — Statut social", url: "https://www.inasti.be", type: "officiel" },
    ],
    localContacts: [
      "UCM Mons-Borinage — guichet d'entreprises et caisse d'assurances sociales",
      "Permanence d'information à confirmer auprès de la commune de Dour",
    ],
  },

  {
    slug: "choisir-statut-juridique",
    title: "Personne physique ou société : comment choisir ?",
    summary: "Avantages et limites de chaque forme juridique pour démarrer.",
    category: "starter",
    tags: ["société", "personne physique", "srl", "statut"],
    verifiedAt: "2026-05-04",
    content: `Le choix entre exercer en personne physique ou en société dépend de plusieurs critères : revenus attendus, risque financier, projet de croissance, et fiscalité.

**En personne physique** : démarches simples, peu coûteuses, mais votre patrimoine personnel est engagé en cas de dette. Vous payez l'impôt des personnes physiques sur vos revenus (taux progressif jusqu'à 50 %). C'est souvent le bon choix pour démarrer une activité de service à faible investissement.

**En société (SRL le plus souvent)** : votre patrimoine personnel est protégé. La société paie l'impôt des sociétés (20 % sur la première tranche de 100 000 € sous conditions, 25 % au-delà). Plus de formalités : statuts, comptabilité double, publication au Moniteur belge, dépôt de comptes annuels. Coût de constitution : 1 500 à 3 000 € en général, plus le capital de départ.

**Quand passer en société ?** Pas de règle absolue. Beaucoup d'experts-comptables conseillent d'envisager la société à partir de 50 000 à 70 000 € de revenu net annuel, mais cela dépend fortement de votre situation personnelle. Demandez toujours un calcul de comparaison à un comptable avant de décider.`,
    links: [
      { label: "SPF Économie — Formes juridiques", url: "https://economie.fgov.be/fr/themes/entreprises/creer-une-entreprise/aspects-juridiques", type: "officiel" },
      { label: "Code des sociétés et associations", url: "https://www.ejustice.just.fgov.be", type: "officiel" },
    ],
    localContacts: ["Consultez un expert-comptable pour une comparaison chiffrée."],
  },

  // =====================================================================
  // GESTION - Je gère au quotidien
  // =====================================================================
  {
    slug: "cotisations-sociales",
    title: "Cotisations sociales d'indépendant",
    summary: "Calcul, paiement, régularisation : ce que vous devez verser chaque trimestre.",
    category: "gestion",
    tags: ["inasti", "cotisations", "social", "pension"],
    verifiedAt: "2026-05-04",
    content: `En tant qu'indépendant, vous payez des cotisations sociales chaque trimestre à votre caisse d'assurances sociales. Ces cotisations financent votre pension, votre couverture maladie, votre droit passerelle en cas de coup dur, et votre congé maternité ou paternité. Elles sont calculées sur vos revenus professionnels nets et sont en grande partie déductibles fiscalement.

**Comment ça fonctionne ?** Pendant les trois premières années de votre activité, vos revenus réels ne sont pas encore connus du fisc. Vous payez donc des cotisations provisoires, généralement basées sur un revenu minimum légal. Une fois vos revenus définitifs établis (en général 2 à 3 ans plus tard), votre caisse régularise : si vous avez gagné plus que prévu, vous payez un complément ; si moins, vous êtes remboursé.

**Démarches concrètes :** choisir une caisse d'assurances sociales avant le début de votre activité ; vous y affilier ; recevoir vos avis de paiement trimestriels (mars, juin, septembre, décembre) ; payer dans les délais pour éviter une majoration de 3 % par trimestre.

**Cas particuliers :** indépendant complémentaire (cotisations réduites ou nulles sous un certain plafond), primo-starter (cotisations réduites les 4 premiers trimestres), ou difficulté financière (dispense temporaire ou report possibles via votre caisse). La dispense ne supprime pas vos droits sociaux mais peut affecter votre pension.`,
    links: [
      { label: "INASTI — toutes les règles légales", url: "https://www.inasti.be", type: "officiel" },
      { label: "Portail Sécurité sociale — démarches en ligne", url: "https://www.socialsecurity.be/citizen/fr/independants", type: "officiel" },
    ],
    localContacts: [
      "Votre caisse d'assurances sociales (interlocuteur direct)",
      "UCM Mons-Borinage — conseil personnalisé",
      "SDI — ligne d'information juridique",
    ],
  },

  {
    slug: "tva-bases",
    title: "TVA : les bases pour un indépendant",
    summary: "Taux, déclarations, franchise pour les petites entreprises.",
    category: "gestion",
    tags: ["tva", "fiscalité", "déclaration", "intervat"],
    verifiedAt: "2026-05-04",
    content: `La TVA (taxe sur la valeur ajoutée) est un impôt indirect que vous facturez à vos clients et reversez à l'État. En tant qu'indépendant assujetti, vous tenez une comptabilité TVA et déposez des déclarations périodiques via Intervat.

**Les taux principaux en Belgique** : 21 % (taux normal), 12 % (certains biens et services, ex. restauration sur place pour la nourriture), 6 % (biens de première nécessité, livres, certains travaux immobiliers). Vérifiez toujours le taux applicable à votre secteur sur le site du SPF Finances.

**Régime de la franchise** : si votre chiffre d'affaires annuel ne dépasse pas 25 000 € (HT), vous pouvez opter pour le régime de franchise. Vous ne facturez pas la TVA, mais vous ne pouvez pas la déduire non plus sur vos achats. Idéal pour démarrer en activité accessoire ou en service à faible investissement matériel.

**Déclarations TVA** : trimestrielles si CA < 2 500 000 €, mensuelles au-dessus. Tout se fait via la plateforme Intervat du SPF Finances. Le paiement intervient à la même échéance.

**Sanctions** : amende automatique en cas de retard, intérêts moratoires, et une attention particulière du fisc si les retards se répètent.`,
    links: [
      { label: "SPF Finances — TVA", url: "https://finances.belgium.be/fr/entreprises/tva", type: "officiel" },
      { label: "Intervat — déclarations en ligne", url: "https://eservices.minfin.fgov.be/intervat/", type: "officiel" },
      { label: "MyMinfin — vos données fiscales", url: "https://eservices.minfin.fgov.be/myminfin-web/", type: "officiel" },
    ],
  },

  {
    slug: "facturation-mentions-obligatoires",
    title: "Facturation : mentions obligatoires",
    summary: "Ce que doit contenir une facture conforme en Belgique.",
    category: "gestion",
    tags: ["facture", "mentions légales", "tva"],
    verifiedAt: "2026-05-04",
    content: `Une facture en Belgique doit contenir un ensemble de mentions obligatoires. Une facture incomplète peut être rejetée par votre client et risque une amende fiscale en cas de contrôle.

**Mentions obligatoires :** date de la facture ; numéro unique séquentiel ; nom, adresse et numéro d'entreprise (BCE) du fournisseur ; nom, adresse et numéro de TVA du client (si professionnel) ; date de la livraison ou prestation ; description précise des biens ou services ; quantités, prix unitaires, total HT ; taux de TVA appliqué et montant ; total TVA comprise ; conditions de paiement et délai.

**Mentions complémentaires selon le cas :** mention de l'auto-liquidation pour les opérations intracommunautaires ; "TVA non applicable, art. 56bis du Code TVA" en cas de régime de franchise ; mentions spécifiques pour la facturation électronique.

**Conservation :** 7 ans minimum pour les factures et tout document comptable, 15 ans pour les documents liés à un bien immobilier. Numérique ou papier, les deux sont acceptés à condition que l'intégrité et la lisibilité soient garanties.`,
    links: [
      { label: "SPF Finances — Mentions sur facture", url: "https://finances.belgium.be/fr/entreprises/tva/factures", type: "officiel" },
      { label: "SPF Économie — Code de droit économique", url: "https://economie.fgov.be", type: "officiel" },
    ],
  },

  {
    slug: "taxes-communales-dour",
    title: "Taxes communales à Dour",
    summary: "Les taxes locales qui peuvent concerner votre activité.",
    category: "gestion",
    tags: ["dour", "taxes communales", "enseigne", "terrasse"],
    verifiedAt: "2026-05-04",
    content: `Outre les impôts fédéraux et régionaux, votre commune peut percevoir des taxes locales qui s'appliquent à votre activité. À Dour, comme dans toutes les communes wallonnes, le règlement-taxe est voté chaque année par le conseil communal et est publié officiellement.

**Taxes potentiellement applicables** (à vérifier au cas par cas auprès de la commune) : taxe sur la force motrice (équipements industriels), taxe sur les enseignes lumineuses, taxe sur les terrasses sur la voie publique, taxe sur la distribution gratuite d'écrits publicitaires, taxe sur les nuitées (HORECA), taxe sur les surfaces commerciales.

**Comment savoir ce qui s'applique chez vous ?** Le règlement-taxe annuel est consultable au service taxes de l'administration communale. Si vous démarrez une activité visible (commerce, HORECA, atelier), prenez contact avec le service taxes avant l'ouverture.

**Sanctions et recours :** une taxe contestée peut faire l'objet d'une réclamation auprès du Collège communal dans les 6 mois de l'envoi de l'avertissement-extrait de rôle. En seconde ligne, recours possible devant le tribunal de première instance.`,
    links: [
      { label: "Commune de Dour", url: "https://www.dour.be", type: "officiel" },
      { label: "Wallonie — fiscalité locale", url: "https://finances.wallonie.be", type: "officiel" },
    ],
    localContacts: [
      "Service taxes de la commune de Dour",
      "Service urbanisme de Dour pour les enseignes",
    ],
  },

  // =====================================================================
  // DEVELOPPEMENT - Je développe
  // =====================================================================
  {
    slug: "aides-wallonnes-panorama",
    title: "Aides wallonnes : panorama des principales primes",
    summary: "Les dispositifs phares pour indépendants et PME en Wallonie.",
    category: "developpement",
    tags: ["aide", "prime", "wallonie", "1890", "midas"],
    verifiedAt: "2026-05-04",
    content: `La Wallonie propose une centaine d'aides aux entreprises, recensées dans la base officielle MIDAS. Voici les dispositifs phares pour les indépendants et petites structures.

**Incitant Airbag (Le Forem)** : jusqu'à 12 500 € sur 2 ans, versés en 4 tranches, pour les personnes qui passent à indépendant à titre principal. Conditions : ne plus percevoir d'allocations de chômage, avoir suivi une formation IFAPME ou un accompagnement SAACE, domicile ou siège social en Wallonie.

**Chèques-Entreprises** : couvrent 50 % à 75 % des frais de consultance externe (création, croissance, transmission, numérique, etc.). C'est l'aide la plus utilisée.

**Tremplin-Indépendants (mesure fédérale)** : permet de lancer une activité indépendante en conservant temporairement ses allocations de chômage. À demander à l'ONEM avant le début d'activité.

**Aide à l'investissement (PME)** : prime variable selon la catégorie d'entreprise, la zone et l'investissement. Régime réformé le 1er juillet 2025 — système d'évaluation par points (Économie / Emploi / Environnement). Demande à introduire AVANT tout engagement.

**Prêt Online (Wallonie Entreprendre)** : jusqu'à 75 000 €, demande entièrement en ligne, combinable avec la Garantie Online (couverture jusqu'à 87,5 %).

**Prêt Coup de Pouce** : prêt entre particuliers et indépendants/PME, avec avantage fiscal pour le prêteur.

**Cumul** : la plupart des aides sont cumulables, mais vérifiez toujours les conditions. Par exemple, Créashop Plus n'est pas cumulable avec Objectif Proximité.

**Comment trouver l'aide adaptée à votre situation ?** Contactez le 1890 (numéro court gratuit en Wallonie), guichet unique d'orientation. Ou utilisez la base MIDAS pour rechercher par filtres.`,
    links: [
      { label: "1890 — Guichet unique wallon", url: "https://www.1890.be", type: "officiel" },
      { label: "MIDAS — Base des aides publiques", url: "https://www.1890.be/outil/rechercher-des-aides-aux-entreprises-en-wallonie-avec-midas/", type: "officiel" },
      { label: "Wallonie Entreprendre", url: "https://walloniefinancement.be", type: "officiel" },
      { label: "Le Forem — Airbag", url: "https://www.leforem.be", type: "officiel" },
      { label: "Chèques-Entreprises", url: "https://www.cheques-entreprises.be", type: "officiel" },
    ],
    localContacts: ["IDEA — agence de développement territorial du Cœur du Hainaut"],
  },

  {
    slug: "cheques-entreprises",
    title: "Chèques-Entreprises wallons",
    summary: "Comment financer 50 à 75 % de votre consultance externe.",
    category: "developpement",
    tags: ["chèque", "consultance", "subside", "formation"],
    verifiedAt: "2026-05-04",
    content: `Les Chèques-Entreprises sont l'un des outils les plus utilisés en Wallonie pour faire appel à des consultants externes : juridique, financier, marketing, numérique, transmission, écologique, etc. La Région prend en charge une partie importante du coût.

**Principe :** vous identifiez un prestataire agréé, vous demandez un chèque pour une mission précise, le prestataire est payé en partie par vous et en partie par la Région.

**Couverture :** entre 50 % et 75 % des frais selon le type de chèque et votre profil. Plafond variable selon les chèques.

**Types de chèques disponibles :** chèque création, chèque croissance, chèque numérique, chèque transmission, chèque relance, chèque énergie, chèque formation à la création, etc.

**Démarche :** créer un compte sur la plateforme Chèques-Entreprises, soumettre une demande, attendre l'accord, signer une convention avec le prestataire, et lancer la mission. Les délais d'acceptation sont généralement de quelques semaines.

**Attention :** vous devez choisir un prestataire agréé (la liste est consultable sur la plateforme), et vous ne pouvez démarrer la mission qu'après accord de la Région.`,
    links: [
      { label: "Chèques-Entreprises — site officiel", url: "https://www.cheques-entreprises.be", type: "officiel" },
      { label: "1890 — orientation chèques", url: "https://www.1890.be", type: "officiel" },
    ],
  },

  // =====================================================================
  // DIFFICULTE - Je traverse une difficulté
  // =====================================================================
  {
    slug: "droit-passerelle",
    title: "Droit passerelle : votre filet de sécurité",
    summary: "Une aide financière en cas d'arrêt forcé ou de difficultés graves.",
    category: "difficulte",
    tags: ["droit passerelle", "arrêt", "difficulté", "inasti"],
    verifiedAt: "2026-05-04",
    content: `Le droit passerelle est un dispositif fédéral qui permet à un indépendant en difficulté de bénéficier d'une prestation financière temporaire et du maintien de certains droits sociaux (assurance maladie notamment), sans payer de cotisations pendant cette période.

**Quatre piliers principaux :**

**1. Faillite ou liquidation :** vous bénéficiez de la prestation si votre activité est officiellement arrêtée par jugement.

**2. Arrêt forcé (catastrophe, allergie, dommage matériel, force majeure) :** par exemple si un incendie détruit vos locaux ou si une décision administrative vous empêche d'exercer.

**3. Difficultés économiques :** sous conditions strictes, lorsque le revenu est tombé sous un certain seuil.

**4. Cessation à 60 ans après difficultés :** dispositif spécifique de fin de carrière.

**Montants :** les prestations mensuelles dépendent de la composition de famille (avec ou sans charge de famille) et sont indexées. Voir le site INASTI pour les montants à jour.

**Demande :** introduite via votre caisse d'assurances sociales, qui transmet à l'INASTI. Délais : la demande doit être déposée dans les délais (variables selon le pilier — généralement quelques mois après l'événement).

**Cumul et limites :** durée maximale de 12 mois sur l'ensemble de la carrière (sauf dispositions particulières).`,
    links: [
      { label: "INASTI — Droit passerelle", url: "https://www.inasti.be", type: "officiel" },
      { label: "Portail Sécurité sociale — indépendants", url: "https://www.socialsecurity.be/citizen/fr/independants", type: "officiel" },
    ],
    localContacts: [
      "Votre caisse d'assurances sociales (passage obligatoire)",
      "UCM Mons-Borinage / SDI — pour conseils en amont",
    ],
  },

  {
    slug: "cesser-activite",
    title: "Cesser son activité d'indépendant",
    summary: "Les démarches obligatoires pour arrêter proprement.",
    category: "difficulte",
    tags: ["cessation", "arrêt", "bce", "tva"],
    verifiedAt: "2026-05-04",
    content: `Cesser son activité d'indépendant n'est pas qu'une décision personnelle : c'est aussi un parcours administratif qui, mal géré, peut générer des dettes durables (cotisations dues, TVA non régularisée).

**Les démarches dans l'ordre :**

**1. Radiation BCE :** via votre guichet d'entreprises agréé. Date à déterminer avec soin — c'est la date qui arrête vos obligations.

**2. Cessation TVA :** déclaration spécifique au SPF Finances. Une dernière déclaration TVA doit clôturer votre activité.

**3. Notification à votre caisse d'assurances sociales :** elle arrêtera de réclamer des cotisations à partir du trimestre suivant. Attention : le trimestre commencé reste dû.

**4. Régularisations finales :** déclaration fiscale de l'année de cessation (revenus + plus-values éventuelles), apurement des dettes sociales et fiscales, fermeture du compte bancaire professionnel.

**Si vous étiez en société :** la procédure est plus lourde (assemblée générale de dissolution, liquidation, publication au Moniteur, dépôt des comptes de clôture). Un comptable et/ou un notaire sont quasi indispensables.

**À ne pas oublier :** prévenir vos clients en cours, archiver tous vos documents comptables (7 ans minimum), conserver vos relevés de cotisations sociales pour le calcul de votre future pension.

**Si vous êtes en difficulté avant la cessation :** vérifiez l'éligibilité au droit passerelle. Une cessation intervenant après une période de droit passerelle ouvre parfois des droits supplémentaires.`,
    links: [
      { label: "SPF Économie — Cesser une activité", url: "https://economie.fgov.be/fr/themes/entreprises", type: "officiel" },
      { label: "INASTI — Fin d'activité", url: "https://www.inasti.be", type: "officiel" },
      { label: "SPF Finances — Cessation TVA", url: "https://finances.belgium.be", type: "officiel" },
    ],
    localContacts: [
      "Votre comptable (fortement recommandé)",
      "Médiation de dettes du CPAS de Dour si difficultés financières",
    ],
  },
];

/** Helpers pour la recherche / filtre */
export function getResourceBySlug(slug: string): Resource | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}

export function getResourcesByCategory(category: ResourceCategory): Resource[] {
  return RESOURCES.filter((r) => r.category === category);
}

export function searchResources(query: string): Resource[] {
  const q = query.toLowerCase().trim();
  if (!q) return RESOURCES;
  return RESOURCES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q))
  );
}
