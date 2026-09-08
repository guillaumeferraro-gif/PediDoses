import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, ageInMonths, calculateSimulation } from '../dist/calculator.js';
import { demoProtocol, clinicalCatalog } from '../dist/protocols.js';

const valid = { weight: '12,5', age: '3', ageUnit: 'years', confirmed: true };
const compute = (input = {}, protocol = demoProtocol) => calculateSimulation({ ...valid, ...input }, protocol);
const codeIs = code => error => error?.code === code;

test('accepte les décimales françaises sans multiplier la valeur par mille', () => {
  assert.equal(parseDecimal('12,5'), 12.5);
  assert.equal(parseDecimal(' 12.5 '), 12.5);
  assert.equal(parseDecimal('0,001'), 0.001);
  assert.equal(ageInMonths('1,5', 'years'), 18);
});

test('rejette les saisies manquantes, ambiguës, négatives et non finies', () => {
  for (const value of ['', ' ', '-2', '+2', '1e3', '12,5.0', '1 000', '12 kg', 'Infinity', 'NaN', null, undefined, false, {}, '9'.repeat(400)]) {
    assert.throws(() => parseDecimal(value), codeIs('invalid-number'), String(value));
  }
});

test('calcule indépendamment dose puis volume pour le cas témoin', () => {
  const result = compute();
  assert.equal(result.dose, 21.25);
  assert.equal(result.volumeMl, 5.3125);
  assert.equal(result.ageMonths, 36);
  assert.equal(result.capped, false);
  assert.equal(result.kind, 'simulation');
  assert.equal(result.protocolVersion, 'DEMO-1.0');
});

test('applique le plafond AVANT la conversion en volume', () => {
  const result = compute({ weight: '30' });
  assert.equal(result.uncappedDose, 51);
  assert.equal(result.dose, 29);
  assert.equal(result.volumeMl, 7.25);
  assert.equal(result.capped, true);
});

test('accepte les bornes exactes et rejette les valeurs au-delà', () => {
  assert.doesNotThrow(() => compute({ weight: '1', age: '1', ageUnit: 'months' }));
  assert.doesNotThrow(() => compute({ weight: '100', age: '215', ageUnit: 'months' }));
  for (const weight of ['0', '0.999', '100.001']) assert.throws(() => compute({ weight }), codeIs('weight-out-of-range'));
  for (const age of ['0', '0.99', '215.01']) assert.throws(() => compute({ age, ageUnit: 'months' }), codeIs('age-out-of-range'));
  assert.throws(() => compute({ age: '18', ageUnit: 'years' }), codeIs('age-out-of-range'));
  assert.throws(() => compute({ ageUnit: 'days' }), codeIs('invalid-age-unit'));
});

test('exige une confirmation explicite pour chaque cas fictif', () => {
  for (const confirmed of [false, undefined, null, 'true', 1]) {
    assert.throws(() => compute({ confirmed }), codeIs('confirmation-required'));
  }
});

test('rejette les protocoles cliniques et les unités médicamenteuses', () => {
  assert.equal(clinicalCatalog.protocols.length, 62);
  assert.equal(clinicalCatalog.status, 'imported-unvalidated');
  assert.equal(clinicalCatalog.jurisdiction, 'France');
  for (const protocol of clinicalCatalog.protocols) {
    assert.throws(() => compute({}, protocol), codeIs('clinical-disabled'));
  }
  for (const protocol of [null, {}, { ...demoProtocol, kind: 'clinical', validated: true }, { ...demoProtocol, unit: 'mg' }, { ...demoProtocol, unit: 'µg' }]) {
    assert.throws(() => compute({}, protocol), codeIs('clinical-disabled'));
  }
});

test('bloque les concentrations nulles et les règles invalides', () => {
  for (const key of ['concentrationPerMl', 'dosePerKg', 'maximumDose', 'minWeightKg', 'maxWeightKg', 'minAgeMonths', 'maxAgeMonths']) {
    for (const value of [0, -1, NaN, Infinity, undefined, '4']) {
      assert.throws(() => compute({}, { ...demoProtocol, [key]: value }), codeIs('invalid-protocol'), key);
    }
  }
  assert.throws(() => compute({}, { ...demoProtocol, minWeightKg: 101 }), codeIs('invalid-protocol'));
  assert.throws(() => compute({}, { ...demoProtocol, minAgeMonths: 216 }), codeIs('invalid-protocol'));
});

test('refuse un résultat non fini et ne fait pas d’arrondi d’administration', () => {
  assert.throws(() => compute({}, { ...demoProtocol, dosePerKg: Number.MAX_VALUE }), codeIs('invalid-result'));
  const result = compute({ weight: '1' }, { ...demoProtocol, dosePerKg: 1, concentrationPerMl: 3 });
  assert.equal(result.volumeMl, 1 / 3);
});
