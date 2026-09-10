import { preparationVariants } from './smur-preparation.js';

export const numberText = (value, digits = 6) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);
export const unitText = unit => unit;
export const volumeText = value => value > 0 && value < 0.005 ? '< 0,01' : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const ageText = months => months >= 24 && months % 12 === 0 ? `${months / 12} ans` : `${months} mois`;
const amountText = (value, unit) => unit === 'mcg' && value >= 1000 ? `${numberText(value / 1000)} mg` : `${numberText(value)} ${unitText(unit)}`;
export function concentrationText(value, unit) {
  if (value === null) return 'Non définie';
  if (unit === 'ng' && value >= 1000) return concentrationText(value / 1000, 'mcg');
  if (unit === 'mcg' && value >= 1000) return concentrationText(value / 1000, 'mg');
  return `${amountText(value, unit)}/mL`;
}
function quotientText(numerator, denominator) {
  const value = numerator / denominator;
  return Math.abs(value - Number(value.toFixed(6))) < 1e-12 ? numberText(value) : `(${numberText(numerator)} ÷ ${numberText(denominator)})`;
}

// These ceilings are present in the supplied Sheet but have not been confirmed
// by the clinical reviewer. They are shown for review, not added to the engine.
const pendingCeilings = {
  'calcium-chlorure': 1000,
  triphosadenine: 12, etomidate: 20, 'ketamine-analgesie': 80,
  propofol: 500, 'atracurium-bolus': 30, 'clonazepam-bolus': 1, 'midazolam-ij': 10,
  'diazepam-ir': 10, phenobarbital: 600, levetiracetam: 1500, flumazenil: 200,
  glucose10: 40, naloxone: 2000,
};
const presentations = {
  'adrenaline-iv': 'Adrénaline 1 mg / 1 mL — 1 mg/mL.',
  'adrenaline-im': 'Adrénaline 1 mg / 1 mL — 1 mg/mL.',
  'adrenaline-ivc': 'Adrénaline 1 mg / 1 mL — 1 mg/mL.',
  'bicarbonate-acr': 'Bicarbonate de sodium 4,2 % — ampoule de 10 mL, 5 mmol, soit 0,5 mmol/mL.',
  'bicarbonate-hyperk': 'Bicarbonate de sodium 4,2 % — ampoule de 10 mL, 5 mmol, soit 0,5 mmol/mL.',
  gentamicine: 'Gentamicine — ampoule de 2 mL, 40 mg, soit 20 mg/mL.',
  amoxicilline: 'Amoxicilline — poudre pour solution injectable, 500 mg par flacon.',
  'amoxicilline-clavulanique': 'Amoxicilline/acide clavulanique — présentation et rapport des deux substances à renseigner.',
  cefotaxime: 'Céfotaxime — poudre pour solution injectable, 500 mg par flacon.',
  ceftriaxone: 'Ceftriaxone — poudre pour solution injectable, 1 g par flacon.',
  isofundine: 'Isofundine — flacon de 1 L (1 000 mL).',
  magnesium: 'Sulfate de magnésium — ampoule de 10 mL ; quantité totale à confirmer (0,15 g par mL ou par ampoule).',
  'midazolam-iv': 'Midazolam 5 mg/mL. L’onglet Ampoules mentionne 50 mg / 10 mL.',
  'midazolam-ij': 'Midazolam 5 mg/mL. L’onglet Ampoules mentionne 50 mg / 10 mL ; forme adaptée à la voie IJ à confirmer.',
  'midazolam-ivc': 'Midazolam 5 mg/mL. L’onglet Ampoules mentionne 50 mg / 10 mL.',
  'morphine-dc': 'Morphine 1 mg/mL. L’onglet Ampoules mentionne 10 mg / 10 mL.',
  'morphine-titration': 'Morphine 1 mg/mL. L’onglet Ampoules mentionne 10 mg / 10 mL.',
  'morphine-ivc': 'Morphine 1 mg/mL. L’onglet Ampoules mentionne 10 mg / 10 mL.',
  'clonazepam-bolus': 'Rivotril 1 mg / 1 mL ; solvant de présentation à distinguer du diluant de la seringue.',
  'clonazepam-ivc': 'Rivotril 1 mg / 1 mL ; solvant de présentation à distinguer du diluant de la seringue.',
  alprostadil: 'Prostine 0,5 mg / 1 mL.', isoprenaline: 'Isuprel 0,2 mg / 1 mL.',
  'atracurium-ivc': 'Atracurium 50 mg / 5 mL — 10 mg/mL.',
  'calcium-gluconate': 'Gluconate de calcium PROAMP 10 % — ampoule de 10 mL, contenant 91 mg de calcium élément (9,1 mg/mL).',
  'insuline-glucose': 'Insuline rapide : spécialité et concentration de l’ampoule/flacon à renseigner. G5 % : poche de 500 mL.',
  'resikali-ir': 'Résikali en poudre — 20 g par cuillère-mesure dans le tableau.',
  'kayexalate-ir': 'Kayexalate en poudre — 15 g par cuillère-mesure dans le tableau.',
  cgr: 'CGR phénotypé — poche de produit sanguin ; pas d’ampoule.',
  pfc: 'PFC — poche de produit sanguin ; pas d’ampoule.',
  cpa: 'CPA — poche de produit sanguin ; pas d’ampoule.',
  cardioversion: 'Sans objet : geste électrique.', defibrillation: 'Sans objet : geste électrique.',
  'arret-potassium': 'Sans objet : consigne.',
};
const containerUnknown = new Set(['calcium-chlorure', 'propofol', 'suxamethonium', 'levetiracetam', 'ssh', 'cafeine', 'flumazenil', 'sugammadex', 'glucose10', 'naloxone', 'noradrenaline']);

function dosageBranches(model) {
  if (model.type === 'conditional-dose') {
    return model.cases.map((item, index) => ({
      condition: item.maxWeightKg === undefined ? `Poids > ${model.cases[index - 1].maxWeightKg} kg` : `Poids ≤ ${item.maxWeightKg} kg`,
      fixed: item.dose,
    }));
  }
  if (model.fixedDoseFromWeightKg !== undefined) return [
    { condition: `Poids < ${model.fixedDoseFromWeightKg} kg`, coefficient: model.coefficient },
    { condition: `Poids ≥ ${model.fixedDoseFromWeightKg} kg`, fixed: model.fixedDose },
  ];
  if (model.fixedDoseFromAgeMonths !== undefined) return [
    { condition: `Âge < ${ageText(model.fixedDoseFromAgeMonths)}`, coefficient: model.coefficient },
    { condition: `Âge ≥ ${ageText(model.fixedDoseFromAgeMonths)}`, fixed: model.fixedDose },
  ];
  if (model.minimumAgeMonths !== undefined) return [
    { condition: `Âge < ${ageText(model.minimumAgeMonths)}`, unavailable: true },
    { condition: `Âge ≥ ${ageText(model.minimumAgeMonths)}`, coefficient: model.coefficient },
  ];
  if (model.minimumAgeMonthsExclusive !== undefined) return [
    { condition: `Âge ≤ ${ageText(model.minimumAgeMonthsExclusive)}`, unavailable: true },
    { condition: `Âge > ${ageText(model.minimumAgeMonthsExclusive)}`, coefficient: model.coefficient },
  ];
  if (model.tiers) return model.tiers.map((tier, index) => ({
    condition: tier.maxAgeMonthsExclusive === undefined ? `Âge ≥ ${ageText(model.tiers[index - 1].maxAgeMonthsExclusive)}` : `Âge < ${ageText(tier.maxAgeMonthsExclusive)}`,
    coefficient: tier.coefficient,
  }));
  return [{ condition: 'Pas de changement d’âge ou de poids documenté', coefficient: model.coefficient }];
}

function standardDoses(record, preparations) {
  const m = record.model;
  const infusion = m.type === 'infusion';
  const antibiotic = record.category === 'antibiotiques';
  const period = infusion ? (m.periodMinutes === 60 ? '/h' : '/min') : m.unit === 'J' ? '/choc' : '/dose';
  return dosageBranches(m).flatMap(branch => preparations.filter(prep =>
    !(m.weightMix && m.fixedDoseFromWeightKg === m.weightMix.thresholdKg) ||
    (branch.fixed !== undefined ? prep.minWeightKg !== undefined : prep.maxWeightKgExclusive !== undefined)
  ).map(prep => {
    const condition = [branch.condition, ...(m.weightMix && m.fixedDoseFromWeightKg !== m.weightMix.thresholdKg ? [prep.condition] : [])].join(' · ');
    if (branch.unavailable) return { condition, dose: 'Pas de posologie fournie pour ce palier', concentration: '—', volume: 'Calcul indisponible' };
    const fixed = branch.fixed !== undefined;
    let dose = `${amountText(fixed ? branch.fixed : branch.coefficient, m.unit)}${fixed ? '' : '/kg'}${period}`;
    if (record.id === 'amoxicilline-clavulanique') dose = '(80 ÷ 3) mg/kg/dose d’amoxicilline — une seule dose';
    else if (antibiotic) dose += ' — une seule dose';
    if (record.id === 'morphine-dc') dose += ' — dose de charge';
    if (record.id === 'morphine-titration') dose += ' toutes les 5 min après la dose de charge';
    if (record.id === 'cafeine') dose += ' de citrate de caféine — dose de charge';
    let volume = 'Non déterminable : dilution finale à préciser';
    let finalConcentration = concentrationText(prep.concentration, m.unit);
    if (antibiotic && m.volumeKind !== 'withdrawal') { volume = '—'; finalConcentration = '—'; }
    if (m.unit === 'J') { volume = 'Sans objet'; finalConcentration = 'Sans objet'; }
    else if (m.unit === 'mL') { volume = dose; finalConcentration = 'Produit prêt à l’emploi'; }
    else if (m.volumePerDose) {
      volume = `${quotientText(branch.coefficient * (record.id === 'resikali-ir' ? 150 : 100), record.id === 'resikali-ir' ? 40 : 15)} mL/kg/dose`;
      finalConcentration = record.id === 'resikali-ir' ? '40 g / 150 mL (nominal)' : '15 g / 100 mL (nominal)';
    } else if (prep.concentration !== null && (!antibiotic || m.volumeKind === 'withdrawal')) {
      const numerator = (fixed ? branch.fixed : branch.coefficient) * (infusion ? 60 / m.periodMinutes : 1);
      volume = `${quotientText(numerator, prep.concentration)} mL${fixed ? '' : '/kg'}${infusion ? '/h' : '/dose'}`;
      if (m.volumeKind === 'withdrawal') {
        volume = `À prélever : ${volume}. Volume final à préciser.`;
        finalConcentration = `Forme source : ${finalConcentration} ; dilution finale non définie`;
      }
    }
    if (record.id === 'insuline-glucose') finalConcentration = '0,03 UI/mL d’insuline dans G5 % (nominal)';
    return { condition, dose, concentration: finalConcentration, volume };
  }));
}

function preparationRows(record, variants) {
  const m = record.model;
  if (m.type === 'fixed-duration-mixture') {
    const stock = variants[0].stockConcentration;
    const maximumWithdrawal = m.maximumDose / stock;
    const threshold = numberText(m.maximumDose / m.coefficient);
    const perKg = quotientText(m.coefficient, stock);
    return [
      { condition: `${m.fixedDoseFromAgeMonths ? `Âge < ${ageText(m.fixedDoseFromAgeMonths)} · ` : ''}poids < ${threshold} kg`, text: `Prélever ${perKg} mL/kg à ${concentrationText(stock, m.unit)}, puis compléter avec ${m.diluent} à ${volumeText(m.finalVolumeMl)} mL au total. Diluant = ${numberText(m.finalVolumeMl)} − (${perKg} × poids en kg) mL. Concentration finale = quantité préparée ÷ ${numberText(m.finalVolumeMl)} mL.` },
      { condition: `${m.fixedDoseFromAgeMonths ? `Âge ≥ ${ageText(m.fixedDoseFromAgeMonths)} ou ` : ''}poids ≥ ${threshold} kg`, text: `Prélever ${volumeText(maximumWithdrawal)} mL de produit (${amountText(m.maximumDose, m.unit)}) + ${volumeText(m.finalVolumeMl - maximumWithdrawal)} mL de ${m.diluent} → volume final ${volumeText(m.finalVolumeMl)} mL, soit ${concentrationText(m.maximumDose / m.finalVolumeMl, m.unit)}.` },
    ];
  }
  if (m.volumeKind === 'withdrawal' && m.stock) return [{ condition: 'Préparation', text: `Produit à prélever à ${concentrationText(variants[0].stockConcentration, m.unit)} ; dilution finale ${record.category === 'antibiotiques' ? 'laissée à l’IDE' : 'à préciser'}.` }];
  if (!m.stock) return [{ condition: 'Préparation', text: record.protocol.dilution }];
  return variants.map(prep => ({ condition: prep.condition, text: prep.mix ?
    `Prélever ${volumeText(prep.takeMl)} mL du produit + ${volumeText(prep.addMl)} mL de ${prep.diluent} → volume final ${volumeText(prep.finalVolumeMl)} mL, soit ${concentrationText(prep.concentration, m.unit)}.` :
    `Sans dilution : ${concentrationText(prep.concentration, m.unit)}.` }));
}

function ceilingText(record) {
  const m = record.model;
  if (m.limitToOneBag) return 'Aucun maximum fixe en mL. Transfuser le volume prescrit, au maximum le contenu d’une poche de volume variable.';
  if (['instruction', 'unresolved', 'fixed-rate'].includes(m.type)) return '';
  if (record.id === 'midazolam-iv') return 'Aucun plafond documenté à ce stade.';
  if (['suxamethonium', 'gentamicine', 'cardioversion'].includes(record.id)) return 'Aucun plafond, conformément à la décision locale.';
  const pending = pendingCeilings[record.id];
  const ceiling = m.maximumDose ?? pending;
  if (!Number.isFinite(ceiling)) return 'Aucun plafond renseigné dans le tableau pour cette ligne ; cela ne vaut pas validation d’une dose illimitée.';
  const status = Number.isFinite(pending) ? 'Plafond du tableau à valider ; non appliqué au calcul' : record.id === 'clonazepam-ivc' ? 'Plafond du tableau utilisé pour la simulation, encore à valider' : 'Plafond retenu dans le modèle';
  const duration = m.durationHours ? ` sur ${m.durationHours} h` : '';
  const thresholds = (m.tiers || [{ coefficient: m.coefficient }]).map(tier => `${numberText(ceiling / tier.coefficient)} kg pour ${amountText(tier.coefficient, m.unit)}/kg`).join(' ; ');
  const thresholdText = m.fixedDoseFromWeightKg !== undefined ? ` Dose fixe à partir de ${m.fixedDoseFromWeightKg} kg.` : m.coefficient ? ` Seuil d’atteinte du plafond pondéral : ${thresholds}.` : '';
  return `${status} : ${amountText(ceiling, m.unit)}${duration}.${thresholdText}`;
}

export function buildMedicationSheet(record) {
  const m = record.model;
  const variants = preparationVariants(m);
  const questions = [...record.protocol.questions];
  const presentation = record.ampoule?.description || presentations[record.id] || record.sourceCells[0] || 'Ampoule/flacon, quantité et concentration à renseigner.';
  if (!presentations[record.id] && !record.sourceCells[0]) questions.push('Renseigner la présentation disponible et sa reconstitution éventuelle.');
  if (containerUnknown.has(record.id) && !record.ampoule?.volumeMl) questions.push('Préciser le volume du contenant disponible ; la concentration seule est renseignée.');
  if ((record.id.startsWith('midazolam-') || record.id.startsWith('morphine-')) && record.ampoule?.status !== 'confirmé') questions.push('Confirmer la présentation de l’onglet Ampoules par rapport au stock effectivement embarqué.');
  if (record.id.startsWith('clonazepam-')) questions.push('Préciser l’utilisation du solvant fourni avec l’ampoule et son volume dans la préparation finale.');
  let administration = record.protocol.administration;
  if (administration === 'IV' && record.category !== 'antibiotiques') {
    administration = 'IV — durée ou vitesse non précisée';
    questions.push('Préciser IV directe, IV lente ou perfusion, avec la durée/vitesse.');
  }
  let doseRows;
  let preparations = preparationRows(record, variants);
  if (m.type === 'instruction') doseRows = [{ condition: 'Consigne', dose: record.protocol.posology, concentration: 'Sans objet', volume: 'Sans objet' }];
  else if (m.type === 'fixed-rate') {
    doseRows = [{ condition: 'Tous les poids · règle SMUR', dose: ['adrenaline-ivc', 'noradrenaline'].includes(record.id) ? '1 mg dans un volume final de 50 mL' : '50 mg dans un volume final de 50 mL', concentration: concentrationText(variants[0].concentration, m.unit), volume: 'Débit = poids (kg) ÷ 3 mL/h, puis arrondi final à 0,1 mL/h' }];
  } else if (record.id === 'tranexamique-ivc') {
    doseRows = [
      { condition: 'Âge < 10 ans · poids < 12,5 kg', dose: '10 mg/kg/h pendant 8 h = 80 mg/kg au total', concentration: '(80 × poids) ÷ 16 mg/mL', volume: '2 mL/h pendant 8 h' },
      { condition: 'Âge < 10 ans · poids ≥ 12,5 kg', dose: 'Plafond total : 1 000 mg sur 8 h', concentration: '62,5 mg/mL', volume: '2 mL/h pendant 8 h' },
      { condition: 'Âge ≥ 10 ans · tous poids', dose: '1 000 mg sur 8 h', concentration: '62,5 mg/mL', volume: '2 mL/h pendant 8 h' },
    ];
    questions.push('Préciser le diluant utilisé pour compléter à 16 mL.');
  } else if (record.id === 'clonazepam-ivc') doseRows = [
    { condition: 'Poids < 40 kg', dose: '0,1 mg/kg sur 6 h', concentration: '(0,1 × poids) ÷ 6 mg/mL', volume: '1 mL/h pendant 6 h' },
    { condition: 'Poids ≥ 40 kg', dose: '4 mg sur 6 h — plafond à confirmer', concentration: '(4 ÷ 6) mg/mL', volume: '1 mL/h pendant 6 h' },
  ];
  else if (record.id === 'calcium-gluconate') doseRows = [
    { condition: 'Schéma du tableau · à trancher', dose: '0,4 mL/kg de produit à 10 %, maximum 20 mL (à partir de 50 kg)', concentration: 'Produit initial : 9,1 mg/mL de calcium élément', volume: 'Après dilution : à déterminer. 0,4 mL/kg = 3,64 mg/kg de calcium élément avant plafond.' },
    { condition: 'Référence ERC 2025 · à trancher', dose: '0,5 mL/kg de produit à 10 %, maximum 20 mL (à partir de 40 kg)', concentration: 'Produit initial : 9,1 mg/mL de calcium élément', volume: 'Après dilution : à déterminer. 0,5 mL/kg = 4,55 mg/kg de calcium élément avant plafond.' },
  ];
  else if (record.id === 'triphosadenine') {
    doseRows = [{ condition: 'En suspens', dose: 'Posologie à documenter', concentration: 'Préparation finale à documenter', volume: 'Aucun calcul automatique' }];
    preparations = [{ condition: 'En suspens', text: 'Préparation et dilution à documenter.' }];
  }
  else doseRows = standardDoses(record, variants);

  if (record.id === 'morphine-ivc') questions.push('Le tableau applique 20 mcg/kg/h dès 3 mois ; Pédiadol décrit ce débit de 3 mois à 5 ans. Confirmer le schéma local au-delà de 5 ans.');
  if (record.id === 'insuline-glucose') questions.push('Le schéma local apporte 0,12 UI/kg d’insuline et 0,2 g/kg de glucose sur 20 min. Confirmer l’écart accepté avec l’ERC 2025 : 0,1 UI/kg (max. 10 UI) + G10 % 5 mL/kg (max. 250 mL) sur 30 min.');
  if (record.id === 'sufentanil') questions.push('L’onglet Ampoules contient aussi 250 mcg/10 mL : confirmer que la préparation présentée utilise bien 50 mcg/10 mL.');
  if (m.type === 'infusion' || m.type === 'fixed-rate') administration = 'IVSE — débit de pompe arrondi uniquement à la fin, au palier de 0,1 mL/h';
  if (record.ampoule?.comment) questions.push(record.ampoule.comment);
  return { presentation, doseRows, preparations: record.protocol.dilution === '' ? [] : preparations, administration, questions: [...new Set(questions)], ceiling: ceilingText(record), pendingCeiling: pendingCeilings[record.id] ?? null, particulars: record.protocol.particulars };
}
