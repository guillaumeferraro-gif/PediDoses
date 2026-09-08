/** Transcription du tableau fourni dans la conversation. Aucune validation clinique. */
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const catalogMeta = freeze({
  jurisdiction: 'France', version: 'FR-IMPORT-1', importedAt: '2026-09-06',
  source: 'Tableau transmis dans cette conversation', sourceDate: null,
  institution: null, validation: 'pending', referenceWeightKg: 10,
  weightStatus: 'inferred',
  weightNote: 'Hypothèse de contrôle : 10 kg, déduite des doses totales du tableau. Poids non confirmé par le document source.',
});

export const categories = freeze([
  ['acr', 'ACR'], ['antibiotiques', 'Antibiotiques'], ['cardio', 'Cardio'],
  ['sedation', 'Sédation / curares'], ['neuro', 'Neuro'], ['antidotes', 'Antidotes / G10 / Exacyl'],
  ['ivc', 'Perfusions IV continues'], ['hyperkaliemie', 'Hyperkaliémie'], ['transfusion', 'Transfusion'],
].map(([id, label]) => ({ id, label })));

export const reviewSources = freeze({
  atropine: { title: 'BDPM · Atropine sulfate Renaudin 0,5 mg/mL', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/67839899/extrait' },
  cafeine: { title: 'BDPM · Citrate de caféine Cooper 25 mg/mL', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/65973294/extrait' },
  noradrenaline: { title: 'BDPM · Noradrénaline Renaudin 2 mg/mL', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/64803855/extrait' },
  ketamine: { title: 'BDPM · Kétamine Panpharma 50 mg/mL', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/69278297/extrait' },
  calcium: { title: 'BDPM · Gluconate de calcium Proamp 10 %', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/68332774/extrait' },
  calciumChlorure: { title: 'BDPM · Chlorure de calcium Renaudin 10 %', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/62914134/extrait' },
});

const stock = (amount, unit, volumeMl = 1) => ({ amount, unit, volumeMl });
const mix = (takeMl, addMl) => ({ takeMl, addMl });
const dose = (coefficient, unit, solution = null, dilution = null, referenceVolume = null, decimals = null, referenceDose = null) => ({
  type: 'dose', coefficient, unit, stock: solution, mix: dilution,
  referenceVolume, decimals, referenceDose,
});
const infusion = (coefficient, unit, periodMinutes, solution, dilution, referenceRate) => ({
  type: 'infusion', coefficient, unit, periodMinutes, stock: solution, mix: dilution, referenceRate,
});
const issue = (code, message, source = null) => ({ code, message, source });
const record = (id, category, name, cells, model, issues = []) => ({
  id, category, name, sourceCells: cells, model, issues,
  kind: 'imported', validation: 'pending', maximumDose: null,
});
const antibioticIssue = () => issue('antibiotic-context', 'Indication, dose par administration ou par jour, intervalle, dose maximale et concentration après reconstitution non précisés. Ne pas déduire une prescription de cette ligne.');

export const catalogRecords = freeze([
  record('adrenaline-iv', 'acr', 'Adrénaline IV', ['Adrénaline 1 mg/mL', '10 mcg/kg', '1 mL + 9 mL NaCl 0.9%', '1,0 mL', '', '100 mcg'], dose(10, 'mcg', stock(1, 'mg'), mix(1, 9), 1, 1, 100)),
  record('adrenaline-im', 'acr', 'Adrénaline IM', ['Adrénaline 1 mg/mL', '10 mcg/kg', 'non', '0,10 mL', '', '100 mcg'], dose(10, 'mcg', stock(1, 'mg'), null, .1, 2, 100), [issue('im-in-acr', 'La voie IM figure dans la rubrique ACR. L’indication doit être explicitée séparément ; aucune indication ni séquence thérapeutique n’est déduite de ce classement.')]),
  record('bicarbonate-acr', 'acr', 'Bicarbonate de sodium', ['Bicarbonate 4,2%', '1 mmol/kg', 'non', '20,0 mL', '', '10,0 mmol'], dose(1, 'mmol', stock(.5, 'mmol'), null, 20, 1, 10), [issue('specific-indication', 'L’indication précise du bicarbonate dans cette rubrique doit être documentée ; ce classement ne signifie pas une administration systématique.')]),
  record('calcium-chlorure', 'acr', 'Chlorure de calcium', ['Chlorure de calcium 10%', '20 mg/kg', 'non', '2,0 mL', '', '200 mg'], dose(20, 'mg', stock(100, 'mg'), null, 2, 1, 200), [issue('calcium-basis', 'Le contrôle suppose des mg de chlorure de calcium, et non des mg de calcium élément. Confirmer cette expression de dose et l’indication.', 'calciumChlorure')]),
  record('cardioversion', 'acr', 'Cardioversion', ['', '1 J/kg', '', '10 J', '', ''], dose(1, 'J', null, null, null, null, 10), [issue('procedure-context', 'Geste électrique, pas un médicament. Rythme, synchronisation, séquence de chocs et plafond d’énergie à documenter.')]),
  record('defibrillation', 'acr', 'Défibrillation', ['', '4 J/kg', '', '40 J', '', ''], dose(4, 'J', null, null, null, null, 40), [issue('procedure-context', 'Geste électrique, pas un médicament. Rythme, séquence de chocs et plafond d’énergie à documenter.')]),

  record('gentamicine', 'antibiotiques', 'Gentamicine', ['', '5 mg/kg', 'à passer en 30 min', '', '', '50,0 mg'], dose(5, 'mg', null, null, null, null, 50), [antibioticIssue()]),
  record('amoxicilline', 'antibiotiques', 'Amoxicilline', ['', '100 mg/kg', '', '', '', '1000 mg'], dose(100, 'mg', null, null, null, null, 1000), [antibioticIssue()]),
  record('amoxicilline-clavulanique', 'antibiotiques', 'Amoxicilline / acide clavulanique', ['', '80 mg/kg', '', '', '', '800 mg'], dose(80, 'mg', null, null, null, null, 800), [antibioticIssue(), issue('combination-basis', 'Préciser si les mg concernent l’amoxicilline et indiquer le rapport amoxicilline/acide clavulanique de la présentation.')]),
  record('cefotaxime', 'antibiotiques', 'Céfotaxime', ['', '75 mg/kg', '', '', '', '750 mg'], dose(75, 'mg', null, null, null, null, 750), [antibioticIssue()]),
  record('ceftriaxone', 'antibiotiques', 'Ceftriaxone', ['', '100 mg/kg', '', '', '', '1000 mg'], dose(100, 'mg', null, null, null, null, 1000), [antibioticIssue()]),

  record('amiodarone', 'cardio', 'Amiodarone', ['Cordarone 150 mg/3 mL', '5 mg/kg', '3 mL + 17 mL de G5%', '6,7 mL', '', '50,0 mg'], dose(5, 'mg', stock(150, 'mg', 3), mix(3, 17), 6.7, 1, 50)),
  record('atropine', 'cardio', 'Atropine', ['Atropine 0.5 mg/mL', '20 mcg/kg', 'non', '0,8 mL', '', '200 mcg'], dose(20, 'mcg', stock(.5, 'mg'), null, .8, 1, 200), [issue('atropine-volume', 'Pour l’hypothèse de 10 kg : 200 mcg = 0,2 mg ; 0,2 ÷ 0,5 = 0,4 mL. Le tableau affiche 0,8 mL. La valeur d’origine reste conservée, sans correction clinique automatique.', 'atropine')]),
  record('hydrocortisone', 'cardio', 'Hydrocortisone', ['Hydrocort 100 mg/2 mL', '2 mg/kg', '2 mL + 8 mL NaCl 0.9%', '2,0 mL', '', '20,0 mg'], dose(2, 'mg', stock(100, 'mg', 2), mix(2, 8), 2, 1, 20)),
  record('magnesium', 'cardio', 'Sulfate de magnésium', ['Sulfate magnéisum 15%', '50 mg/kg', 'non', '3,3 mL', '', '500 mg'], dose(50, 'mg', stock(150, 'mg'), null, 3.3, 1, 500), [issue('salt-basis', 'Le contrôle interprète 15 % comme 150 mg/mL de sel et la dose en mg de sulfate de magnésium. Confirmer l’expression de la dose, la présentation et la durée d’administration.')]),
  record('triphosadenine', 'cardio', 'Triphosadénine', ['Striadyne 20 mg/2 mL', '1 mg/kg', 'non', '1,0 mL', '', '10,0 mg'], dose(1, 'mg', stock(20, 'mg', 2), null, 1, 1, 10), [issue('atp-not-adenosine', 'Vérifier le protocole propre à la triphosadénine (ATP), sans substitution par un schéma d’adénosine ; bolus, répétitions et dose maximale non précisés.')]),

  record('etomidate', 'sedation', 'Étomidate (> 2 ans)', ['Hypnomidate 20 mg/10 mL', '0,3 mg/kg', 'non', '1,50 mL', '', '3,00 mg'], { ...dose(.3, 'mg', stock(20, 'mg', 10), null, 1.5, 2, 3), minimumAgeMonthsExclusive: 24 }, [issue('age-restriction', 'Restriction transcrite : âge strictement supérieur à 2 ans. L’âge du cas de référence n’est pas fourni ; l’éligibilité n’est pas vérifiée.')]),
  record('ketamine-analgesie', 'sedation', 'Kétamine (analgésie)', ['Ketamine 250 mg/5 mL', '0,5 mg/kg', '1 mL + 9 mL NaCl 0,9%', '1,00 mL', '', '5,0 mg'], dose(.5, 'mg', stock(250, 'mg', 5), mix(1, 9), 1, 2, 5), [issue('ketamine-context', 'Confirmer le protocole pédiatrique, la voie et la vitesse d’administration pour l’analgésie.', 'ketamine')]),
  record('ketamine-intubation', 'sedation', 'Kétamine (intubation)', ['Ketamine 250 mg/5 mL', '4 mg/kg', '2 mL + 8 mL NaCl 0,9%', '4,0 mL', '', '40,0 mg'], dose(4, 'mg', stock(250, 'mg', 5), mix(2, 8), 4, 1, 40), [issue('ketamine-route', 'La dose de 4 mg/kg est transcrite telle quelle. Confirmer la voie, le protocole d’induction et le contexte avant toute utilisation ; elle n’est pas validée par ce contrôle arithmétique.', 'ketamine')]),
  record('midazolam-iv', 'sedation', 'Midazolam', ['Midazolam 5 mg/mL', '0,1 mg/kg', 'non', '0,20 mL', '', '1,00 mg'], dose(.1, 'mg', stock(5, 'mg'), null, .2, 2, 1)),
  record('morphine-dc', 'sedation', 'Morphine (DC)', ['Morphine 1 mg/mL', '0,1 mg/kg', 'non', '1,00 mL', '', '1,00 mg'], dose(.1, 'mg', stock(1, 'mg'), null, 1, 2, 1), [issue('dc-abbreviation', 'L’abréviation « DC », la voie et les modalités d’administration doivent être confirmées.')]),
  record('morphine-titration', 'sedation', 'Morphine (titration)', ['Morphine 1 mg/mL', '0,025 mg/kg', 'non', '0,25 mL', '', '0,25 mg'], dose(.025, 'mg', stock(1, 'mg'), null, .25, 2, .25), [issue('titration', 'Intervalle de titration, critères d’arrêt et dose cumulée maximale absents du tableau.')]),
  record('propofol', 'sedation', 'Propofol', ['Propofol 10 mg/mL', '2 mg/kg', 'non', '2,0 mL', '', '20,0 mg'], dose(2, 'mg', stock(10, 'mg'), null, 2, 1, 20)),
  record('suxamethonium', 'sedation', 'Suxaméthonium', ['Celocurine 50 mg/mL', '2 mg/kg', '1 mL + 4 mL NaCl 0,9%', '2,0 mL', '', '20,0 mg'], dose(2, 'mg', stock(50, 'mg'), mix(1, 4), 2, 1, 20)),
  record('atracurium-bolus', 'sedation', 'Atracurium', ['Atracurium 50 mg/5 mL', '0,6 mg/kg', 'non', '0,6 mL', '', '6,0 mg'], dose(.6, 'mg', stock(50, 'mg', 5), null, .6, 1, 6)),

  record('clonazepam-bolus', 'neuro', 'Clonazépam', ['Rivotril 1 mg/mL', '0,05 mg/kg', '1 mL + 4 mL NaCl 0,9%', '2,5 mL', '', '0,500 mg'], dose(.05, 'mg', stock(1, 'mg'), mix(1, 4), 2.5, 1, .5)),
  record('midazolam-ij', 'neuro', 'Midazolam (IJ)', ['Midazolam 5 mg/mL', '0,3 mg/kg', 'non', '0,60 mL', '', '3,0 mg'], dose(.3, 'mg', stock(5, 'mg'), null, .6, 2, 3), [issue('ij-route', 'La voie « IJ » n’est pas développée dans la source. Confirmer son sens et la formulation adaptée ; aucune voie IV ou buccale n’a été déduite.')]),
  record('diazepam-ir', 'neuro', 'Diazépam (IR)', ['Valium 10 mg/2 mL', '0,5 mg/kg', 'non', '1,0 mL', '', '5,0 mg'], dose(.5, 'mg', stock(10, 'mg', 2), null, 1, 1, 5)),
  record('phenobarbital', 'neuro', 'Phénobarbital', ['Gardenal 200 mg/4 mL', '20 mg/kg', 'non', '4,0 mL', '', '200 mg'], dose(20, 'mg', stock(200, 'mg', 4), null, 4, 1, 200), [issue('reconstitution', 'Vérifier la reconstitution, la concentration utilisable et la vitesse d’administration ; « non » ne documente pas ces modalités.')]),
  record('levetiracetam', 'neuro', 'Lévétiracétam', ['Keppra 100 mg/mL', '40 mg/kg', 'non', '4,0 mL', '', '400 mg'], dose(40, 'mg', stock(100, 'mg'), null, 4, 1, 400), [issue('levetiracetam-form', 'La forme pharmaceutique et la dilution pour administration ne sont pas précisées. Les 4 mL du tableau ne doivent pas être interprétés comme un volume à injecter directement.')]),
  record('phenytoine', 'neuro', 'Phénytoïne', ['Dilantin 250 mg/5 mL', '20 mg/kg', '5 mL + 5 mL NaCl 0.9%', '8,0 mL', '', '200 mg'], dose(20, 'mg', stock(250, 'mg', 5), mix(5, 5), 8, 1, 200), [issue('phenytoin-preparation', 'Concentration finale calculée : 25 mg/mL. Faire confirmer la dilution, la compatibilité, la voie et le débit par le protocole du service.')]),
  record('ssh', 'neuro', 'SSH 7,5 %', ['Chlorure sodium 7,5 %', '3 mL/kg', 'non', '30,0 mL', 'dont 10,0 mL de NaCl 10%', ''], { type: 'unresolved' }, [issue('ssh-mixture', 'La mention « dont 10 mL de NaCl 10 % » ne permet pas de reconstituer une préparation finale documentée à 7,5 %. Composition complète et volume final à préciser ; aucun volume de préparation n’est calculé.')]),

  record('tranexamique-bolus', 'antidotes', 'Acide tranexamique', ['Exacyl 0.5 g/5 mL', '10 mg/kg', 'non', '1,0 mL', '', '100 mg'], dose(10, 'mg', stock(.5, 'g', 5), null, 1, 1, 100)),
  record('cafeine', 'antidotes', 'Caféine', ['Citrate caféine 25 mg/mL', '20 mg/kg', 'non', '8,00 mL', '', '200 mg'], { type: 'unresolved' }, [issue('caffeine-basis', 'Préciser si la dose est exprimée en caféine base ou en citrate de caféine, ainsi que la présentation exacte et la population. Le volume n’est pas recalculé tant que cette distinction n’est pas résolue.', 'cafeine')]),
  record('flumazenil', 'antidotes', 'Flumazénil', ['Flumazenil 0,1 mg/mL', '10 mcg/kg', 'non', '1,0 mL', '', '100 mcg'], dose(10, 'mcg', stock(.1, 'mg'), null, 1, 1, 100)),
  record('sugammadex', 'antidotes', 'Sugammadex', ['Bridion 100 mg/mL', '2 mg/kg', '1 mL + 9 mL NaCl 0,9%', '2,0 mL', '', '20,0 mg'], dose(2, 'mg', stock(100, 'mg'), mix(1, 9), 2, 1, 20)),
  record('glucose10', 'antidotes', 'Glucose 10 %', ['Glucose 10 %', '2 mL/kg', 'non', '20,0 mL', '', '2000 mg'], { ...dose(2, 'mL', null, null, 20, 1), massPerMl: 100, massUnit: 'mg', referenceMass: 2000 }),
  record('naloxone', 'antidotes', 'Naloxone', ['Naloxone 0,4 mg/mL', '10 mcg/kg', '1 mL + 19 mL NaCl 0.9%', '5,0 mL', '', '100 mcg'], dose(10, 'mcg', stock(.4, 'mg'), mix(1, 19), 5, 1, 100)),

  record('tranexamique-ivc', 'ivc', 'Acide tranexamique', ['Exacyl 0,5g/5 mL', '8,0 mL', '8,0 mL', '2 mL/h', '= 10 mg/kg/h pendant 8h', ''], { ...infusion(10, 'mg', 60, stock(.5, 'g', 5), mix(8, 8), 2), durationHours: 8 }, [issue('missing-diluent', 'Le diluant des 8 mL à ajouter n’est pas nommé. La vérification numérique du mélange ne valide pas sa préparation.')]),
  record('adrenaline-ivc', 'ivc', 'Adrénaline', ['Adrénaline 1 mg/mL', '1,0 mL', '49,0 mL NaCl 0.9%', '3,3 mL/h', '= 0,1 mcg/kg/min', ''], infusion(.1, 'mcg', 1, stock(1, 'mg'), mix(1, 49), 3.3)),
  record('alprostadil', 'ivc', 'Alprostadil', ['Prostine 0,5 mg/mL', '1,0 mL', '49,00 mL de NaCl 0,9%', '3,0 mL/h', '= 50 ng/kg/min', ''], infusion(50, 'ng', 1, stock(.5, 'mg'), mix(1, 49), 3)),
  record('atracurium-ivc', 'ivc', 'Atracurium', ['Atracurium 10 mg/mL', '5,0 mL', '45,0 mL de NaCl 0,9%', '5,0 mL/h', '= 0,5 mg/kg/h', ''], infusion(.5, 'mg', 60, stock(10, 'mg'), mix(5, 45), 5)),
  record('clonazepam-ivc', 'ivc', 'Clonazépam', ['Rivotril 1 mg/mL', '1,0 mL', '5,0 mL de NaCl 0,9%', '1,0 mL/h', '= 0,1 mg/kg/6h', ''], infusion(.1, 'mg', 360, stock(1, 'mg'), mix(1, 5), 1), [issue('six-hour-unit', 'La posologie source est exprimée par 6 heures. Le contrôle la divise par 6 pour obtenir la quantité horaire ; elle n’est pas traitée comme 0,1 mg/kg/h.')]),
  record('dobutamine', 'ivc', 'Dobutamine', ['Dobutamine 250 mg/20 mL', '4,0 mL', '46,0 mL de NaCl 0,9%', '3,3 mL/h', '= 5,0 mcg/kg/min', ''], infusion(5, 'mcg', 1, stock(250, 'mg', 20), mix(4, 46), 3.3)),
  record('dopamine', 'ivc', 'Dopamine', ['Dopamine 50 mg/10 mL', '10,0 mL', '40,0 mL de NaCl 0,9%', '3,3 mL/h', '= 5,0 mcg/kg/min', ''], infusion(5, 'mcg', 1, stock(50, 'mg', 10), mix(10, 40), 3.3)),
  record('isoprenaline', 'ivc', 'Isoprénaline', ['Isuprel 0,2 mg/mL', '2,0 mL', '38,0 mL de NaCl 0,9%', '3,0 mL/h', '= 0,05 mcg/kg/min', ''], infusion(.05, 'mcg', 1, stock(.2, 'mg'), mix(2, 38), 3)),
  record('midazolam-ivc', 'ivc', 'Midazolam', ['Hypnovel 5 mg/mL', '4,0 mL', '16,0 mL de NaCl 0,9%', '1,2 mL/h', '= 2 mcg/kg/min', ''], infusion(2, 'mcg', 1, stock(5, 'mg'), mix(4, 16), 1.2)),
  record('morphine-ivc', 'ivc', 'Morphine', ['Morphine 1 mg/mL', '', 'Pas de dilution', '0,1 mL/h', '= 10 mcg/kg/h', ''], infusion(10, 'mcg', 60, stock(1, 'mg'), null, .1)),
  record('noradrenaline', 'ivc', 'Noradrénaline', ['Noradrenaline 2 mg/mL', '0,5 mL', '49,5 mL de NaCl 0,9%', '3,3 mL/h', '= 0,1 mcg/kg/min', ''], { type: 'unresolved' }, [issue('noradrenaline-basis', 'La spécialité et l’expression en base ou en tartrate ne sont pas précisées. Elles déterminent la concentration active. Le débit ne peut pas être validé ni recalculé sans cette information.', 'noradrenaline')]),
  record('nicardipine', 'ivc', 'Nicardipine', ['Loxen 10 mg/10 mL', 'Pas de dilution', '1,2 mL/h', '= 2 mcg/kg/min', '', ''], infusion(2, 'mcg', 1, stock(10, 'mg', 10), null, 1.2), [issue('shifted-columns', 'La ligne comporte un décalage de colonnes. Pour le seul contrôle numérique, « 1,2 mL/h » est lu comme le débit et « 2 mcg/kg/min » comme la posologie. Les cellules originales sont conservées.')]),
  record('salbutamol-ivc', 'ivc', 'Salbutamol', ['Salbutamol 5 mg/5 mL', '10 mL', '30,0 mL de NaCl 0,9 %', '0,2 mL/h', '= 0,1 mcg/kg/min', ''], infusion(.1, 'mcg', 1, stock(5, 'mg', 5), mix(10, 30), .2)),
  record('sufentanil', 'ivc', 'Sufentanil', ['Sufentanil 50 mcg/10 mL', '2 mL', '8,0 mL de NaCl 0,9%', '2,0 mL/h', '= 0,2 mcg/kg/h', ''], infusion(.2, 'mcg', 60, stock(50, 'mcg', 10), mix(2, 8), 2)),

  record('arret-potassium', 'hyperkaliemie', 'Arrêt des apports en potassium', ['', '', '', '', '', ''], { type: 'instruction' }),
  record('bicarbonate-hyperk', 'hyperkaliemie', 'Bicarbonate si acidose', ['Bicarbonate 4,2 %', '1 mmol/kg', 'Pas de dilution', '20 mL', '', '10 mmol'], dose(1, 'mmol', stock(.5, 'mmol'), null, 20, 0, 10)),
  record('salbutamol-nebulise', 'hyperkaliemie', 'Salbutamol nébulisé', ['Salbutamol 2,5 mg/2,5mL', '', '', '2,5 mL', '', ''], { type: 'unresolved' }, [issue('nebulised-dose', 'Le volume est donné sans dose par kg, âge, fréquence ni indication détaillée. Il ne peut pas être extrapolé au poids.')]),
  record('calcium-gluconate', 'hyperkaliemie', 'Gluconate Ca2+ 10 %', ['', '20 mg/kg', 'Pas de dilution', '4,0 mL', "IVL/20'", ''], { type: 'unresolved' }, [issue('gluconate-basis', 'Les mg de gluconate de calcium et les mg de calcium élément ne sont pas interchangeables. La présentation manque et 4 mL ne peut pas être rapproché sans ambiguïté de 20 mg/kg ; aucun volume n’est calculé.', 'calcium')]),
  record('insuline-glucose', 'hyperkaliemie', 'Insuline rapide + G5 %', ['', '4 mL/kg', 'G5 % 500 mL + 15 UI', '40 mL', "IVL/20'", ''], { type: 'unresolved' }, [issue('insulin-mixture', 'Présentation de l’insuline, volume final, protocole insuline/glucose et surveillance à préciser. Ne pas déduire une préparation d’insuline de cette seule ligne.')]),
  record('resikali-ir', 'hyperkaliemie', 'Resikali (IR)', ['Resikali 20 g/c-m', '1 g/kg', '40 g + 150 mL de G5 %', '38 mL', '', '10,0 g'], dose(1, 'g', null, null, null, null, 10), [issue('suspension-final-volume', 'Le volume final après ajout de la poudre n’est pas précisé. « 40 g + 150 mL » n’équivaut pas nécessairement à 150 mL de suspension finale ; le volume n’est pas calculé.')]),
  record('kayexalate-ir', 'hyperkaliemie', 'Kayexalate (IR)', ['Kayexalate 15 g/c-m', '1 g/kg', '15 g + 100 mL de G10 %', '67 mL', '', '10,0 g'], dose(1, 'g', null, null, null, null, 10), [issue('suspension-final-volume', 'Le volume final après ajout de la poudre n’est pas précisé. « 15 g + 100 mL » n’équivaut pas nécessairement à 100 mL de suspension finale ; le volume n’est pas calculé.')]),

  record('cgr', 'transfusion', 'CGR phénotypé', ['', '10 mL/kg', '', '100 mL', '', ''], dose(10, 'mL', null, null, 100, 0)),
  record('pfc', 'transfusion', 'PFC', ['', '10 mL/kg', '', '100 mL', '', ''], dose(10, 'mL', null, null, 100, 0)),
  record('cpa', 'transfusion', 'CPA', ['', '5 mL/kg', '', '50 mL', '', ''], dose(5, 'mL', null, null, 50, 0)),
]);
