# PediDoses — France

Version **0.11** : 65 fiches, posologies réglables avec avertissement et tableau d’administration intégré protégé par un code fixe à huit chiffres. Cette version regroupe les deux doses de triphosadénine, retire l’atracurium bolus et intègre les corrections ciblées du 1er octobre. Le **sufentanil reste à 50 mcg/10 mL**.

Les paramètres suivent les décisions de l’utilisateur des 26–28 septembre et du 1er octobre 2026. [CLINICAL-SCOPE.md](./CLINICAL-SCOPE.md) décrit les règles et points ouverts. Les tests arithmétiques ne constituent pas une validation clinique.

## Utilisation

- L’âge et le poids sont partagés entre « Calculs rapides » et « Simulation logicielle ». Chaque modification recalcule toutes les lignes et rétablit les doses de départ.
- Le poids connu valide est prioritaire. Sans poids, l’âge permet l’estimation locale. Une saisie invalide efface les résultats.
- « Nouveau patient » efface les saisies, volumes de poche et réglages. Aucune donnée patient n’est enregistrée ni transmise.
- Les deux vues partagent les mêmes réglages de posologie. Changer d’onglet conserve le patient et ses réglages.
- Les prélèvements et volumes finaux sont distincts. Aucun débit d’injection n’est déduit d’un prélèvement si la dilution finale manque.
- Les débits sont arrondis à 0,1 mL/h à l’affichage ; les volumes de préparation à 0,01 mL. Les calculs utilisent les valeurs exactes, sauf les arrondis prescrits de dose pour l’amoxicilline/clavulanate et de diluant pour le lévétiracétam.

## Corrections v0.11

- Triphosadénine : une seule ligne, une préparation commune et les deux couples dose/volume. Les deux posologies et plafonds sont modifiables dans la même ligne d’administration.
- Magnésium : compléter le produit prélevé avec du NaCl 0,9 % jusqu’à **50 mL au total**. Au plafond de 2 g, le prélèvement est de 13,333… mL et le complément de 36,666… mL.
- Lévétiracétam : viser 15 mg/mL puis arrondir le NaCl 0,9 % au mL supérieur, ou au dixième de mL pour les petits volumes si nécessaire, afin de rester entre **10 et 15 mg/mL**. La concentration et le débit sont recalculés à partir du volume réellement préparé.
- Phénobarbital : 20 mg/kg avant un mois, 15 mg/kg dès un mois, maximum 600 mg, IVL 20 min. La poudre injectable est affichée sans calcul de volume ni consigne de dilution.
- Kétamine analgésie et sédation : aucun plafond. Midazolam IJ : plafond confirmé de 10 mg, présentation adaptée à 5 mg/1 mL. L’atracurium IVSE est conservé ; le bolus est retiré.
- Morphine titration, propofol et propofol LISA : IVL sans durée ni débit calculé. Les critères d’arrêt ne sont plus affichés pour la morphine titration.

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
- Les configurations v0.10 déjà enregistrées ou importées reçoivent les corrections v0.11, y compris le regroupement de la triphosadénine et le retrait de l’atracurium bolus. Les autres paramètres personnalisés sont conservés. Les anciennes ampoules sont également reprises. L’écriture locale reste soumise au déverrouillage puis à l’enregistrement. Le tableur externe n’est plus le mode de modification de l’application.

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

Les anciens plafonds en attente de kétamine analgésique et de midazolam IJ sont résolus par les décisions du 1er octobre ; le bolus d’atracurium est retiré. Les deux vues utilisent les mêmes plafonds actifs.

L’audit initial reste dans `catalog-data.js`, [TABLEAU-IMPORTE.md](./TABLEAU-IMPORTE.md) et [REVUE-DU-TABLEAU.md](./REVUE-DU-TABLEAU.md). Les fichiers historiques, dont l’ancien classeur d’ampoules, ne définissent pas les règles actives de cette version.

## Développement et GitHub

Node.js 22 ou supérieur ; Python 3 pour le serveur. Aucune dépendance npm à installer.

```bash
npm run check
npm test
npm start
```

Ouvrir http://localhost:8080. Les modules nécessitent un serveur HTTP ; la vérification du code utilise Web Crypto, disponible sur localhost et en HTTPS.

Les tests GitHub Actions se lancent sur les pushes de `main` et les pull requests. Pages reste manuel : Actions → **Publier la démonstration sur GitHub Pages** → **Run workflow**, branche `main`. **Re-run all jobs** relance l’ancien commit. L’intégration du code ne publie pas automatiquement le site. Le badge attendu est **v0.11**.

## Structure et vérification

| Fichier | Rôle |
| --- | --- |
| `dist/smur-data.js` | Paramètres initiaux, groupes, références |
| `dist/patient-calculator.js`, `dist/smur-preparation.js` | Calculs et préparations |
| `dist/protocol-config.js`, `dist/protocol-store.js`, `dist/configuration-updates.js` | Variables, validation, conversion, persistance et migration |
| `dist/admin-access.js`, `dist/admin-ui.js`, `dist/admin.css` | Code fixe et tableau intégré |
| `dist/dose-adjustments.js`, `dist/dose-controls.js` | Réglages et confirmation des dépassements |
| `dist/smur-ui.js`, `dist/simulation-ui.js`, `dist/simulation-data.js` | Deux vues des résultats |
| `dist/administration.js`, `dist/smur-sheets.js` | Voies, durées et fiches |
| `tests/` | Régressions des calculs, réglages, imports et interactions |

Les tests couvrent les doses initiales, seuils, annulation/confirmation, changement de patient, unités, durées, configurations, erreurs de stockage et migration. Ils vérifient également les deux doses de triphosadénine, le volume final du magnésium, la concentration du lévétiracétam après arrondi et le palier du phénobarbital. Des tests d’interaction chargent les modules d’interface avec un DOM minimal : ouverture des 65 fiches d’administration, édition, sauvegarde, verrouillage, boutons de dose et regroupement de la triphosadénine. Ils ne vérifient pas la mise en page. Le contrôle visuel dans un navigateur réel et l’impression restent à réaliser, l’accès au serveur local ayant été refusé par le navigateur disponible.
