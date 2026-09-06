# PediDoses — France

Version 0.3 : âge, poids connu prioritaire et recalcul automatique. Les 63 lignes du tableau fourni sont conservées dans leurs neuf rubriques ; l’Isofundine est ajouté dans un groupe « Remplissage ».

**Prototype non validé pour les soins. Les calculs appliquent les coefficients sources sans plafond clinique, sans choix d’indication et sans génération d’ordonnance.**

## Fonctions

- « Calculs rapides » s’ouvre directement sur les champs âge / poids. L’âge seul fournit un poids estimé ; tout poids connu valide saisi prend la priorité et rend l’âge facultatif, sauf restriction particulière.
- Modifier l’âge ou le poids recalcule immédiatement toutes les lignes calculables, y compris celles masquées par le filtre. Effacer le poids connu revient à l’estimation ; « Nouveau patient » efface les saisies et résultats.
- Une saisie invalide efface les résultats. Un poids invalide n’est jamais remplacé silencieusement par une estimation. Changer l’unité convertit l’âge déjà saisi : 2 ans deviennent 24 mois.
- Les mélanges de perfusion restent fixes : seul le débit calculé varie avec le poids. L’autonomie du mélange d’acide tranexamique est distinguée de sa durée source.
- Quantités, volumes documentés et débits groupés par rubrique, avec préparations, calculs et précautions en détail. Aucun arrondi d’administration ni plafond clinique appliqué.
- Recherche par nom, présentation ou texte et filtre par rubrique.
- Consultation des six cellules sources, y compris les cases vides et les colonnes décalées.
- Audit numérique à 10 kg présumés : hypothèse de contrôle déduite des doses totales, à confirmer.
- Valeurs originales conservées, avec distinction des écarts numériques et des données ambiguës.
- Unités g, mg, mcg, ng, mmol, mL et J distinguées ; perfusions par minute, heure ou 6 heures.
- Références françaises ciblées pour la relecture.
- Simulation logicielle initiale conservée dans un onglet séparé, avec substance et unités fictives.

Les neuf rubriques d’origine sont ACR, antibiotiques, cardio, sédation/curares, neuro, antidotes/G10/Exacyl, perfusions IV continues, hyperkaliémie et transfusion. Leur ordre est conservé ; « Remplissage » est ajouté après ACR. Les 64 lignes incluent des gestes électriques et des produits sanguins, pas seulement des médicaments.

## Estimation du poids

Formules APLS décrites par [Carasco et al., 2016](https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/bcp.12876), consultées le 6 septembre 2026 :

| Âge saisi | Poids estimé en kg |
| --- | --- |
| De 1 à moins de 12 mois | 0,5 × âge en mois + 4 |
| De 1 à moins de 6 ans | 2 × âge en années + 8 |
| De 6 à 12 ans inclus | 3 × âge en années + 7 |

Les âges décimaux sont conservés. Pas d’extrapolation avant 1 mois ou au-delà de 144 mois. Le changement de formule à 6 ans peut entraîner un saut de l’estimation. Privilégier un poids connu ; les [recommandations RCUK 2025](https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/paediatric-basic-life-support-guidelines) privilégient l’information parentale et les méthodes fondées sur la taille, idéalement ajustées à la corpulence. Aucune adaptation au poids idéal ou à l’obésité n’est automatisée.

Les bornes de saisie (poids connu de 0,5 à 200 kg ; âge de 0 à 18 ans) sont des contrôles techniques, pas des critères d’éligibilité clinique. Un nouveau-né identifié de moins d’un mois reste sans résultat médicamenteux, faute de protocole néonatal documenté.

## Isofundine

Ajout distinct de la transcription utilisateur. Le repère de 10 mL/kg correspond au bolus de cristalloïde isotonique équilibré décrit dans les [recommandations RCUK 2025, section Circulation](https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/paediatric-basic-life-support-guidelines), pour un choc hypovolémique, obstructif ou distributif, avec réévaluation après chaque bolus. Son application à l’Isofundine est un choix de développement fondé sur sa classe de solution, à confirmer dans le protocole local.

Ce repère n’est pas la posologie journalière du [RCP français de l’Isofundine](https://base-donnees-publique.medicaments.gouv.fr/medicament/66312310/extrait#tab-rcp), consulté le 6 septembre 2026. Aucune répétition ni vitesse n’est calculée. Les contre-indications et l’incompatibilité avec un dispositif de transfusion commun sont indiquées dans la fiche.

## Limites

Cinq écarts numériques sont signalés : atropine, adrénaline IVC, dobutamine, dopamine et salbutamol IVC. Les calculs au poids saisi suivent le coefficient par kg et la concentration du modèle, jamais le volume ou débit d’exemple recopié. Neuf lignes restent sans résultat dans « Calculs rapides » : SSH, caféine, noradrénaline, salbutamol nébulisé, gluconate de calcium, insuline/G5 %, kétamine d’intubation, midazolam IJ et amoxicilline/acide clavulanique. Leurs préparations, voies ou expressions de dose restent ambiguës. L’étomidate exige un âge connu strictement supérieur à 2 ans. Les volumes des suspensions de résines et des antibiotiques sans concentration ne sont pas déduits.

Les indications détaillées, plafonds, intervalles, populations et modalités d’administration restent à compléter avec le protocole daté du service. « Non » dans la colonne de dilution n’est pas interprété comme une autorisation d’injection directe. Les documents de la BDPM sont des références de relecture ciblée ; ils ne valident pas le tableau complet.

Voir [REVUE-DU-TABLEAU.md](./REVUE-DU-TABLEAU.md), [TABLEAU-IMPORTE.md](./TABLEAU-IMPORTE.md) et [CLINICAL-SCOPE.md](./CLINICAL-SCOPE.md).

## Essayer localement

Node.js 22 ou supérieur pour les tests, Python 3 pour le serveur. Aucune dépendance npm à installer.

```bash
npm test
npm run check
npm start
```

Ouvrir http://localhost:8080. Les modules JavaScript nécessitent un serveur HTTP ; un double clic sur index.html n’est pas pris en charge.

## GitHub

Copier le contenu du dossier à la racine d’un dépôt GitHub, y compris .github/workflows, puis utiliser la branche main. Les tests se lancent sur les pushes et les pull requests.

La publication Pages reste manuelle : sélectionner Settings > Pages > Build and deployment > Source > GitHub Actions, puis lancer « Publier la démonstration sur GitHub Pages » depuis Actions. L’importation du dépôt ne publie pas le site. Cette publication concerne uniquement le prototype de relecture.

Ne pas importer de .git existant, de secrets ni de données patient. L’archive exclut l’identité de l’aperçu hébergé. La visibilité de Pages dépend du dépôt et de l’offre GitHub ; consulter les [sources de publication](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Le workflow suit la [documentation officielle Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), consultée le 6 septembre 2026.

## Structure

| Fichier | Rôle |
| --- | --- |
| dist/patient-calculator.js | Résolution du poids, estimation et calculs par ligne |
| dist/smur-data.js | Groupes du calculateur et référence Isofundine |
| dist/smur-ui.js et dist/smur.css | Saisie immédiate et résultats groupés |
| dist/catalog-data.js | Transcription, provenance et points à clarifier |
| dist/catalog-audit.js | Audit à 10 kg présumés, sans prescription |
| dist/catalog-ui.js et dist/catalog.css | Consultation et relecture |
| dist/index.html et dist/styles.css | Structure et thème communs |
| dist/app.js et dist/calculator.js | Simulation fictive conservée |
| dist/protocols.js | Catalogue importé non validé et démonstration séparée |
| tests/ | Tests des unités, dilutions, périodes, transitions de poids, écarts et blocages |

## Données et validation

Aucun nom ni identifiant n’est demandé. Les saisies du calculateur restent uniquement en mémoire dans la page, sans stockage local ni transmission au serveur. Le retour depuis le cache de navigation efface les champs et les résultats. Le chargement du site reste une requête normale auprès de l’hébergeur.

Les tests logiciels ne constituent pas une validation clinique. Aucun test navigateur ni test en situation de soins n’a été réalisé pour cette version.
