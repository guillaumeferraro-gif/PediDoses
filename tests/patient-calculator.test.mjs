import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogRecords, categories } from '../dist/catalog-data.js';
import { smurRecords, smurCategories, isofundine } from '../dist/smur-data.js';
import { resolvePatientContext, estimateWeightKg, calculateRecordForPatient, calculateAllRecords } from '../dist/patient-calculator.js';

const row = id => smurRecords.find(record => record.id === id);
const patient = (weight = '10', age = '3', ageUnit = 'years') => resolvePatientContext({ weight, age, ageUnit });
const calculate = (id, context = patient()) => calculateRecordForPatient(row(id), context);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('estimation APLS : bornes, mois et années décimales', () => {
  for (const [months, expected] of [[1, 4.5], [6, 7], [11, 9.5], [12, 10], [18, 11], [36, 14], [60, 18], [71, 19 + 5 / 6], [72, 25], [96, 31], [144, 43]]) {
    close(estimateWeightKg(months).weightKg, expected);
  }
  for (const months of [0, 0.99, 144.01, 156, -1, NaN, Infinity, '12']) assert.throws(() => estimateWeightKg(months));
  assert.equal(patient('', '3').weightKg, 14);
  assert.equal(patient('', '36', 'months').weightKg, 14);
  assert.equal(patient('', '1,5').weightKg, 11);
  assert.equal(patient('', String(1 / 12)).weightKg, 4.5);
});

test('le poids connu reste prioritaire, avec âge facultatif ou hors estimation', () => {
  for (const age of ['', '3', '6', '15']) {
    const context = patient('12,5', age);
    assert.equal(context.weightKg, 12.5);
    assert.equal(context.weightSource, 'measured');
    assert.equal(context.formula, null);
    assert.equal(calculate('adrenaline-iv', context).dose, 125);
  }
  assert.equal(patient('12.5').weightKg, 12.5);
  assert.equal(patient('', '3').weightSource, 'estimated');
  assert.equal(patient('200', '').weightKg, 200);
  assert.equal(patient('0,5', '').weightKg, 0.5);
});

test('une saisie erronée ne retombe jamais silencieusement sur le poids estimé', () => {
  for (const weight of ['0', '0,49', '201', '-1', '12 kg', '1e2', '12,5.0', 'NaN', 'Infinity', '12,', false]) {
    assert.throws(() => patient(weight, '3'), failure => failure.field === 'weight');
  }
  for (const age of ['-1', 'abc', '19', 'Infinity', '3,']) assert.throws(() => patient('12', age));
  assert.throws(() => patient('', '3', 'days'));
  assert.equal(resolvePatientContext(), null);
  assert.equal(patient(' ', ' '), null);
});

test('les changements âge → poids connu → correction → effacement recalculent les 64 lignes', () => {
  const contexts = [patient('', '3'), patient('12.5', '3'), patient('20', '3'), patient('20', '6'), patient('', '6'), null];
  const expectedWeights = [14, 12.5, 20, 20, 25, null];
  const snapshot = JSON.stringify(smurRecords);
  for (const [index, context] of contexts.entries()) {
    const results = calculateAllRecords(smurRecords, context);
    assert.equal(results.size, 64);
    assert.equal(results.get('isofundine').dose, expectedWeights[index] === null ? null : expectedWeights[index] * 10);
    for (const result of results.values()) {
      assert.equal(result.clinicalUse, false);
      if (result.status === 'calculated') assert.equal(result.weightKg, expectedWeights[index]);
      if (!context && result.status !== 'instruction') {
        assert.equal(result.dose, null);
        assert.equal(result.volumeMl, null);
        assert.equal(result.rateMlH, null);
      }
    }
  }
  assert.equal(JSON.stringify(smurRecords), snapshot);
});

test('vérifie séparément dose, dilution, mL, mmol, joules et conversion g/mg', () => {
  const context = patient('20');
  for (const [id, dose, volume] of [
    ['adrenaline-iv', 200, 2], ['adrenaline-im', 200, 0.2],
    ['bicarbonate-acr', 20, 40], ['atropine', 400, 0.8],
    ['amiodarone', 100, 100 / 7.5], ['ketamine-analgesie', 10, 2],
    ['tranexamique-bolus', 200, 2], ['naloxone', 200, 10],
    ['cardioversion', 20, null], ['defibrillation', 80, null],
    ['glucose10', 40, 40], ['cgr', 200, 200], ['cpa', 100, 100],
    ['isofundine', 200, 200], ['gentamicine', 100, null], ['resikali-ir', 20, null],
  ]) {
    const result = calculate(id, context);
    close(result.dose, dose);
    if (volume === null) assert.equal(result.volumeMl, null);
    else close(result.volumeMl, volume);
  }
  assert.equal(calculate('glucose10', context).mass, 4000);
  assert.equal(calculate('atropine').volumeMl, 0.4);
  assert.equal(row('atropine').sourceCells[3], '0,8 mL');
});

test('les perfusions gardent un mélange fixe et distinguent minute, heure et six heures', () => {
  for (const [id, rate, concentration] of [
    ['adrenaline-ivc', 6, 20], ['dobutamine', 6, 1000], ['dopamine', 6, 1000],
    ['salbutamol-ivc', 0.48, 250], ['alprostadil', 6, 10000],
    ['clonazepam-ivc', 2, 1 / 6], ['morphine-ivc', 0.2, 1000],
    ['sufentanil', 4, 1], ['midazolam-ivc', 2.4, 1000], ['tranexamique-ivc', 4, 50],
  ]) {
    const result = calculate(id, patient('20'));
    close(result.rateMlH, rate);
    close(result.concentration, concentration);
    close(result.concentration, calculate(id).concentration);
  }
  assert.equal(calculate('tranexamique-ivc', patient('20')).mixtureVolumeMl, 16);
  assert.equal(calculate('tranexamique-ivc', patient('20')).theoreticalDurationHours, 4);
});

test('les ambiguïtés documentées restent sans dose, volume ni débit', () => {
  for (const id of ['ssh', 'cafeine', 'noradrenaline', 'salbutamol-nebulise', 'calcium-gluconate', 'insuline-glucose', 'ketamine-intubation', 'midazolam-ij', 'amoxicilline-clavulanique']) {
    const result = calculate(id);
    assert.equal(result.status, 'blocked', id);
    assert.equal(result.dose, null, id);
    assert.equal(result.volumeMl, null, id);
    assert.equal(result.rateMlH, null, id);
  }
  assert.equal(calculate('arret-potassium').status, 'instruction');
});

test('la restriction étomidate est réévaluée avec un poids connu inchangé', () => {
  for (const age of ['', '1', '2']) assert.equal(calculate('etomidate', patient('12', age)).status, 'blocked');
  assert.equal(calculate('etomidate', patient('12', '2.01')).status, 'calculated');
  assert.equal(calculate('etomidate', patient('12', '24', 'months')).status, 'blocked');
  assert.equal(calculate('etomidate', patient('12', '25', 'months')).status, 'calculated');
});

test('un nouveau-né identifié requiert un protocole spécifique, même avec poids connu', () => {
  const results = calculateAllRecords(smurRecords, patient('3.5', '0.5', 'months'));
  for (const result of results.values()) if (result.status !== 'instruction') assert.equal(result.status, 'blocked');
});

test('l’ajout Isofundine conserve les 63 sources et les neuf groupes dans leur ordre', () => {
  assert.equal(catalogRecords.length, 63);
  assert.equal(smurRecords.length, 64);
  assert.equal(new Set(smurRecords.map(record => record.id)).size, 64);
  assert.deepEqual(smurCategories.filter(category => category.id !== 'remplissage'), categories);
  assert.ok(catalogRecords.every(record => smurRecords.includes(record)));
  assert.equal(isofundine.kind, 'reference');
  assert.equal(isofundine.validation, 'pending');
  assert.ok(isofundine.issues.some(issue => issue.message.includes('hyperkaliémie')));
  assert.equal(isofundine.sources.length, 2);
});

test('un modèle défectueux ne produit pas de valeur non finie ni de résultat périmé', () => {
  const invalid = { ...row('adrenaline-iv'), id: 'invalid', model: { ...row('adrenaline-iv').model, coefficient: Infinity } };
  const results = calculateAllRecords([invalid, row('isofundine')], patient());
  assert.equal(results.get('invalid').status, 'blocked');
  assert.equal(results.get('invalid').dose, null);
  assert.equal(results.get('isofundine').dose, 100);
  assert.throws(() => calculate('isofundine', { weightKg: Infinity, ageMonths: 36, weightSource: 'measured' }));
  assert.throws(() => calculate('isofundine', { weightKg: 12, ageMonths: NaN, weightSource: 'measured' }));
});
