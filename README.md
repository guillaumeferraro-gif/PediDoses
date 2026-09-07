# PediDoses — France

Version 0.4 : protocole SMUR enrichi à partir du tableau fourni et des décisions prises avec l’utilisateur. Les 63 lignes d’origine sont conservées ; l’Isofundine reste ajouté dans le groupe « Remplissage ».

**Validation clinique à finaliser. L’application calcule les règles confirmées et affiche les questionnements restants dans chaque fiche, sans générer d’ordonnance.**

## Fonctions

- « Calculs rapides » s’ouvre directement sur les champs âge / poids. L’âge seul fournit un poids estimé ; tout poids connu valide saisi prend la priorité et rend l’âge facultatif, sauf restriction particulière.
- Modifier l’âge ou le poids recalcule immédiatement toutes les lignes calculables, y compris celles masquées par le filtre. Effacer le poids connu revient à l’estimation ; « Nouveau patient » efface les saisies et résultats.
- Une saisie invalide efface les résultats. Un poids invalide n’est jamais remplacé silencieusement par une estimation. Changer l’unité d’âge conserve la valeur numérique : « 3 mois » devient « 3 ans » si l’unité est changée.
- Chaque fiche de calcul rapide affiche posologie, particularités de poids ou d’âge, dilution, modalités d’administration et questionnements restants. Les indications ne sont pas affichées.
- Les débits de pompe sont arrondis seulement à la fin à 0,1 mL/h. Les volumes de préparation sont affichés à 0,01 mL ; aucun arrondi intermédiaire n’est réutilisé.
- Adrénaline, noradrénaline, dopamine et dobutamine IVSE utilisent les préparations fixes locales et le débit approché poids/3.
- Recherche par nom, présentation ou texte et filtre par rubrique.
- Consultation des six cellules sources, y compris les cases vides et les colonnes décalées.
- Audit numérique à 10 kg présumés : hypothèse de contrôle déduite des doses totales, à confirmer.
- Valeurs originales conservées, avec distinction des écarts numériques et des données ambiguës.
- Unités g, mg, mcg, ng, mmol, mL et J distinguées ; perfusions par minute, heure ou 6 heures.
- Références françaises ciblées pour la relecture.
- Simulation logicielle initiale conservée dans un onglet séparé, avec substance et unités fictives.

Les neuf rubriques d’origine sont ACR, antibiotiques, cardio, sédation/curares, neuro, antidotes/G10/Exacyl, perfusions IV continues, hyperkaliémie et transfusion. Leur ordre est conservé ; « Remplissage » est ajouté après ACR. Les 64 lignes incluent des gestes électriques et des produits sanguins, pas seulement des médicaments.

## Estimation du poids

Règle locale confirmée :

| Âge saisi | Poids estimé en kg |
| --- | --- |
| De 0 à 11 mois | Table mensuelle du fichier source : 3 ; 3,5 ; 4,2 ; 5 ; 6 ; 6 ; 7 ; 8 ; 8 ; 9 ; 9 ; 10 kg |
| À partir de 1 an | (âge en années + 4) × 2 |

Les âges décimaux sont conservés. Avant un an, la borne mensuelle inférieure de la table est utilisée, sans interpolation. Le poids connu reste prioritaire. Aucune adaptation au poids idéal ou à l’obésité n’est automatisée.

Les bornes de saisie (poids connu de 0,5 à 200 kg ; âge de 0 à 18 ans) sont des contrôles techniques, pas des critères d’éligibilité clinique.

## Isofundine

Ajout distinct de la transcription utilisateur. Le repère de 10 mL/kg correspond au bolus de cristalloïde isotonique équilibré décrit dans les [recommandations RCUK 2025, section Circulation](https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/paediatric-basic-life-support-guidelines), pour un choc hypovolémique, obstructif ou distributif, avec réévaluation après chaque bolus. Son application à l’Isofundine est un choix de développement fondé sur sa classe de solution, à confirmer dans le protocole local.

Ce repère n’est pas la posologie journalière du [RCP français de l’Isofundine](https://base-donnees-publique.medicaments.gouv.fr/medicament/66312310/extrait#tab-rcp), consulté le 6 septembre 2026. Aucune répétition ni vitesse n’est calculée. Les contre-indications et l’incompatibilité avec un dispositif de transfusion commun sont indiquées dans la fiche.

## Limites

Les règles validées au cours de la relecture sont intégrées, notamment l’atropine locale à 0,25 mg/mL, l’adrénaline IM plafonnée à 0,5 mg, les paliers d’âge transcrits, le SSH 7,5 % prêt à l’emploi, la caféine exprimée en citrate, le gluconate de calcium PROAMP 10 %, l’insuline/G5 locale, les résines et la morphine. L’étomidate exige un âge connu strictement supérieur à 2 ans. Les antibiotiques restent calculés en masse sans volume standardisé, leur dilution étant laissée à l’IDE.

Les plafonds, intervalles, présentations ou modalités encore incertains sont listés dans les fiches concernées et ne sont pas appliqués comme des règles confirmées. Les documents de la BDPM et Pédiadol sont des références ciblées ; ils ne valident pas le tableau complet.

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
