# ADN visuel Synergie Dour - source de vérité

Version **2026.08.05**.

Ce dossier est le point d'entrée officiel pour le branding, les agents IA, les automatisations et les développements du dépôt `Julien218/synergie-dour`.

## Accès agents IA

Lire dans cet ordre :

1. `AGENT_README.md`
2. `AGENT_INDEX.json`
3. `06_REGLES_ET_PROMPTS/brand-rules.json`
4. `06_REGLES_ET_PROMPTS/SYSTEM_PROMPT_AGENT_VISUEL.md`
5. `06_REGLES_ET_PROMPTS/GUIDE_EDITORIAL.md`
6. `06_REGLES_ET_PROMPTS/AUDIT_VISUELS_SOURCES.md`

Le module TypeScript partagé est disponible dans `shared/brand/synergie-dour.ts`.

## Fichiers de production déjà présents dans le dépôt

- Logo Synergie Dour canonique et réellement transparent : `client/public/logo-sd-transparent.png`
- Crédit JS-Innov.IA : actif transparent officiel non fourni ; toute composition qui l'exige doit rester bloquée.

Les fichiers `public/logo-sd-officiel.png` et `public/logo-jsinnovia.png` ne sont pas
des actifs transparents canoniques : le premier contient un damier visuel et le second
ne représente pas une signature JS-Innov.IA vérifiable.

## Référence de marque

- Nom : **Synergie Dour**
- Dénomination : **ASBL Synergie Dour**
- Signature : **Commerçants & indépendants réunis**
- Emblème : ne jamais redessiner, recoloriser, recadrer, déformer ou régénérer avec une IA.

## Processus obligatoire

1. Valider le brief et les informations factuelles.
2. Générer le fond sans texte et sans logo.
3. Ajouter les fichiers officiels lors de la composition.
4. Relire l'orthographe et contrôler le contraste.
5. Exécuter le contrôle qualité de `brand-rules.json`.
6. Bloquer la publication si une condition n'est pas satisfaite.

## Archive complète

L'archive de production finalisée est nommée `Synergie_Dour_Kit_ADN_Complet_2026_FINAL.zip`.
Ses métadonnées et son empreinte SHA-256 sont enregistrées dans `ARCHIVE_METADATA.json`.

Les empreintes des fichiers réellement versionnés se vérifient depuis la racine du dépôt :
`sha256sum -c docs/brand-kit/2026/CHECKSUMS.sha256`.
