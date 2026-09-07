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
});

const protocolDefaults = record => ({
  posology: record.sourceCells[1] || record.sourceCells[4] || 'Consigne sans calcul pondéral',
  particulars: [],
  dilution: record.model?.mix ? `${record.model.mix.takeMl} mL de produit + ${record.model.mix.addMl} mL de diluant` : record.sourceCells[2] || 'Pas de dilution renseignée',
  administration: record.category === 'ivc' ? 'IVSE' : 'IV',
  questions: [],
});

const overrides = {
  'adrenaline-iv': { model: { maximumDose: 1000, fixedDoseFromWeightKg: 50, fixedDose: 1000 }, protocol: { particulars: ['À partir de 50 kg : 1 mg, comme chez l’adulte.'], administration: 'IV' } },
  'adrenaline-im': { model: { maximumDose: 500 }, protocol: { particulars: ['Dose maximale : 0,5 mg.'], dilution: 'Sans dilution', administration: 'IM' } },
  'bicarbonate-acr': { protocol: { dilution: 'Sans dilution' } },
  'calcium-chlorure': { protocol: { dilution: 'Sans dilution', questions: ['Confirmer si les 20 mg/kg sont exprimés en chlorure de calcium ou en calcium élément, ainsi que le plafond de 1 000 mg.'] } },
  cardioversion: { protocol: { dilution: 'Sans objet', administration: 'Choc synchronisé', questions: ['Préciser la séquence et le plafond d’énergie.'] } },
  defibrillation: { protocol: { dilution: 'Sans objet', administration: 'Défibrillation', questions: ['Confirmer le plafond de 200 J et la séquence des chocs.'] } },

  gentamicine: { protocol: { dilution: 'Dilution laissée à l’IDE', administration: 'IVL sur 30 min', questions: ['Confirmer l’intervalle et le plafond de dose.'] } },
  amoxicilline: { protocol: { dilution: 'Dilution laissée à l’IDE', questions: ['Confirmer si la dose est par administration ou par jour, l’intervalle et le plafond de 2 g.'] } },
  'amoxicilline-clavulanique': { protocol: { dilution: 'Dilution laissée à l’IDE', questions: ['Confirmer que les 80 mg/kg sont exprimés en amoxicilline, ainsi que l’intervalle et le plafond de 2 g.'] } },
  cefotaxime: { protocol: { dilution: 'Dilution laissée à l’IDE', questions: ['Confirmer si la dose est par administration ou par jour, l’intervalle et le plafond de 3 g.'] } },
  ceftriaxone: { protocol: { dilution: 'Dilution laissée à l’IDE', questions: ['Confirmer si la dose est par administration ou par jour et le plafond de 4 g.'] } },

  amiodarone: { protocol: { questions: ['Confirmer le plafond de 300 mg et la durée d’administration.'] } },
  atropine: {
    sourceCells: ['Atropine 0,25 mg/1 mL', '20 mcg/kg', 'Sans dilution', '0,8 mL', '', '200 mcg'],
    model: { stock: { amount: 0.25, unit: 'mg', volumeMl: 1 }, mix: null },
    protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 3 mg.'] },
  },
  hydrocortisone: { protocol: { questions: ['Confirmer le plafond de 100 mg.'] } },
  lidocaine: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 100 mg.'] } },
  magnesium: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer la présentation à 15 %, l’expression en sulfate de magnésium, le plafond de 2 g et la durée.'] } },
  triphosadenine: { protocol: { dilution: 'Sans dilution', administration: 'Bolus IV', questions: ['Confirmer les répétitions et le plafond de 12 mg propres à la triphosadénine.'] } },

  etomidate: { protocol: { particulars: ['Uniquement si âge strictement supérieur à 2 ans.'], dilution: 'Sans dilution', questions: ['Confirmer le plafond de 20 mg.'] } },
  'ketamine-analgesie': { protocol: { administration: 'IVL sur 2 à 3 min', questions: ['Confirmer le plafond de 80 mg.'] } },
  'ketamine-intubation': { model: { tiers: [{ maxAgeMonthsExclusive: 18, coefficient: 4 }, { coefficient: 2 }] }, protocol: { posology: '4 mg/kg avant 18 mois ; 2 mg/kg à partir de 18 mois', particulars: ['Palier d’âge issu du tableau à confirmer.'], administration: 'IVL sur 2 à 3 min', questions: ['Confirmer le palier à 18 mois.'] } },
  'midazolam-iv': { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 5 mg.'] } },
  'morphine-dc': { model: { maximumDose: 6, dynamicConcentration: { thresholdKg: 10, below: 0.1, atOrAbove: 1 } }, protocol: { posology: 'Dose de charge : 0,1 mg/kg, maximum 6 mg', particulars: ['DC = dose de charge.'], dilution: 'Si poids < 10 kg : 1 mL de morphine 1 mg/mL + 9 mL de NaCl 0,9 % ; sinon sans dilution', questions: [] } },
  'morphine-titration': { model: { dynamicConcentration: { thresholdKg: 10, below: 0.1, atOrAbove: 1 } }, protocol: { posology: '0,025 mg/kg toutes les 5 min après la dose de charge, jusqu’à analgésie', dilution: 'Si poids < 10 kg : 1 mL de morphine 1 mg/mL + 9 mL de NaCl 0,9 % ; sinon sans dilution', questions: ['Définir les critères locaux d’arrêt et de surveillance de la titration.'] } },
  propofol: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 500 mg.'] } },
  suxamethonium: { model: { tiers: [{ maxAgeMonthsExclusive: 18, coefficient: 2 }, { coefficient: 1 }], maximumDose: null }, protocol: { posology: '2 mg/kg avant 18 mois ; 1 mg/kg à partir de 18 mois', particulars: ['Aucun plafond de dose. Palier d’âge issu du tableau à confirmer.'], questions: ['Confirmer le palier à 18 mois.'] } },
  'atracurium-bolus': { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 30 mg.'] } },

  'clonazepam-bolus': { protocol: { questions: ['Confirmer le plafond de 1 mg.'] } },
  'midazolam-ij': { protocol: { particulars: ['IJ = intergingivojugal.'], dilution: 'Sans dilution', administration: 'Intergingivojugale', questions: ['Confirmer le plafond de 10 mg.'] } },
  'diazepam-ir': { protocol: { dilution: 'Sans dilution', administration: 'Intrarectale', questions: ['Confirmer le plafond de 10 mg.'] } },
  phenobarbital: { model: { tiers: [{ maxAgeMonthsExclusive: 1, coefficient: 20 }, { coefficient: 15 }] }, protocol: { posology: '20 mg/kg avant 1 mois ; 15 mg/kg à partir de 1 mois', particulars: ['Palier d’âge issu du tableau à confirmer.'], dilution: 'Sans dilution renseignée', questions: ['Confirmer le palier à 1 mois, le plafond de 600 mg, la reconstitution et la vitesse.'] } },
  levetiracetam: { protocol: { dilution: 'Dilution à préciser', questions: ['Confirmer la forme, la dilution, la durée et le plafond de 1 500 mg.'] } },
  phenytoine: { protocol: { questions: ['Confirmer la compatibilité, la vitesse et le plafond.'] } },
  ssh: { model: { type: 'dose', coefficient: 3, unit: 'mL', stock: null, mix: null }, sourceCells: ['SSH 7,5 % préparé par la pharmacie', '3 mL/kg', 'Préparation prête à l’emploi', '30,0 mL', '', ''], protocol: { posology: '3 mL/kg', dilution: 'Aucune manipulation : préparation à 7,5 % fournie par la pharmacie', questions: ['Confirmer la durée d’administration.'] } },

  'tranexamique-bolus': { model: { maximumDose: 1000, fixedDoseFromAgeMonths: 120, fixedDose: 1000 }, protocol: { posology: '10 mg/kg avant 10 ans ; 1 g à partir de 10 ans', particulars: ['Maximum 1 g.'], dilution: 'Sans dilution' } },
  cafeine: { model: { type: 'dose', coefficient: 20, unit: 'mg', stock: { amount: 25, unit: 'mg', volumeMl: 1 }, mix: null }, protocol: { posology: 'Dose de charge : 20 mg/kg de citrate de caféine', particulars: ['Dose exprimée en citrate de caféine.'], dilution: 'Sans dilution', questions: ['Confirmer le plafond et la durée d’administration.'] } },
  flumazenil: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer le plafond de 200 µg et les répétitions.'] } },
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
  'morphine-ivc': { model: { tiers: [{ maxAgeMonthsExclusive: 3, coefficient: 10 }, { coefficient: 20 }], dynamicConcentration: { thresholdKg: 10, below: 100, atOrAbove: 1000 } }, protocol: { posology: '10 µg/kg/h avant 3 mois ; 20 µg/kg/h de 3 mois à 5 ans', particulars: ['Concentration : 0,1 mg/mL si < 10 kg ; 1 mg/mL si ≥ 10 kg.'], dilution: 'Si poids < 10 kg : 5 mL de morphine 1 mg/mL + 45 mL de NaCl 0,9 % ; si poids ≥ 10 kg : morphine 1 mg/mL non diluée', administration: 'IVSE ; débit arrondi à 0,1 mL/h', questions: ['Au-delà de 5 ans, préciser le schéma local hors PCA.'] }, sources: ['morphine'] },
  nicardipine: { protocol: { dilution: 'Sans dilution', questions: ['Confirmer l’ordre des cellules source, le plafond et la plage de débit.'] } },
  'salbutamol-ivc': { protocol: { questions: ['Confirmer le plafond et la plage de débit.'] } },
  sufentanil: { protocol: { questions: ['Confirmer le plafond et la plage de débit.'] } },

  'arret-potassium': { protocol: { posology: 'Arrêter tous les apports en potassium', dilution: 'Sans objet', administration: 'Consigne' } },
  'bicarbonate-hyperk': { protocol: { dilution: 'Sans dilution', questions: ['Confirmer la durée d’administration.'] } },
  'salbutamol-nebulise': { model: { type: 'conditional-dose', unit: 'mg', cases: [{ maxWeightKg: 16, dose: 2.5 }, { dose: 5 }], stock: { amount: 2.5, unit: 'mg', volumeMl: 2.5 } }, protocol: { posology: '2,5 mg si poids ≤ 16 kg ; 5 mg si poids > 16 kg', particulars: ['Le seuil de 16 kg provient du tableau local.'], dilution: 'Solution pour nébulisation 2,5 mg/2,5 mL', administration: 'Nébulisation', questions: ['Confirmer le nombre maximal de répétitions.'] } },
  'calcium-gluconate': { model: { type: 'dose', coefficient: 0.5, unit: 'mL', stock: null, mix: null, maximumDose: 20, massPerMl: 9.1, massUnit: 'mg de calcium élément' }, sourceCells: ['Gluconate de calcium PROAMP 10 % · ampoule 10 mL', '0,5 mL/kg, max. 20 mL', 'Dilution à confirmer', '', 'IV lente', ''], protocol: { posology: '0,5 mL/kg, maximum 20 mL', particulars: ['Ampoule de 10 mL = 91 mg de calcium élément. Hors arrêt cardiaque pédiatrique.'], dilution: 'À confirmer : l’ERC ne précise pas la dilution ; le RCP PROAMP prévoit une dilution au 1/10 en cas de perfusion pédiatrique', administration: 'IV lente, sous surveillance ECG', questions: ['Décider localement injection IV lente ou perfusion diluée, et préciser la durée.'] }, sources: ['calcium'] },
  'insuline-glucose': { model: { type: 'dose', coefficient: 4, unit: 'mL', stock: null, mix: null, massPerMl: 0.03, massUnit: 'UI d’insuline' }, sourceCells: ['Insuline rapide + G5 %', '4 mL/kg de la préparation', '15 UI dans 500 mL de G5 %', '', 'IVL/20 min', ''], protocol: { posology: '4 mL/kg de la préparation', particulars: ['Correspond à 0,12 UI/kg d’insuline avec la préparation nominale.'], dilution: '15 UI d’insuline rapide dans 500 mL de G5 %', administration: 'IV sur 20 min', questions: ['Préciser l’insuline rapide disponible, sa concentration et sa compatibilité avec le G5 %.'] } },
  'resikali-ir': { model: { maximumDose: 40, volumePerDose: 150 / 40 }, protocol: { particulars: ['Maximum 40 g. Le déplacement de volume de la poudre est ignoré selon la convention locale.'], administration: 'Intrarectale' } },
  'kayexalate-ir': { model: { maximumDose: 15, volumePerDose: 100 / 15 }, protocol: { particulars: ['Maximum 15 g. Le déplacement de volume de la poudre est ignoré selon la convention locale.'], administration: 'Intrarectale' } },

  cgr: { protocol: { dilution: 'Sans objet', questions: ['Confirmer le plafond, la vitesse et les modalités transfusionnelles locales.'] } },
  pfc: { protocol: { dilution: 'Sans objet', questions: ['Confirmer le plafond, la vitesse et les modalités transfusionnelles locales.'] } },
  cpa: { protocol: { dilution: 'Sans objet', questions: ['Confirmer le plafond, la vitesse et les modalités transfusionnelles locales.'] } },
};

function mergeRecord(record) {
  const override = overrides[record.id] || {};
  return {
    ...record, ...override,
    model: { ...record.model, ...(override.model || {}) },
    protocol: { ...protocolDefaults(record), ...(override.protocol || {}) },
    sourceCells: override.sourceCells || record.sourceCells,
    sources: override.sources || record.sources || [],
  };
}

export const isofundine = freeze({
  id: 'isofundine', category: 'remplissage', name: 'Isofundine', kind: 'reference', validation: 'pending', maximumDose: null,
  sourceCells: ['Isofundine, solution pour perfusion', '10 mL/kg', 'Solution prête à l’emploi', '', '', ''],
  model: { type: 'dose', coefficient: 10, unit: 'mL', stock: null, mix: null },
  protocol: { posology: '10 mL/kg par bolus', particulars: ['Réévaluer après chaque bolus.'], dilution: 'Solution prête à l’emploi', administration: 'IV', questions: ['Confirmer localement la vitesse, le nombre maximal de bolus et les limites propres au contexte SMUR.'] },
  sources: ['isofundine', 'remplissage'], issues: [],
});

export const smurCategories = freeze([categories[0], { id: 'remplissage', label: 'Remplissage' }, ...categories.slice(1)]);
export const smurRecords = freeze([...catalogRecords.map(mergeRecord), isofundine]);
