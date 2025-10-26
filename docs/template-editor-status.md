# Template Editor Correctifs Techniques

## Correctifs techniques

### 1.1 Magnétisme (snap complet)
- **Statut** : Implémenté
- **Commentaire** : Un `SnapManager` central gère désormais les coordonnées des blocs, agrège la grille, les repères et les bords/centres des autres éléments, et alimente un calque de manipulation dédié (drag + clavier) avec prévisualisations et indicateurs visuels.

### 1.2 Pagination (moteur de composition)
- **Statut** : Implémenté
- **Commentaire** : Un moteur de pagination mesure les blocs, applique les règles (pageBreak, keepWithNext, orphans/widows, allowItemSplit) et alimente les exports HTML/PDF via un rendu paginé dédié.

### 1.3 Design Tokens (API + UI + alias + versions)
- **Statut** : Implémenté
- **Commentaire** : API CRUD, interface d’administration et sélection par `tokensRef` disponibles avec prise en charge des alias et thèmes.

### 1.4 Admin Data (champs paramétrés + validation AJV)
- **Statut** : Implémenté
- **Commentaire** : API sécurisée, interface d’administration avancée (assistants de validation guidés, détection de doublons, aperçu JSON), validation runtime AJV centralisée avec propagation temps réel (SSE + runtime versionné), migrations automatiques des valeurs existantes et revalidation export/éditeur assurent la cohérence des champs.

## Fonctionnalités

### Canvas toolbar (pan, fit-to-page, multi-sélection, verrouillage, duplication)
- **Statut** : Implémenté
- **Commentaire** : Barre d’outils enrichie avec zoom guidé, fit-to-page, déplacement (space+drag), lasso multi-sélection, verrous non sélectionnables, duplication avec historisation et raccourcis clavier.

### Toolbox & médiathèque
- **Statut** : Implémenté
- **Commentaire** : Ajout d’une médiathèque complète (upload drag & drop, tags, recherche, suppression) et insertion directe d’images/templates depuis la bibliothèque.

### Assistants IA par bloc (Auto-fill, Auto-section)
- **Statut** : Implémenté
- **Commentaire** : Les blocs texte/variables exposent les modes Auto-fill contextualisés, les blocs répétitifs déclenchent la génération d’une section complète (JSON) stockée dans les propriétés du bloc.

### Assistant IA global (Plan → Diff → Patch)
- **Statut** : Implémenté
- **Commentaire** : Le plan IA s’appuie sur les avertissements du moteur de pagination pour générer des actions structurées, calcule les diffs sur le canvas (checklist avec états) et applique les patchs sélectionnés avec recalcul immédiat de la pagination.
