# Pédia Urgences — France

Version 0.2 : 63 lignes du tableau fourni, dans neuf rubriques, dont 14 perfusions IV continues.

**Médicaments réels, tableau non validé pour la prescription. Aucune ordonnance ni aucun calcul patient.**

## Fonctions

- Recherche par nom, présentation ou texte et filtre par rubrique.
- Consultation des six cellules sources, y compris les cases vides et les colonnes décalées.
- Audit numérique à 10 kg présumés : hypothèse de contrôle déduite des doses totales, à confirmer.
- Valeurs originales conservées, avec distinction des écarts numériques et des données ambiguës.
- Unités g, mg, mcg, ng, mmol, mL et J distinguées ; perfusions par minute, heure ou 6 heures.
- Références françaises ciblées pour la relecture.
- Simulation logicielle initiale conservée dans un onglet séparé, avec substance et unités fictives.

Les neuf rubriques sont ACR, antibiotiques, cardio, sédation/curares, neuro, antidotes/G10/Exacyl, perfusions IV continues, hyperkaliémie et transfusion. Les 63 lignes incluent des gestes électriques et des produits sanguins, pas seulement des médicaments.

## Limites

Cinq écarts numériques sont signalés : atropine, adrénaline IVC, dobutamine, dopamine et salbutamol IVC. Six lignes ne sont pas calculées : SSH, caféine, noradrénaline, salbutamol nébulisé, gluconate de calcium et insuline/G5 %. Les volumes des suspensions de résines et des antibiotiques sans concentration ne sont pas déduits.

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
| dist/catalog-data.js | Transcription, provenance et points à clarifier |
| dist/catalog-audit.js | Audit à 10 kg présumés, sans prescription |
| dist/catalog-ui.js et dist/catalog.css | Consultation et relecture |
| dist/index.html et dist/styles.css | Structure et thème communs |
| dist/app.js et dist/calculator.js | Simulation fictive conservée |
| dist/protocols.js | Catalogue importé non validé et démonstration séparée |
| tests/ | Tests des unités, dilutions, périodes, écarts et blocages |

## Données et validation

Aucun nom ni identifiant n’est demandé. Le catalogue ne propose aucun calcul patient. La simulation conserve seulement ses champs en mémoire dans la page, sans stockage local ni transmission au serveur. Le chargement du site reste une requête normale auprès de l’hébergeur.

Les tests logiciels ne constituent pas une validation clinique. Aucun test navigateur ni test en situation de soins n’a été réalisé pour cette version.
