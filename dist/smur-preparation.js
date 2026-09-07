import { concentration } from './catalog-audit.js';

// These variants feed both the review sheets and the patient calculation.
// No display rounding belongs in this module.
export function preparationVariants(model) {
  const variants = model.weightMix ? [
    { condition: `Poids < ${model.weightMix.thresholdKg} kg`, maxWeightKgExclusive: model.weightMix.thresholdKg, mix: model.weightMix.below },
    { condition: `Poids ≥ ${model.weightMix.thresholdKg} kg`, minWeightKg: model.weightMix.thresholdKg, mix: model.weightMix.atOrAbove },
  ] : [{ condition: 'Tous les paliers', mix: model.mix }];
  return variants.map(variant => ({
    ...variant,
    concentration: model.stock ? concentration({ ...model, mix: variant.mix }, model.unit) : null,
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
