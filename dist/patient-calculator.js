import { CalculationError, parseDecimal, ageInMonths } from './calculator.js';
import { concentration } from './catalog-audit.js';
import { preparationForWeight } from './smur-preparation.js';

export const weightBounds = Object.freeze({ min: 0.5, max: 200 });
export const infantWeightTable = Object.freeze([3, 3.5, 4.2, 5, 6, 6, 7, 8, 8, 9, 9, 10]);
export const weightEstimation = Object.freeze({ name: 'Table locale puis (âge + 4) × 2', minAgeMonths: 0, maxAgeMonths: 216 });

const present = value => value !== undefined && value !== null && String(value).trim() !== '';
const round = (value, decimals) => Number(value.toFixed(decimals));
function error(code, message, field) {
  const failure = new CalculationError(code, message); failure.field = field; throw failure;
}
function positive(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new CalculationError('invalid-result', 'Paramètre de calcul non valide.');
  return value;
}
function validateWeight(weightKg) {
  if (!Number.isFinite(weightKg) || weightKg < weightBounds.min || weightKg > weightBounds.max) error('weight-out-of-range', 'Poids : saisissez une valeur entre 0,5 et 200 kg. Vérifiez l’unité.', 'weight');
}

export function estimateWeightKg(months) {
  if (!Number.isFinite(months) || months < 0 || months > 216) error('estimation-unavailable', 'Estimation disponible de la naissance à 18 ans. Renseignez le poids connu si nécessaire.', 'age');
  if (months < 12) {
    const index = Math.min(11, Math.floor(months));
    return Object.freeze({ weightKg: infantWeightTable[index], formula: `table locale : ${index} mois → ${infantWeightTable[index]} kg` });
  }
  const years = months / 12;
  return Object.freeze({ weightKg: (years + 4) * 2, formula: '(âge en années + 4) × 2' });
}

export function resolvePatientContext({ weight = '', age = '', ageUnit = 'years' } = {}) {
  let ageMonths = null;
  if (present(age)) {
    try { ageMonths = ageInMonths(age, ageUnit); } catch (failure) { failure.field = 'age'; throw failure; }
    if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 216) error('age-out-of-range', 'Âge : saisissez une valeur de 0 à 18 ans (216 mois).', 'age');
    ageMonths = round(ageMonths, 9);
  }
  if (present(weight)) {
    let weightKg;
    try { weightKg = parseDecimal(weight, 'Poids'); } catch (failure) { failure.field = 'weight'; throw failure; }
    validateWeight(weightKg);
    return Object.freeze({ weightKg, ageMonths, weightSource: 'measured', formula: null });
  }
  if (ageMonths === null) return null;
  return Object.freeze({ ...estimateWeightKg(ageMonths), ageMonths, weightSource: 'estimated' });
}

function effectiveCoefficient(model, context) {
  if (!model.tiers) return model.coefficient;
  if (context.ageMonths === null) throw new CalculationError('age-required', 'Âge nécessaire pour appliquer le palier de posologie.');
  return model.tiers.find(item => item.maxAgeMonthsExclusive === undefined || context.ageMonths < item.maxAgeMonthsExclusive)?.coefficient;
}
function effectiveDose(model, context, coefficient) {
  let dose = coefficient * context.weightKg;
  if (model.fixedDoseFromWeightKg !== undefined && context.weightKg >= model.fixedDoseFromWeightKg) dose = model.fixedDose;
  if (model.fixedDoseFromAgeMonths !== undefined) {
    if (context.ageMonths === null) throw new CalculationError('age-required', 'Âge nécessaire pour appliquer le palier de posologie.');
    if (context.ageMonths >= model.fixedDoseFromAgeMonths) dose = model.fixedDose;
  }
  const uncappedDose = dose;
  if (Number.isFinite(model.maximumDose)) dose = Math.min(dose, model.maximumDose);
  return { dose, uncappedDose, maximumApplied: dose < uncappedDose };
}

export function calculateRecordForPatient(record, context) {
  if (!record?.model) throw new CalculationError('invalid-record', 'Ligne de calcul absente.');
  const m = record.model;
  const result = {
    recordId: record.id, clinicalUse: false, status: 'empty', message: 'Renseignez l’âge ou le poids.',
    weightKg: null, weightSource: null, dose: null, uncappedDose: null, unit: m.unit ?? null,
    coefficient: null, volumeMl: null, withdrawalMl: null, addMl: null, rateMlH: null, exactRateMlH: null, hourlyAmount: null, concentration: null,
    preparation: null, stockConcentration: null,
    mass: null, massUnit: null, mixtureVolumeMl: null, theoreticalDurationHours: null, maximumApplied: false,
  };
  if (m.type === 'instruction') return Object.freeze({ ...result, status: 'instruction', message: record.protocol?.posology || 'Consigne sans calcul.' });
  if (m.type === 'unresolved') return Object.freeze({ ...result, status: 'blocked', message: m.blockReason || 'Données à confirmer avant calcul.' });
  if (!context) return Object.freeze(result);
  validateWeight(context.weightKg);
  if (!['measured', 'estimated'].includes(context.weightSource) || (context.ageMonths !== null && (!Number.isFinite(context.ageMonths) || context.ageMonths < 0 || context.ageMonths > 216))) throw new CalculationError('invalid-context', 'Âge ou origine du poids non valide.');
  result.weightKg = context.weightKg; result.weightSource = context.weightSource;
  result.preparation = preparationForWeight(m, context.weightKg);
  result.stockConcentration = result.preparation.stockConcentration;
  if (m.minimumAgeMonthsExclusive !== undefined) {
    if (context.ageMonths === null) return Object.freeze({ ...result, status: 'blocked', message: 'Âge nécessaire pour cette posologie.' });
    if (context.ageMonths <= m.minimumAgeMonthsExclusive) return Object.freeze({ ...result, status: 'blocked', message: 'Non calculé : âge hors du palier indiqué.' });
  }
  if (m.type === 'fixed-rate') {
    result.exactRateMlH = context.weightKg / positive(m.rateDivisor);
    result.rateMlH = round(result.exactRateMlH, 1);
    result.concentration = result.preparation.concentration;
    result.mixtureVolumeMl = result.preparation.finalVolumeMl;
    return Object.freeze({ ...result, status: 'calculated', message: 'Débit du protocole SMUR arrondi à 0,1 mL/h.' });
  }
  if (m.type === 'conditional-dose') {
    const selected = m.cases.find(item => item.maxWeightKg === undefined || context.weightKg <= item.maxWeightKg);
    result.dose = positive(selected.dose); result.uncappedDose = result.dose;
    result.concentration = concentration(m, m.unit);
    if (result.concentration !== null) result.volumeMl = result.dose / result.concentration;
    return Object.freeze({ ...result, status: 'calculated', message: 'Palier de poids appliqué.' });
  }
  const coefficient = positive(effectiveCoefficient(m, context)); result.coefficient = coefficient;
  Object.assign(result, effectiveDose(m, context, coefficient));
  if (m.type === 'fixed-duration-mixture') {
    result.withdrawalMl = result.dose / positive(result.stockConcentration);
    result.mixtureVolumeMl = positive(m.finalVolumeMl);
    result.addMl = result.mixtureVolumeMl - result.withdrawalMl;
    if (result.addMl < 0) throw new CalculationError('invalid-preparation', 'Le volume de produit dépasse le volume final.');
    result.concentration = result.dose / result.mixtureVolumeMl;
    result.exactRateMlH = result.mixtureVolumeMl / positive(m.durationHours);
    result.rateMlH = round(result.exactRateMlH, 1);
    result.theoreticalDurationHours = m.durationHours;
    return Object.freeze({ ...result, status: 'calculated', message: 'Préparation calculée sans arrondi intermédiaire ; débit arrondi à 0,1 mL/h.' });
  }
  if (m.type === 'dose') {
    if (m.unit === 'mL') result.volumeMl = result.dose;
    else if (m.unit !== 'J') {
      result.concentration = result.preparation.concentration;
      if (result.concentration !== null) result.volumeMl = result.dose / positive(result.concentration);
    }
    if (m.volumePerDose !== undefined) result.volumeMl = result.dose * positive(m.volumePerDose);
    if (m.massPerMl !== undefined && result.volumeMl !== null) { result.mass = result.volumeMl * positive(m.massPerMl); result.massUnit = m.massUnit; }
    if (m.volumeKind === 'withdrawal') {
      result.withdrawalMl = result.volumeMl;
      result.volumeMl = null;
      result.concentration = null;
    }
  } else if (m.type === 'infusion') {
    result.dose = null; result.uncappedDose = null;
    result.concentration = positive(result.preparation.concentration);
    result.hourlyAmount = coefficient * context.weightKg * 60 / positive(m.periodMinutes);
    const exactRate = result.hourlyAmount / result.concentration;
    result.exactRateMlH = exactRate;
    result.rateMlH = round(exactRate, 1);
    if (result.preparation.finalVolumeMl) { result.mixtureVolumeMl = result.preparation.finalVolumeMl; result.theoreticalDurationHours = result.mixtureVolumeMl / exactRate; }
  } else throw new CalculationError('invalid-model', 'Type de calcul non reconnu.');
  return Object.freeze({ ...result, status: 'calculated', message: result.maximumApplied ? 'Plafond du modèle appliqué ; statut précisé dans la fiche.' : 'Calcul effectué sans arrondi intermédiaire.' });
}

export function calculateAllRecords(records, context) {
  return new Map(records.map(record => {
    try { return [record.id, calculateRecordForPatient(record, context)]; }
    catch (failure) { return [record.id, Object.freeze({ recordId: record.id, status: 'blocked', clinicalUse: false, message: failure.message || 'Calcul indisponible.', dose: null, volumeMl: null, rateMlH: null })]; }
  }));
}
