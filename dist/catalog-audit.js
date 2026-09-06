import { catalogMeta } from './catalog-data.js';

const mass = Object.freeze({ g: 1000, mg: 1, mcg: .001, ng: .000001 });
const standalone = new Set(['mmol', 'mL', 'J']);

export function convertUnit(value, from, to) {
  if (!Number.isFinite(value)) throw new Error('Valeur non finie.');
  if (mass[from] && mass[to]) return value * mass[from] / mass[to];
  if (from === to && standalone.has(from)) return value;
  throw new Error(`Conversion non définie : ${from} vers ${to}.`);
}

function positive(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Paramètre arithmétique non valide.');
  return value;
}

export function concentration(model, unit) {
  if (!model.stock) return null;
  const s = model.stock;
  const initial = convertUnit(positive(s.amount), s.unit, unit) / positive(s.volumeMl);
  if (!model.mix) return initial;
  const take = positive(model.mix.takeMl);
  const added = model.mix.addMl;
  if (typeof added !== 'number' || !Number.isFinite(added) || added < 0) throw new Error('Volume de diluant non valide.');
  return initial * take / positive(take + added);
}

/** Audit of the imported 10 kg EXAMPLE ONLY. This function never accepts patient data. */
export function auditRecord(record) {
  if (record?.kind !== 'imported' || !record.model) throw new Error('Ligne importée attendue.');
  const m = record.model;
  const result = {
    recordId: record.id, kind: 'source-audit', clinicalUse: false,
    weightKg: catalogMeta.referenceWeightKg, weightConfirmed: false,
    issues: record.issues.map(item => ({ ...item })),
    discrepancies: [], calculable: false, dose: null, volumeMl: null,
    concentration: null, rateMlH: null, unit: m.unit ?? null,
  };
  if (m.type === 'unresolved' || m.type === 'instruction') return result;
  positive(m.coefficient);
  if (m.type === 'dose') {
    result.dose = m.coefficient * result.weightKg;
    if (m.unit === 'mL') result.volumeMl = result.dose;
    else {
      result.concentration = concentration(m, m.unit);
      if (result.concentration !== null) result.volumeMl = result.dose / positive(result.concentration);
    }
    if (m.referenceDose !== null && m.referenceDose !== undefined && Math.abs(m.referenceDose - result.dose) > 1e-8) {
      result.discrepancies.push({ code: 'dose-discrepancy', supplied: m.referenceDose, expected: result.dose, unit: m.unit });
    }
    if (m.referenceVolume !== null && m.referenceVolume !== undefined && result.volumeMl !== null) {
      const halfLastDigit = .5 * 10 ** -(m.decimals ?? 0);
      if (Math.abs(m.referenceVolume - result.volumeMl) > halfLastDigit + 1e-9) {
        result.discrepancies.push({ code: 'volume-discrepancy', supplied: m.referenceVolume, expected: result.volumeMl, unit: 'mL' });
      }
    }
    if (m.massPerMl !== undefined) {
      result.mass = result.volumeMl * positive(m.massPerMl);
      result.massUnit = m.massUnit;
      if (m.referenceMass !== undefined && Math.abs(result.mass - m.referenceMass) > 1e-8) {
        result.discrepancies.push({ code: 'mass-discrepancy', supplied: m.referenceMass, expected: result.mass, unit: m.massUnit });
      }
    }
  } else if (m.type === 'infusion') {
    result.concentration = concentration(m, m.unit);
    positive(result.concentration);
    result.hourlyAmount = m.coefficient * result.weightKg * 60 / positive(m.periodMinutes);
    result.rateMlH = result.hourlyAmount / result.concentration;
    result.sourceEquivalentCoefficient = positive(m.referenceRate) * result.concentration / result.weightKg * m.periodMinutes / 60;
    const relativeDifference = (m.referenceRate - result.rateMlH) / result.rateMlH;
    if (Math.abs(relativeDifference) > 1e-8) {
      result.discrepancies.push({
        code: 'rate-discrepancy', supplied: m.referenceRate, expected: result.rateMlH,
        unit: 'mL/h', relativePercent: relativeDifference * 100,
      });
    }
    if (m.mix) {
      result.mixtureVolumeMl = m.mix.takeMl + m.mix.addMl;
      result.theoreticalDurationHours = result.mixtureVolumeMl / result.rateMlH;
    }
  } else throw new Error('Type de contrôle inconnu.');
  for (const key of ['dose', 'volumeMl', 'rateMlH', 'concentration']) {
    if (result[key] !== null) positive(result[key]);
  }
  result.calculable = true;
  return result;
}

export function reviewState(record, audit = auditRecord(record)) {
  if (audit.discrepancies.length) return { code: 'difference', label: 'Écart numérique' };
  if (record.model.type === 'unresolved') return { code: 'unresolved', label: 'Calcul indéterminé' };
  if (audit.issues.length) return { code: 'clarify', label: 'À préciser' };
  return { code: 'pending', label: 'À relire' };
}

export function prescriptionForRecord() {
  throw new Error('Les lignes importées ne sont pas des protocoles cliniques validés. Aucune prescription patient disponible.');
}
