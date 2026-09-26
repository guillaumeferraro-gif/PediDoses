# Périmètre clinique — France — v0.9

Usage demandé : calculs rapides en SMUR pédiatrique. Le tableau source porte l’en-tête CHU Toulouse / SMUR pédiatrique 31 ; sa validation institutionnelle datée n’a pas été fournie. Cette version intègre les décisions de l’utilisateur du 26 septembre 2026, sans leur attribuer une validation clinique du logiciel.

Le référentiel actif comporte 66 fiches. L’audit historique conserve la transcription initiale et son exemple à 10 kg.

## Corrections intégrées

| Médicament | Règle v0.9 |
| --- | --- |
| Chlorure de calcium | 20 mg/kg de chlorure, maximum 1 g = 10 mL ; IVD |
| Gluconate de calcium 10 % | ERC : 0,5 mL/kg, maximum 20 mL de produit. Prélèvement seul tant que dilution et durée ne sont pas précisées ; aucune conversion en calcium élément |
| Amoxicilline/acide clavulanique | 80 mg/kg/j d’amoxicilline ÷ 3, puis arrondi à la dizaine de mg supérieure ; maximum antérieur de 2 g conservé ; flacon 500 mg/50 mg |
| Sulfate de magnésium | 1,5 g/10 mL = 15 %. Dose antérieure 50 mg/kg, maximum 2 g, IVL 20 min conservée ; volume prélevé distinct du volume dilué |
| Triphosadénine | Deux lignes : 1 mg/kg maximum 10 mg, puis 2 mg/kg maximum 20 mg |
| Insuline + G10 % | 0,1 UI/kg d’insuline rapide, maximum 10 UI, et 5 mL/kg de G10 %, maximum 250 mL, sur 30 min. Plafonds indépendants ; débit G10 % explicitement identifié |
| Étomidate | Aucun plafond de dose ; âge ≥ 24 mois conservé |
| Propofol | Aucun plafond ; 200 mg/20 mL. Ligne LISA à 0,5 mg/kg |
| Célocurine | Palier à 18 mois confirmé ; 100 mg/2 mL ; IVL sans durée ni vitesse |
| Atracurium bolus | 0,5 mg/kg pour tous ; 1 mL = 10 mg + 9 mL NaCl 0,9 %, soit 1 mg/mL et 0,5 mL/kg par dose |
| Clonazépam bolus | Maximum 1 mg ; ampoule seule sans solvant fourni ; IVL 10 min |
| Diazépam IR | Maximum 10 mg |
| Phénobarbital | Maximum 600 mg ; IVL 20 min |
| Lévétiracétam | 40 mg/kg, maximum 3 g ; 500 mg/5 mL ; IVL 5 min |
| Phénytoïne | Maximum 1 g ; NaCl 0,9 % ; IVL 20 min |
| SSH | 7,5 % ; IVL 20 min ; aucun volume de contenant requis |
| Tranexamique, charge | Avant 10 ans : 20 mg/kg, plafond antérieur de 1 g conservé. Dès 10 ans : 1 g. NaCl 0,9 % ; dilution finale à préciser |
| Tranexamique, entretien | Avant 10 ans : 2 mg/kg/h sans durée imposée ; concentration finale à préciser. Dès 10 ans : 1 g sur 8 h = 125 mg/h ; préparation antérieure à 16 mL conservée avec NaCl 0,9 % |
| Caféine | Posologie et expression en citrate conservées ; aucun plafond ; IVL 20 min |
| Flumazénil | IVD ; plafond antérieur confirmé ; 1 mg/10 mL |
| Sugammadex | Aucun plafond ; 100 mg/mL, flacon 2 mL ; IVD |
| G10 % | Aucun plafond ; 10 g/100 mL sans volume de contenant requis ; IVD |
| Naloxone | 0,4 mg/1 mL ; maximum 2 mg ; IVD ; aucune répétition affichée |
| Atracurium IVSE | 0,5 mg/kg/h initialement ; concentration 1 mg/mL ; aucun plafond ni durée de seringue imposée |
| Clonazépam IVSE | 0,1 mg/kg, maximum 1 mg sur 6 h ; NaCl 0,9 % ; volume final antérieur de 6 mL conservé |
| Isoprénaline | Posologie maximale 2 mcg/kg/min |
| Midazolam IVSE | Aucun plafond ; ampoule 5 mg/mL, sans volume de contenant imposé |
| Morphine IVSE | PSE, sans PCA ni palier à trois mois. 20 mcg/kg/h initialement ; ampoule 10 mg/10 mL ; 0,1 mg/mL sous 10 kg, pur à 1 mg/mL dès 10 kg |
| Noradrénaline IVSE | Préparation antérieure 1 mg/50 mL conservée ; aucune capacité de seringue de 60 mL affichée |
| Nicardipine | Charge 10 à 20 mcg/kg ; entretien 0,5 à 5 mcg/kg/min ; aucun plafond de dose totale. 10 mg/10 mL + 40 mL NaCl 0,9 % |
| Salbutamol IVSE | < 21 kg : 5 mg + 45 mL NaCl ; 21 à < 42 kg : 10 mg + 40 mL ; ≥ 42 kg : 15 mg + 35 mL. Ampoules 5 mg/5 mL. Posologie 0,1 à 2 mcg/kg/min pour les trois concentrations |
| Sufentanil | **50 mcg/10 mL = 5 mcg/mL** ; aucun plafond de débit. Préparation antérieure à 1 mcg/mL conservée |
| Salbutamol nébulisé | Aucune répétition affichée |
| CGR, PFC, CPA | Aucune vitesse ni modalité transfusionnelle ajoutée. Volume prescrit et limite antérieure d’une poche conservés |

Le bolus d’atracurium est exprimé en mL/kg **par dose** ; mL/kg/h s’applique à l’IVSE. L’amoxicilline/clavulanate est calculée en amoxicilline, sans addition des 50 mg d’acide clavulanique aux 500 mg.

## Pas de réglage à fournir

Les commandes +/− sont en place dans les deux vues, avec recalcul du débit à concentration constante et contrôle des bornes. Les pas restent absents jusqu’à la réponse de l’utilisateur. Les valeurs des tests ne sont pas des réglages cliniques.

| Réglage | Unité du pas | Limite explicite |
| --- | --- | --- |
| Adrénaline IVSE | mcg/kg/min | — |
| Alprostadil | ng/kg/min | — |
| Atracurium IVSE | mg/kg/h | Aucun plafond demandé |
| Clonazépam IVSE | mg/kg sur 6 h | 1 mg total sur 6 h |
| Dobutamine | mcg/kg/min | — |
| Dopamine | mcg/kg/min | — |
| Isoprénaline | mcg/kg/min | Maximum 2 |
| Midazolam IVSE | mcg/kg/min | Aucun plafond demandé |
| Morphine IVSE | mcg/kg/h | — |
| Noradrénaline IVSE | mcg/kg/min | — |
| Nicardipine, charge | mcg/kg | 10 à 20 |
| Nicardipine, entretien | mcg/kg/min | 0,5 à 5 |
| Salbutamol IVSE | mcg/kg/min | 0,1 à 2 |
| Sufentanil | mcg/kg/h | Aucun plafond demandé |
| Tranexamique avant 10 ans | mg/kg/h | Concentration finale encore nécessaire pour le débit |
| Tranexamique dès 10 ans | mg/h | Schéma initial 125 mg/h pendant 8 h |

Adrénaline, noradrénaline, dopamine et dobutamine démarrent au débit local poids/3. Le réglage part de la dose exacte délivrée avec cette concentration. Le clonazépam conserve la concentration initialement préparée afin que le changement de posologie modifie réellement le débit.

## Points encore ouverts

- Gluconate : spécialité exacte, dilution finale et durée. Le calcul utilise le volume de produit à 10 % ; la teneur exacte en sels ou calcium élément dépend de la spécialité.
- Insuline rapide : concentration nécessaire pour son prélèvement. Dose en UI et volume/débit du G10 % sont calculables indépendamment.
- Tranexamique avant 10 ans : concentration finale de l’entretien ; les mg/h sont calculés sans inventer de débit. La dilution finale de la charge reste également à préciser.
- Magnésium, phénobarbital, lévétiracétam : prélèvement distinct du volume après dilution lorsque celui-ci n’est pas renseigné.
- Atracurium IVSE : conditionnement disponible à préciser ; cible 1 mg/mL. La présentation historique 50 mg/5 mL reste « à confirmer » dans les ampoules.
- Nicardipine, charge : durée d’administration non fournie.
- Questions antérieures : plafonds de kétamine analgésique (80 mg), atracurium bolus (30 mg), midazolam IJ (10 mg), autres points de leurs fiches. Ces plafonds sont appliqués uniquement dans la simulation marquée †, conformément au fonctionnement antérieur.

## Références ciblées

Consultées le 26 septembre 2026 :

- [ERC 2025, Paediatric Life Support](https://www.erc.edu/media/03xnpjmj/gl2025-09-pls-e.pdf), hyperkaliémie : gluconate 10 % 0,5 mL/kg (maximum 20 mL) ; insuline 0,1 UI/kg (maximum 10 UI) avec glucose 10 % 5 mL/kg (maximum 250 mL) sur 30 min.
- [BDPM, gluconate de calcium PROAMP 10 %](https://base-donnees-publique.medicaments.gouv.fr/medicament/68332774/extrait) : composition et dilution spécifiques. Cette spécialité n’est pas supposée être celle du stock sans confirmation.

Les 67 tests logiciels, le contrôle des ampoules et ces références ciblées ne valident pas l’ensemble du protocole. La relecture clinique/pharmaceutique, le contrôle visuel de l’application et les essais en situation de soins restent à réaliser.
