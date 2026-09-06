import { CalculationError, parseDecimal, ageInMonths } from './calculator.js';
import { concentration } from './catalog-audit.js';

// Technical input bounds, not a statement of clinical eligibility.
export const weightBounds = Object.freeze({ min: 0.5, max: 200 });
export const weightEstimation = Object.freeze({
  name: 'APLS', minAgeMonths: 1, maxAgeMonths: 144,
  source: 'https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/bcp.12876',
});

const present = value => value !== undefined && value !== null && String(value).trim() !== '';
function error(code, message, field) {
  const failure = new CalculationError(code, message);
  failure.field = field;
  throw failure;
}
function positive(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new CalculationError('invalid-result', 'Paramètre de calcul non valide.');
  }
  return value;
}
function validateWeight(weightKg) {
  if (!Number.isFinite(weightKg) || weightKg < weightBounds.min || weightKg > weightBounds.max) {
    error('weight-out-of-range', 'Poids : saisissez une valeur entre 0,5 et 200 kg. Vérifiez l’unité.', 'weight');
  }
}

/** Age-only fallback. No extrapolation to newborns or beyond 12 years. */
export function estimateWeightKg(months) {
  if (!Number.isFinite(months) || months < weightEstimation.minAgeMonths || months > weightEstimation.maxAgeMonths) {
    error('estimation-unavailable', 'Estimation disponible de 1 mois à 12 ans. Renseignez le poids connu.', 'age');
  }
  const years = months / 12;
  if (months < 12) return Object.freeze({ weightKg: 0.5 * months + 4, formula: '0,5 × âge en mois + 4' });
  if (months < 72) return Object.freeze({ weightKg: 2 * years + 8, formula: '2 × âge en années + 8' });
  return Object.freeze({ weightKg: 3 * years + 7, formula: '3 × âge en années + 7' });
}

/** A non-empty measured-weight field must be valid; never silently fall back. */
export function resolvePatientContext({ weight = '', age = '', ageUnit = 'years' } = {}) {
  let ageMonths = null;
  if (present(age)) {
    try { ageMonths = ageInMonths(age, ageUnit); }
    catch (failure) { failure.field = 'age'; throw failure; }
    if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 216) {
      error('age-out-of-range', 'Âge : saisissez une valeur de 0 à 18 ans (216 mois).', 'age');
    }
    // Avoid a unit-conversion roundoff pushing an exact month over a boundary.
    ageMonths = Math.round(ageMonths * 1e9) / 1e9;
  }
  if (present(weight)) {
    let weightKg;
    try { weightKg = parseDecimal(weight, 'Poids'); }
    catch (failure) { failure.field = 'weight'; throw failure; }
    validateWeight(weightKg);
    return Object.freeze({ weightKg, ageMonths, weightSource: 'measured', formula: null });
  }
  if (ageMonths === null) return null;
  const estimate = estimateWeightKg(ageMonths);
  return Object.freeze({ ...estimate, ageMonths, weightSource: 'estimated' });
}

// Known source ambiguities that must not become weight-adjusted doses.
const blockingIssues = new Set(['ketamine-route', 'ij-route', 'combination-basis']);

/** Arithmetic using documented source coefficients, never a prescription. */
export function calculateRecordForPatient(record, context) {
  if (!record?.model) throw new CalculationError('invalid-record', 'Ligne de calcul absente.');
  const m = record.model;
  const result = {
    recordId: record.id, clinicalUse: false, status: 'empty', message: 'Renseignez l’âge ou le poids.',
    weightKg: null, weightSource: null, dose: null, unit: m.unit ?? null,
    volumeMl: null, rateMlH: null, hourlyAmount: null, concentration: null,
    mass: null, massUnit: null, mixtureVolumeMl: null, theoreticalDurationHours: null,
    maximumApplied: false,
  };
  const blocked = message => Object.freeze({ ...result, status: 'blocked', message });
  if (m.type === 'instruction') return Object.freeze({ ...result, status: 'instruction', message: 'Consigne du tableau, sans calcul.' });
  if (!context) return Object.freeze(result);
  validateWeight(context.weightKg);
  if (!['measured', 'estimated'].includes(context.weightSource) ||
      (context.ageMonths !== null && (!Number.isFinite(context.ageMonths) || context.ageMonths < 0 || context.ageMonths > 216))) {
    throw new CalculationError('invalid-context', 'Âge ou origine du poids non valide.');
  }
  result.weightKg = context.weightKg;
  result.weightSource = context.weightSource;
  if (context.ageMonths !== null && context.ageMonths < 1) return blocked('Nouveau-né : protocole spécifique à renseigner.');
  if (m.type === 'unresolved') return blocked('Données sources à clarifier.');
  if (record.issues?.some(issue => blockingIssues.has(issue.code))) return blocked('Voie ou expression de dose à confirmer.');
  if (m.minimumAgeMonthsExclusive !== undefined) {
    if (context.ageMonths === null) return blocked('Âge nécessaire : uniquement au-delà de 2 ans.');
    if (context.ageMonths <= m.minimumAgeMonthsExclusive) return blocked('Restriction du tableau : âge strictement supérieur à 2 ans.');
  }
  if (!['g', 'mg', 'mcg', 'ng', 'mmol', 'mL', 'J'].includes(m.unit)) {
    throw new CalculationError('invalid-unit', 'Unité de calcul non reconnue.');
  }
  const coefficient = positive(m.coefficient);
  if (m.type === 'dose') {
    result.dose = positive(coefficient * context.weightKg);
    if (m.unit === 'mL') result.volumeMl = result.dose;
    else if (m.unit !== 'J') {
      result.concentration = concentration(m, m.unit);
      if (result.concentration !== null) result.volumeMl = positive(result.dose / positive(result.concentration));
    }
    if (m.massPerMl !== undefined) {
      result.mass = positive(result.volumeMl * positive(m.massPerMl));
      result.massUnit = m.massUnit;
    }
  } else if (m.type === 'infusion') {
    result.concentration = positive(concentration(m, m.unit));
    result.hourlyAmount = positive(coefficient * context.weightKg * 60 / positive(m.periodMinutes));
    result.rateMlH = positive(result.hourlyAmount / result.concentration);
    if (m.mix) {
      result.mixtureVolumeMl = positive(m.mix.takeMl + m.mix.addMl);
      result.theoreticalDurationHours = positive(result.mixtureVolumeMl / result.rateMlH);
    }
  } else throw new CalculationError('invalid-model', 'Type de calcul non reconnu.');
  return Object.freeze({ ...result, status: 'calculated', message: 'Calcul arithmétique sans plafond clinique.' });
}

export function calculateAllRecords(records, context) {
  return new Map(records.map(record => {
    try { return [record.id, calculateRecordForPatient(record, context)]; }
    catch { return [record.id, Object.freeze({ recordId: record.id, status: 'blocked', clinicalUse: false, message: 'Calcul indisponible : données de cette ligne à vérifier.', dose: null, volumeMl: null, rateMlH: null })]; }
  }));
}
