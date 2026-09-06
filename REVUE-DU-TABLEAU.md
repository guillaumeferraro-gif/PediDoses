# Relecture du tableau importé — FR-IMPORT-1

Source : tableau fourni dans cette conversation ; France confirmée. Protocole original daté et établissement non fournis. Vérification ciblée effectuée le 6 septembre 2026.

**Ce document contrôle la cohérence de la transcription. Il ne valide pas des prescriptions.** Les valeurs originales restent conservées dans l’application et dans `TABLEAU-IMPORTE.md`.

## Hypothèse de poids

Les comparaisons utilisent 10 kg, poids déduit de plusieurs correspondances dose/kg → dose totale. Ce poids n’est pas confirmé, et aucune projection sur un autre poids patient n’est proposée.

## Cinq écarts numériques

| Ligne | Valeur fournie | Calcul de contrôle à 10 kg présumés | Constat |
| --- | --- | --- | --- |
| Atropine | 0,8 mL à 0,5 mg/mL | 200 mcg = 0,2 mg ; 0,2 / 0,5 = **0,4 mL** | Le volume source est le double du volume arithmétique |
| Adrénaline IVC | 3,3 mL/h | 1 mg dans 50 mL = 20 mcg/mL ; cible source = 60 mcg/h ; **3 mL/h** | Écart de +10 % ; 3,3 mL/h correspond arithmétiquement à 0,11 mcg/kg/min |
| Dobutamine | 3,3 mL/h | 50 mg dans 50 mL = 1 mg/mL ; cible source = 3 mg/h ; **3 mL/h** | Écart de +10 % |
| Dopamine | 3,3 mL/h | 50 mg dans 50 mL = 1 mg/mL ; cible source = 3 mg/h ; **3 mL/h** | Écart de +10 % |
| Salbutamol IVC | 0,2 mL/h | 10 mg dans 40 mL = 250 mcg/mL ; cible source = 60 mcg/h ; **0,24 mL/h** | Le débit source donne environ 0,0833 mcg/kg/min, soit −16,7 % par rapport à la cible écrite ; règle d’arrondi et pompe à préciser |

Ces calculs ne sont pas des débits ou volumes recommandés. Ils supposent les concentrations et fractions actives écrites, sans évaluer indications, plafonds, voies ou modalités d’administration. La [fiche française de l’atropine à 0,5 mg/mL](https://base-donnees-publique.medicaments.gouv.fr/medicament/67839899/extrait) permet de vérifier la concentration ; elle ne valide pas la posologie pédiatrique du tableau.

## Informations empêchant un calcul

| Ligne | Point à résoudre |
| --- | --- |
| SSH 7,5 % | La mention « dont 10 mL de NaCl 10 % » ne décrit pas une préparation finale complète et vérifiable |
| Caféine | Dose exprimée en citrate ou en caféine base ; spécialité et population à préciser |
| Noradrénaline | Spécialité et expression de la concentration et de la dose en tartrate ou en base à préciser |
| Salbutamol nébulisé | Volume sans dose par kg, âge ni fréquence ; aucune extrapolation |
| Gluconate de calcium | Présentation absente, expression « Ca2+ / 20 mg/kg » ambiguë ; sel et calcium élément à distinguer |
| Insuline + G5 % | Présentation de l’insuline, volume final et protocole insuline/glucose non documentés |

Les volumes des résines ne sont pas recalculés : un volume de diluant ajouté à une poudre ne définit pas automatiquement le volume final d’une suspension. Les antibiotiques ne sont pas convertis en volumes sans concentration après reconstitution ; dose par administration ou par jour, indication et intervalle restent à préciser.

## Autres points conservés dans l’interface

- Adrénaline IM : classée dans ACR dans la source ; indication et voie à examiner séparément.
- Étomidate : restriction source strictement au-delà de 2 ans ; âge de l’exemple inconnu.
- Kétamine « intubation » : 4 mg/kg conservés sans substitution. Le [RCP Kétamine Panpharma](https://base-donnees-publique.medicaments.gouv.fr/medicament/69278297/extrait), section 4.2, distingue voies et contextes d’administration ; le protocole pédiatrique local reste nécessaire. Aucune erreur de dose n’est affirmée sur cette seule ligne.
- Midazolam « IJ » et morphine « DC » : abréviations non développées dans la source.
- Clonazépam IVC : période de 6 heures conservée, convertie en quantité horaire uniquement pour l’audit.
- Nicardipine : débit et posologie dans des colonnes décalées ; lecture numérique explicitée et cellules sources inchangées.
- Phénytoïne, lévétiracétam et phénobarbital : reconstitution, dilution et modalités d’administration à documenter. « Non » n’est pas une consigne d’injection directe.

## Références françaises ciblées

Le [RCP Citrate de caféine Cooper](https://base-donnees-publique.medicaments.gouv.fr/medicament/65973294/extrait), sections 2 et 4.2, distingue citrate et base : 25 mg/mL de citrate correspondent à 12,5 mg/mL de caféine base ; l’expression de la prescription doit être explicite. Ce contrôle ne valide pas une indication pour le cas de 10 kg présumé.

La [fiche Noradrénaline Renaudin 2 mg/mL](https://base-donnees-publique.medicaments.gouv.fr/medicament/64803855/extrait) identifie une présentation en tartrate ; elle ne permet pas d’affirmer quelle spécialité ni quelle fraction active l’auteur du tableau utilisait.

Les fiches du [gluconate de calcium Proamp](https://base-donnees-publique.medicaments.gouv.fr/medicament/68332774/extrait) et du [chlorure de calcium Renaudin](https://base-donnees-publique.medicaments.gouv.fr/medicament/62914134/extrait) concernent des produits distincts. Une conversion de doses ne peut pas reposer uniquement sur la mention « 10 % ».

Ces références servent à une relecture ciblée, pas à une validation exhaustive des 63 lignes. Document daté du service et relecture clinique et pharmaceutique restent à obtenir.
