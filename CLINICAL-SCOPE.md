# Périmètre clinique — France

## Éléments confirmés

Pays : France. Usage envisagé par l’utilisateur : accès rapide aux calculs en intervention SMUR, avec modification immédiate de l’âge ou du poids. Tableau utilisateur de 63 lignes couvrant neuf rubriques, dont 14 perfusions IV continues. Les cellules sources sont conservées et toutes les lignes sont marquées comme importées et non validées. L’établissement, l’auteur, la date et la version du document original restent inconnus. L’Isofundine est ajouté séparément en version 0.3, sans modifier la transcription.

Les correspondances 10 mcg/kg → 100 mcg, 1 mmol/kg → 10 mmol et 10 mL/kg → 100 mL suggèrent 10 kg. Cela constitue une hypothèse de contrôle, sans garantir que toutes les lignes correspondent à ce poids. L’âge n’est pas connu.

## Prochaine information nécessaire

Confirmer le poids de référence et fournir le protocole daté du service, ou ses références et son responsable clinique. Les écarts sont décrits dans REVUE-DU-TABLEAU.md.

| Élément | État |
| --- | --- |
| Pays | France |
| Service / établissement | À préciser |
| Utilisateurs et usage | SMUR confirmé ; qualification et validation clinique du logiciel non réalisées |
| Population | Âges, poids et inclusion des nouveau-nés à définir |
| Indications | Rubriques générales fournies ; détails manquants |
| Posologies | Transcrites ; plafonds et intervalles absents |
| Antibiotiques | Dose par prise ou par jour, indication, intervalle et reconstitution à préciser |
| Voies | Certaines explicites ; IJ, DC et classement de l’adrénaline IM à clarifier |
| Fraction active | Sel ou base à préciser selon le produit, notamment caféine, noradrénaline et calcium |
| Préparations | Plusieurs mélanges incomplets ou ambigus |
| Perfusions | 14 lignes transcrites, périodes conservées et écarts signalés |
| Relecture clinique / pharmaceutique | Non effectuée |

## Suite du développement

La version 0.3 ajoute un moteur arithmétique distinct pour recalculer le tableau selon le poids saisi ou estimé par l’âge. Le poids connu valide est toujours prioritaire. La méthode APLS, ses bornes et ses limites sont décrites et sourcées dans README.md. Une saisie invalide efface les résultats ; aucune valeur de l’exemple de 10 kg n’est utilisée comme poids par défaut.

Ce moteur n’applique aucun plafond clinique et ne choisit ni l’indication, ni la voie, ni les répétitions. Les neuf lignes aux ambiguïtés bloquantes restent sans résultat ; l’âge est vérifié pour l’étomidate et les nouveau-nés identifiés nécessitent un protocole séparé. Les autres réserves du tableau restent visibles. Les mélanges de perfusion conservent les quantités sources ; le débit varie avec le poids. L’audit de l’exemple et la simulation fictive restent indépendants.

L’Isofundine est un ajout de développement, avec un repère de remplissage de 10 mL/kg fondé sur les recommandations RCUK 2025 pour la classe des cristalloïdes équilibrés. Ce choix doit être confirmé localement ; il ne provient pas du tableau utilisateur et ne remplace pas les posologies du RCP. Réévaluation, contre-indications, vitesse, indication et éventuelles répétitions relèvent de la décision clinique. Les références et précautions sont jointes à la fiche.

Un moteur destiné aux soins nécessite des règles documentées : population, indications, unités et fraction active, voies et concentrations, plafonds et répétitions, conditions particulières, préparation, arrondis et cas de référence vérifiés indépendamment avec les professionnels concernés.

Un RCP consulté ou un contrôle arithmétique réussi ne vaut pas approbation d’un protocole pédiatrique. Les exigences d’authentification, de traçabilité, d’hébergement et de qualification du logiciel dépendront de l’usage retenu. Le prototype ne stocke pas de données patient et ne génère pas d’ordonnance.
