# PediDoses — France

Version **0.10** : 67 fiches, posologies réglables avec avertissement et tableau d’administration intégré protégé par un code fixe. Les corrections précédentes du protocole SMUR sont conservées, notamment le **sufentanil à 50 mcg/10 mL**. Une ligne de charge de salbutamol à 5 mcg/kg est ajoutée.

Les paramètres suivent les décisions de l’utilisateur des 26–28 septembre 2026. [CLINICAL-SCOPE.md](./CLINICAL-SCOPE.md) décrit les règles et points ouverts. Les tests arithmétiques ne constituent pas une validation clinique.

## Utilisation

- L’âge et le poids sont partagés entre « Calculs rapides » et « Simulation logicielle ». Chaque modification recalcule toutes les lignes et rétablit les doses de départ.
- Le poids connu valide est prioritaire. Sans poids, l’âge permet l’estimation locale. Une saisie invalide efface les résultats.
- « Nouveau patient » efface les saisies, volumes de poche et réglages. Aucune donnée patient n’est enregistrée ni transmise.
- Les deux vues partagent les mêmes réglages de posologie. Changer d’onglet conserve le patient et ses réglages.
- Les prélèvements et volumes finaux sont distincts. Aucun débit d’injection n’est déduit d’un prélèvement si la dilution finale manque.
- Les débits sont arrondis à 0,1 mL/h à l’affichage ; les volumes de préparation à 0,01 mL. Aucun arrondi intermédiaire n’est réutilisé, sauf l’arrondi prescrit pour l’amoxicilline/clavulanate.

## Posologies réglables

| Médicament | Unité | Pas | Départ | Seuil d’avertissement |
| --- | --- | ---: | ---: | ---: |
| Adrénaline IVSE | mcg/kg/min | 0,05 | 0,1 | 1 |
| Alprostadil | ng/kg/min | 5 | 25 | 100 |
| Dobutamine | mcg/kg/min | 1 | 5 | 20 |
| Dopamine | mcg/kg/min | 1 | 5 | 20 |
| Isoprénaline | mcg/kg/min | 0,02 | 0,02 | 1 |
| Midazolam IVSE | mcg/kg/min | 1 | 2 | 6 |
| Noradrénaline IVSE | mcg/kg/min | 0,05 | 0,1 | 1 |
| Nicardipine, entretien | mcg/kg/min | 0,25 | 0,5 | 2 |
| Salbutamol IVSE | mcg/kg/min | 0,1 | 0,1 | 5 |
| Sufentanil | mcg/kg/h | 0,1 | 0,2 | 1 |

Les boutons +/− changent la posologie et le débit, à concentration constante. Au-delà du seuil, **chaque augmentation requiert une confirmation** avant d’être appliquée. Annuler conserve le résultat précédent. Une diminution reste possible et la mention « Dépassement confirmé » reste visible tant que le seuil est dépassé. Une confirmation périmée après changement du patient ou du protocole est refusée.

Les quatre catécholamines démarrent désormais à la dose du tableau ci-dessus : l’ancienne règle poids/3 n’est plus utilisée. Les seuils d’isoprénaline, de nicardipine et de salbutamol remplacent les anciennes limites non dépassables de la v0.9.

Atracurium IVSE, clonazépam IVSE, nicardipine charge et tranexamique entretien n’ont pas de commande par pas. La morphine reste en suspens pour le réglage ; sa dose précédente de 20 mcg/kg/h est conservée. La charge de salbutamol est de 5 mcg/kg sur 5 min, avec les trois dilutions pondérales de l’entretien.

## Administration dans l’application

Ouvrir **Administration**, saisir le code fixe transmis au responsable, modifier le tableau puis cliquer sur **Enregistrer les modifications**. Il n’y a ni compte ni changement de mot de passe. Le code protège l’édition courante dans l’interface ; cette application statique ne propose pas une authentification serveur.

Le tableau donne accès aux doses, unités, pas, seuils, ampoules, voies et durées. **Détails** donne également accès aux limites, préparations, diluants, concentrations finales, volumes, paliers d’âge et de poids, filtres et textes de chaque fiche. Les valeurs numériques structurées alimentent les calculs ; les textes libres servent aux explications et doivent rester cohérents avec ces valeurs.

- Les modifications restent en brouillon jusqu’à l’enregistrement. Elles actualisent ensuite les deux vues et rétablissent les doses de départ.
- Les unités massiques et les périodes minute/heure sont converties en conservant la dose physique. Modifier la valeur numérique modifie la prescription.
- La concentration de l’ampoule est calculée par quantité ÷ volume, ou par la concentration déclarée si ces données manquent. La dilution dépend des volumes ou de la concentration finale renseignés. Après un changement de stock, contrôler aussi la préparation souhaitée.
- Le tableau refuse les nombres invalides, unités incompatibles, dilutions impossibles, paliers discontinus, seuils inférieurs au départ et données contradictoires. Un échec d’enregistrement conserve les calculs actifs.
- Quitter l’onglet verrouille l’administration ; un brouillon non enregistré peut être conservé en annulant la sortie.
- Les réglages sont enregistrés **sur ce navigateur et cet appareil**. L’export/import JSON transfère l’ensemble des variables sur un autre appareil. L’import reste un brouillon jusqu’à l’enregistrement.
- Les anciennes ampoules enregistrées localement sont reprises en conservant les cibles de dilution et en ajoutant la nouvelle charge de salbutamol. Le tableur externe n’est plus le mode de modification de l’application.

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

Les plafonds historiques non confirmés de kétamine analgésique, atracurium bolus et midazolam IJ restent identifiés dans les fiches. La simulation les applique avec le marqueur † selon le comportement demandé en v0.8 ; les calculs rapides les indiquent sans les appliquer. Ils sont éditables dans les détails de l’administration.

L’audit initial reste dans `catalog-data.js`, [TABLEAU-IMPORTE.md](./TABLEAU-IMPORTE.md) et [REVUE-DU-TABLEAU.md](./REVUE-DU-TABLEAU.md). Les fichiers historiques, dont l’ancien classeur d’ampoules, ne définissent pas les règles actives de cette version.

## Développement et GitHub

Node.js 22 ou supérieur ; Python 3 pour le serveur. Aucune dépendance npm à installer.

```bash
npm run check
npm test
npm start
```

Ouvrir http://localhost:8080. Les modules nécessitent un serveur HTTP ; la vérification du code utilise Web Crypto, disponible sur localhost et en HTTPS.

Les tests GitHub Actions se lancent sur les pushes de `main` et les pull requests. Pages reste manuel : Actions → **Publier la démonstration sur GitHub Pages** → **Run workflow**, branche `main`. **Re-run all jobs** relance l’ancien commit. L’intégration du code ne publie pas automatiquement le site. Le badge attendu est **v0.10**.

## Structure et vérification

| Fichier | Rôle |
| --- | --- |
| `dist/smur-data.js` | Paramètres initiaux, groupes, références |
| `dist/patient-calculator.js`, `dist/smur-preparation.js` | Calculs et préparations |
| `dist/protocol-config.js`, `dist/protocol-store.js` | Variables, validation, conversion et persistance |
| `dist/admin-access.js`, `dist/admin-ui.js`, `dist/admin.css` | Code fixe et tableau intégré |
| `dist/dose-adjustments.js`, `dist/dose-controls.js` | Réglages et confirmation des dépassements |
| `dist/smur-ui.js`, `dist/simulation-ui.js`, `dist/simulation-data.js` | Deux vues des résultats |
| `dist/administration.js`, `dist/smur-sheets.js` | Voies, durées et fiches |
| `tests/` | Régressions des calculs, réglages, imports et interactions |

Les tests couvrent les doses initiales, seuils, annulation/confirmation, changement de patient, unités, durées, configurations, erreurs de stockage et migration. Des tests d’interaction chargent les modules d’interface avec un DOM minimal : ouverture des 67 fiches d’administration, édition, sauvegarde, verrouillage et boutons de dose. Ils ne vérifient pas la mise en page. Le contrôle visuel dans un navigateur réel et l’impression restent à réaliser, l’accès au serveur local ayant été refusé par le navigateur disponible.
