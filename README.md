# PediDoses — version Atelier · Bleu clinique

Version publiée de l’Atelier **10**, style **Bleu clinique**, reprise à l’identique depuis le commit `d68ca1f39be9b2a079687f0a65907d8f8588f123`.

Adresse conservée : https://guillaumeferraro-gif.github.io/PediDoses/

Le dossier `dist/` contient exactement l’application validée dans l’Atelier, avec le marqueur GitHub Pages `.nojekyll`. Les textes « Atelier / Test » et les mentions de validation clinique sont conservés. Aucun paramètre clinique ni aucune disposition n’a été modifié pour ce transfert.

La visualisation est l’écran d’entrée. Elle reprend les cartes, les détails compacts et les styles de la vue PediDose existante. Les anciens onglets Calculs rapides / Administration sont supprimés. Un bouton Administration, en haut à droite, ouvre la gestion en six cartes ; Visualisation permet de revenir. Les deux écrans restent montés pour conserver le patient en mémoire, la recherche et les détails ouverts. Les réglages enregistrés sont transmis au lecteur, les brouillons restent dans l’administration.

## Périmètre

- 65 fiches issues d'une copie figée de PediDose au commit b9e503ddad8e870c143c45f8562c4afdb926c861.
- Six cartes : Posologie ; Options ; Conditions particulières ; Préparation ; Administration ; Relecture. Le nom et le groupe restent en en-tête. La dose maximale affiche son unité à côté du champ.
- Bouton Nouveau médicament : création complète sans code et affectation directe d’une ampoule, ou affectation ultérieure depuis Ampoules. Le nom, l’unité et la dose sont obligatoires ; aucune posologie n’est inventée. Le calcul reste suspendu tant que l’ampoule manque.
- Affectation bidirectionnelle : sélectionner une ampoule compatible dans une fiche médicament, ou cocher les usages dans une fiche ampoule. Une seule relation stockée, visible dans les deux écrans. Les caractéristiques de l’ampoule restent en lecture seule depuis le médicament et se modifient dans Ampoules.
- Espace Ampoules indépendant : créer une présentation, modifier sa quantité / son volume et cocher les médicaments qui l’utilisent. Une réaffectation remplace l’ancienne ampoule de l’usage. Retirer une affectation suspend le calcul jusqu’à ce qu’une ampoule soit de nouveau affectée.
- Quatre options à cocher, dont les champs sont masqués lorsqu’elles sont désactivées : doses successives ; doses selon l’âge ou le poids ; administration continue ; boutons + / −.
- De 2 à 10 doses successives, chacune avec sa valeur et son plafond.
- De 2 à 10 tranches d’âge (mois) ou de poids (kg). Les limites sont communes à la dose et à la préparation lorsqu’elles varient toutes deux. Une seule dimension par jeu de seuils ; les essais antérieurs combinant des axes indépendants sont conservés avec leurs éditeurs existants.
- Préparation propre à chaque tranche, avec Ajouter un seuil et des bornes inférieures incluses / supérieures exclues. L’aperçu montre la tranche appliquée.
- Boutons + / − dans l’aperçu, avec pas, limites et confirmation des dépassements du seuil d’avertissement. L’essai ne modifie pas la posologie enregistrée.
- Les tranches peuvent se combiner avec les doses successives ou le continu ; continu et doses successives restent distincts.
- Changer du ponctuel au continu exige une nouvelle posologie ; la valeur précédente n’est jamais interprétée silencieusement avec une période différente.
- Aperçu compact, patient d'essai, cas usuels et limites d'âge/poids.
- Enregistrement atomique, comparaison avant/après, remise à relire, historique et restauration.
- Sauvegarde locale indépendante, export/import JSON et réinitialisation.

Les réglages effectués dans l’interface ne modifient pas le dépôt GitHub ni une autre installation de PediDose. Il ne transmet aucune donnée patient. Les patients de visualisation et d’essai ne sont pas persistés. Les versions et relectures restent propres à ce navigateur ; exporter le JSON pour transférer les essais.

## Fonctionnement

Ouvrir une fiche, modifier les paramètres, contrôler l'aperçu puis choisir **Enregistrer la fiche**. Une présentation partagée affiche les usages concernés avant confirmation. Les paramètres sont conservés uniquement après validation et réussite de l'écriture locale.

La rubrique **Ampoules** contient l’édition des ampoules et leurs affectations. Chaque usage affiche aussi un sélecteur d’affectation et un résumé des caractéristiques en lecture seule. Changer une affectation ne modifie ni l’ampoule ni les autres usages. **Historique** permet le retour à la version précédente ; une restauration incompatible avec des modifications ultérieures est bloquée.

Les textes de posologie et de préparation sont générés. Les consignes particulières libres importées sont conservées et explicitement signalées comme à vérifier lors d'un changement de règle.

## Vérification

Exécuter :

    npm test
    npm run check

90 tests vérifient notamment la comparaison des 65 fiches sur quatre contextes avec le moteur original, la propagation des présentations, les modifications isolées, les unités, les préparations, les paliers, la relecture, la restauration et la sauvegarde.

Les modules dist/engine proviennent de la copie des sources PediDose. Le validateur local a été étendu pour les nouveaux médicaments et pour contrôler les préparations dans leurs tranches applicables ; le moteur arithmétique copié reste inchangé. Les tests arithmétiques ne constituent pas une validation clinique. Interface d'essai hors usage clinique.

Les sauvegardes v1 à v3 sont reprises automatiquement en v4, y compris les doses successives, les seuils existants et l’historique. Les nouvelles valeurs mensuelles des repères sont laissées vides. Le stockage reste distinct de PediDose.

Des contrôles de script vérifient le rendu HTML des 65 fiches (six cartes et absence d’identifiants dupliqués), l’affichage conditionnel, la création depuis l’interface, les affectations dans les deux sens, la mise à jour du lecteur après enregistrement et le parcours complet avec conservation du patient / de la recherche / des fiches ouvertes, y compris annulation d’un retour navigateur avec brouillon. Ils ne remplacent pas un test navigateur. La vérification visuelle mobile / tablette n’a pas pu être réalisée : le relais d’aperçu local est indisponible.

## Déploiement

Application statique sans dépendance à installer. Le déploiement GitHub Pages existant est conservé, avec la même adresse et le même dossier `dist`. La configuration d’hébergement privée de l’Atelier n’est pas copiée dans ce dépôt.

- `npm run check` et `npm test` vérifient les sources avant publication.
- `npm start` ouvre un serveur local sur http://localhost:8080.
- La publication reste manuelle : Actions → **Publier la démonstration sur GitHub Pages** → **Run workflow**, branche `main`. Relancer un ancien workflow republierait son ancien commit.

Le stockage des réglages est propre au navigateur et à l’origine du site : les réglages personnalisés de l’Atelier ne sont pas automatiquement transférés sur GitHub Pages. Utiliser l’export/import JSON existant si nécessaire. Les anciennes sauvegardes du site GitHub restent présentes ; elles ne sont ni effacées ni converties silencieusement dans le nouveau format.

Les documents `CLINICAL-SCOPE.md`, `REVUE-DU-TABLEAU.md` et `TABLEAU-IMPORTE.md` sont conservés comme historique du référentiel initial ; le comportement actuel est décrit ici et couvert par les tests de l’Atelier.

## Vue de lecture

Les styles `dist/visual/styles.css` et `dist/visual/smur.css`, le composant de réglage de dose et la structure des cartes proviennent de la vue existante. `dist/visual/data.js` adapte uniquement les données sauvegardées (nouvelles fiches, affectations, doses successives et tranches) à cette vue. `dist/navigation.js` gère les deux écrans et le retour navigateur, avec protection des brouillons. Les styles d’administration et de visualisation sont activés séparément pour éviter de modifier la présentation d’origine.


## Impression compacte en portrait (v6)

Le bouton **Imprimer recto verso** imprime les médicaments actuellement affichés (recherche, groupe et visibilité liée à l’âge conservés). La feuille est dédiée à l’impression : les cartes et les détails ouverts à l’écran ne sont pas modifiés. Les données patient restent uniquement en mémoire.

- A4 portrait, marges de 7 mm ; choisir le recto verso **bord long**, l’échelle 100 % et désactiver les en-têtes / pieds de page du navigateur.
- Deux faces pour les 65 fiches initiales, y compris le bandeau des repères au recto ; une seule ligne par médicament. La répartition des lignes est calculée selon la sélection et la place disponible. Les sections ont un bandeau contrasté, des titres plus grands en gras et un léger espacement entre groupes.
- Colonnes : médicament / usage, dose calculée, ampoule et préparation, volume / débit à administrer, voie / durée. Le recto commence directement par les repères vitaux / sondes, puis le tableau. Le verso commence par les colonnes du tableau. L’en-tête d’identification (titre, pagination, poids, âge, date et nombre de médicaments) est supprimé sur les deux faces, sans espace vide réservé.
- Les résultats proviennent des calculs de la visualisation, y compris les paliers, doses successives, plafonds et réglages temporaires. Les valeurs manquantes restent signalées ; aucune dose n’est remplacée par une valeur supposée.
- Les rappels généraux (flash, rinçage standard, mode synchrone) restent dans la fiche à l’écran et sont omis sur papier. Les durées, y compris « 2 à 3 min », et les autres consignes personnalisées restent conservées.
- La préparation conserve le volume de produit et le volume de diluant, sans afficher le résultat de leur somme. Le volume réellement à administrer reste dans sa colonne. Les zéros décimaux redondants sont masqués sans changer les arrondis ; une flèche sépare les doses successives. Les plafonds restent appliqués aux valeurs calculées, sans symbole de renvoi.
- La feuille est une synthèse : les précautions et points de relecture restent consultables dans la fiche complète à l’écran. Les pieds de page et leurs symboles de renvoi sont supprimés.
- Les présentations personnalisées très longues peuvent occuper plusieurs lignes dans une même rangée ; un catalogue agrandi peut demander davantage de pages. Aucune donnée n’est coupée pour forcer deux faces. Une consigne dépassant à elle seule la hauteur d’une page bloque l’impression avec un message explicite.

`dist/visual/print-data.js` projette les données sans recalcul clinique. `print-layout.js` pagine le tableau en dimensions physiques et produit des pages SVG vectorielles réservées au média impression. La pagination tient compte de la hauteur différente du recto et du verso, ainsi que de l’espacement des sections ; aucun titre de section ne reste isolé en bas de page. Les lignes sont plus espacées que dans l’ancienne feuille paysage. Les deux polices DejaVu Sans Condensed sont embarquées avec leurs métriques et leur licence ; le bouton attend leur chargement. Aucun service externe n’est utilisé.

Contrôles : 65 lignes, deux pages, une ligne par fiche et aucun débordement de texte pour des poids de 0,5 à 200 kg (cas sélectionnés), nouveau-né / adolescent / âge absent ; concordance avec les résultats existants, filtrage, données invalides, seuils, affectations, doses successives identiques et conservation de l’état après impression. Le rendu PDF de contrôle, produit depuis les mêmes opérations de mise en page et les mêmes polices, a été inspecté sur les deux pages A4 portrait. La boîte d’impression native et le rendu propre à chaque navigateur restent à vérifier : le relais d’aperçu navigateur est indisponible dans cet environnement.


## Repères vitaux et intubation (v6)

**Administration → Repères vitaux** propose 12 tranches indépendantes : de 0 à moins de 1 mois, puis jusqu’à 11 à moins de 12 mois. Chaque tranche contient la TAm et sa limite inférieure, la TAs et sa limite inférieure, les diamètres internes des sondes avec et sans ballonnet. Les diamètres mensuels sont proposés de 3,0 à 8,0 mm par pas de 0,5. Aucune valeur infantile n’est préremplie, interpolée ou reprise d’un mois voisin. Une valeur vide reste « À renseigner » à l’écran et à l’impression.

Dès 12 mois, l’âge exact en années (mois / 12) est utilisé, sans tronquer aux années révolues :

| Repère | Référence | Limite inférieure |
| --- | --- | --- |
| TAm (mmHg) | 55 + 1,5 × âge | 45 + 1,5 × âge |
| TAs (mmHg) | 90 + 2 × âge | 70 + 2 × âge |
| Sonde avec ballonnet, DI (mm) | âge / 4 + 3 par défaut | — |
| Sonde sans ballonnet, DI (mm) | âge / 4 + 4 | — |

Les constantes des pressions et de la sonde sans ballonnet suivent la demande locale. La constante de la sonde avec ballonnet est sélectionnable entre + 3 (valeur demandée) et + 3,5 dans le volet des formules. L’administration précise que l’ERC 2025 indique + 3,5 jusqu’à 8 ans : https://www.erc.edu/media/03xnpjmj/gl2025-09-pls-e.pdf. La formule locale + 3 n’est pas présentée comme une recommandation ERC. Aucune valeur calculée n’est plafonnée à 8 mm : la plage 3–8 concerne uniquement le sélecteur mensuel, conformément à la demande.

Les pressions affichent au plus une décimale, les diamètres théoriques deux, avec « ≈ » si le résultat affiché est arrondi. Aucun calibre de sonde n’est choisi automatiquement. Les calculs internes conservent toute leur précision. Le poids seul ne permet pas de déduire un âge ; en cas d’âge absent, de saisie invalide ou de sauvegarde illisible, aucun repère numérique ancien ou supposé n’est affiché.

Les changements restent en brouillon jusqu’à l’enregistrement confirmé. Le retour à la visualisation et la fermeture protègent les modifications non enregistrées ; une saisie invalide est conservée lorsqu’on change de mois. Sauvegarde, import/export et restauration incluent les repères. Leur historique est indépendant de celui des médicaments et des ampoules : restaurer les repères ne rétablit pas d’anciennes posologies. Aucun âge ni poids patient n’est persisté.

`dist/clinical-references.js` centralise validation, formules et libellés communs à l’écran et au papier. `dist/reference-ui.js` gère l’édition. Le bandeau imprimé ajoute 40 points au recto ; les dimensions des médicaments et les sections restent conservées. Les tests couvrent les mois 0, 11,999 et 12, les âges fractionnaires, les deux unités d’âge, les valeurs absentes, les bornes des diamètres, la migration, les échecs de stockage, les restaurations, les parcours d’interface et l’absence de débordement sur deux pages pour 65 médicaments. Le PDF issu des mêmes opérations et polices a été inspecté sur les deux faces. Le relais d’aperçu étant indisponible, le rendu de l’interface et la boîte d’impression native restent à vérifier dans un navigateur.
