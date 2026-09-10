# Périmètre clinique — France

## Éléments confirmés

Pays : France. Usage envisagé : calculs rapides en SMUR. Après suppression demandée de la lidocaïne, 62 lignes sources sont conservées. Le Sheet fourni porte l’en-tête CHU Toulouse / SMUR pédiatrique 31 ; son auteur, sa date et sa version de validation restent à documenter. L’Isofundine figure séparément dans « Remplissage », soit 63 fiches. L’adrénaline IM est classée dans « Anaphylaxie ».

La cellule Prescription!C5 du fichier fourni contient un poids saisi de 10 kg. L’audit historique de la transcription initiale est conservé indépendamment des simulations patient et des corrections locales.

## Prochaine étape de validation

Répondre aux questionnements affichés dans chaque fiche, puis faire relire l’ensemble des règles par le référent clinique et la pharmacie. Les écarts historiques restent décrits dans REVUE-DU-TABLEAU.md.

| Élément | État |
| --- | --- |
| Pays | France |
| Service / établissement | En-tête du fichier : CHU Toulouse / SMUR pédiatrique 31 ; validation datée à fournir |
| Utilisateurs et usage | SMUR confirmé ; qualification et validation clinique du logiciel non réalisées |
| Population | 0 à 18 ans ; estimation locale avant 1 an puis (âge + 4) × 2 |
| Posologies | Paliers du tableau et décisions locales, avec questions explicites sur les règles encore à valider |
| Antibiotiques | Une seule dose en masse ; plafonds confirmés ; amoxicilline-clavulanate : 80/3 mg/kg/dose d’amoxicilline. IV sans durée ajoutée, sauf gentamicine sur 30 min |
| Voies | IV par défaut ; exceptions IVSE, IM, IJ/intergingivojugale, IR et nébulisation explicites |
| Fraction active | Caféine en citrate ; dose et dilution du gluconate de calcium non tranchées, calcul suspendu |
| Préparations | Volumes affichés à 0,01 mL sans arrondi intermédiaire |
| Perfusions | Débits finaux à 0,1 mL/h ; quatre catécholamines selon le protocole SMUR poids/3 |
| Relecture clinique / pharmaceutique | Non effectuée |

## Suite du développement

La version 0.8 recalcule les lignes déterminées selon le poids saisi ou estimé. Le poids connu valide est toujours prioritaire. Avant un an, l’estimation reprend la table mensuelle ; à partir d’un an elle applique (âge + 4) × 2. Une saisie invalide efface les résultats.

Les nouvelles décisions sont détaillées dans README.md. L’adrénaline IV est pure dès 50 kg. Les plafonds validés sont appliqués. Le magnésium calcule la masse (50 mg/kg, maximum 2 g), mais aucun volume tant que la quantité totale de l’ampoule de 10 mL reste ambiguë. La triphosadénine est laissée en suspens, sans calcul automatique. Le palier de kétamine d’intubation à 18 mois est confirmé ; le plafond de 80 mg de kétamine analgésique reste en suspens. Le midazolam IV n’a aucun plafond documenté. Midazolam IV, morphine DC et étomidate sont indiqués IVL sans durée ni vitesse ajoutées. Selon la correction de l’utilisateur en v0.8, l’étomidate est masqué avant 24 mois, visible et calculable dès 24 mois inclus. Si l’âge manque, la fiche reste visible et le calcul attend l’âge.

CGR, CPA et PFC : les posologies en mL/kg sont conservées, sans maximum fixe en mL. La règle locale limite la transfusion au contenu d’une poche de volume variable. La simulation compare le volume prescrit au volume de la poche renseigné sur la ligne, sans arrondi intermédiaire, et retient le plus petit. Sans volume de poche saisi, elle indique le volume prescrit avec la limite d’une poche. Aucune question ne demande de valider un plafond numérique.

Le tableau des ampoules comporte une ligne par fiche et permet un import CSV contrôlé. Les quantités et volumes finaux des préparations diluées sont préservés, et les prélèvements sont recalculés. La configuration est enregistrée dans le navigateur sur chaque appareil, sans données patient. La confirmation d’une présentation n’équivaut pas à la validation du protocole.

Chaque fiche expose directement l’ampoule utilisée, toutes les posologies et leurs seuils, les équivalents volumiques après dilution, toutes les préparations, l’administration et les questions. Ces informations restent visibles sans contexte patient et à l’impression. Les indications ne sont pas affichées. Les plafonds non confirmés du Sheet sont identifiés comme non appliqués ; le plafond de clonazépam IVSE déjà utilisé reste signalé comme provisoire.

Le gluconate de calcium compare le tableau (0,4 mL/kg) et l’ERC 2025 (0,5 mL/kg), avant dilution, maximum 20 mL. Aucune des deux propositions n’est choisie automatiquement. La mention source « 20 mg/kg », la dilution et la durée restent à trancher. L’écart entre insuline/G5 local et schéma ERC est également explicite. Pour la morphine IVSE, le schéma au-delà de 5 ans reste à préciser par rapport à la référence Pédiadol.

Les seuils de dilution et les concentrations des fiches sont issus des mêmes données que le moteur. Les résultats distinguent produit prélevé, diluant ajouté, volume administré et débit final. Les coefficients en mL/kg ne sont pas ramenés à deux décimales ; l’affichage à 0,01 mL concerne les volumes, sans réutilisation dans les calculs.

Un moteur destiné aux soins nécessite des règles documentées : population, indications, unités et fraction active, voies et concentrations, plafonds et répétitions, conditions particulières, préparation, arrondis et cas de référence vérifiés indépendamment avec les professionnels concernés.

Un RCP consulté ou un contrôle arithmétique réussi ne vaut pas approbation d’un protocole pédiatrique. Les exigences d’authentification, de traçabilité, d’hébergement et de qualification du logiciel dépendront de l’usage retenu. Le prototype ne stocke pas de données patient et ne génère pas d’ordonnance.

## Simulation compacte

La simulation v0.8 utilise les doses documentées et les plafonds encore à valider, sur demande de l’utilisateur ; ces valeurs sont repérées par †. Ce choix n’attribue aucun statut de validation clinique aux médicaments. Les fiches « Calculs rapides » conservent leurs questions et blocages distincts.

La triphosadénine reprend la valeur source de 1 mg/kg et le plafond source de 12 mg. Le gluconate reprend la règle source de 0,4 mL/kg, maximum 20 mL, avec une dose en calcium élément et uniquement un volume de produit à prélever. Sa dilution finale reste indéterminée. L’ambiguïté de concentration du magnésium n’est pas résolue automatiquement. Aucun volume d’administration ni débit n’est déduit d’un simple volume prélevé.

La simulation contient tout le référentiel, avec le filtre d’âge corrigé pour l’étomidate. Les unités non massiques restent explicites. La présentation utilise uniquement une liste : dose, volume et débit dans une colonne à droite, les autres informations dans l’espace restant, sans champs sans objet. Elle conserve le poids partagé en mémoire, les ampoules configurées et les règles d’arrondi final. Les volumes de poche sont propres au patient courant, sans stockage persistant, et sont effacés avec les saisies patient.
