import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogRecords, catalogMeta, categories } from '../dist/catalog-data.js';
import { auditRecord, concentration, convertUnit, prescriptionForRecord } from '../dist/catalog-audit.js';

const record = id => catalogRecords.find(r => r.id === id);
const audit = id => auditRecord(record(id));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('préserve les 62 lignes conservées après suppression de la lidocaïne et les champs sources distincts', () => {
  assert.equal(catalogRecords.length, 62);
  assert.equal(new Set(catalogRecords.map(r => r.id)).size, 62);
  assert.deepEqual(categories.map(c => catalogRecords.filter(r => r.category === c.id).length), [6, 5, 5, 9, 7, 6, 14, 7, 3]);
  for (const r of catalogRecords) {
    assert.equal(r.sourceCells.length, 6);
    assert.equal(r.validation, 'pending');
    assert.equal(r.maximumDose, null);
  }
  assert.equal(record('atropine').sourceCells[3], '0,8 mL');
  assert.equal(record('adrenaline-ivc').sourceCells[3], '3,3 mL/h');
  assert.equal(record('nicardipine').sourceCells[2], '1,2 mL/h');
  assert.equal(record('nicardipine').sourceCells[3], '= 2 mcg/kg/min');
  assert.equal(record('ssh').sourceCells[4], 'dont 10,0 mL de NaCl 10%');
});

test('convertit mg, microgrammes et nanogrammes sans mélanger les dimensions', () => {
  assert.equal(convertUnit(1, 'mg', 'mcg'), 1000);
  close(convertUnit(50, 'ng', 'mcg'), .05);
  assert.equal(convertUnit(.5, 'g', 'mg'), 500);
  assert.equal(convertUnit(200, 'mcg', 'mg'), .2);
  assert.equal(convertUnit(10, 'mmol', 'mmol'), 10);
  for (const pair of [['mg', 'mmol'], ['mg', 'mL'], ['J', 'mg'], ['UI', 'mg'], ['mg', 'unknown']]) {
    assert.throws(() => convertUnit(1, ...pair));
  }
  assert.throws(() => convertUnit(Infinity, 'mg', 'mcg'));
});

test('distingue les préparations IV et IM d’adrénaline', () => {
  close(audit('adrenaline-iv').concentration, 100);
  close(audit('adrenaline-iv').volumeMl, 1);
  close(audit('adrenaline-im').concentration, 1000);
  close(audit('adrenaline-im').volumeMl, .1);
  assert.ok(record('adrenaline-im').issues.some(i => i.code === 'im-in-acr'));
});

test('contrôle des dilutions indépendantes et les unités mmol et mL', () => {
  const examples = [
    ['bicarbonate-acr', 10, 20], ['amiodarone', 50, 50 / 7.5],
    ['hydrocortisone', 20, 2], ['ketamine-analgesie', 5, 1],
    ['ketamine-intubation', 40, 4], ['clonazepam-bolus', .5, 2.5],
    ['phenytoine', 200, 8], ['tranexamique-bolus', 100, 1],
    ['sugammadex', 20, 2], ['naloxone', 100, 5],
  ];
  for (const [id, quantity, volume] of examples) {
    close(audit(id).dose, quantity);
    close(audit(id).volumeMl, volume);
  }
  assert.equal(audit('glucose10').volumeMl, 20);
  assert.equal(audit('glucose10').mass, 2000);
  assert.equal(audit('cardioversion').dose, 10);
  assert.equal(audit('defibrillation').dose, 40);
  assert.equal(audit('cgr').volumeMl, 100);
  assert.equal(audit('cpa').volumeMl, 50);
});

test('identifie exactement les cinq écarts numériques documentés', () => {
  assert.deepEqual(catalogRecords.filter(r => auditRecord(r).discrepancies.length).map(r => r.id), [
    'atropine', 'adrenaline-ivc', 'dobutamine', 'dopamine', 'salbutamol-ivc',
  ]);
  assert.equal(audit('atropine').volumeMl, .4);
  assert.equal(audit('atropine').discrepancies[0].supplied, .8);
  for (const id of ['adrenaline-ivc', 'dobutamine', 'dopamine']) {
    close(audit(id).rateMlH, 3);
    close(audit(id).discrepancies[0].relativePercent, 10);
  }
  close(audit('salbutamol-ivc').rateMlH, .24);
  close(audit('salbutamol-ivc').sourceEquivalentCoefficient, 1 / 12);
  close(audit('salbutamol-ivc').discrepancies[0].relativePercent, -100 / 6);
});

test('distingue minute, heure et six heures dans les perfusions', () => {
  for (const [id, expectedRate] of [
    ['alprostadil', 3], ['atracurium-ivc', 5], ['clonazepam-ivc', 1],
    ['isoprenaline', 3], ['midazolam-ivc', 1.2], ['morphine-ivc', .1],
    ['nicardipine', 1.2], ['sufentanil', 2], ['tranexamique-ivc', 2],
  ]) close(audit(id).rateMlH, expectedRate);
  close(audit('clonazepam-ivc').hourlyAmount, 1 / 6);
  close(audit('tranexamique-ivc').theoreticalDurationHours, 8);
});

test('ne calcule pas les six lignes dont la base ou la préparation est ambiguë', () => {
  for (const id of ['ssh', 'cafeine', 'noradrenaline', 'salbutamol-nebulise', 'calcium-gluconate', 'insuline-glucose']) {
    assert.equal(audit(id).calculable, false);
    assert.equal(audit(id).dose, null);
    assert.equal(audit(id).volumeMl, null);
    assert.equal(audit(id).rateMlH, null);
  }
  assert.equal(audit('resikali-ir').volumeMl, null);
  assert.equal(audit('kayexalate-ir').volumeMl, null);
  assert.equal(audit('gentamicine').volumeMl, null);
});

test('maintient le poids comme hypothèse de source et interdit les prescriptions', () => {
  assert.equal(catalogMeta.weightStatus, 'inferred');
  for (const r of catalogRecords) {
    const result = auditRecord(r);
    assert.equal(result.kind, 'source-audit');
    assert.equal(result.clinicalUse, false);
    assert.equal(result.weightKg, 10);
    assert.equal(result.weightConfirmed, false);
    assert.throws(() => prescriptionForRecord(r, { weight: 30 }));
  }
  assert.equal(record('etomidate').model.minimumAgeMonthsExclusive, 24);
  assert.throws(() => { record('atropine').sourceCells[3] = '0,4 mL'; });
});

test('rejette concentrations nulles, paramètres non finis et unités invalides', () => {
  const r = record('adrenaline-iv');
  for (const value of [0, -1, Infinity, NaN]) {
    assert.throws(() => concentration({ ...r.model, stock: { amount: value, unit: 'mg', volumeMl: 1 } }, 'mcg'));
    assert.throws(() => auditRecord({ ...r, model: { ...r.model, coefficient: value } }));
  }
  assert.throws(() => concentration({ ...r.model, mix: { takeMl: 1, addMl: -1 } }, 'mcg'));
  assert.throws(() => auditRecord({ ...r, model: { type: 'automatic-prescription', coefficient: 1 } }));
});
