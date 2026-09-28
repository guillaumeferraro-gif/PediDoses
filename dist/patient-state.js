// Shared only in memory: changing tabs never changes the patient or stores their data.
import {clearDoseSettings} from './dose-adjustments.js';
let input = Object.freeze({ weight: '', age: '', ageUnit: 'years' });
const listeners = new Set();
export const getPatientInput = () => input;
export function setPatientInput(next, source) {
  const value = { weight: String(next.weight ?? ''), age: String(next.age ?? ''), ageUnit: next.ageUnit === 'months' ? 'months' : 'years' };
  if (Object.keys(value).every(key => input[key] === value[key])) return;
  input = Object.freeze(value);
  clearDoseSettings({notify:false});
  for (const listener of listeners) listener(input, source);
}
export function subscribePatientInput(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
