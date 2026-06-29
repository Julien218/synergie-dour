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
  /** Image OG personnalisée pour réseaux sociaux (nom du fichier dans /public/og-ressources/) */
  ogImage?: string;
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
  ogImage: "og_record-independants-belgique.jpg",
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
  ogImage: "og_aides-crise-energetique-2026.jpg",
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
  ogImage: "og_tva-12-horeca-hotels-2026.jpg",
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
  ogImage: "og_facturation-electronique-peppol.jpg",
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
  ogImage: "og_suppression-guichets-entreprises.jpg",
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

  // =====================================================================
  // STARTER — Je me lance (suite)
  // =====================================================================
  {
    slug: "numero-bce-tva-activation",
    title: "Numéro BCE et activation TVA : mode d'emploi",
    summary: "Comment obtenir votre numéro d'entreprise et activer votre numéro de TVA en ligne.",
    category: "starter",
    tags: ["bce", "tva", "numéro entreprise", "guichet", "intervat"],
    verifiedAt: "2026-06-01",
    content: `Le numéro BCE (Banque-Carrefour des Entreprises) est votre identifiant unique en tant qu'entreprise belge. Il commence par 0 ou 1 et comporte 10 chiffres. Il sert pour toutes vos démarches administratives.

**Obtenir votre numéro BCE :** rendez-vous auprès d'un guichet d'entreprises agréé (Acerta, UCM, Liantis, Partena, Xerius, Securex…). Le guichet vérifie vos données, vous inscrit à la BCE et, si nécessaire, active votre numéro de TVA auprès du SPF Finances. Prévoir environ 105,50 € de frais de guichet (montant indicatif 2026, vérifier auprès de votre guichet).

**Activation TVA :** si vous êtes assujetti à la TVA (la grande majorité des indépendants), votre guichet soumet votre dossier au SPF Finances. Vous recevez une confirmation d'assujettissement et pouvez alors facturer avec TVA. Si votre CA annuel reste sous 25 000 €, vous pouvez opter pour la franchise de la TVA.

**Délai :** l'inscription complète prend généralement 1 à 5 jours ouvrables.

**Vérifier un numéro BCE :** rendez-vous sur la Banque-Carrefour en ligne pour vérifier qu'un numéro est actif.`,
    links: [
      { label: "Banque-Carrefour des Entreprises", url: "https://kbopub.economie.fgov.be", type: "officiel" },
      { label: "SPF Finances — Intervat (TVA)", url: "https://eservices.minfin.fgov.be/intervat/", type: "officiel" },
      { label: "UCM — Guichet d'entreprises", url: "https://www.ucm.be", type: "partenaire" },
    ],
    localContacts: ["UCM Mons-Borinage — guichet agréé couvrant la région de Dour"],
  },

  {
    slug: "plan-financier-obligation",
  ogImage: "og_reforme-fiscale-2026-2030.jpg",
    title: "Plan financier : obligation et contenu",
    summary: "Obligatoire pour créer une société, le plan financier engage votre responsabilité.",
    category: "starter",
    tags: ["plan financier", "société", "srl", "comptable", "capital"],
    verifiedAt: "2026-06-01",
    content: `Depuis le Code des Sociétés et Associations (CSA) de 2019, tout fondateur d'une SRL, SA ou SC doit remettre un **plan financier** au notaire avant la constitution. Ce document reste confidentiel mais peut être opposé aux fondateurs en cas de faillite dans les 3 ans.

**Ce que le plan financier doit contenir :**
- Description de l'activité projetée
- Aperçu de toutes les sources de financement (capital, emprunts, subsides)
- Bilan d'ouverture prévisionnel
- Compte de résultat prévisionnel pour 2 ans
- Budget de trésorerie mensuel pour 2 ans
- Description des hypothèses retenues et de leur mode d'évaluation

**Qui le rédige ?** Généralement un comptable ou un expert-comptable. Le Centre pour Entreprises en difficulté (CED/OCE) peut aider les candidats entrepreneurs avec peu de moyens.

**Responsabilité des fondateurs :** si la société est déclarée en faillite dans les 3 ans suivant sa création, et que le capital de départ s'avère manifestement insuffisant, les fondateurs peuvent être tenus personnellement responsables des dettes sociales.`,
    links: [
      { label: "SPF Justice — Code des Sociétés (CSA)", url: "https://www.ejustice.just.fgov.be", type: "officiel" },
      { label: "1890 — Guichet wallon des entreprises", url: "https://www.1890.be", type: "officiel" },
    ],
    localContacts: ["Expert-comptable local (demandez une liste à l'ITAA)", "OCE/CED — Centre pour Entreprises en difficulté"],
  },

  {
    slug: "assurances-independant",
    title: "Assurances indispensables pour un indépendant",
    summary: "RC professionnelle, revenu garanti, hospitalisation : ce qui est obligatoire et ce qui est conseillé.",
    category: "starter",
    tags: ["assurance", "rc pro", "revenu garanti", "hospitalisation", "risques"],
    verifiedAt: "2026-06-01",
    content: `En tant qu'indépendant, vous n'avez pas la couverture automatique d'un salarié. Il est essentiel de vous protéger vous-même contre les risques professionnels et personnels.

**RC Professionnelle (obligatoire dans certains secteurs) :** couvre les dommages causés à des tiers dans le cadre de votre activité. Obligatoire pour les professions libérales réglementées (médecins, architectes, comptables…) et fortement recommandée pour tous. Coût : de 150 € à plusieurs milliers d'euros selon le secteur.

**Assurance revenu garanti :** en cas d'incapacité de travail (maladie, accident), vous touchez via votre mutuelle une indemnité, mais limitée (environ 68 €/jour en 2026 pour un titulaire, indicatif). L'assurance revenu garanti comble la différence. Critère clé : vérifier le délai de carence et la définition d'invalidité.

**Hospitalisation :** non obligatoire, mais fortement conseillée. En Belgique, les frais hospitaliers peuvent dépasser 5 000 € pour un séjour courant. Les mutuelles proposent des hospitalisations à des tarifs intéressants.

**Assurance incendie et RC exploitation :** si vous avez un local commercial, l'assurance incendie peut être imposée par votre bail. La RC exploitation couvre les dommages survenus dans votre établissement.

**Déductibilité fiscale :** les primes d'assurance professionnelle sont en général déductibles à titre de frais professionnels. Vérifiez avec votre comptable.`,
    links: [
      { label: "FSMA — Assurances en Belgique", url: "https://www.fsma.be", type: "officiel" },
      { label: "INAMI — Indemnités maladie indépendant", url: "https://www.inami.fgov.be", type: "officiel" },
    ],
    localContacts: ["Votre mutuelle (interlocuteur privilégié pour le revenu garanti)"],
  },

  // =====================================================================
  // GESTION — Je gère au quotidien (suite)
  // =====================================================================
  {
    slug: "tva-horeca",
    title: "TVA et HORECA : règles spécifiques",
    summary: "Taux réduit sur la restauration, consommations sur place et à emporter.",
    category: "gestion",
    tags: ["tva", "horeca", "restaurant", "café", "12%", "6%"],
    verifiedAt: "2026-06-01",
    content: `Le secteur HORECA bénéficie de règles TVA particulières en Belgique, avec plusieurs taux applicables selon la nature de la prestation.

**Taux applicables en 2026 :**
- **12 %** : repas et consommations servis sur place (assiettes chaudes, menus, sandwichs consommés sur place)
- **6 %** : boissons non alcoolisées et aliments de base à emporter, hébergement (hôtels, chambres d'hôtes), boissons chaudes à emporter
- **21 %** : boissons alcoolisées (bière, vin, spiritueux) — même consommées sur place
- **6 %** : hébergement touristique classifié

**Attention aux combinaisons :** une facture HORECA peut comporter plusieurs taux TVA pour une même commande. Votre caisse enregistreuse doit distinguer automatiquement chaque taux.

**Système de caisse enregistreuse (SCE) :** obligatoire si votre CA annuel en repas dépasse 25 000 €. Le SCE transmet des données quotidiennes au SPF Finances via un FDM (Fiscal Data Module). Non-respect : amendes importantes.

**Déductibilité des repas d'affaires :** 69 % des frais de restaurant (à confirmer avec votre comptable pour 2026).`,
    links: [
      { label: "SPF Finances — TVA HORECA", url: "https://finances.belgium.be/fr/entreprises/tva/taux-de-tva", type: "officiel" },
      { label: "Fédération HORECA Wallonie", url: "https://www.horecawallonie.be", type: "partenaire" },
    ],
    localContacts: ["Comptable spécialisé HORECA", "Fédération HORECA Wallonie — permanences téléphoniques"],
  },

  {
    slug: "comptabilite-simplifiee-independant",
    title: "Comptabilité simplifiée vs comptabilité en partie double",
    summary: "Quelle comptabilité devez-vous tenir selon votre statut et votre CA ?",
    category: "gestion",
    tags: ["comptabilité", "bilan", "journaux", "simplifiée", "double"],
    verifiedAt: "2026-06-01",
    content: `En Belgique, les obligations comptables dépendent de votre statut juridique et de votre chiffre d'affaires.

**Indépendant en personne physique — comptabilité simplifiée :** si votre CA annuel hors TVA ne dépasse pas 500 000 €, vous pouvez tenir une comptabilité simplifiée. Cela signifie : un journal des recettes, un journal des achats/dépenses, et un registre des biens professionnels. Pas de bilan formel exigé.

**Indépendant en personne physique — comptabilité en partie double :** obligatoire si vous dépassez 500 000 € de CA, ou si vous exercez une activité commerciale en société de fait ou sous forme d'entreprise individuelle de grande taille.

**Sociétés (SRL, SA…) — comptabilité en partie double :** toujours obligatoire, quelle que soit la taille. Vous devez déposer vos comptes annuels à la Banque Nationale de Belgique (BNB) dans les 7 mois après la clôture.

**Logiciels recommandés :** Winbooks, BOB50, Exact Online, ou des outils cloud comme Dext, Yuki, Silverfin pour les plus modernes.

**Conseil pratique :** même si la comptabilité simplifiée est autorisée, confier votre comptabilité à un professionnel (comptable ou expert-comptable ITAA) vous fait gagner du temps et sécurise vos déclarations.`,
    links: [
      { label: "SPF Économie — Droit comptable", url: "https://economie.fgov.be/fr/themes/entreprises/comptabilite", type: "officiel" },
      { label: "ITAA — Trouver un comptable", url: "https://www.itaa.be", type: "officiel" },
      { label: "BNB — Dépôt des comptes annuels", url: "https://www.nbb.be/fr/centrale-des-bilans", type: "officiel" },
    ],
    localContacts: ["ITAA — annuaire des comptables agréés (recherche par région)"],
  },

  {
    slug: "bail-commercial",
  ogImage: "og_taxes-plus-values-2026.jpg",
    title: "Bail commercial : droits et obligations",
    summary: "Durée minimale, loyer, renouvellement et résiliation d'un bail commercial.",
    category: "gestion",
    tags: ["bail", "loyer", "local commercial", "contrat", "propriétaire"],
    verifiedAt: "2026-06-01",
    content: `Le bail commercial est régi en Wallonie principalement par la loi belge sur les baux commerciaux et, depuis 2018 pour les nouveaux baux wallons, par le Code wallon du Logement et de l'Habitat Durable pour certains aspects. Les règles fédérales de 1951 sur les baux commerciaux restent largement d'application.

**Durée minimale :** 9 ans, sauf exception. Le locataire peut résilier à la fin de chaque période triennale (3, 6, ou 9 ans) moyennant un préavis de 6 mois.

**Loyer :** librement fixé entre parties. Il peut être indexé annuellement (selon l'indice santé) si le contrat le prévoit. Toute révision du loyer (à la hausse) n'est possible qu'après 3 ans d'occupation.

**Droit au renouvellement :** après 9 ans, le locataire a le droit de demander le renouvellement du bail. Le propriétaire ne peut refuser que dans des cas limitativement prévus (reprise pour usage personnel, démolition/reconstruction, motif grave).

**Résiliation anticipée :** le propriétaire ne peut pas résilier le bail avant son terme, sauf clause spéciale ou faute grave du locataire. Le locataire peut quitter à chaque triennat avec 6 mois de préavis.

**À Dour :** les locaux commerciaux disponibles sont recensés sur cette plateforme. Avant de signer un bail, faites-le relire par un notaire ou un avocat spécialisé.`,
    links: [
      { label: "SPF Justice — Baux commerciaux", url: "https://www.notaire.be/acheter-louer-construire/louer/bail-commercial", type: "officiel" },
      { label: "Fédération Royale du Notariat belge", url: "https://www.notaire.be", type: "officiel" },
    ],
    localContacts: ["Notaire local à Dour ou Boussu", "Syndicat des locataires commerciaux — UCM"],
  },

  {
    slug: "rgpd-independant",
  ogImage: "og_modernisation-droit-travail-2026.jpg",
    title: "RGPD pour les indépendants et PME",
    summary: "Ce que vous devez faire concrètement pour être en conformité avec le RGPD.",
    category: "gestion",
    tags: ["rgpd", "données personnelles", "vie privée", "conformité", "APD"],
    verifiedAt: "2026-06-01",
    content: `Le RGPD (Règlement Général sur la Protection des Données) s'applique à toute entreprise qui traite des données personnelles de résidents européens, quelle que soit sa taille. En tant qu'indépendant ou PME, vous êtes concerné dès que vous gérez une liste de clients, envoyez des newsletters, ou utilisez un logiciel de facturation.

**Ce que vous devez faire en pratique :**

1. **Tenir un registre des traitements** : liste des données que vous collectez, pourquoi, combien de temps vous les conservez, et qui y a accès.

2. **Politique de confidentialité** : informer vos clients et prospects de leurs droits (accès, rectification, effacement). À afficher sur votre site web et dans vos contrats.

3. **Consentement** : toute communication commerciale par email nécessite un consentement explicite (opt-in), sauf pour des clients existants.

4. **Sécurité des données** : protéger vos fichiers clients (mot de passe, chiffrement, sauvegardes). En cas de fuite, vous devez notifier l'APD sous 72 heures.

5. **Désignation d'un DPO** : obligatoire seulement pour les organisations traitant des données sensibles à grande échelle. Facultatif mais recommandé pour les autres.

**Sanctions :** amendes jusqu'à 20 millions € ou 4 % du CA mondial annuel. Pour une PME locale, une plainte d'un client peut déclencher un contrôle de l'APD.`,
    links: [
      { label: "Autorité de Protection des Données (APD)", url: "https://www.autoriteprotectiondonnees.be", type: "officiel" },
      { label: "Commission européenne — RGPD", url: "https://commission.europa.eu/law/law-topic/data-protection_fr", type: "officiel" },
    ],
    localContacts: ["UCM — accompagnement RGPD pour PME"],
  },

  {
    slug: "tresorie-independant",
    title: "Gérer sa trésorerie quand on est indépendant",
    summary: "Anticiper les décalages de paiement, constituer une réserve et éviter les impayés.",
    category: "gestion",
    tags: ["trésorerie", "liquidités", "impayés", "cash-flow", "budget"],
    verifiedAt: "2026-06-01",
    content: `La trésorerie est le nerf de la guerre pour un indépendant. Même une activité rentable peut se retrouver en difficulté si les encaissements arrivent trop tard par rapport aux décaissements.

**Les bons réflexes au quotidien :**

- **Délai de paiement légal :** en B2B, le délai légal est de 30 jours après facturation (60 jours si accepté par les parties). En B2C, paiement immédiat ou à la livraison est courant.
- **Rappels automatiques :** envoyez un rappel dès le lendemain de l'échéance. Passez à la mise en demeure après 15 jours.
- **Provision mensuelle :** mettez de côté chaque mois 25 à 30 % de vos recettes brutes pour couvrir TVA, cotisations sociales et impôt.
- **Compte séparé :** tenez un compte bancaire strictement professionnel pour isoler vos flux.
- **Crédit court terme :** certaines banques offrent des lignes de crédit pour indépendants (straight loan, crédit de caisse). À n'utiliser qu'en dernier recours.

**Outil simple :** un tableau prévisionnel mensuel sur 12 mois (recettes prévues - dépenses fixes - charges sociales - TVA = trésorerie disponible). Excel ou Google Sheets suffisent pour démarrer.`,
    links: [
      { label: "SPF Économie — Délais de paiement", url: "https://economie.fgov.be/fr/themes/entreprises/pratiques-du-marche-et-protection-du-consommateur/delais-de-paiement", type: "officiel" },
      { label: "Febelfin — Crédits aux entreprises", url: "https://www.febelfin.be", type: "partenaire" },
    ],
    localContacts: ["Comptable local pour mise en place d'un tableau de bord trésorerie", "UCM — conseil financier PME"],
  },

  // =====================================================================
  // DÉVELOPPEMENT — Je développe mon activité
  // =====================================================================
  {
    slug: "prime-investissement-wallon",
    title: "Prime à l'investissement wallon",
    summary: "Subsides directs pour équiper votre entreprise ou agrandir vos locaux.",
    category: "developpement",
    tags: ["prime", "investissement", "wallonie", "équipement", "subsides"],
    verifiedAt: "2026-06-01",
    content: `La Région wallonne offre des primes à l'investissement aux PME qui réalisent des investissements productifs sur son territoire. Ces primes sont gérées par l'Agence pour l'Entreprise et l'Innovation (AEI / anciennement Agence wallonne de l'Export et des Investissements étrangers, rebaptisée).

**Qui peut bénéficier ?** Toute PME (moins de 250 personnes, CA < 50M€) établie en Wallonie, dans la plupart des secteurs d'activité. Certains secteurs sont exclus (agriculture, finance, immobilier pur...).

**Types d'investissements éligibles :**
- Acquisition de matériel et d'outillage
- Aménagement ou construction de locaux professionnels
- Logiciels liés à un investissement matériel
- Investissements immatériels (brevets, licences) dans certaines conditions

**Taux de prime :** entre 4 % et 32 % du montant éligible selon la taille de l'entreprise, la zone géographique (zone de développement prioritaire ou non), et le type d'investissement. La commune de Dour se situe en Province de Hainaut, qui bénéficie souvent de taux majorés.

**Démarche :** la demande de prime doit être introduite AVANT de commencer l'investissement. Une fois les travaux ou achats réalisés sans agrément préalable, la prime est perdue. Contactez l'AEI ou votre guichet d'entreprises pour préparer votre dossier.`,
    links: [
      { label: "AEI — Primes à l'investissement", url: "https://www.aei.be/fr/investir-en-wallonie/primes-a-l-investissement", type: "officiel" },
      { label: "1890 — Guichet wallon entreprises", url: "https://www.1890.be", type: "officiel" },
    ],
    localContacts: ["AEI — antenne Hainaut (Mons)", "UCM Mons-Borinage — accompagnement à la prime"],
  },

  {
    slug: "digital-wallon-numerique",
    title: "Aides à la transformation numérique en Wallonie",
    summary: "Chèques numériques, coachings et subventions pour digitaliser votre activité.",
    category: "developpement",
    tags: ["numérique", "digital", "site web", "e-commerce", "subvention"],
    verifiedAt: "2026-06-01",
    content: `La Wallonie soutient activement la transformation numérique des PME et indépendants via plusieurs dispositifs complémentaires.

**Chèque numérique :** d'une valeur de 3 500 € (subside à 50-75 % selon la taille), ce chèque finance l'intervention d'un prestataire numérique agréé pour : création/refonte de site web, stratégie réseaux sociaux, mise en place d'un CRM, e-commerce, cybersécurité, etc. Géré par le Digital Wallonia.

**Coaching numérique :** accompagnement gratuit de 5 à 10 jours par un coach numérique certifié. Pour établir votre stratégie digitale et prioriser les actions.

**Aide à la cybersécurité :** depuis 2024, une aide spécifique existe pour les audits de cybersécurité et la mise en conformité RGPD des PME wallonnes.

**Conditions générales :** être établi en Wallonie, avoir moins de 250 employés, ne pas avoir bénéficié du même dispositif récemment.

**Comment postuler ?** Via le portail Digital Wallonia ou en passant par votre guichet d'entreprises ou la chambre de commerce locale.`,
    links: [
      { label: "Digital Wallonia — Chèques numériques", url: "https://www.digitalwallonia.be/fr/cheques-numeriques", type: "officiel" },
      { label: "Agence du Numérique", url: "https://www.numerique.be", type: "officiel" },
    ],
    localContacts: ["Digital Wallonia — contacter pour coaching gratuit", "UCM — accompagnement dossiers chèques numériques"],
  },

  {
    slug: "embauche-premier-employe",
  ogImage: "og_heures-supplementaires-2026.jpg",
    title: "Embaucher son premier employé",
    summary: "ONSS, Dimona, contrat de travail et aides à l'embauche en Wallonie.",
    category: "developpement",
    tags: ["emploi", "onss", "dimona", "contrat", "aides", "premier emploi"],
    verifiedAt: "2026-06-01",
    content: `Engager votre premier salarié est une étape importante. Les démarches sont encadrées mais accessibles si vous les suivez dans le bon ordre.

**Avant l'entrée en service :**
1. Déclaration Dimona (Déclaration immédiate à l'emploi) via l'ONSS — obligatoire avant le premier jour de travail. À faire via le portail de la Sécurité sociale.
2. Affiliation à un secrétariat social (SD Worx, Acerta, Partena, UCM, Securex…) qui calculera les salaires et versera les cotisations ONSS.
3. Rédaction du contrat de travail (CDI, CDD, temps partiel, étudiant…).
4. Inscription au registre du personnel et mise en place du règlement de travail.

**Cotisations patronales ONSS :** environ 25 % du salaire brut (taux indicatif 2026). Des réductions existent (plan Activa, Plan Win-Win, etc.) pour les premiers engagements.

**Aides wallonnes à l'embauche :**
- **Plan Formation-Insertion (PFI)** : subvention si vous formez un demandeur d'emploi.
- **Région Wallonne — Aides à l'emploi** : consultez le Forem pour les aides actuellement disponibles.
- **Réduction ONSS premier engagé** : exonération complète des cotisations patronales pour le 1er employé (sous conditions de taille et de secteur).

**Conseils pratiques :** prévoyez 30 à 40 % de coût supplémentaire par rapport au salaire net versé (charges sociales, frais de secrétariat, assurance). Faites un calcul avec votre comptable avant de vous engager.`,
    links: [
      { label: "ONSS — Dimona (déclaration en ligne)", url: "https://www.socialsecurity.be/site_fr/employer/applics/dimona/index.htm", type: "officiel" },
      { label: "Forem — Aides à l'emploi", url: "https://www.leforem.be/entreprises/aides-a-l-emploi.html", type: "officiel" },
      { label: "SPF Emploi — Contrats de travail", url: "https://emploi.belgique.be/fr/themes/relations-de-travail/contrats-de-travail", type: "officiel" },
    ],
    localContacts: ["Forem Mons — antenne emploi pour Dour", "UCM — accompagnement premier emploi"],
  },

  {
    slug: "exportation-europe-pme",
    title: "Vendre en Europe : règles pour les PME",
    summary: "TVA intracommunautaire, One Stop Shop et formalités à l'export pour les petites entreprises.",
    category: "developpement",
    tags: ["export", "europe", "tva intracommunautaire", "oss", "e-commerce", "international"],
    verifiedAt: "2026-06-01",
    content: `Vendre à des clients dans d'autres pays de l'UE est accessible aux PME, mais demande quelques adaptations comptables et fiscales.

**TVA intracommunautaire (VIES) :** si vous vendez à des entreprises assujetties dans d'autres pays de l'UE, la vente est en principe exonérée de TVA belge (taux 0 %), à condition que l'acheteur dispose d'un numéro de TVA valide. Vous devez déclarer ces ventes dans un relevé TVA intracommunautaire (liste des clients européens).

**Ventes B2C en ligne (e-commerce) :** depuis juillet 2021, le régime OSS (One Stop Shop) simplifie la TVA pour les ventes en ligne à des particuliers dans l'UE. Si votre CA transfrontalier dépasse 10 000 €/an, vous devez appliquer la TVA du pays du client. L'OSS vous permet de tout déclarer depuis la Belgique.

**Formalités douanières hors UE :** pour exporter hors UE (ex: Royaume-Uni post-Brexit, Suisse), vous devez établir une déclaration d'exportation en douane (PLDA/CDS). L'AGDA (Administration des Douanes et Accises) gère ces démarches.

**Aides à l'export :** l'AEI (Agence pour l'Entreprise et l'Innovation, anciennement AWEX) propose des subsides pour les missions économiques à l'étranger, les participations à des foires internationales et l'accompagnement export.`,
    links: [
      { label: "SPF Finances — TVA intracommunautaire", url: "https://finances.belgium.be/fr/entreprises/tva/tva-europeenne-oss", type: "officiel" },
      { label: "AEI (AWEX) — Export Wallonie", url: "https://www.aei.be/fr/exporter", type: "officiel" },
      { label: "AGDA — Douanes belges", url: "https://finances.belgium.be/fr/douanes_accises", type: "officiel" },
    ],
    localContacts: ["AEI — antenne Hainaut pour accompagnement à l'export"],
  },

  // =====================================================================
  // DIFFICULTÉ — Je traverse une difficulté (suite)
  // =====================================================================
  {
    slug: "maladie-incapacite-independant",
    title: "Maladie et incapacité de travail pour un indépendant",
    summary: "Vos droits en cas d'arrêt maladie, les délais de carence et les indemnités de votre mutuelle.",
    category: "difficulte",
    tags: ["maladie", "incapacité", "mutuelle", "arrêt", "indemnité", "inami"],
    verifiedAt: "2026-06-01",
    content: `En tant qu'indépendant, une maladie prolongée peut rapidement mettre votre activité en péril. Comprendre vos droits est essentiel pour réagir rapidement.

**Période de carence :** contrairement aux salariés, les indépendants ont une période de carence. Pour une incapacité primaire, les indemnités démarrent en principe à partir du **1er mois** de votre arrêt de travail (pas de rémunération garantie pendant ce mois). Depuis 2020, des améliorations ont été apportées : certains indépendants peuvent percevoir une indemnité dès la 2ème semaine via leur mutuelle.

**Démarche :** déclarer l'incapacité à votre mutuelle dans les 14 jours suivant le début de l'incapacité (sinon perte d'indemnités). Le médecin remplit un certificat d'incapacité à remettre à la mutuelle.

**Montant des indemnités :** environ 68 € à 90 €/jour (indemnité de titulaire ou de cohabitant) selon votre situation familiale, en 2026 (montants indicatifs, à vérifier avec votre mutuelle). Le statut de "chef de ménage" donne droit à un montant plus élevé.

**Cotisations sociales :** en cas d'incapacité prolongée (plus d'un an), vous pouvez demander une dispense de cotisations sociales à votre caisse. Cette dispense n'est pas automatique.

**Assurance revenu garanti :** si vous avez souscrit cette assurance, elle compense la différence entre l'indemnité mutualiste et votre revenu habituel. Contactez votre assureur dès les premiers jours d'arrêt.`,
    links: [
      { label: "INAMI — Indemnités pour indépendants", url: "https://www.inami.fgov.be/fr/themes/incapacite-invalidite/Pages/default.aspx", type: "officiel" },
      { label: "INASTI — Dispense de cotisations", url: "https://www.inasti.be/fr/independants/dispense-de-cotisations", type: "officiel" },
    ],
    localContacts: ["Votre mutuelle (contacter dans les 14 jours)", "Votre caisse d'assurances sociales pour la dispense de cotisations"],
  },

  {
    slug: "procedure-re-reorganisation-judiciaire",
    title: "Réorganisation judiciaire (PRJ) : éviter la faillite",
    summary: "La procédure de réorganisation judiciaire permet de suspendre les poursuites et de négocier un plan d'apurement.",
    category: "difficulte",
    tags: ["faillite", "prj", "réorganisation", "dettes", "tribunal", "plan"],
    verifiedAt: "2026-06-01",
    content: `La Procédure de Réorganisation Judiciaire (PRJ) est un mécanisme légal qui permet à une entreprise en difficulté de se protéger temporairement de ses créanciers, le temps de trouver une solution. Elle est régie par le Code économique (Livre XX).

**À qui s'adresse la PRJ ?** Toute entreprise (y compris indépendant en personne physique) qui est en état de cessation de paiement ou menacée de l'être, et qui pense pouvoir se redresser.

**Les 3 formes de PRJ :**
1. **Accord amiable confidentiel** : négociation privée avec 2 créanciers minimum, homologuée par le tribunal. Rapide et discret.
2. **Accord collectif** : un plan de remboursement est soumis au vote des créanciers. Si approuvé à la majorité (en nombre et en montant), il s'impose à tous.
3. **Cession sous autorité de justice** : transfert de tout ou partie de l'activité à un tiers, avec protection pendant la procédure.

**Durée de la protection :** 6 mois, renouvelable jusqu'à 12 mois (exceptionnellement 18 mois).

**Conséquences :** pendant la procédure, les créanciers ne peuvent pas lancer de nouvelles poursuites, ni réaliser de saisies. Les contrats en cours (bail, fournisseurs) sont maintenus.

**Démarche :** introduire une requête auprès du Tribunal de l'Entreprise de votre ressort (pour Dour : Tribunal de l'Entreprise du Hainaut, division Mons ou Tournai selon le cas). Un avocat ou un comptable peut vous accompagner.`,
    links: [
      { label: "Code économique Livre XX — Insolvabilité", url: "https://www.ejustice.just.fgov.be", type: "officiel" },
      { label: "Tribunal de l'Entreprise du Hainaut", url: "https://www.juridat.be", type: "officiel" },
    ],
    localContacts: ["Avocat spécialisé en droit des entreprises", "Centre pour Entreprises en difficulté (CED/OCE) — Mons"],
  },

  {
    slug: "impots-independant-ipp",
    title: "Impôt des personnes physiques pour indépendants",
    summary: "Revenus imposables, tranches, frais déductibles et versements anticipés.",
    category: "gestion",
    tags: ["impôt", "ipp", "revenus", "tranches", "versements anticipés", "frais professionnels"],
    verifiedAt: "2026-06-01",
    content: `Les indépendants en personne physique paient l'Impôt des Personnes Physiques (IPP) sur leurs revenus professionnels nets (revenus bruts - frais professionnels - cotisations sociales déductibles).

**Tranches d'imposition 2026 (indicatif) :**
- 0 € à 15 820 € : 25 %
- 15 820 € à 27 920 € : 40 %
- 27 920 € à 48 320 € : 45 %
- Au-delà de 48 320 € : 50 %
Ces montants sont ajustés annuellement à l'indice. Vérifiez sur le site du SPF Finances chaque année.

**Frais déductibles à titre professionnel :** loyer d'un bureau (si usage professionnel prouvé), frais de véhicule (forfait kilométrique ou réel), matériel et outillage, frais de formation, abonnements professionnels, cotisations sociales, intérêts d'emprunt professionnel, etc.

**Versements anticipés (VA) :** en tant qu'indépendant, il n'y a pas de précompte professionnel retenu à la source. Vous devez donc effectuer des versements anticipés (VA1 à VA4) chaque trimestre pour éviter une majoration d'impôt de 2,25 % (taux indicatif). Les délais sont : 10 avril, 10 juillet, 10 octobre, 20 décembre.

**Déclaration fiscale :** à remplir chaque année via MyMinfin ou Tax-on-web, généralement entre mai et juin (délai prolongé pour les mandataires). Votre comptable peut la déposer avec un délai supplémentaire.`,
    links: [
      { label: "SPF Finances — MyMinfin", url: "https://myminfin.be", type: "officiel" },
      { label: "SPF Finances — Versements anticipés", url: "https://finances.belgium.be/fr/particuliers/versements-anticipes", type: "officiel" },
      { label: "Tax-on-web", url: "https://eservices.minfin.fgov.be/taxonweb/", type: "officiel" },
    ],
    localContacts: ["Expert-comptable ou comptable agréé ITAA (déductible fiscalement)", "SPF Finances — Contact Center 0257 257 57"],
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
