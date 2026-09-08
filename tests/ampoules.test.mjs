import test from 'node:test';
import assert from 'node:assert/strict';
import { smurRecords } from '../dist/smur-data.js';
import { defaultAmpoules, applyAmpoules, exportAmpoulesCsv, importAmpoulesCsv, ampouleHeaders } from '../dist/ampoules.js';
import { calculateRecordForPatient, resolvePatientContext } from '../dist/patient-calculator.js';
import { buildMedicationSheet } from '../dist/smur-sheets.js';
const patient = weight => resolvePatientContext({ weight: String(weight), age: '5' });
const calc = (id, weight, records = smurRecords) => calculateRecordForPatient(records.find(r => r.id === id), patient(weight));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const sheet = id => buildMedicationSheet(smurRecords.find(r => r.id === id));

test('plafonds confirmés appliqués avant conversion ; gentamicine et cardioversion sans plafond', () => {
  for (const [id, weight, dose] of [['defibrillation', 60, 200], ['isofundine', 60, 500], ['amoxicilline', 30, 2000], ['cefotaxime', 50, 3000], ['ceftriaxone', 50, 4000], ['amiodarone', 70, 300], ['atropine', 110, 2000], ['hydrocortisone', 60, 100], ['magnesium', 50, 2000]]) {
    assert.equal(calc(id, weight).dose, dose, id);
    assert.equal(sheet(id).pendingCeiling, null, id);
  }
  assert.equal(calc('cardioversion', 200).maximumApplied, false);
  assert.match(sheet('cardioversion').administration, /Synchrone/);
  assert.equal(sheet('cardioversion').questions.length, 0);
  assert.equal(calc('gentamicine', 100).dose, 500);
  assert.equal(calc('gentamicine', 100).withdrawalMl, 25);
  assert.equal(calc('gentamicine', 100).volumeMl, null);
  assert.equal(sheet('gentamicine').administration, 'IVL sur 30 min');
});

test('amoxicilline-clavulanate : un tiers de la dose journalière, sans arrondi en chaîne', () => {
  close(calc('amoxicilline-clavulanique', 12.34).dose, 80 * 12.34 / 3);
  assert.notEqual(calc('amoxicilline-clavulanique', 12.34).dose, 26.67 * 12.34);
  close(calc('amoxicilline-clavulanique', 74.999).dose, 80 * 74.999 / 3);
  assert.equal(calc('amoxicilline-clavulanique', 75).dose, 2000);
  assert.equal(calc('amoxicilline-clavulanique', 100).dose, 2000);
  for (const id of ['amoxicilline', 'amoxicilline-clavulanique', 'cefotaxime', 'ceftriaxone']) {
    assert.equal(sheet(id).administration, 'IV');
    assert.deepEqual(sheet(id).preparations, []);
    assert.equal(calc(id, 10).volumeMl, null);
    assert.doesNotMatch(sheet(id).questions.join(' '), /intervalle|durée|vitesse|plafond/);
  }
});

test('magnésium sans volume et triphosadénine entièrement laissée en suspens', () => {
  assert.equal(calc('magnesium', 10).dose, 500);
  assert.equal(calc('magnesium', 10).volumeMl, null);
  assert.match(sheet('magnesium').questions.join(' '), /par mL ou par ampoule/);
  assert.equal(calc('triphosadenine', 10).status, 'blocked');
  assert.equal(calc('triphosadenine', 10).dose, null);
  assert.equal(sheet('triphosadenine').doseRows[0].volume, 'Aucun calcul automatique');
});

test('le CSV conserve les lignes distinctes, accents, guillemets et retours à la ligne', () => {
  const items = defaultAmpoules(smurRecords);
  items[0].comment = 'Exemple, "ampoule"\nDeuxième ligne';
  assert.deepEqual(importAmpoulesCsv(exportAmpoulesCsv(items), smurRecords), items);
  const stock = applyAmpoules(smurRecords, items);
  for (const r of stock) {
    assert.doesNotMatch(JSON.stringify(buildMedicationSheet(r)), /NaN|undefined|Infinity/);
    assert.equal(calc(r.id, 12.34, stock).status, calc(r.id, 12.34).status);
    for (const key of ['dose', 'volumeMl', 'withdrawalMl', 'exactRateMlH']) {
      const before = calc(r.id, 12.34)[key], after = calc(r.id, 12.34, stock)[key];
      if (before === null) assert.equal(after, null, `${r.id}.${key}`); else close(after, before);
    }
  }
});

test('une ampoule différente adapte le prélèvement en gardant les cibles de dilution', () => {
  const items = defaultAmpoules(smurRecords);
  for (const id of ['adrenaline-iv', 'adrenaline-ivc']) {
    const ampoule = items.find(r => r.id === id); ampoule.amount = 2; ampoule.volumeMl = 1;
  }
  const records = applyAmpoules(smurRecords, items);
  close(calc('adrenaline-iv', 10, records).volumeMl, 1);
  close(calc('adrenaline-iv', 10, records).preparation.takeMl, 0.5);
  close(calc('adrenaline-iv', 10, records).preparation.addMl, 9.5);
  close(calc('adrenaline-iv', 50, records).volumeMl, 0.5);
  close(calc('adrenaline-ivc', 10, records).concentration, 20);
  close(calc('adrenaline-ivc', 10, records).mixtureVolumeMl, 50);
  close(calc('adrenaline-ivc', 10, records).exactRateMlH, 10 / 3);
  close(calc('adrenaline-im', 10, records).volumeMl, 0.1);
});

test('un tableau invalide est refusé entièrement, sans toucher au référentiel', () => {
  const original = defaultAmpoules(smurRecords);
  for (const mutation of [rows => rows.pop(), rows => { rows[0].id = rows[1].id; }, rows => { rows[0].unit = 'mmol'; }, rows => { rows[0].volumeMl = 0; }, rows => { rows[0].declaredConcentration = 2; }, rows => { rows[0].amount = 0.001; }, rows => { rows[0].amount = null; rows[0].declaredConcentration = null; }, rows => { rows[0].status = 'peut-être'; }]) {
    const copy = structuredClone(original); mutation(copy);
    assert.throws(() => applyAmpoules(smurRecords, copy));
  }
  assert.throws(() => importAmpoulesCsv('Identifiant,Quantité\nadrenaline-iv,1', smurRecords));
  assert.throws(() => importAmpoulesCsv(ampouleHeaders.join(',') + '\n"non fermé', smurRecords));
  for (const id of ['tranexamique-ivc', 'clonazepam-ivc']) {
    const copy = structuredClone(original);
    copy.find(row => row.id === id).amount = 0.1;
    assert.throws(() => importAmpoulesCsv(exportAmpoulesCsv(copy), smurRecords), /quantité maximale/);
  }
  assert.deepEqual(defaultAmpoules(smurRecords), original);
});

test('décimales françaises acceptées ; magnésium sans volume tant que non confirmé', () => {
  const items = defaultAmpoules(smurRecords);
  items.find(r => r.id === 'magnesium').amount = 1.5;
  const parsed = importAmpoulesCsv(exportAmpoulesCsv(items).replace('"1.5"', '"1,5"'), smurRecords);
  assert.equal(parsed.find(r => r.id === 'magnesium').amount, 1.5);
  assert.equal(calc('magnesium', 10, applyAmpoules(smurRecords, parsed)).withdrawalMl, null);
  parsed.find(r => r.id === 'magnesium').status = 'confirmé';
  close(calc('magnesium', 10, applyAmpoules(smurRecords, parsed)).withdrawalMl, 500 / 150);
});

test('les schémas liés à une concentration fixe ne sont pas transposés à un autre produit', () => {
  for (const id of ['ssh', 'glucose10', 'calcium-gluconate']) {
    const items = defaultAmpoules(smurRecords); const entry = items.find(r => r.id === id);
    if (entry.amount !== null) entry.amount *= 2; else entry.declaredConcentration *= 2;
    assert.throws(() => applyAmpoules(smurRecords, items), /règle est liée/);
  }
  const items = defaultAmpoules(smurRecords); const glucose = items.find(r => r.id === 'glucose10');
  glucose.unit = 'mg'; glucose.declaredConcentration = 100;
  assert.equal(calc('glucose10', 10, applyAmpoules(smurRecords, items)).mass, 2000);
});

test('nouvelles précisions : paliers de kétamine, midazolam et morphine DC IVL', () => {
  assert.equal(sheet('ketamine-analgesie').pendingCeiling, 80);
  assert.match(sheet('ketamine-analgesie').questions.join(' '), /en suspens/);
  assert.equal(calc('ketamine-analgesie', 180).dose, 90);
  assert.equal(sheet('ketamine-intubation').questions.length, 0);
  const records = applyAmpoules(smurRecords, defaultAmpoules(smurRecords));
  for (const [id, amount, volume] of [['midazolam-iv', 50, 10], ['morphine-dc', 10, 10]]) {
    const record = records.find(r => r.id === id);
    const fiche = buildMedicationSheet(record);
    assert.equal(fiche.administration, 'IVL');
    assert.equal(record.ampoule.amount, amount);
    assert.equal(record.ampoule.volumeMl, volume);
    assert.equal(fiche.questions.length, 0);
  }
  assert.equal(sheet('midazolam-iv').pendingCeiling, null);
  assert.match(sheet('midazolam-iv').ceiling, /Aucun plafond documenté/);
  assert.equal(calc('midazolam-iv', 100).dose, 10);
});
