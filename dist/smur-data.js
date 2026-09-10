import { catalogRecords, categories } from './catalog-data.js';

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const smurSources = freeze({
  isofundine: { title: 'BDPM · Isofundine, RCP', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/66312310/extrait#tab-rcp' },
  remplissage: { title: 'RCUK 2025 · Cristalloïde isotonique équilibré', url: 'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/paediatric-basic-life-support-guidelines' },
  calcium: { title: 'BDPM · Gluconate de calcium PROAMP 10 %', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/68332774/extrait' },
  morphine: { title: 'Pédiadol · Morphine IV continue', url: 'https://pediadol.org/morphine-en-iv-continu/' },
  erc: { title: 'ERC 2025 · Paediatric Life Support, p. 24–25', url: 'https://doi.org/10.1016/j.resuscitation.2025.110767' },
  magnesium: { title: 'BDPM · Sulfate de magnésium Lavoisier 15 %', url: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/61106121/extrait' },
});

const protocolDefaults = record => ({
  posology: record.sourceCells[1] || record.sourceCells[4] || 'Consigne sans calcul pondéral',
  particulars: [],
  dilution: record.model?.mix ? `${record.model.mix.takeMl} mL de produit + ${record.model.mix.addMl} mL de diluant` : record.sourceCells[2] || 'Pas de dilution renseignée',
  administration: record.category === 'ivc' ? 'IVSE' : 'IV',
  questions: [],
});

const overrides = {
  'adrenaline-iv': { model: { maximumDose: 1000, fixedDoseFromWeightKg: 50, fixedDose: 1000, mix: null, weightMix: { thresholdKg: 50, below: { takeMl: 1, addMl: 9 }, atOrAbove: null } }, protocol: { particulars: ['À partir de 50 kg : 1 mg de produit pur, sans dilution.'], administration: 'IVD flash, puis rincer avec 5 mL de NaCl 0,9 %' } },
  'adrenaline-im': { category: 'anaphylaxie', model: { maximumDose: 500 }, protocol: { particulars: ['Dose maximale confirmée : 500 mcg (0,5 mg).'], dilution: 'Sans dilution', administration: 'IM' } },
  'bicarbonate-acr': { model: { stock: { amount: 5, unit: 'mmol', volumeMl: 10 } }, protocol: { dilution: 'Sans dilution', administration: 'IVL' } },
  'calcium-chlorure': { protocol: { dilution: 'Sans dilution', questions: ['Confirmer si les 20 mg/kg sont exprimés en chlorure de calcium ou en calcium élément, ainsi que le plafond de 1 000 mg.'] } },
  cardioversion: { model: { maximumDose: null }, protocol: { dilution: 'Sans objet', administration: 'Mettre le défibrillateur en mode « Synchrone »', questions: [] } },
  defibrillation: { model: { maximumDose: 200 }, protocol: { dilution: 'Sans objet', administration: 'Défibrillation', questions: [] } },

  gentamicine: { model: { stock: { amount: 40, unit: 'mg', volumeMl: 2 }, volumeKind: 'withdrawal', maximumDose: null }, protocol: { posology: '5 mg/kg/dose', dilution: 'Dilution laissée à l’IDE', administration: 'IVL sur 30 min', questions: [] } },
  amoxicilline: { protocol: { posology: '100 mg/kg/dose — une seule dose', dilution: '', administration: 'IV', questions: [] }, model: { maximumDose: 2000 } },
  'amoxicilline-clavulanique': { model: { coefficient: 80 / 3, maximumDose: 2000 }, protocol: { posology: '(80 ÷ 3) mg/kg/dose d’amoxicilline — une seule dose', particulars: ['La dose de 80 mg/kg/jour est répartie en trois administrations ; une seule de ces doses est calculée ici.'], dilution: '', administration: 'IV', questions: ['Renseigner la présentation disponible et son rapport amoxicilline/acide clavulanique.'] } },
  cefotaxime: { model: { maximumDose: 3000 }, protocol: { posology: '75 mg/kg/dose — une seule dose', dilution: '', administration: 'IV', questions: [] } },
  ceftriaxone: { model: { maximumDose: 4000 }, protocol: { posology: '100 mg/kg/dose — une seule dose', dilution: '', administration: 'IV', questions: [] } },

  amiodarone: { model: { maximumDose: 300 }, protocol: { administration: 'IVD, puis rincer avec 5 mL de NaCl 0,9 %', questions: [] } },
  atropine: {
    sourceCells: ['Atropine 0,25 mg/1 mL', '20 mcg/kg', 'Sans dilution', '0,8 mL', '', '200 mcg'],
    model: { stock: { amount: 0.25, unit: 'mg', volumeMl: 1 }, mix: null, maximumDose: 2000 },
    protocol: { dilution: 'Sans dilution', administration: 'IVD', questions: [] },
  },
  hydrocortisone: { model: { maximumDose: 100 }, protocol: { administration: 'IVD', questions: [] } },
  magnesium: { model: { coefficient: 50, maximumDose: 2000, stock: null, mix: null }, protocol: { posology: '50 mg/kg/dose de sulfate de magnésium, maximum 2 g', dilution: 'Préparation à préciser après confirmation de la concentration de l’ampoule.', administration: 'IVL sur 20 min', questions: ['Confirmer si « 0,15 g » désigne la quantité par mL ou par ampoule de 10 mL. Une solution à 15 % contient 0,15 g/mL, soit 1,5 g/10 mL ; 0,15 g/10 mL correspondrait à 15 mg/mL. Aucun volume calculé en attendant.'] }, sources: ['magnesium'] },
  triphosadenine: { model: { type: 'unresolved', blockReason: 'Triphosadénine laissée en suspens : posologie et modalités à documenter.' }, protocol: { posology: 'En suspens', dilution: 'En suspens', administration: 'En suspens', questions: ['Documenter la posologie, la préparation, l’administration, les répétitions et le plafond propres à la triphosadénine. Aucun calcul automatique en attendant.'] } },

  etomidate: { name: 'Étomidate', hideBelowAgeMonths: 24, model: { minimumAgeMonths: 24 }, protocol: { particulars: ['Masqué avant 24 mois ; visible et calculable à partir de 24 mois inclus. Si l’âge manque, la fiche reste visible et le calcul attend l’âge.'], dilution: 'Sans dilution', administration: 'IVL', questions: ['Confirmer le plafond de 20 mg.'] } },
  'ketamine-analgesie': { model: { mix: null, weightMix: { thresholdKg: 15, below: { takeMl: 1, addMl: 9 }, atOrAbove: null } }, protocol: { administration: 'IVL sur 2 à 3 min', questions: ['Plafond proposé de 80 mg conservé en suspens ; non appliqué au calcul en attendant la validation collective.'] } },
  'ketamine-intubation': { model: { tiers: [{ maxAgeMonthsExclusive: 18, coefficient: 4 }, { coefficient: 2 }] }, protocol: { posology: '4 mg/kg avant 18 mois ; 2 mg/kg à partir de 18 mois', particulars: ['Palier d’âge confirmé à 18 mois.'], administration: 'IVL sur 2 à 3 min', questions: [] } },
  'midazolam-iv': { model: { maximumDose: null, stock: { amount: 50, unit: 'mg', volumeMl: 10 }, weightMix: { thresholdKg: 10, below: { takeMl: 1, addMl: 9 }, atOrAbove: null } }, protocol: { administration: 'IVL', questions: [] } },
  'morphine-dc': { model: { maximumDose: 6, stock: { amount: 10, unit: 'mg', volumeMl: 10 }, dynamicConcentration: { thresholdKg: 10, below: 0.1, atOrAbove: 1 } }, protocol: { posology: 'Dose de charge : 0,1 mg/kg, maximum 6 mg', particulars: ['DC = dose de charge.'], dilution: 'Si poids < 10 kg : 1 mL de morphine 1 mg/mL + 9 mL de NaCl 0,9 % ; sinon sans dilution', administration: 'IVL', questions: [] } },
  'morphine-titration': { model: { dynamicConcentration: { thresholdKg: 10, below: 0.1, atOrAbove: 1 } }, protocol: { posology: '0,025 mg/kg toutes les 5 min après la dose de charge, jusqu’à analgésie', dilution: 'Si poids < 10 kg : 1 mL de morphine 1 mg/mL + 9 mL de NaCl 0,9 % ; sinon sans dilution', questions: ['Définir les critères locaux d’arrêt et de surveillance de la titration.'] } },
  propofol: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 500 mg.'] } },
  suxamethonium: { model: { tiers: [{ maxAgeMonthsExclusive: 18, coefficient: 2 }, { coefficient: 1 }], maximumDose: null }, protocol: { posology: '2 mg/kg avant 18 mois ; 1 mg/kg à partir de 18 mois', particulars: ['Aucun plafond de dose. Palier d’âge issu du tableau à confirmer.'], questions: ['Confirmer le palier à 18 mois.'] } },
  'atracurium-bolus': { model: { weightMix: { thresholdKg: 10, below: { takeMl: 1, addMl: 9 }, atOrAbove: null } }, protocol: { questions: ['Confirmer le plafond de 30 mg.'] } },

  'clonazepam-bolus': { protocol: { questions: ['Confirmer le plafond de 1 mg.'] } },
  'midazolam-ij': { protocol: { particulars: ['IJ = intergingivojugal.'], dilution: 'Sans dilution', administration: 'Intergingivojugale', questions: ['Confirmer le plafond de 10 mg.'] } },
  'diazepam-ir': { protocol: { dilution: 'Sans dilution', administration: 'Intrarectale', questions: ['Confirmer le plafond de 10 mg.'] } },
  phenobarbital: { model: { volumeKind: 'withdrawal', tiers: [{ maxAgeMonthsExclusive: 1, coefficient: 20 }, { coefficient: 15 }] }, protocol: { posology: '20 mg/kg avant 1 mois ; 15 mg/kg à partir de 1 mois', particulars: ['Palier d’âge issu du tableau à confirmer.'], dilution: 'Présentation du tableau : 200 mg dans 4 mL. Reconstitution et éventuelle dilution supplémentaire à préciser.', questions: ['Confirmer le palier à 1 mois, le plafond de 600 mg, la reconstitution et la vitesse.'] } },
  levetiracetam: { model: { volumeKind: 'withdrawal' }, protocol: { dilution: 'Volume à prélever calculé à 100 mg/mL ; dilution finale à préciser.', questions: ['Confirmer la forme, la dilution, la durée et le plafond de 1 500 mg.'] } },
  phenytoine: { protocol: { questions: ['Confirmer la compatibilité, la vitesse et le plafond.'] } },
  ssh: { model: { type: 'dose', coefficient: 3, unit: 'mL', stock: null, mix: null }, sourceCells: ['SSH 7,5 % préparé par la pharmacie', '3 mL/kg', 'Préparation prête à l’emploi', '30,0 mL', '', ''], protocol: { posology: '3 mL/kg', dilution: 'Aucune manipulation : préparation à 7,5 % fournie par la pharmacie', questions: ['Confirmer la durée d’administration.'] } },

  'tranexamique-bolus': { model: { maximumDose: 1000, fixedDoseFromAgeMonths: 120, fixedDose: 1000 }, protocol: { posology: '10 mg/kg avant 10 ans ; 1 g à partir de 10 ans', particulars: ['Maximum 1 g.'], dilution: 'Sans dilution' } },
  cafeine: { model: { type: 'dose', coefficient: 20, unit: 'mg', stock: { amount: 25, unit: 'mg', volumeMl: 1 }, mix: null }, protocol: { posology: 'Dose de charge : 20 mg/kg de citrate de caféine', particulars: ['Dose exprimée en citrate de caféine.'], dilution: 'Sans dilution', questions: ['Confirmer le plafond et la durée d’administration.'] } },
  flumazenil: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 200 mcg et les répétitions.'] } },
  sugammadex: { protocol: { questions: ['Confirmer le plafond.'] } },
  glucose10: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 40 mL.'] } },
  naloxone: { protocol: { questions: ['Confirmer le plafond de 2 mg et les répétitions.'] } },

  'tranexamique-ivc': { model: { type: 'fixed-duration-mixture', coefficient: 80, unit: 'mg', durationHours: 8, maximumDose: 1000, fixedDoseFromAgeMonths: 120, fixedDose: 1000, stock: { amount: 500, unit: 'mg', volumeMl: 5 }, mix: null, finalVolumeMl: 16 }, protocol: { posology: 'Avant 10 ans : 10 mg/kg/h pendant 8 h, maximum total 1 g ; à partir de 10 ans : 1 g sur 8 h', particulars: ['Débit fixe : 2 mL/h après préparation à 16 mL.'], dilution: 'Prélever le volume d’Exacyl nécessaire puis compléter à 16 mL', administration: 'IVSE à 2 mL/h pendant 8 h' } },
  'adrenaline-ivc': { model: { type: 'fixed-rate', rateDivisor: 3 }, protocol: { posology: 'Protocole SMUR approché : débit = poids/3', particulars: ['La dose nominale est un repère approximatif ; ne pas recalculer depuis celle-ci.'], dilution: 'Prélever 1 mL d’adrénaline 1 mg/mL puis compléter à un volume final de 50 mL', administration: 'IVSE ; débit arrondi à 0,1 mL/h' } },
  dobutamine: { model: { type: 'fixed-rate', rateDivisor: 3 }, protocol: { posology: 'Protocole SMUR approché : débit = poids/3', particulars: ['La dose nominale est un repère approximatif.'], dilution: 'Prélever 4 mL de dobutamine 250 mg/20 mL (50 mg), puis compléter à un volume final de 50 mL', administration: 'IVSE ; débit arrondi à 0,1 mL/h' } },
  dopamine: { model: { type: 'fixed-rate', rateDivisor: 3 }, protocol: { posology: 'Protocole SMUR approché : débit = poids/3', particulars: ['La dose nominale est un repère approximatif.'], dilution: 'Prélever 10 mL de dopamine 50 mg/10 mL, puis compléter à un volume final de 50 mL', administration: 'IVSE ; débit arrondi à 0,1 mL/h' } },
  noradrenaline: { model: { type: 'fixed-rate', rateDivisor: 3, unit: 'mcg', stock: { amount: 2, unit: 'mg', volumeMl: 1 }, mix: null }, sourceCells: ['Noradrénaline 2 mg/mL', '1 mg', 'Compléter à 50 mL de NaCl 0,9 %', 'Poids/3 mL/h', 'Protocole SMUR approché', ''], protocol: { posology: 'Protocole SMUR approché : débit = poids/3', particulars: ['Ampoule de départ : 2 mg/mL. La dose nominale est un repère approximatif.'], dilution: 'Prélever 0,5 mL de noradrénaline 2 mg/mL (1 mg), puis compléter à un volume final de 50 mL', administration: 'IVSE ; débit arrondi à 0,1 mL/h', questions: [] } },
  alprostadil: { protocol: { questions: ['Confirmer le plafond, la préparation et la plage de débit.'] } },
  'atracurium-ivc': { protocol: { questions: ['Confirmer le plafond et la durée de la seringue.'] } },
  'clonazepam-ivc': { model: { type: 'fixed-duration-mixture', coefficient: 0.1, unit: 'mg', durationHours: 6, maximumDose: 4, stock: { amount: 1, unit: 'mg', volumeMl: 1 }, mix: null, finalVolumeMl: 6 }, protocol: { posology: '0,1 mg/kg sur 6 h, maximum 4 mg/6 h', dilution: 'Prélever la dose de clonazépam puis compléter à 6 mL', administration: 'IVSE à 1 mL/h pendant 6 h', questions: ['Confirmer le plafond de 4 mg/6 h.'] } },
  isoprenaline: { protocol: { questions: ['Confirmer le plafond et la plage de débit.'] } },
  'midazolam-ivc': { protocol: { questions: ['Confirmer le plafond et la plage de débit.'] } },
  'morphine-ivc': { model: { tiers: [{ maxAgeMonthsExclusive: 3, coefficient: 10 }, { coefficient: 20 }], dynamicConcentration: { thresholdKg: 10, below: 100, atOrAbove: 1000 } }, protocol: { posology: '10 mcg/kg/h avant 3 mois ; 20 mcg/kg/h de 3 mois à 5 ans', particulars: ['Concentration : 0,1 mg/mL si < 10 kg ; 1 mg/mL si ≥ 10 kg.'], dilution: 'Si poids < 10 kg : 5 mL de morphine 1 mg/mL + 45 mL de NaCl 0,9 % ; si poids ≥ 10 kg : morphine 1 mg/mL non diluée', administration: 'IVSE ; débit arrondi à 0,1 mL/h', questions: ['Au-delà de 5 ans, préciser le schéma local hors PCA.'] }, sources: ['morphine'] },
  nicardipine: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond et la plage de débit.'] } },
  'salbutamol-ivc': { protocol: { questions: ['Confirmer le plafond et la plage de débit.'] } },
  sufentanil: { protocol: { questions: ['Confirmer le plafond et la plage de débit.'] } },

  'arret-potassium': { protocol: { posology: 'Arrêter tous les apports en potassium', dilution: 'Sans objet', administration: 'Consigne' } },
  'bicarbonate-hyperk': { model: { stock: { amount: 5, unit: 'mmol', volumeMl: 10 } }, protocol: { dilution: 'Sans dilution', administration: 'IVL', questions: [] } },
  'salbutamol-nebulise': { model: { type: 'conditional-dose', unit: 'mg', cases: [{ maxWeightKg: 16, dose: 2.5 }, { dose: 5 }], stock: { amount: 2.5, unit: 'mg', volumeMl: 2.5 } }, protocol: { posology: '2,5 mg si poids ≤ 16 kg ; 5 mg si poids > 16 kg', particulars: ['Le seuil de 16 kg provient du tableau local.'], dilution: 'Solution pour nébulisation 2,5 mg/2,5 mL', administration: 'Nébulisation', questions: ['Confirmer le nombre maximal de répétitions.'] } },
  'calcium-gluconate': { model: { type: 'unresolved', stock: null, mix: null, blockReason: 'Dose et dilution du gluconate de calcium à trancher : voir les deux schémas dans la fiche.' }, sourceCells: ['Gluconate de calcium PROAMP 10 % · ampoule 10 mL', 'Dose à trancher', 'Dilution à confirmer', '', 'IVL/20 min dans le tableau', ''], protocol: { posology: 'Tableau : 0,4 mL/kg ; ERC 2025 : 0,5 mL/kg. Maximum 20 mL dans les deux schémas.', particulars: ['10 mL = 91 mg de calcium élément, soit 9,1 mg/mL. Les volumes ci-dessous désignent le produit à 10 %, avant dilution.'], dilution: 'Le RCP prévoit une dilution pour l’administration pédiatrique ; pour la perfusion, dilution au 1/10 dans NaCl 0,9 % ou G5 %. Préparation finale locale à fixer.', administration: 'Tableau : IVL sur 20 min. Modalité finale à valider, sous surveillance ECG.', questions: ['Choisir entre 0,4 mL/kg (tableau) et 0,5 mL/kg (ERC 2025), maximum 20 mL de produit à 10 %.', 'Corriger la mention « 20 mg/kg » : elle ne correspond pas à 0,4 mL/kg de PROAMP 10 % ; préciser la fraction de calcium utilisée.', 'Valider la dilution finale, le volume administré après dilution et la durée ; le RCP pédiatrique prévoit une dilution.'] }, sources: ['calcium', 'erc'] },
  'insuline-glucose': { model: { type: 'dose', coefficient: 4, unit: 'mL', stock: null, mix: null, massPerMl: 0.03, massUnit: 'UI d’insuline' }, sourceCells: ['Insuline rapide + G5 %', '4 mL/kg de la préparation', '15 UI dans 500 mL de G5 %', '', 'IVL/20 min', ''], protocol: { posology: '4 mL/kg de la préparation', particulars: ['Correspond à 0,12 UI/kg d’insuline avec la préparation nominale.'], dilution: '15 UI d’insuline rapide dans 500 mL de G5 %', administration: 'IV sur 20 min', questions: ['Préciser l’insuline rapide disponible, sa concentration et sa compatibilité avec le G5 %.'] } },
  'resikali-ir': { model: { maximumDose: 40, volumePerDose: 150 / 40 }, protocol: { particulars: ['Maximum 40 g. Le déplacement de volume de la poudre est ignoré selon la convention locale.'], administration: 'Intrarectale' } },
  'kayexalate-ir': { model: { maximumDose: 15, volumePerDose: 100 / 15 }, protocol: { particulars: ['Maximum 15 g. Le déplacement de volume de la poudre est ignoré selon la convention locale.'], administration: 'Intrarectale' } },

  cgr: { model: { maximumDose: null, limitToOneBag: true }, protocol: { dilution: 'Sans objet', particulars: ['Poche de volume variable : transfuser le volume prescrit, au maximum le contenu d’une poche. Aucun maximum fixe en mL.'], questions: ['Préciser la vitesse et les modalités transfusionnelles locales.'] } },
  pfc: { model: { maximumDose: null, limitToOneBag: true }, protocol: { dilution: 'Sans objet', particulars: ['Poche de volume variable : transfuser le volume prescrit, au maximum le contenu d’une poche. Aucun maximum fixe en mL.'], questions: ['Préciser la vitesse et les modalités transfusionnelles locales.'] } },
  cpa: { model: { maximumDose: null, limitToOneBag: true }, protocol: { dilution: 'Sans objet', particulars: ['Poche de volume variable : transfuser le volume prescrit, au maximum le contenu d’une poche. Aucun maximum fixe en mL.'], questions: ['Préciser la vitesse et les modalités transfusionnelles locales.'] } },
};

function mergeRecord(record) {
  const override = overrides[record.id] || {};
  const model = { ...record.model, ...(override.model || {}) };
  if (model.minimumAgeMonths !== undefined) delete model.minimumAgeMonthsExclusive;
  if (record.id.startsWith('morphine-')) {
    model.weightMix = { thresholdKg: 10, below: record.id === 'morphine-ivc' ? { takeMl: 5, addMl: 45 } : { takeMl: 1, addMl: 9 }, atOrAbove: null };
    delete model.dynamicConcentration;
  }
  if (record.id === 'noradrenaline') model.mix = { takeMl: 0.5, addMl: 49.5 };
  if (model.mix || model.weightMix || record.id === 'clonazepam-ivc') model.diluent = record.id === 'amiodarone' ? 'G5 %' : 'NaCl 0,9 %';
  if (record.id === 'tranexamique-ivc') model.diluent = 'diluant à préciser';
  return {
    ...record, ...override,
    model,
    protocol: { ...protocolDefaults(record), ...(override.protocol || {}) },
    sourceCells: override.sourceCells || record.sourceCells,
    sources: override.sources || record.sources || [],
  };
}

export const isofundine = freeze({
  id: 'isofundine', category: 'remplissage', name: 'Isofundine', kind: 'reference', validation: 'pending', maximumDose: null,
  sourceCells: ['Isofundine, solution pour perfusion — flacon de 1 L', '10 mL/kg', 'Solution prête à l’emploi', '', '', ''],
  model: { type: 'dose', coefficient: 10, unit: 'mL', stock: null, mix: null, maximumDose: 500 },
  protocol: { posology: '10 mL/kg par bolus, maximum 500 mL par bolus', particulars: [], dilution: 'Solution prête à l’emploi', administration: 'IVD — à passer le plus rapidement possible', questions: [] },
  sources: ['isofundine', 'remplissage'], issues: [],
});

export const smurCategories = freeze([categories[0], { id: 'anaphylaxie', label: 'Anaphylaxie' }, { id: 'remplissage', label: 'Remplissage' }, ...categories.slice(1)]);
export const smurRecords = freeze([...catalogRecords.map(mergeRecord), isofundine]);
