# Périmètre clinique — France

## Éléments confirmés

Pays : France. Usage envisagé par l’utilisateur : accès rapide aux calculs en intervention SMUR, avec modification immédiate de l’âge ou du poids. Tableau utilisateur de 63 lignes couvrant neuf rubriques, dont 14 perfusions IV continues. Les cellules sources sont conservées et toutes les lignes sont marquées comme importées et non validées. L’établissement, l’auteur, la date et la version du document original restent inconnus. L’Isofundine est ajouté séparément en version 0.3, sans modifier la transcription.

Les correspondances 10 mcg/kg → 100 mcg, 1 mmol/kg → 10 mmol et 10 mL/kg → 100 mL suggèrent 10 kg. Cela constitue une hypothèse de contrôle, sans garantir que toutes les lignes correspondent à ce poids. L’âge n’est pas connu.

## Prochaine étape de validation

Répondre aux questionnements affichés dans chaque fiche, puis faire relire l’ensemble des règles par le référent clinique et la pharmacie. Les écarts historiques restent décrits dans REVUE-DU-TABLEAU.md.

| Élément | État |
| --- | --- |
| Pays | France |
| Service / établissement | À préciser |
| Utilisateurs et usage | SMUR confirmé ; qualification et validation clinique du logiciel non réalisées |
| Population | 0 à 18 ans ; estimation locale avant 1 an puis (âge + 4) × 2 |
| Posologies | Règles confirmées calculées ; autres plafonds et intervalles affichés comme questions |
| Antibiotiques | Masse calculée ; dilution laissée à l’IDE ; intervalle et plusieurs plafonds à préciser |
| Voies | IV par défaut ; exceptions IVSE, IM, IJ/intergingivojugale, IR et nébulisation explicites |
| Fraction active | Caféine exprimée en citrate ; calcium PROAMP documenté en volume et calcium élément |
| Préparations | Volumes affichés à 0,01 mL sans arrondi intermédiaire |
| Perfusions | Débits finaux à 0,1 mL/h ; quatre catécholamines selon le protocole SMUR poids/3 |
| Relecture clinique / pharmaceutique | Non effectuée |

## Suite du développement

La version 0.4 recalcule le tableau selon le poids saisi ou estimé. Le poids connu valide est toujours prioritaire. Avant un an, l’estimation reprend la table mensuelle du fichier source ; à partir d’un an elle applique (âge + 4) × 2. Une saisie invalide efface les résultats.

Le moteur applique uniquement les plafonds confirmés. Chaque fiche de calcul rapide expose la posologie, ses paliers éventuels, la dilution, l’administration et les questions non résolues. Les indications ne sont pas affichées. L’audit de l’exemple et la simulation fictive restent indépendants.

L’Isofundine est un ajout de développement, avec un repère de remplissage de 10 mL/kg fondé sur les recommandations RCUK 2025 pour la classe des cristalloïdes équilibrés. Ce choix doit être confirmé localement ; il ne provient pas du tableau utilisateur et ne remplace pas les posologies du RCP. Réévaluation, contre-indications, vitesse, indication et éventuelles répétitions relèvent de la décision clinique. Les références et précautions sont jointes à la fiche.

Un moteur destiné aux soins nécessite des règles documentées : population, indications, unités et fraction active, voies et concentrations, plafonds et répétitions, conditions particulières, préparation, arrondis et cas de référence vérifiés indépendamment avec les professionnels concernés.

Un RCP consulté ou un contrôle arithmétique réussi ne vaut pas approbation d’un protocole pédiatrique. Les exigences d’authentification, de traçabilité, d’hébergement et de qualification du logiciel dépendront de l’usage retenu. Le prototype ne stocke pas de données patient et ne génère pas d’ordonnance.
