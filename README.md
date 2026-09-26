# PediDoses — France

Version **0.9** : corrections du protocole SMUR, 66 fiches, ampoules actualisées et commandes de réglage des posologies. Trois lignes sont ajoutées : Propofol LISA, deuxième dose de triphosadénine et charge de nicardipine.

Les modifications suivent les décisions du 26 septembre 2026. Les points ouverts sont recensés dans [CLINICAL-SCOPE.md](./CLINICAL-SCOPE.md). Le logiciel reste un support de relecture ; les tests arithmétiques ne constituent pas une validation clinique.

## Fonctionnement

- L’âge et le poids sont partagés entre « Calculs rapides » et « Simulation logicielle ». Chaque modification recalcule toutes les lignes calculables.
- Le poids connu valide est prioritaire. Sans poids, l’âge permet une estimation locale. Une saisie invalide efface les résultats.
- « Nouveau patient » efface les saisies, volumes de poche et réglages de posologie. Aucune donnée patient n’est enregistrée ni transmise.
- Les rubriques du tableau source, l’anaphylaxie et le remplissage sont conservés. Recherche et filtre par rubrique disponibles.
- La simulation affiche une liste compacte : dose, volume et débit. Les fiches détaillent les paliers, préparations et questions restantes, et sont imprimables.
- Les doses, prélèvements et volumes finaux sont distingués. Un prélèvement seul ne permet pas de déduire un débit d’administration.
- Les débits sont arrondis à 0,1 mL/h uniquement à l’affichage final ; les volumes de préparation à 0,01 mL. Aucun arrondi intermédiaire n’est réutilisé, sauf l’arrondi prescrit pour l’amoxicilline/clavulanate.

## Corrections v0.9

Le détail des doses, plafonds, présentations et voies figure dans [CLINICAL-SCOPE.md](./CLINICAL-SCOPE.md). Points principaux :

- **Sufentanil : 50 mcg/10 mL = 5 mcg/mL**, dose affichée en mcg/h.
- Chlorure de calcium : maximum 1 g de chlorure, IVD. Gluconate 10 % : 0,5 mL/kg, maximum 20 mL de produit avant dilution, selon le schéma ERC demandé.
- Insuline rapide : 0,1 UI/kg, maximum 10 UI, avec G10 % 5 mL/kg, maximum 250 mL, sur 30 min. Les plafonds sont indépendants. Le débit affiché est celui du G10 %.
- Amoxicilline/clavulanate : 80 mg/kg/j d’amoxicilline, division par trois puis arrondi à la dizaine de mg supérieure ; flacon 500 mg/50 mg.
- Morphine au PSE : dose initiale de 20 mcg/kg/h, sans palier à trois mois ; 0,1 mg/mL sous 10 kg et 1 mg/mL dès 10 kg.
- Salbutamol IVSE : concentrations différentes aux seuils de 21 et 42 kg ; plage de 0,1 à 2 mcg/kg/min.
- Tranexamique : avant 10 ans, charge de 20 mg/kg puis 2 mg/kg/h ; dès 10 ans, charge de 1 g puis 1 g sur 8 h. NaCl 0,9 %. La concentration d’entretien avant 10 ans reste à préciser.
- Aucune durée/vitesse ajoutée à la Célocurine ou aux produits sanguins. Les répétitions de naloxone et de salbutamol nébulisé ne sont pas affichées.

L’audit initial et les cellules sources restent dans `catalog-data.js`, [TABLEAU-IMPORTE.md](./TABLEAU-IMPORTE.md) et [REVUE-DU-TABLEAU.md](./REVUE-DU-TABLEAU.md). Ces documents historiques ne décrivent pas les règles actives de la v0.9.

## Boutons de posologie

Les boutons +/− couvrent les 14 perfusions continues et la charge de nicardipine dans les deux vues. Le réglage modifie la dose et recalcule le débit à concentration constante, dans les bornes renseignées. Pour le clonazépam, la préparation initiale reste constante et la dose sur 6 h varie, avec un plafond de 1 mg. Les quatre catécholamines conservent leur débit initial poids/3 ; le réglage utilise la dose exacte correspondante.

**Les pas doivent encore être fournis par l’utilisateur.** Ils sont volontairement `null` dans `dist/dose-adjustments.js` : les boutons restent désactivés avec « Pas à définir ». Les valeurs des tests ne sont pas des pas cliniques. L’Exacyl possède deux réglages distincts : mg/kg/h avant 10 ans et mg/h dès 10 ans. La liste des unités figure dans [CLINICAL-SCOPE.md](./CLINICAL-SCOPE.md#pas-de-réglage-à-fournir).

## Ampoules modifiables sans coder

L’onglet « Ampoules » propose le [tableau Excel](./dist/assets/PediDoses-Ampoules.xlsx), l’export CSV, l’import avec aperçu et le retour aux présentations de cette version. Le fichier contient 66 lignes, une par fiche et par voie, avec des formules de concentration.

Renseigner quantité et volume du contenant ; si le volume est inconnu, renseigner seulement la concentration déclarée. Exporter l’onglet Ampoules en CSV puis l’importer dans l’application. La configuration est enregistrée sur cet appareil uniquement. Les anciennes configurations de 63 lignes doivent être complétées avec les nouvelles lignes avant import ; elles ne sont pas appliquées silencieusement.

Le tableau ne modifie pas les posologies. Pour une préparation diluée, quantité de médicament et volume final sont conservés ; le prélèvement s’adapte à l’ampoule. Pour les produits purs, la nouvelle concentration est utilisée. L’import refuse les lignes absentes ou doublonnées, unités incompatibles, concentrations contradictoires et préparations impossibles.

## Règles conservées

| Élément | Règle |
| --- | --- |
| Poids estimé avant un an | Table mensuelle : 3 ; 3,5 ; 4,2 ; 5 ; 6 ; 6 ; 7 ; 8 ; 8 ; 9 ; 9 ; 10 kg |
| Poids estimé dès un an | (âge en années + 4) × 2 |
| Âges décimaux | Conservés ; avant un an, borne mensuelle inférieure, sans interpolation |
| Bornes de saisie | 0 à 18 ans ; poids connu de 0,5 à 200 kg |
| Étomidate | Masqué avant 24 mois ; calcul dès 24 mois inclus ; âge requis |
| Isofundine | 10 mL/kg, maximum 500 mL par bolus, IVD le plus rapidement possible |
| CGR, PFC, CPA | Volume prescrit limité à une poche si son volume est renseigné ; aucune vitesse ajoutée |

Les plafonds historiques non confirmés de kétamine analgésique, atracurium bolus et midazolam IJ restent identifiés dans les fiches. La simulation les applique avec le marqueur † selon le comportement demandé en v0.8 ; les calculs rapides les indiquent sans les appliquer.

## Développement et GitHub

Node.js 22 ou supérieur ; Python 3 pour le serveur. Aucune dépendance npm à installer.

```bash
npm run check
npm test
npm start
```

Ouvrir http://localhost:8080. Les modules JavaScript nécessitent un serveur HTTP.

Les tests GitHub Actions se lancent sur les pushes de `main` et les pull requests. Pages reste manuel : Actions → « Publier la démonstration sur GitHub Pages » → **Run workflow**, branche `main`. **Re-run all jobs** relance l’ancien commit. L’intégration du code ne publie pas automatiquement le site. Le badge attendu pour ce code est **v0.9**.

## Structure

| Fichier | Rôle |
| --- | --- |
| `dist/smur-data.js` | Règles actives, groupes, références ciblées |
| `dist/patient-calculator.js` | Patient, estimation du poids, calculs |
| `dist/smur-preparation.js`, `dist/smur-sheets.js` | Préparations et fiches |
| `dist/dose-adjustments.js`, `dist/dose-controls.js` | Réglages, bornes et boutons |
| `dist/smur-ui.js`, `dist/simulation-ui.js`, `dist/simulation-data.js` | Deux vues et présentation des résultats |
| `dist/patient-state.js` | Patient partagé en mémoire |
| `dist/ampoules.js`, `dist/ampoules-ui.js` | Présentations et import/export |
| `dist/catalog-data.js`, `dist/catalog-audit.js` | Transcription et audit historiques |
| `tests/` | Tests des calculs, limites, unités et réglages |

## Vérification

67 tests automatisés réussis : doses, plafonds, arrondi après division, seuils, plafonds indépendants insuline/G10 %, sufentanil en mcg, conservation des concentrations lors du réglage et import CSV. Le classeur a été recalculé, comparé aux 66 présentations et contrôlé visuellement.

Le navigateur disponible n’a pas permis d’ouvrir le serveur local ; le rendu de l’application et l’impression v0.9 restent à vérifier. Aucun test en situation de soins ni validation clinique du logiciel n’a été réalisé.
