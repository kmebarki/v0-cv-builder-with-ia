# Analyse de l'éditeur de template

## Vue d'ensemble
L'éditeur actuel est construit autour de [Craft.js](https://craft.js.org) et propose un canvas central encadré par une boîte à outils à gauche et un panneau de propriétés/calques à droite.【F:components/editor/cv-editor.tsx†L39-L88】 L'interface est minimale : elle affiche un exemple statique de CV et n'exploite pas la structure sauvegardée passée en prop (`initialStructure`).【F:components/editor/cv-editor.tsx†L23-L74】 La barre supérieure fournit uniquement la sauvegarde et l'historique (undo/redo).【F:components/editor/editor-header.tsx†L13-L38】

## Architecture & persistance
- **Données** : aucune couche de données temps réel n'est branchée sur les blocs. Le seul bloc dynamique (`VariableTextNode`) repose sur des données simulées (`cvData`) codées en dur.【F:components/editor/nodes/variable-text-node.tsx†L46-L55】
- **Template / Structure** : la structure est le JSON sérialisé par Craft via `query.serialize()` lors de la sauvegarde.【F:components/editor/cv-editor.tsx†L26-L33】 Le serveur désérialise ensuite cette chaîne pour la stocker dans Prisma, en incrémentant une version.【F:lib/actions/cv.ts†L1-L25】 Aucun mécanisme n'interprète ce JSON pour produire un rendu hors de l'éditeur.
- **Moteur de rendu** : il n'existe pas de couche dédiée de rendu graphique ; seul le canvas Craft restitue le template, et aucune intégration avec un moteur externe (PDF/HTML) n'est présente dans le code.

## Interface principale vs. cahier des charges
- **Canvas** : WYSIWYG basique sans gestion multi-page, zoom, panoramique, grilles ni repères. Le contenu par défaut est statique et ne reflète pas les templates enregistrés.【F:components/editor/cv-editor.tsx†L61-L74】
- **Drag & Drop** : limité aux composants de Craft ; il n'existe pas de fonctions de duplication, verrouillage, multi-sélection ou groupement explicite.
- **Fenêtre latérale** : un unique panneau "Paramètres" s'adapte au type de bloc sélectionné, mais ne propose ni onglets (Contenu/Style/Comportement/IA) ni assistants.【F:components/editor/settings-panel.tsx†L12-L351】
- **Calques** : l'intégration de `<Layers />` offre une hiérarchie simple mais sans z-index ni gestion de visibilité/verrouillage conforme au cahier des charges.【F:components/editor/cv-editor.tsx†L78-L88】
- **Barre supérieure** : seules les actions Undo/Redo et Sauvegarder sont disponibles ; pas de prévisualisation, de gestion de versions, d'export, ni de bascule multi-support.【F:components/editor/editor-header.tsx†L13-L38】

## Blocs disponibles
La toolbox expose cinq blocs : texte simple, texte variable, texte riche (Slate), container et image.【F:components/editor/toolbox.tsx†L19-L82】 Elle ne couvre pas les sections, piles, grilles, badges, formes, icônes, pages, ni les blocs de rating exigés. Les blocs de champs dynamiques se résument à `VariableTextNode`, sans concaténation ni filtres avancés (dateFormat, dateRange, etc.). Les tests conditionnels sont partiels : seules quelques opérations (exists, equals, contains) sont disponibles, et uniquement sur les textes variables.【F:components/editor/nodes/variable-text-node.tsx†L57-L104】【F:lib/editor/variables.ts†L45-L74】

## Règles & comportements
- **Alignement / magnétisme** : aucune logique de snapping, guides ou distribution n'est implémentée.
- **Grilles et repères** : non pris en charge.
- **Pagination** : aucun contrôle `pageBreak`, ni gestion des veuves/orphelines.
- **Conditions** : repose sur `evaluateCondition` avec un nombre réduit d'opérateurs ; pas de moteur JSONLogic ni d'expressions complexes.【F:lib/editor/variables.ts†L45-L74】

## Style & design tokens
Les réglages de style se limitent à la police, couleur, alignement, marges/padding et couleur de fond via le panneau de paramètres.【F:components/editor/settings-panel.tsx†L41-L347】 Aucun système de design tokens, thèmes, modes light/dark ou explorateur de tokens n'est présent.

## Assistants IA
Ni bouton IA global ni assistants contextuels ne sont implémentés. Le panneau de paramètres et la barre supérieure ne font aucune référence à des fonctionnalités IA.【F:components/editor/cv-editor.tsx†L49-L88】【F:components/editor/settings-panel.tsx†L12-L351】

## Autres fonctionnalités
- **Variable picker** : un composant de sélection de variables existe mais n'est branché nulle part dans l'éditeur, ce qui limite l'insertion guidée de champs dynamiques.【F:components/editor/variable-picker.tsx†L1-L154】
- **Mode JSON / prévisualisation** : pas de bascule vers une vue JSON ni d'aperçu PDF/HTML.
- **Internationalisation** : l'éditeur est codé en français uniquement, sans mécanisme i18n dédié.
- **Raccourcis clavier** : seuls ceux gérés par Slate (Cmd/Ctrl+B/I/U) pour le texte riche sont disponibles ; aucune prise en charge globale des raccourcis mentionnés.【F:components/editor/nodes/rich-text-node.tsx†L12-L120】

## Synthèse des écarts majeurs
| Domaine | État actuel | Écart principal |
| --- | --- | --- |
| Architecture | JSON Craft sérialisé, données simulées | Absence de moteur de rendu et de binding aux vraies données |
| Canvas | Page unique statique | Pas de multi-page, zoom, grilles, repères, snapping |
| Propriétés | Panneau unique | Manque d'onglets Contenu/Style/Comportement/IA et d'assistants |
| Blocs | Texte, image, container | Manquent sections, grilles, ratings, formes, objets graphiques |
| Conditions | Opérateurs simples | Pas de JSONLogic ni de filtres avancés |
| Style | Réglages basiques | Pas de design tokens ni thèmes |
| IA | Non disponible | Aucun assistant local ou global |
| Export/Preview | Non disponible | Pas d'export JSON/PDF/DOCX ni de preview multi-support |

Dans l'état actuel, l'éditeur constitue une preuve de concept centrée sur Craft.js. Pour répondre au cahier des charges, il faudra enrichir profondément la couche de données, la bibliothèque de blocs, l'UI (canvas, panneaux, prévisualisation), le moteur conditionnel, les fonctionnalités de style, ainsi que toutes les capacités IA et d'export.
