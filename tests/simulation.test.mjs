import test from 'node:test';
import assert from 'node:assert/strict';
import { smurRecords } from '../dist/smur-data.js';
import { defaultAmpoules, applyAmpoules } from '../dist/ampoules.js';
import { resolvePatientContext, calculateRecordForPatient } from '../dist/patient-calculator.js';
import { prepareSimulationRecords, buildSimulationRow, simulationListContent, transfusionVolume } from '../dist/simulation-data.js';
import { buildMedicationSheet } from '../dist/smur-sheets.js';
import { getPatientInput, setPatientInput, subscribePatientInput } from '../dist/patient-state.js';
const configured = applyAmpoules(smurRecords, defaultAmpoules(smurRecords));
const records = prepareSimulationRecords(configured);
const patient = (weight = 10, age = 12) => resolvePatientContext({ weight: String(weight), age: String(age), ageUnit: 'months' });
const row = (id, context = patient(), source = records) => buildSimulationRow(source.find(r => r.id === id), context);

test('simulation : les 63 lignes sont présentes, y compris les doses provisoires, sans changer les fiches', () => {
  assert.equal(records.length, 63);
  for (const context of [null, patient(3, 0), patient(), patient(50, 120)]) {
    for (const record of records) {
      const r = buildSimulationRow(record, context);
      assert.doesNotMatch(JSON.stringify(r), /NaN|Infinity|undefined/, r.id);
      for (const key of ['posology', 'ampoule', 'dose', 'dilution', 'volume', 'rate']) assert.equal(typeof r[key], 'string', `${r.id}.${key}`);
    }
  }
  assert.equal(row('triphosadenine').dose, '10 mg');
  assert.equal(row('triphosadenine').provisional, true);
  assert.equal(calculateRecordForPatient(smurRecords.find(r => r.id === 'triphosadenine'), patient()).status, 'blocked');
  assert.equal(row('etomidate', patient(20, 23.99)).visible, false);
  assert.equal(row('etomidate', patient(20, 24)).visible, true);
  assert.equal(row('etomidate', patient(20, 24)).status, 'calculated');
  assert.equal(row('etomidate', resolvePatientContext({weight:'20',age:''})).visible, true);
  assert.equal(row('etomidate', patient(20, 25)).status, 'calculated');
});

test('simulation : doses massiques en mg, unités non massiques conservées et bases explicites', () => {
  assert.equal(row('adrenaline-iv').dose, '0,1 mg');
  assert.equal(row('atropine').dose, '0,2 mg');
  assert.equal(row('alprostadil').dose, '0,03 mg/h');
  assert.equal(row('bicarbonate-acr').dose, '10 mmol');
  assert.equal(row('defibrillation').dose, '40 J');
  assert.equal(row('insuline-glucose').dose, '1,2 UI');
  assert.match(row('insuline-glucose').doseDetail, /2\s?000 mg de glucose/);
  assert.equal(row('calcium-gluconate').dose, '36,4 mg');
  assert.match(row('calcium-gluconate').doseDetail, /calcium élément/);
});

test('simulation : plafonds du tableau appliqués avant conversion, avec statut provisoire', () => {
  assert.equal(row('triphosadenine', patient(30)).dose, '12 mg');
  assert.equal(row('ketamine-analgesie', patient(180)).dose, '80 mg');
  assert.equal(row('midazolam-iv', patient(100)).dose, '10 mg');
  assert.equal(row('calcium-gluconate', patient(60)).result.withdrawalMl, 20);
  assert.equal(row('adrenaline-iv', patient(49)).volume, '4,90 mL');
  assert.equal(row('adrenaline-iv', patient(50)).volume, '1,00 mL');
  assert.equal(row('adrenaline-iv', patient(50)).dilution, 'Pur');
});

test('simulation : les volumes prélevés ne deviennent pas des volumes injectés', () => {
  for (const id of ['gentamicine', 'phenobarbital', 'levetiracetam', 'calcium-gluconate', 'magnesium']) {
    const r = row(id);
    assert.equal(r.volume, '—', id);
    assert.equal(r.rate, '—', id);
    assert.match(r.dilution, /IDE|préciser/, id);
  }
  assert.match(row('gentamicine').volumeDetail, /2,50 mL à prélever/);
  assert.match(row('calcium-gluconate').volumeDetail, /4,00 mL à prélever/);
  assert.equal(row('amoxicilline').dose, '1\u202f000 mg');
  assert.equal(row('amoxicilline').volume, '—');
  assert.equal(row('insuline-glucose').rate, '120,0 mL/h');
});

test('simulation : les quatre débits poids/3 restent indépendants de la dose nominale', () => {
  for (const id of ['adrenaline-ivc', 'noradrenaline', 'dopamine', 'dobutamine']) {
    const r = row(id, patient(12.34));
    assert.equal(r.rate, '4,1 mL/h');
    assert.equal(r.result.exactRateMlH, 12.34 / 3);
    assert.equal(r.volume, '50,00 mL');
    assert.equal(r.volumeDetail, 'seringue');
    assert.equal(r.dose, ['dopamine', 'dobutamine'].includes(id) ? '50 mg' : '1 mg');
    assert.equal(r.doseDetail, 'par seringue');
  }
});

test('simulation : adaptation de l’ampoule et aucun arrondi en chaîne', () => {
  const items = defaultAmpoules(smurRecords);
  items.find(r => r.id === 'adrenaline-iv').amount = 2;
  const changed = prepareSimulationRecords(applyAmpoules(smurRecords, items));
  assert.equal(row('adrenaline-iv', patient(10), changed).volume, '1,00 mL');
  assert.match(row('adrenaline-iv', patient(10), changed).dilution, /0,50 mL \+ 9,50 mL/);
  const r = row('amoxicilline-clavulanique', patient(12.34));
  assert.ok(Math.abs(r.result.dose - 80 * 12.34 / 3) < 1e-10);
  assert.match(r.posology, /80 ÷ 3/);
  assert.equal(row('morphine-dc', patient(9.99)).volume, '9,99 mL');
  assert.equal(row('morphine-dc', patient(10)).volume, '1,00 mL');
});

test('patient partagé : changement d’onglet, d’unité, saisie invalide et remise à zéro sans stockage', () => {
  const events = [];
  const unsubscribe = subscribePatientInput((input, source) => events.push({ input, source }));
  setPatientInput({ age: '3', ageUnit: 'years', weight: '' }, 'quick');
  assert.equal(resolvePatientContext(getPatientInput()).weightKg, 14);
  setPatientInput({ age: '3', ageUnit: 'months', weight: '6' }, 'simulation');
  assert.equal(getPatientInput().age, '3');
  assert.equal(resolvePatientContext(getPatientInput()).weightKg, 6);
  setPatientInput({ age: '3', ageUnit: 'months', weight: 'abc' }, 'simulation');
  assert.throws(() => resolvePatientContext(getPatientInput()));
  setPatientInput({ age: '', ageUnit: 'years', weight: '' }, 'quick');
  assert.equal(resolvePatientContext(getPatientInput()), null);
  assert.equal(events.length, 4);
  assert.equal(events[1].source, 'simulation');
  unsubscribe();
});

test('liste : champs sans objet masqués et résultats sans volume superflu', () => {
  const shock = simulationListContent(row('defibrillation'));
  assert.equal(shock.ampoule, '');
  assert.equal(shock.dilution, '');
  assert.deepEqual(shock.metrics.map(m => m.type), ['dose']);
  assert.equal(shock.metrics[0].label, 'Énergie');
  const instruction = simulationListContent(row('arret-potassium'));
  assert.equal(instruction.ampoule, '');
  assert.equal(instruction.dilution, '');
  assert.deepEqual(instruction.metrics, []);
  assert.deepEqual(simulationListContent(row('morphine-dc')).metrics.map(m => m.type), ['dose', 'volume']);
  assert.deepEqual(simulationListContent(row('isofundine')).metrics.map(m => m.type), ['volume']);
  assert.deepEqual(simulationListContent(row('gentamicine')).metrics.map(m => m.type), ['dose']);
  assert.match(simulationListContent(row('calcium-gluconate')).dilutionDetail, /4,00 mL à prélever/);
});

test('transfusion : volume prescrit limité au contenu réel d’une seule poche', () => {
  for (const id of ['cgr', 'cpa', 'pfc']) {
    const record = records.find(r => r.id === id);
    const expected = record.model.coefficient * 20;
    assert.equal(record.model.maximumDose, null);
    const sheet = buildMedicationSheet(record);
    assert.doesNotMatch(sheet.questions.join(' '), /plafond|maximum/);
    assert.match(sheet.ceiling, /Aucun maximum fixe/);
    const missing = buildSimulationRow(record, patient(20));
    assert.equal(missing.transfusion.administeredVolumeMl, null);
    assert.equal(missing.volume, '—');
    assert.match(missing.doseDetail, /maximum 1 poche/);
    for (const bagVolume of [expected - 0.01, expected, expected + 0.01, 1000]) {
      const r = buildSimulationRow(record, patient(20), { bagVolumeMl: String(bagVolume) });
      assert.equal(r.transfusion.administeredVolumeMl, Math.min(expected, bagVolume));
      assert.equal(r.transfusion.oneBagApplied, expected > bagVolume);
      assert.equal(r.result.dose, expected);
    }
    const invalid = buildSimulationRow(record, patient(20), { bagVolumeMl: 'abc' });
    assert.equal(invalid.volume, '—');
    assert.equal(invalid.bagInputError, true);
    assert.match(invalid.message, /Volume de la poche/);
  }
  assert.equal(transfusionVolume(123.4567, '120,1234').administeredVolumeMl, 120.1234);
  for (const value of ['0', '-1', 'abc', '1e3', Infinity]) assert.throws(() => transfusionVolume(200, value));
});
