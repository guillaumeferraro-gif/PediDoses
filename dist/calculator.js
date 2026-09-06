export class CalculationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CalculationError';
    this.code = code;
  }
}

/** Reject ambiguous separators, exponent notation, signs and missing values. */
export function parseDecimal(value, label = 'Valeur') {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new CalculationError('invalid-number', `${label} : saisissez un nombre.`);
  }
  const text = String(value).trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) {
    throw new CalculationError('invalid-number', `${label} : utilisez un nombre simple, par exemple 12,5.`);
  }
  const number = Number(text.replace(',', '.'));
  if (!Number.isFinite(number)) {
    throw new CalculationError('invalid-number', `${label} : valeur non valide.`);
  }
  return number;
}

export function ageInMonths(value, unit) {
  if (!['months', 'years'].includes(unit)) {
    throw new CalculationError('invalid-age-unit', 'Choisissez une unité d’âge.');
  }
  const age = parseDecimal(value, 'Âge');
  return age * (unit === 'years' ? 12 : 1);
}

export function validateDemoProtocol(protocol) {
  // This release cannot execute clinical protocols, even if a caller marks one validated.
  if (protocol?.kind !== 'simulation' || protocol?.unit !== 'u. démo') {
    throw new CalculationError('clinical-disabled', 'Le calcul clinique est désactivé dans cette version.');
  }
  for (const key of ['dosePerKg', 'maximumDose', 'concentrationPerMl', 'minWeightKg', 'maxWeightKg', 'minAgeMonths', 'maxAgeMonths']) {
    if (typeof protocol[key] !== 'number' || !Number.isFinite(protocol[key]) || protocol[key] <= 0) {
      throw new CalculationError('invalid-protocol', 'Le protocole de simulation est incomplet ou non valide.');
    }
  }
  if (protocol.minWeightKg > protocol.maxWeightKg || protocol.minAgeMonths > protocol.maxAgeMonths) {
    throw new CalculationError('invalid-protocol', 'Les bornes de simulation ne sont pas cohérentes.');
  }
}

export function calculateSimulation({ weight, age, ageUnit, confirmed }, protocol) {
  validateDemoProtocol(protocol);
  const weightKg = parseDecimal(weight, 'Poids');
  const months = ageInMonths(age, ageUnit);
  if (weightKg < protocol.minWeightKg || weightKg > protocol.maxWeightKg) {
    throw new CalculationError('weight-out-of-range', `Pour ce test, saisissez un poids de ${protocol.minWeightKg} à ${protocol.maxWeightKg} kg. Ces bornes sont fictives.`);
  }
  if (months < protocol.minAgeMonths || months > protocol.maxAgeMonths) {
    throw new CalculationError('age-out-of-range', `Pour ce test, saisissez un âge de ${protocol.minAgeMonths} à ${protocol.maxAgeMonths} mois. Le nouveau-né n’est pas couvert par cette simulation.`);
  }
  if (confirmed !== true) {
    throw new CalculationError('confirmation-required', 'Confirmez que vous utilisez uniquement un cas fictif.');
  }
  const uncappedDose = weightKg * protocol.dosePerKg;
  const dose = Math.min(uncappedDose, protocol.maximumDose);
  const volumeMl = dose / protocol.concentrationPerMl;
  if (![uncappedDose, dose, volumeMl].every(n => Number.isFinite(n) && n > 0)) {
    throw new CalculationError('invalid-result', 'Le résultat ne peut pas être calculé.');
  }
  return Object.freeze({
    kind: 'simulation',
    protocolId: protocol.id,
    protocolVersion: protocol.version,
    weightKg,
    ageMonths: months,
    uncappedDose,
    dose,
    volumeMl,
    capped: uncappedDose > protocol.maximumDose,
    unit: protocol.unit,
  });
}
