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

La version 0.6 recalcule les lignes déterminées selon le poids saisi ou estimé. Le poids connu valide est toujours prioritaire. Avant un an, l’estimation reprend la table mensuelle ; à partir d’un an elle applique (âge + 4) × 2. Une saisie invalide efface les résultats.

Les nouvelles décisions sont détaillées dans README.md. L’adrénaline IV est pure dès 50 kg. Les plafonds validés sont appliqués. Le magnésium calcule la masse (50 mg/kg, maximum 2 g), mais aucun volume tant que la quantité totale de l’ampoule de 10 mL reste ambiguë. La triphosadénine est laissée en suspens, sans calcul automatique. Le palier de kétamine d’intubation à 18 mois est confirmé ; le plafond de 80 mg de kétamine analgésique reste en suspens. Le midazolam IV n’a aucun plafond documenté. Midazolam IV, morphine DC et étomidate sont indiqués IVL sans durée ni vitesse ajoutées. Le filtre demandé masque l’étomidate après 2 ans ; son sens reste à confirmer car la restriction de calcul historique exclut au contraire les âges avant ou à 2 ans.

Le tableau des ampoules comporte une ligne par fiche et permet un import CSV contrôlé. Les quantités et volumes finaux des préparations diluées sont préservés, et les prélèvements sont recalculés. La configuration est enregistrée dans le navigateur sur chaque appareil, sans données patient. La confirmation d’une présentation n’équivaut pas à la validation du protocole.

Chaque fiche expose directement l’ampoule utilisée, toutes les posologies et leurs seuils, les équivalents volumiques après dilution, toutes les préparations, l’administration et les questions. Ces informations restent visibles sans contexte patient et à l’impression. Les indications ne sont pas affichées. Les plafonds non confirmés du Sheet sont identifiés comme non appliqués ; le plafond de clonazépam IVSE déjà utilisé reste signalé comme provisoire.

Le gluconate de calcium compare le tableau (0,4 mL/kg) et l’ERC 2025 (0,5 mL/kg), avant dilution, maximum 20 mL. Aucune des deux propositions n’est choisie automatiquement. La mention source « 20 mg/kg », la dilution et la durée restent à trancher. L’écart entre insuline/G5 local et schéma ERC est également explicite. Pour la morphine IVSE, le schéma au-delà de 5 ans reste à préciser par rapport à la référence Pédiadol.

Les seuils de dilution et les concentrations des fiches sont issus des mêmes données que le moteur. Les résultats distinguent produit prélevé, diluant ajouté, volume administré et débit final. Les coefficients en mL/kg ne sont pas ramenés à deux décimales ; l’affichage à 0,01 mL concerne les volumes, sans réutilisation dans les calculs.

Un moteur destiné aux soins nécessite des règles documentées : population, indications, unités et fraction active, voies et concentrations, plafonds et répétitions, conditions particulières, préparation, arrondis et cas de référence vérifiés indépendamment avec les professionnels concernés.

Un RCP consulté ou un contrôle arithmétique réussi ne vaut pas approbation d’un protocole pédiatrique. Les exigences d’authentification, de traçabilité, d’hébergement et de qualification du logiciel dépendront de l’usage retenu. Le prototype ne stocke pas de données patient et ne génère pas d’ordonnance.
