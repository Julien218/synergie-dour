# Formulaire accessible depuis le lien général — 16 novembre 2026

Le signalement concernait le formulaire entièrement désactivé sur `/fetes-2026` sans invitation personnelle. Le lien général était ainsi inutilisable pour commencer une fiche. La condition d’activation du formulaire distingue désormais la saisie d’une nouvelle fiche et l’accès à un dossier déjà enregistré.

Le commerçant peut saisir les coordonnées, les liens, les offres et les accords depuis la page générale. Au premier enregistrement ou dépôt de fichier, une clé aléatoire propre à sa nouvelle fiche est créée dans son navigateur. Un lien privé est affiché et peut être copié pour revenir compléter les éléments. Sans les champs requis et les accords de traitement et de droits, aucun dossier n’est créé. La case de diffusion reste facultative et décochée.

Les nouvelles fiches ne recherchent ni n’exposent de commerce existant par son email. Elles restent en attente de vérification d’adhésion et ne créent aucun travail de production avant rattachement par un administrateur. Le CRM présente ces fiches avec leur statut et un contrôle d’adhésion. Le rattachement exige un commerce approuvé, une confirmation explicite de l’administrateur et une version à jour ; il refuse d’écraser un dossier déjà lié au même commerce.

La migration `0010_holiday_public_intake.sql` permet des références CRM temporairement nulles. Elle ne supprime ni ne réécrit les données des dossiers existants. Les anciennes invitations privées, les quotas, l’antivirus, la protection des fichiers, le retrait des accords et les deux validations restent actifs.

Vérifications : 27 tests unitaires ciblés réussis ; aucun nouveau diagnostic TypeScript dans les fichiers de campagne ; construction réussie. Essai réel sur MySQL 9 isolé : création publique, répétition sans écrasement, confidentialité de la fiche, absence de production avant contrôle, refus de rattachement par un non-administrateur, confirmation par un administrateur puis retrait. Les tests existants de fichiers, antivirus réel et validations ont également réussi.

Le correctif a été publié et la saisie de lettres, chiffres et accents a été vérifiée dans le navigateur sur le site officiel. Les deux champs d’essai ont ensuite été vidés : aucune fausse fiche ni donnée personnelle n’a été enregistrée en production. Aucun email et aucune publication sociale n’ont été envoyés.

Cette modification remplace l’exigence d’une invitation préalable décrite dans les rapports précédents. Le lien à partager peut désormais être directement : https://www.synergiedour.be/fetes-2026.

Le raccordement de la génération Elynea et de la publication automatique reste distinct de cette correction. Les nouveaux dossiers attendent le contrôle d’adhésion et les contenus restent soumis aux validations prévues.
