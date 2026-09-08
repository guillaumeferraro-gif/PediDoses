# PediDoses — France

Version 0.7 : fiches de validation collective du protocole SMUR et ampoules modifiables par tableau CSV. Après suppression de la lidocaïne, 62 lignes sources sont conservées ; l’Isofundine porte le total à 63 fiches. L’adrénaline IM figure dans « Anaphylaxie ».

**Support de relecture avant production. Les simulations et les références consultées ne constituent pas une validation clinique.**

## Fonctions

- « Calculs rapides » s’ouvre directement sur les champs âge / poids. L’âge seul fournit un poids estimé ; tout poids connu valide saisi prend la priorité et rend l’âge facultatif, sauf restriction particulière.
- Modifier l’âge ou le poids recalcule immédiatement toutes les lignes calculables, y compris celles masquées par le filtre. Effacer le poids connu revient à l’estimation ; « Nouveau patient » efface les saisies et résultats.
- Une saisie invalide efface les résultats. Un poids invalide n’est jamais remplacé silencieusement par une estimation. Changer l’unité d’âge conserve la valeur numérique : « 3 mois » devient « 3 ans » si l’unité est changée.
- Chaque fiche affiche directement l’ampoule ou présentation, toutes les posologies et leurs seuils, la concentration finale, l’équivalent en mL/kg/dose ou mL/kg/h, chaque préparation, l’administration et les questions à résoudre. Tous les paliers restent visibles même sans âge ou poids saisi. Les indications ne sont pas affichées.
- Les dilutions changent à 15 kg pour la kétamine analgésique et à 10 kg pour midazolam IV, atracurium bolus et morphine. Fiches et moteur utilisent les mêmes préparations. La morphine IVSE affiche les quatre combinaisons d’âge et de poids.
- Le bouton « Imprimer les fiches affichées » respecte le filtre de recherche et conserve les sections de validation ouvertes.
- Les débits de pompe sont arrondis seulement à la fin à 0,1 mL/h. Les volumes de préparation sont affichés à 0,01 mL ; aucun arrondi intermédiaire n’est réutilisé.
- Adrénaline, noradrénaline, dopamine et dobutamine IVSE utilisent les préparations fixes locales et le débit approché poids/3.
- Recherche par nom, présentation ou texte et filtre par rubrique.
- Consultation des six cellules sources, y compris les cases vides et les colonnes décalées.
- L’audit de la transcription initiale reste inchangé. La cellule C5 du fichier Sheet fourni confirme un poids saisi de 10 kg pour cet exemple.
- Valeurs originales conservées, avec distinction des écarts numériques et des données ambiguës.
- Unités g, mg, mcg, ng, mmol, mL et J distinguées ; perfusions par minute, heure ou 6 heures.
- Références françaises ciblées pour la relecture.
- Simulation logicielle compacte avec les 63 lignes : tableau à en-tête fixe ou liste adaptée au téléphone. Les deux onglets de calcul partagent le même âge et le même poids.

Les neuf rubriques d’origine sont ACR, antibiotiques, cardio, sédation/curares, neuro, antidotes/G10/Exacyl, perfusions IV continues, hyperkaliémie et transfusion. « Anaphylaxie » et « Remplissage » sont ajoutés après ACR. Les 63 fiches incluent des gestes électriques et des produits sanguins.

## Simulation compacte v0.7

L’onglet « Simulation logicielle » remplace la démonstration fictive par les 63 lignes du référentiel. Il affiche la posologie applicable, l’ampoule active, la dose, la dilution, le volume et le débit. La voie et les modalités connues sont placées sous le nom du médicament. Les listes de questions restent dans les fiches de validation.

Le tableau garde son en-tête visible pendant le défilement. La liste est sélectionnée automatiquement sur petit écran ; les boutons Tableau / Liste permettent de choisir. Le patient est partagé en mémoire avec « Calculs rapides », y compris pour la remise à zéro et les saisies invalides. Les configurations d’ampoules modifient également cette vue.

Sur demande explicite, la simulation utilise les doses et plafonds du tableau encore en attente de validation, marqués †. La triphosadénine reprend 1 mg/kg, maximum 12 mg ; le gluconate reprend 0,4 mL/kg de produit PROAMP 10 %, maximum 20 mL. Pour celui-ci, la dose en mg est exprimée en calcium élément et le volume calculé reste un prélèvement : la dilution et le volume administré ne sont pas inventés. Le magnésium garde sa dose actuelle, sans volume tant que la teneur de l’ampoule manque. Les états de validation des fiches ne changent pas.

Toutes les lignes sont visibles dans la simulation. La restriction de calcul de l’étomidate à un âge strictement supérieur à 2 ans reste conservée ; le filtre contradictoire antérieurement demandé reste une question dans la fiche de validation.

Les quantités de masse sont converties en mg à l’affichage, sans modifier les valeurs brutes. Les mmol, UI, mL et joules ne sont pas convertis artificiellement. Pour les quatre IVSE poids/3, la dose indiquée est la quantité par seringue ; les autres perfusions affichent mg/h ou la quantité sur la durée prévue. Un volume de seringue est identifié comme tel. Les volumes prélevés sont distingués des volumes administrés ; un débit sur une durée connue n’est calculé que si le volume final est déterminé.

## Ampoules modifiables sans coder

L’onglet « Ampoules » propose le téléchargement du tableau Excel (importable dans Google Sheets), l’export CSV, l’import avec aperçu des changements et le retour aux ampoules de la version. Une ligne distincte est conservée pour chaque fiche, y compris les voies différentes d’un même médicament.

Dans le tableau, renseigner quantité totale et volume du contenant ; la concentration se calcule sans arrondi. Si le volume est inconnu, seule la concentration déclarée est utilisée. Exporter l’onglet Ampoules en CSV, l’importer dans l’application puis appliquer les changements. Les configurations sont enregistrées sur l’appareil, sans donnée patient. Pour plusieurs appareils, importer le même CSV sur chacun. Aucune publication publique de Google Sheets n’est nécessaire.

Les posologies ne sont pas modifiées par le tableau. Les préparations diluées conservent les quantités de médicament et volumes finaux du protocole ; le prélèvement s’adapte à la nouvelle ampoule. Les produits purs utilisent la nouvelle concentration. L’import refuse les lignes manquantes ou doublons, unités incompatibles, concentrations contradictoires et préparations impossibles. La colonne « Concentration calculée » est informative à l’import : les calculs repartent des données brutes.

Les logos CHU Toulouse et SAMU 31 proviennent des images fournies dans la conversation. Ils sont intégrés sans modification ni déformation.

## Estimation du poids

Règle locale confirmée :

| Âge saisi | Poids estimé en kg |
| --- | --- |
| De 0 à 11 mois | Table mensuelle du fichier source : 3 ; 3,5 ; 4,2 ; 5 ; 6 ; 6 ; 7 ; 8 ; 8 ; 9 ; 9 ; 10 kg |
| À partir de 1 an | (âge en années + 4) × 2 |

Les âges décimaux sont conservés. Avant un an, la borne mensuelle inférieure de la table est utilisée, sans interpolation. Le poids connu reste prioritaire. Aucune adaptation au poids idéal ou à l’obésité n’est automatisée.

Les bornes de saisie (poids connu de 0,5 à 200 kg ; âge de 0 à 18 ans) sont des contrôles techniques, pas des critères d’éligibilité clinique.

## Isofundine

Isofundine : 10 mL/kg, maximum confirmé de 500 mL par bolus, flacon de 1 L. Modalité : IVD, à passer le plus rapidement possible. Aucune vitesse chiffrée ni nombre maximal de bolus ajouté.

## Corrections v0.6

- Adrénaline IV : 10 mcg/kg sous 50 kg avec dilution ; 1 mg pur dès 50 kg. IVD flash, puis rinçage de 5 mL de NaCl 0,9 %. IM : maximum 500 mcg.
- Bicarbonate : 5 mmol dans 10 mL, IVL. Cardioversion : 1 J/kg, mode « Synchrone », sans plafond ; défibrillation : maximum 200 J.
- Gentamicine : 40 mg/2 mL, sans plafond, IVL sur 30 min ; volume prélevé distingué du volume final choisi par l’IDE.
- Amoxicilline : maximum 2 g ; amoxicilline-clavulanate : (80/3) mg/kg par dose exprimée en amoxicilline, maximum 2 g ; céfotaxime : maximum 3 g ; ceftriaxone : maximum 4 g. Une seule dose, IV, sans intervalle, durée ou dilution imposés.
- Amiodarone : maximum 300 mg, IVD puis rinçage 5 mL de NaCl 0,9 % ; atropine : maximum 2 mg, IVD ; hydrocortisone : maximum 100 mg, IVD.
- Magnésium : 50 mg/kg de sulfate, maximum 2 g, IVL sur 20 min. L’ambiguïté 0,15 g par mL/par ampoule de 10 mL empêche le calcul d’un volume ; la quantité du contenant reste vide dans le tableau.
- Triphosadénine : laissée en suspens, sans calcul automatique.
- Étomidate : IVL sans durée. Filtre demandé masquant la fiche après 2 ans, âge absent visible ; le calcul avant ou à 2 ans reste bloqué. Le sens du filtre, opposé à la restriction historique de calcul, est à confirmer.
- Kétamine analgésique : plafond proposé 80 mg maintenu en suspens ; kétamine d’intubation : palier confirmé à 18 mois.
- Midazolam IV : aucun plafond documenté, 50 mg/10 mL, IVL sans durée ni vitesse ; morphine DC : 10 mg/10 mL, IVL sans durée ni vitesse.
- Microgrammes affichés « mcg » dans l’interface.

## Limites

Les décisions locales intégrées incluent l’atropine à 0,25 mg/mL, l’adrénaline IM plafonnée à 0,5 mg, le SSH 7,5 % prêt à l’emploi, la caféine exprimée en citrate, l’insuline/G5 et les conventions des résines. Le seuil de kétamine d’intubation à 18 mois est confirmé. Les paliers de suxaméthonium et de phénobarbital restent à confirmer. L’étomidate exige un âge connu strictement supérieur à 2 ans. Les antibiotiques restent calculés en masse sans volume standardisé, leur dilution étant laissée à l’IDE.

Le gluconate de calcium n’a plus de dose automatiquement retenue : la fiche compare 0,4 mL/kg du tableau et 0,5 mL/kg de l’ERC 2025, les deux plafonnés à 20 mL de produit à 10 %, et demande de trancher la dose, la fraction de calcium et la dilution. Le calcul patient est suspendu pour cette ligne et pour la triphosadénine. Le RCP PROAMP documente la composition et la dilution, sans valider le schéma local.

Pour le phénobarbital et le lévétiracétam, le volume prélevé n’est pas présenté comme un volume final à administrer tant que la préparation finale manque. Pour tranexamique et clonazépam IVSE, le résultat sépare volume prélevé, complément de diluant et concentration finale.

Dans « Calculs rapides », les plafonds du tableau non confirmés sont affichés avec leur seuil pondéral et la mention « non appliqué au calcul ». Le plafond de clonazépam IVSE à 4 mg/6 h, déjà utilisé par la version précédente, reste signalé comme utilisé pour la simulation mais à valider. La morphine IVSE applique le tableau dès 3 mois ; le schéma au-delà de 5 ans reste une question explicite par rapport à Pédiadol. Les documents de la BDPM, Pédiadol et ERC sont des références ciblées, pas une validation du tableau complet.

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

La publication Pages reste manuelle : dans Actions, ouvrir « Publier la démonstration sur GitHub Pages », puis cliquer sur **Run workflow** en sélectionnant **main**. **Re-run all jobs** relance l’ancien commit et peut donc conserver une ancienne version. Le badge de cette version est **v0.7**. L’intégration du code ne publie pas le site.

Ne pas importer de .git existant, de secrets ni de données patient. L’archive exclut l’identité de l’aperçu hébergé. La visibilité de Pages dépend du dépôt et de l’offre GitHub ; consulter les [sources de publication](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Le workflow suit la [documentation officielle Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), consultée le 6 septembre 2026.

## Structure

| Fichier | Rôle |
| --- | --- |
| dist/patient-calculator.js | Résolution du poids, estimation et calculs par ligne |
| dist/smur-data.js | Groupes du calculateur et référence Isofundine |
| dist/smur-preparation.js | Préparations communes au calcul et à la fiche de validation |
| dist/smur-sheets.js | Présentations, tous les paliers, équivalents volumiques et questions |
| dist/smur-ui.js et dist/smur.css | Saisie immédiate et résultats groupés |
| dist/catalog-data.js | Transcription, provenance et points à clarifier |
| dist/catalog-audit.js | Audit à 10 kg présumés, sans prescription |
| dist/catalog-ui.js et dist/catalog.css | Consultation et relecture |
| dist/index.html et dist/styles.css | Structure et thème communs |
| dist/app.js | Navigation des onglets |
| dist/simulation-data.js, dist/simulation-ui.js, dist/simulation.css | Simulation compacte de toutes les drogues |
| dist/patient-state.js | Patient partagé en mémoire entre les deux vues |
| dist/calculator.js | Contrôles de saisie et ancien cas de test logiciel |
| dist/protocols.js | Catalogue importé non validé et démonstration séparée |
| tests/ | Tests des unités, dilutions, périodes, transitions de poids, écarts et blocages |

## Données et validation

Aucun nom ni identifiant n’est demandé. Les saisies du calculateur restent uniquement en mémoire dans la page, sans stockage local ni transmission au serveur. Le retour depuis le cache de navigation efface les champs et les résultats. Le chargement du site reste une requête normale auprès de l’hébergeur.

53 tests automatisés couvrent notamment les seuils de dilution, paliers d’âge, préparations fixes et précision des calculs. L’aperçu local n’a pas pu être ouvert dans le navigateur distant : le rendu visuel et l’impression restent à contrôler. Les tests logiciels ne constituent pas une validation clinique ; aucun test en situation de soins n’a été réalisé.
