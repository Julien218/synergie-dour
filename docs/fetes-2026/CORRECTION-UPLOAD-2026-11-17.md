# Réception des fichiers — correction du 17 novembre 2026

Le nom et l’état des fichiers sélectionnés apparaissent maintenant sous le sélecteur : en attente, transfert/analyse, reçu et enregistré, ou échec à reprendre. Le compteur des fichiers effectivement conservés est visible même à zéro et rétabli lors du retour sur une fiche.

La sélection est copiée dans un tableau avant toute réinitialisation du champ ou attente asynchrone. Les fichiers non confirmés restent dans la sélection locale avec un bouton de reprise ; un dossier ne peut pas être transmis tant qu’il en reste en attente. Fermer la page fait perdre cette sélection locale, ce qui est indiqué dans l’interface.

La confirmation exige un identifiant d’upload ET la présence de ce même identifiant dans la fiche relue sur le serveur. Une réponse HTTP 200 sans fichier enregistré, un écran HTML de proxy et un refus de format ne deviennent pas une réussite. Les refus sont affichés à côté de la liste avec le nom du fichier concerné.

Vérification : quatre tests ciblés du vrai service de transfert, construction de l’interface réussie, aucun nouveau diagnostic TypeScript sur les fichiers modifiés (erreurs globales préexistantes hors campagne). Contrôle dans le navigateur sur le site officiel : sélection du fichier TEST-logo-non-envoye.png, accords laissés décochés, nom conservé dans la liste en attente, compteur à zéro et bouton de reprise visibles. Aucun dossier, email, média serveur ou post créé par cette vérification.

Image déployée : olivier-synergie:fetes-upload-20261117. Image dérivée de la version en production avec uniquement les fichiers publics de l’interface. Serveur, stockage, secrets et moteur vidéo hérités sans modification. Sauvegarde et retour arrière dans /srv/olivier/releases/synergie-fetes-upload-20261117 ; santé après activation vérifiée.

L’ancien logo de la fiche test n’était présent ni dans les enregistrements ni dans le stockage privé. Il reste à sélectionner à nouveau ; aucun ancien fichier n’a pu être récupéré.
