import { concentration } from './catalog-audit.js';

// These variants feed both the review sheets and the patient calculation.
// No display rounding belongs in this module.
export function preparationVariants(model) {
  const variants = model.weightMixes ? model.weightMixes.map(item => ({
    ...item,
    condition: item.minWeightKg === undefined ? `Poids < ${item.maxWeightKgExclusive} kg` : item.maxWeightKgExclusive === undefined ? `Poids ≥ ${item.minWeightKg} kg` : `${item.minWeightKg} kg ≤ poids < ${item.maxWeightKgExclusive} kg`,
  })) : model.weightMix ? [
    { condition: `Poids < ${model.weightMix.thresholdKg} kg`, maxWeightKgExclusive: model.weightMix.thresholdKg, mix: model.weightMix.below },
    { condition: `Poids ≥ ${model.weightMix.thresholdKg} kg`, minWeightKg: model.weightMix.thresholdKg, mix: model.weightMix.atOrAbove },
  ] : [{ condition: 'Tous les paliers', mix: model.mix }];
  return variants.map(variant => ({
    ...variant,
    concentration: model.finalConcentration ?? (model.stock ? concentration({ ...model, mix: variant.mix }, model.unit) : null),
    stockConcentration: model.stock ? concentration({ ...model, mix: null }, model.unit) : null,
    takeMl: variant.mix?.takeMl ?? null,
    addMl: variant.mix?.addMl ?? null,
    finalVolumeMl: variant.mix ? variant.mix.takeMl + variant.mix.addMl : null,
    diluent: model.diluent,
  }));
}

export function preparationForWeight(model, weightKg) {
  return preparationVariants(model).find(variant =>
    (variant.minWeightKg === undefined || weightKg >= variant.minWeightKg) &&
    (variant.maxWeightKgExclusive === undefined || weightKg < variant.maxWeightKgExclusive));
}

export function modelForSecondDose(model) {
  if (model.secondCoefficient === undefined) return null;
  const next = { ...model, coefficient: model.secondCoefficient, maximumDose: model.secondMaximumDose ?? null };
  delete next.secondCoefficient;
  delete next.secondMaximumDose;
  return next;
}

// The diluent is the only rounded input: recompute the actual final concentration from it.
export function preparationForDose(model, dose, stockConcentration) {
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if (!positive(dose) || !positive(stockConcentration)) throw new Error('Dose ou concentration de l’ampoule invalide.');
  const withdrawalMl = dose / stockConcentration;
  let volumeMl, addMl;
  if (model.preparationMode === 'fixed-volume') {
    volumeMl = model.finalVolumeMl;
    if (!positive(volumeMl) || withdrawalMl > volumeMl) throw new Error('Le prélèvement dépasse le volume final de la préparation.');
    addMl = volumeMl - withdrawalMl;
  } else if (model.preparationMode === 'concentration-range') {
    const min = model.minimumFinalConcentration, target = model.targetFinalConcentration;
    if (!positive(min) || !positive(target) || min > target || stockConcentration < min) throw new Error('Plage de concentration impossible avec cette ampoule.');
    const required = Math.max(0, dose / target - withdrawalMl);
    const steps = [model.diluentRoundingMl, model.fineDiluentRoundingMl];
    if (steps.some(step => !positive(step))) throw new Error('Arrondi du diluant invalide.');
    for (const step of steps) {
      const ratio = required / step;
      const rounded = Math.ceil(ratio - 4 * Number.EPSILON * Math.max(1, ratio)) * step;
      const final = dose / (withdrawalMl + rounded);
      if (final >= min * (1 - 1e-12) && final <= target * (1 + 1e-12)) {
        addMl = Number(rounded.toPrecision(14));
        break;
      }
    }
    if (addMl === undefined) throw new Error('Les arrondis de diluant ne permettent pas de respecter la concentration finale.');
    volumeMl = withdrawalMl + addMl;
  } else throw new Error('Mode de préparation non reconnu.');
  return { withdrawalMl, addMl, volumeMl, mixtureVolumeMl: volumeMl, concentration: dose / volumeMl };
}
