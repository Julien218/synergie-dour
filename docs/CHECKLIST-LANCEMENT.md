# Checklist juridique et conformité — à cocher AVANT le lancement public

Ce document liste tout ce qui doit être en ordre **côté humain** avant la mise en ligne. La technique seule ne suffit pas : sans ces démarches, l'ASBL et JS-Innov.IA prennent des risques inutiles.

---

## Du côté de l'ASBL Synergie Dour

### Statuts et publication
- [ ] Statuts de l'ASBL signés et déposés au greffe du tribunal de l'entreprise
- [ ] Statuts publiés au Moniteur belge (obligatoire pour toute ASBL)
- [ ] Bureau (les 8 personnes) inscrit au Moniteur belge avec leurs fonctions
- [ ] N° d'entreprise BCE attribué et actif
- [ ] Adresse du siège social fixée (peut être chez le président)

### Comptabilité ASBL
- [ ] Compte bancaire ouvert au nom de l'ASBL (pas un compte personnel)
- [ ] Trésorier désigné officiellement (Stéphane GIVERT) avec procuration sur le compte
- [ ] Tenue d'une comptabilité simplifiée ou complète selon la taille
- [ ] Modèle de comptes annuels prévu pour l'AG
- [ ] Date de l'AG annuelle obligatoire fixée

### Stripe Connect (ASBL)
- [ ] Compte Stripe Connect créé au nom de l'ASBL
- [ ] Onboarding terminé (Olivier TREVIS comme représentant légal)
- [ ] IBAN ASBL renseigné dans Stripe pour les virements
- [ ] Documents légaux fournis à Stripe (statuts, identité, BCE)
- [ ] Compte vérifié et actif (peut prendre quelques jours)
- [ ] Variable Railway `ASBL_STRIPE_CONNECT_ACCOUNT_ID` renseignée

### RGPD
- [ ] Registre des traitements créé (article 30 RGPD)
  - Liste des données collectées : nom, email, téléphone, adresse, paiement
  - Finalité : gestion adhésions et communications ASBL
  - Base légale : consentement (formulaire) et contrat (adhésion)
  - Durée de conservation : durée de l'adhésion + 3 ans (obligation comptable)
- [ ] Politique de confidentialité publiée et accessible depuis le footer
- [ ] Mentions légales publiées (cf. la page `/legal` existante à compléter)
- [ ] Procédure pour les demandes de droit d'accès / rectification / effacement
- [ ] Email dédié pour les demandes RGPD (ex: `rgpd@synergiedour.be`)

### Convention avec JS-Innov.IA
Document à rédiger et signer entre Olivier TREVIS (président de l'ASBL) et Julien (JS-Innov.IA). Doit contenir :
- [ ] Identification claire des deux parties
- [ ] Description des prestations techniques fournies par JS-Innov.IA
- [ ] Tarification de chaque prestation (hébergement, dev, maintenance, IA, support)
- [ ] Mention de la commission Stripe Connect de 2,50€ par adhésion (séparée des prestations)
- [ ] Propriété intellectuelle du code source (recommandé : licence d'usage à l'ASBL)
- [ ] Modalités de fin de contrat (préavis, récupération des données par l'ASBL)
- [ ] Confidentialité des données des adhérents
- [ ] Clause RGPD : JS-Innov.IA agit comme sous-traitant au sens du RGPD
- [ ] Sauvegarde et plan de continuité en cas d'arrêt
- [ ] Signature par le président de l'ASBL et par Julien (au nom de JS-Innov.IA)

---

## Du côté de JS-Innov.IA

### Statut juridique
- [ ] Forme juridique de JS-Innov.IA fixée (entreprise individuelle, SRL...)
- [ ] N° d'entreprise actif
- [ ] TVA active si applicable
- [ ] Compte bancaire pro distinct du compte personnel

### Stripe Connect (plateforme)
- [ ] Compte Stripe activé au nom de JS-Innov.IA
- [ ] Stripe Connect activé dans Settings > Connect
- [ ] Profil de plateforme rempli
- [ ] Conditions de plateforme acceptées
- [ ] Webhook configuré et testé (en mode test d'abord)

### Facturation des prestations à l'ASBL
- [ ] Convention signée (cf. ci-dessus)
- [ ] Plan de facturation : ponctuelle (dev initial) + récurrente (hébergement, maintenance) ?
- [ ] Modèle de facture conforme aux obligations belges
- [ ] Système de comptabilité pour suivre les revenus (commission Stripe + facturation ASBL)

---

## Côté technique avant la mise en ligne

### Tests fonctionnels
- [ ] Création d'une candidature qui aboutit en BDD
- [ ] Email d'accusé de réception bien reçu (vérifier ne tombe pas en spam)
- [ ] Approbation admin envoie correctement le lien Stripe
- [ ] Paiement test Stripe (carte 4242 4242 4242 4242) crée bien l'adhésion
- [ ] Webhook Stripe bien reçu et traité (vérifier la table `payments`)
- [ ] Email de bienvenue après paiement bien reçu
- [ ] Cron de l'agent fonctionne (déclencher manuellement via le dashboard)
- [ ] Validation d'un changement majeur applique bien la modif

### Sécurité
- [ ] HTTPS forcé sur toutes les routes
- [ ] Webhook Stripe vérifie la signature
- [ ] Endpoint cron protégé par CRON_SECRET
- [ ] Routes admin protégées par middleware d'authentification
- [ ] Pas de secrets en clair dans le code (tout en variables d'env)
- [ ] CORS configuré strictement

### Performance et fiabilité
- [ ] Sauvegarde quotidienne de la BDD activée sur Railway
- [ ] Monitoring en place (Railway propose des logs natifs)
- [ ] Plan de retour arrière en cas de bug majeur
- [ ] Tests de charge basiques (l'agent ne doit pas planter sur 50 fiches)

### Délivrabilité email
- [ ] Domaine `synergiedour.be` vérifié dans Resend
- [ ] Enregistrements DNS SPF, DKIM, DMARC en place
- [ ] Test d'envoi vers Gmail, Outlook, Hotmail (les 3 principaux usagers)
- [ ] Vérification que les emails ne tombent pas en spam

---

## Le jour du lancement

- [ ] Communication aux 8 membres du bureau pour qu'ils soient les premiers adhérents (test grandeur nature)
- [ ] Soft launch d'abord avec 5-10 commerçants connus du bureau
- [ ] Réunion de retours après 2 semaines pour ajuster
- [ ] Communication publique seulement après validation du soft launch

---

## Calendrier prévisionnel — 3 mois

**Semaines 1-4 (mois 1)**
- Intégration phase 1 (déjà livrée) : structure, ressources, page bureau, footer
- Tests locaux des fiches statiques et de l'agent en local
- Préparation des démarches juridiques ASBL (statuts, BCE, banque)
- Convention ASBL ↔ JS-Innov.IA en discussion

**Semaines 5-8 (mois 2)**
- Intégration phase 2 (cette livraison) : Stripe, Resend, BDD, dashboard
- Configuration Resend + DNS
- Onboarding Stripe Connect de l'ASBL
- Tests bout-en-bout en mode test Stripe

**Semaines 9-12 (mois 3)**
- Tests d'acceptation par le bureau
- Soft launch avec 5-10 membres pilotes
- Itérations selon les retours
- Mise en mode live Stripe
- Lancement public

---

Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
