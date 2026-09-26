import { preparationForWeight } from './smur-preparation.js';

// Null is intentional: increments must be supplied by the clinical user.
// Keys ending in :fixed refer to a fixed hourly dose instead of a weight-based one.
export const doseSteps = Object.freeze({
  'tranexamique-ivc': null, 'tranexamique-ivc:fixed': null,
  'adrenaline-ivc': null, alprostadil: null, 'atracurium-ivc': null,
  'clonazepam-ivc': null, dobutamine: null, dopamine: null,
  isoprenaline: null, 'midazolam-ivc': null, 'morphine-ivc': null,
  noradrenaline: null, nicardipine: null, 'nicardipine-charge': null,
  'salbutamol-ivc': null, sufentanil: null,
});

export function doseDefinition(record, context) {
  if (!record.adjustable) return null;
  const m = record.model;
  let initial = m.coefficient, mode = 'coefficient';
  let unit = `${m.unit}/kg${m.type === 'infusion' ? m.periodMinutes === 60 ? '/h' : '/min' : m.durationHours ? `/${m.durationHours} h` : ''}`;
  if (m.type === 'fixed-rate') {
    // Preserve the existing weight/3 starting rate, expressing its actual dose.
    initial = preparationForWeight(m, context?.weightKg ?? 10).concentration / (60 * m.rateDivisor);
    unit = `${m.unit}/kg/min`;
  }
  if (m.fixedHourlyFromAgeMonths !== undefined && context?.ageMonths == null) return {key:record.id, initial:null, unit, step:null, min:0, max:null, mode};
  if (m.fixedHourlyFromAgeMonths !== undefined && context.ageMonths >= m.fixedHourlyFromAgeMonths) {
    initial = m.fixedHourlyAmount; mode = 'hourly'; unit = `${m.unit}/h`;
  }
  let max = m.maximumCoefficient ?? null;
  if (m.type === 'fixed-duration-mixture' && context && Number.isFinite(m.maximumDose)) {
    max = m.maximumDose / context.weightKg;
    initial = Math.min(initial, max);
  }
  const key = record.id + (mode === 'hourly' ? ':fixed' : '');
  return {key, initial, unit, mode, min:m.minimumCoefficient ?? 0, max, step:doseSteps[key] ?? null};
}

export function nextDoseValue(definition, value, direction, step = definition.step) {
  if (!Number.isFinite(step) || step <= 0) throw new Error('Pas de réglage à définir.');
  if (!Number.isFinite(value) || value <= 0 || ![-1,1].includes(direction)) throw new Error('Réglage de posologie invalide.');
  const raw = value + direction * step;
  const next = Number(raw.toPrecision(14));
  if (next <= 0 || next < definition.min) return value;
  return definition.max !== null ? Math.min(next, definition.max) : next;
}

export function recordWithDose(record, context, selection) {
  const definition = doseDefinition(record, context);
  if (!definition || !selection || selection.mode !== definition.mode) return record;
  let value = selection.value;
  if (!Number.isFinite(value) || value <= 0 || value < definition.min) throw new Error('Posologie invalide.');
  if (definition.max !== null) value = Math.min(value, definition.max);
  const model = {...record.model};
  if (definition.mode === 'hourly') model.selectedHourlyAmount = value;
  else {
    model.coefficient = value;
    if (model.type === 'fixed-rate') { model.type='infusion'; model.periodMinutes=1; }
  }
  return {...record, model, selectedDose:{...selection,value}};
}

const selections = new Map();
const listeners = new Set();
export const subscribeDoseSettings = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export function clearDoseSettings() { selections.clear(); for(const listener of listeners) listener(); }
export function currentDose(record, context) {
  const definition=doseDefinition(record,context);
  if (!definition) return null;
  const selected=selections.get(record.id);
  const value=selected?.mode===definition.mode ? selected.value : definition.initial;
  return {...definition, value:value===null ? null : definition.max===null ? value : Math.min(value,definition.max)};
}
export function changeDose(record,context,direction) {
  const dose=currentDose(record,context);
  if (!context || !dose) return;
  const value=nextDoseValue(dose,dose.value,direction);
  selections.set(record.id,{value,mode:dose.mode});
  for(const listener of listeners) listener();
}
export const withCurrentDose = (record,context) => recordWithDose(record,context,selections.get(record.id));
