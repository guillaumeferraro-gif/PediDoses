import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { catalogRecords, categories } from '../dist/catalog-data.js';
import { smurRecords, smurCategories, isofundine } from '../dist/smur-data.js';
import { resolvePatientContext, estimateWeightKg, infantWeightTable, calculateRecordForPatient, calculateAllRecords } from '../dist/patient-calculator.js';
import { buildMedicationSheet, volumeText } from '../dist/smur-sheets.js';

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
  assert.deepEqual([...results.values()].filter(result => result.status === 'blocked').map(result => result.recordId), ['calcium-gluconate']);
  assert.equal(results.get('arret-potassium').status, 'instruction');
  assert.equal([...results.values()].filter(result => result.status === 'calculated').length, 62);
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

test('sépare volume prélevé, diluant et concentration finale sans arrondi en chaîne', () => {
  const tranexamique = calculate('tranexamique-ivc', patient('12.34', '5'));
  close(tranexamique.dose, 987.2);
  close(tranexamique.withdrawalMl, 9.872);
  close(tranexamique.addMl, 6.128);
  close(tranexamique.concentration, 61.7);
  close(tranexamique.stockConcentration, 100);
  assert.equal(volumeText(tranexamique.withdrawalMl), '9,87');
  assert.equal(volumeText(tranexamique.addMl), '6,13');
  assert.equal(tranexamique.volumeMl, null);
  close(tranexamique.mixtureVolumeMl, 16);
  close(tranexamique.rateMlH, 2);
  const clonazepam = calculate('clonazepam-ivc', patient('50'));
  close(clonazepam.dose, 4);
  close(clonazepam.withdrawalMl, 4);
  close(clonazepam.addMl, 2);
  close(clonazepam.concentration, 4 / 6);
  close(clonazepam.rateMlH, 1);
});

test('intègre le protocole hyperkaliémie local et les conventions de volume', () => {
  const calcium = calculate('calcium-gluconate', patient('50'));
  assert.equal(calcium.status, 'blocked');
  assert.equal(calcium.dose, null);
  assert.equal(calcium.volumeMl, null);
  assert.equal(calculate('calcium-gluconate', null).status, 'blocked');
  const alternatives = buildMedicationSheet(row('calcium-gluconate')).doseRows;
  assert.match(alternatives[0].dose, /0,4 mL\/kg/);
  assert.match(alternatives[1].dose, /0,5 mL\/kg/);
  const insulin = calculate('insuline-glucose', patient('10'));
  close(insulin.volumeMl, 40);
  close(insulin.mass, 1.2);
  close(calculate('salbutamol-nebulise', patient('16')).dose, 2.5);
  close(calculate('salbutamol-nebulise', patient('16.1')).dose, 5);
  close(calculate('resikali-ir', patient('10')).volumeMl, 37.5);
  close(calculate('kayexalate-ir', patient('20')).dose, 15);
  close(calculate('kayexalate-ir', patient('20')).volumeMl, 100);
});

test('les 64 fiches sont complètes sans contexte patient et signalent les données manquantes', () => {
  for (const record of smurRecords) {
    const sheet = buildMedicationSheet(record);
    assert.ok(sheet.presentation && sheet.administration && sheet.preparations.length && sheet.doseRows.length, record.id);
    assert.ok(Array.isArray(sheet.questions), record.id);
    for (const dose of sheet.doseRows) assert.ok(dose.condition && dose.dose && dose.volume && dose.concentration, record.id);
    assert.doesNotMatch(JSON.stringify(sheet), /NaN|undefined|Infinity/, record.id);
  }
  const amoxicillin = buildMedicationSheet(row('amoxicilline'));
  assert.match(amoxicillin.presentation, /à renseigner/);
  assert.match(amoxicillin.doseRows[0].dose, /période à confirmer/);
  assert.match(amoxicillin.doseRows[0].volume, /dilution finale à préciser/);
  assert.match(amoxicillin.ceiling, /non appliqué au calcul/);
  assert.equal(calculate('amoxicilline', patient('30')).dose, 3000);
});

test('affiche les deux doses de kétamine et les quatre combinaisons âge/poids de morphine IVSE', () => {
  const ketamine = buildMedicationSheet(row('ketamine-intubation')).doseRows;
  assert.deepEqual(ketamine.map(r => [r.condition, r.dose, r.volume]), [
    ['Âge < 18 mois', '4 mg/kg/dose', '0,4 mL/kg/dose'],
    ['Âge ≥ 18 mois', '2 mg/kg/dose', '0,2 mL/kg/dose'],
  ]);
  const morphine = buildMedicationSheet(row('morphine-ivc'));
  assert.deepEqual(morphine.doseRows.map(r => r.volume), ['0,1 mL/kg/h', '0,01 mL/kg/h', '0,2 mL/kg/h', '0,02 mL/kg/h']);
  assert.equal(morphine.preparations.length, 2);
  assert.match(morphine.preparations[0].text, /5,00 mL.*45,00 mL/);
});

test('affiche 0,1 mL/kg/dose pour adrénaline ACR et 10 mL dès 50 kg', () => {
  const sheet = buildMedicationSheet(row('adrenaline-iv'));
  assert.equal(sheet.doseRows[0].volume, '0,1 mL/kg/dose');
  assert.equal(sheet.doseRows[1].dose, '1 mg/dose');
  assert.equal(sheet.doseRows[1].volume, '10 mL/dose');
  assert.match(sheet.ceiling, /50 kg/);
  assert.doesNotMatch(sheet.ceiling, /100 kg/);
});

test('change effectivement la dilution aux seuils de 10 et 15 kg', () => {
  for (const [id, threshold, diluted, pure] of [
    ['ketamine-analgesie', 15, 5, 50], ['midazolam-iv', 10, 0.5, 5],
    ['atracurium-bolus', 10, 1, 10], ['morphine-dc', 10, 0.1, 1], ['morphine-titration', 10, 0.1, 1],
  ]) {
    const before = calculate(id, patient(String(threshold - 0.001)));
    const at = calculate(id, patient(String(threshold)));
    close(before.concentration, diluted);
    close(at.concentration, pure);
    close(before.volumeMl, before.dose / diluted);
    close(at.volumeMl, at.dose / pure);
    assert.equal(buildMedicationSheet(row(id)).preparations.length, 2);
  }
  // The estimated weight must select the same preparation as a measured weight.
  close(calculate('midazolam-iv', patient('', '6', 'months')).concentration, 0.5);
  close(calculate('midazolam-iv', patient('', '1', 'years')).concentration, 5);
});

test('les quatre préparations fixes restent indépendantes de la dose nominale', () => {
  for (const [id, expected, take] of [['adrenaline-ivc', 20, 1], ['noradrenaline', 20, 0.5], ['dopamine', 1000, 10], ['dobutamine', 1000, 4]]) {
    const record = row(id);
    const alteredNominal = { ...record, model: { ...record.model, coefficient: 999 } };
    const result = calculateRecordForPatient(alteredNominal, patient('10.1'));
    close(result.concentration, expected);
    close(result.preparation.takeMl, take);
    close(result.mixtureVolumeMl, 50);
    close(result.exactRateMlH, 10.1 / 3);
    close(result.rateMlH, 3.4);
  }
});

test('ne confond pas le volume prélevé de phénobarbital/lévétiracétam et le volume final inconnu', () => {
  for (const [id, expected] of [['phenobarbital', 3], ['levetiracetam', 4]]) {
    const result = calculate(id);
    close(result.withdrawalMl, expected);
    assert.equal(result.volumeMl, null);
    assert.equal(result.concentration, null);
    assert.match(buildMedicationSheet(row(id)).doseRows[0].volume, /À prélever.*Volume final à préciser/);
  }
});

test('conserve les coefficients fins et arrondit uniquement les volumes affichés et débits finaux', () => {
  assert.equal(buildMedicationSheet(row('salbutamol-ivc')).doseRows[0].volume, '0,024 mL/kg/h');
  close(calculate('salbutamol-ivc', patient('12.34')).exactRateMlH, 0.29616);
  close(calculate('salbutamol-ivc', patient('12.34')).rateMlH, 0.3);
  close(calculate('amiodarone', patient('12.34')).volumeMl, 8.226666666666667);
  assert.equal(volumeText(calculate('amiodarone', patient('12.34')).volumeMl), '8,23');
  assert.equal(volumeText(0.001), '< 0,01');
  assert.equal(volumeText(0), '0,00');
});

test('conserve les 63 lignes sources, les groupes et l’ajout Isofundine', () => {
  assert.equal(catalogRecords.length, 63);
  assert.equal(smurRecords.length, 64);
  assert.equal(new Set(smurRecords.map(record => record.id)).size, 64);
  assert.deepEqual(smurCategories.filter(category => category.id !== 'remplissage'), categories);
  assert.deepEqual(smurRecords.slice(0, 63).map(record => record.id), catalogRecords.map(record => record.id));
  assert.equal(isofundine.kind, 'reference');
});
