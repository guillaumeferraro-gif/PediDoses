import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { catalogRecords, categories } from '../dist/catalog-data.js';
import { smurRecords, smurCategories, isofundine } from '../dist/smur-data.js';
import { resolvePatientContext, estimateWeightKg, infantWeightTable, calculateRecordForPatient, calculateAllRecords } from '../dist/patient-calculator.js';

const row = id => smurRecords.find(record => record.id === id);
const patient = (weight = '10', age = '3', ageUnit = 'years') => resolvePatientContext({ weight, age, ageUnit });
const calculate = (id, context = patient()) => calculateRecordForPatient(row(id), context);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('estime le poids avec la table mensuelle avant un an puis (âge + 4) × 2', () => {
  assert.deepEqual(infantWeightTable, [3, 3.5, 4.2, 5, 6, 6, 7, 8, 8, 9, 9, 10]);
  infantWeightTable.forEach((expected, month) => close(estimateWeightKg(month).weightKg, expected));
  for (const [months, expected] of [[11.9, 10], [12, 10], [18, 11], [36, 14], [120, 28], [216, 44]]) close(estimateWeightKg(months).weightKg, expected);
  for (const value of [-1, 216.01, NaN, Infinity, '12']) assert.throws(() => estimateWeightKg(value));
});

test('changer l’unité change le sens, jamais la valeur saisie', () => {
  assert.equal(patient('', '3', 'months').weightKg, 5);
  assert.equal(patient('', '3', 'years').weightKg, 14);
  const source = fs.readFileSync(new URL('../dist/smur-ui.js', import.meta.url), 'utf8');
  assert.match(source, /ageUnitInput\.addEventListener\('change', updatePatient\)/);
  assert.doesNotMatch(source, /value \* 12|value \/ 12/);
});

test('le poids connu reste prioritaire et une saisie invalide ne retombe pas sur une estimation', () => {
  assert.equal(patient('12,5', '3').weightKg, 12.5);
  assert.equal(patient('12,5', '3').weightSource, 'measured');
  assert.equal(patient('', '3').weightSource, 'estimated');
  for (const weight of ['0', '0,49', '201', '-1', '12 kg', '1e2', 'NaN']) assert.throws(() => patient(weight, '3'));
  assert.equal(resolvePatientContext(), null);
});

test('calcule toutes les lignes décidées et conserve 64 fiches', () => {
  const results = calculateAllRecords(smurRecords, patient('12', '3'));
  assert.equal(results.size, 64);
  assert.equal([...results.values()].filter(result => result.status === 'blocked').length, 0);
  assert.equal(results.get('arret-potassium').status, 'instruction');
  assert.equal([...results.values()].filter(result => result.status === 'calculated').length, 63);
});

test('applique les concentrations et plafonds confirmés sans plafond au suxaméthonium', () => {
  close(calculate('atropine', patient('10')).dose, 200);
  close(calculate('atropine', patient('10')).volumeMl, 0.8);
  close(calculate('adrenaline-im', patient('80')).dose, 500);
  close(calculate('adrenaline-iv', patient('49')).dose, 490);
  close(calculate('adrenaline-iv', patient('50')).dose, 1000);
  close(calculate('suxamethonium', patient('100', '2')).dose, 100);
  assert.equal(calculate('suxamethonium', patient('100', '2')).maximumApplied, false);
});

test('applique les paliers d’âge du suxaméthonium, phénobarbital et kétamine', () => {
  close(calculate('suxamethonium', patient('10', '17', 'months')).dose, 20);
  close(calculate('suxamethonium', patient('10', '18', 'months')).dose, 10);
  close(calculate('ketamine-intubation', patient('10', '17', 'months')).dose, 40);
  close(calculate('ketamine-intubation', patient('10', '18', 'months')).dose, 20);
  close(calculate('phenobarbital', patient('3', '0', 'months')).dose, 60);
  close(calculate('phenobarbital', patient('3.5', '1', 'months')).dose, 52.5);
});

test('calcule les quatre catécholamines par poids/3 et arrondit seulement le débit final', () => {
  for (const id of ['adrenaline-ivc', 'noradrenaline', 'dopamine', 'dobutamine']) {
    close(calculate(id, patient('10')).rateMlH, 3.3);
    close(calculate(id, patient('10,1')).rateMlH, 3.4);
  }
  assert.equal(row('noradrenaline').sourceCells[0], 'Noradrénaline 2 mg/mL');
  assert.match(row('noradrenaline').protocol.dilution, /1 mg/);
});

test('calcule morphine selon âge et concentration selon le seuil de 10 kg', () => {
  const neonate = calculate('morphine-ivc', patient('5', '2', 'months'));
  close(neonate.hourlyAmount, 50);
  close(neonate.concentration, 100);
  close(neonate.rateMlH, 0.5);
  const infant = calculate('morphine-ivc', patient('10', '3', 'months'));
  close(infant.hourlyAmount, 200);
  close(infant.concentration, 1000);
  close(infant.rateMlH, 0.2);
  close(calculate('morphine-dc', patient('8')).volumeMl, 8);
  close(calculate('morphine-dc', patient('10')).volumeMl, 1);
});

test('calcule les préparations fixes à 0,01 mL sans arrondi en chaîne', () => {
  const tranexamique = calculate('tranexamique-ivc', patient('12.34', '5'));
  close(tranexamique.dose, 987.2);
  close(tranexamique.volumeMl, 9.872);
  close(tranexamique.mixtureVolumeMl, 16);
  close(tranexamique.rateMlH, 2);
  const clonazepam = calculate('clonazepam-ivc', patient('50'));
  close(clonazepam.dose, 4);
  close(clonazepam.volumeMl, 4);
  close(clonazepam.rateMlH, 1);
});

test('intègre le protocole hyperkaliémie local et les conventions de volume', () => {
  const calcium = calculate('calcium-gluconate', patient('50'));
  close(calcium.dose, 20);
  close(calcium.mass, 182);
  assert.equal(calcium.maximumApplied, true);
  const insulin = calculate('insuline-glucose', patient('10'));
  close(insulin.volumeMl, 40);
  close(insulin.mass, 1.2);
  close(calculate('salbutamol-nebulise', patient('16')).dose, 2.5);
  close(calculate('salbutamol-nebulise', patient('16.1')).dose, 5);
  close(calculate('resikali-ir', patient('10')).volumeMl, 37.5);
  close(calculate('kayexalate-ir', patient('20')).dose, 15);
  close(calculate('kayexalate-ir', patient('20')).volumeMl, 100);
});

test('chaque fiche contient posologie, dilution, administration et questionnements explicites', () => {
  for (const record of smurRecords) {
    assert.equal(typeof record.protocol.posology, 'string', record.id);
    assert.equal(typeof record.protocol.dilution, 'string', record.id);
    assert.equal(typeof record.protocol.administration, 'string', record.id);
    assert.ok(Array.isArray(record.protocol.particulars), record.id);
    assert.ok(Array.isArray(record.protocol.questions), record.id);
  }
  const ui = fs.readFileSync(new URL('../dist/smur-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /Questionnements restants/);
  assert.doesNotMatch(ui, /Indication/);
});

test('conserve les 63 lignes sources, les groupes et l’ajout Isofundine', () => {
  assert.equal(catalogRecords.length, 63);
  assert.equal(smurRecords.length, 64);
  assert.equal(new Set(smurRecords.map(record => record.id)).size, 64);
  assert.deepEqual(smurCategories.filter(category => category.id !== 'remplissage'), categories);
  assert.deepEqual(smurRecords.slice(0, 63).map(record => record.id), catalogRecords.map(record => record.id));
  assert.equal(isofundine.kind, 'reference');
});
