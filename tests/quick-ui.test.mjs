import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDocument, descendants } from './helpers/dom.mjs';
import { smurRecords } from '../dist/smur-data.js';
import { defaultAmpoules, applyAmpoules } from '../dist/ampoules.js';
import { calculateAllRecords, resolvePatientContext } from '../dist/patient-calculator.js';
import { buildMedicationSheet } from '../dist/smur-sheets.js';
import { quickMedicationDetails } from '../dist/quick-summary.js';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const { document, window } = createDocument(html);
globalThis.document = document; globalThis.window = window;
await import('../dist/smur-ui.js');
const byId = id => document.getElementById(id);
const card = id => descendants(byId('quick-groups')).find(el => el.dataset?.recordId === id);
const member = (id, className) => descendants(card(id)).find(el => el.className === className);
const field = (id, key) => descendants(card(id)).find(el => el.dataset?.field === key).children[1].textContent;
const patient = async (weight = '10', age = '3') => {
  byId('quick-weight').value = weight; byId('quick-age').value = age;
  await byId('quick-weight').emit('input');
};

test('vue compacte : les 65 résultats restent présentables, sans valeurs non finies, à chaque âge et sans patient', () => {
  const records = applyAmpoules(smurRecords, defaultAmpoules(smurRecords));
  for (const context of [null, resolvePatientContext({ weight:'3', age:'0' }), resolvePatientContext({ weight:'10', age:'1' }), resolvePatientContext({ weight:'200', age:'18' }), resolvePatientContext({ weight:'10' })]) {
    const results = calculateAllRecords(records, context);
    for (const record of records) {
      const fields = quickMedicationDetails(record, results.get(record.id), context, buildMedicationSheet(record));
      assert.equal(fields.length, 6, record.id);
      assert.doesNotMatch(JSON.stringify(fields), /NaN|Infinity|undefined/, record.id);
      for (const item of fields) assert.equal(typeof item.value, 'string', record.id);
    }
  }
});

test('cartes : dose et volume administré distincts du prélèvement et du volume de préparation', async () => {
  await patient();
  const details = member('ketamine-analgesie', 'dose-details');
  assert.equal(details.tagName, 'DETAILS'); assert.equal(details.open, false);
  assert.match(member('ketamine-analgesie', 'dose-values').textContent, /Dose calculée5 mgVolume à administrer1,00 mL/);
  assert.equal(field('ketamine-analgesie', 'withdrawal'), '1,00 mL');
  assert.equal(field('ketamine-analgesie', 'diluent'), 'NaCl 0,9 % · 9,00 mL');
  assert.equal(field('ketamine-analgesie', 'final-volume'), '10,00 mL');
  assert.deepEqual(member('ketamine-analgesie', 'dose-detail-rows').children.map(row => row.children[0].textContent), ['Présentation','Posologie','Prélèvement','Diluant','Volume final','Administration']);
  assert.ok(member('ketamine-analgesie', 'dose-reference').textContent.includes('Tous les paliers'));
});

test('dilution non définie et poudre : aucun prélèvement transformé en volume à administrer', async () => {
  await patient();
  assert.equal(field('gentamicine', 'withdrawal'), '2,50 mL');
  assert.equal(field('gentamicine', 'final-volume'), 'À préciser');
  assert.match(member('gentamicine', 'dose-values').textContent, /Volume à administrer—/);
  assert.doesNotMatch(field('gentamicine', 'administration'), /mL\/h/);
  assert.equal(field('phenobarbital', 'withdrawal'), 'Non documenté');
  assert.equal(field('phenobarbital', 'final-volume'), 'Non documenté');
  assert.doesNotMatch(member('phenobarbital', 'dose-values').textContent, /[\d,]+ mL/);
});

test('volumes préparés : magnésium, arrondi du lévétiracétam et deux doses de triphosadénine', async () => {
  await patient('3');
  assert.equal(field('magnesium', 'final-volume'), '50,00 mL');
  assert.equal(field('magnesium', 'withdrawal'), '1,00 mL');
  assert.equal(field('magnesium', 'diluent'), 'NaCl 0,9 % · 49,00 mL');
  const doses = descendants(card('triphosadenine')).filter(el => el.className === 'dose-sequence');
  assert.equal(doses.length, 2);
  assert.match(doses[0].textContent, /1re dose3 mg0,30 mL/);
  assert.match(doses[1].textContent, /2e dose6 mg0,60 mL/);
  assert.equal(field('triphosadenine', 'final-volume'), '1re : 0,30 mL ; 2e : 0,60 mL');
  assert.equal(field('triphosadenine', 'withdrawal'), '1re : 0,30 mL ; 2e : 0,60 mL');
  await patient('10');
  assert.equal(field('levetiracetam', 'diluent'), 'NaCl 0,9 % · 23,00 mL');
  assert.equal(field('levetiracetam', 'final-volume'), '27,00 mL');
});

test('débits : titration synchronisée, glucose identifié, IVL sans durée et poche non inventée', async () => {
  await patient();
  await byId('quick-dose-sufentanil-plus').emit('click');
  assert.match(field('sufentanil', 'posology'), /^0,3 mcg\/kg\/h/);
  assert.match(field('sufentanil', 'administration'), /Débit : 3 mL\/h/);
  assert.match(member('sufentanil', 'dose-values').textContent, /Dose horaire3 mcg\/hDébit3 mL\/h/);
  assert.equal(field('sufentanil', 'final-volume'), '10,00 mL');
  assert.match(field('insuline-glucose', 'final-volume'), /^G10 % : 50,00 mL$/);
  assert.match(field('insuline-glucose', 'administration'), /Débit G10 % : 100 mL\/h/);
  assert.equal(field('morphine-titration', 'administration'), 'IVL');
  assert.equal(field('propofol', 'administration'), 'IVL');
  assert.match(member('cgr', 'dose-values').textContent, /Volume prescrit · max. 1 poche/);
  assert.equal(field('cgr', 'final-volume'), 'Selon le contenu de la poche');
});

test('les détails restent ouverts lors du recalcul et du filtrage ; une saisie invalide efface les volumes', async () => {
  await patient();
  let details = member('magnesium', 'dose-details');
  details.open = true; await details.emit('toggle');
  await patient('20'); assert.equal(member('magnesium', 'dose-details'), details);
  assert.equal(details.open, true);
  byId('quick-search').value = 'magnésium'; await byId('quick-search').emit('input');
  details = member('magnesium', 'dose-details'); assert.equal(details.open, true);
  byId('quick-search').value = ''; await byId('quick-search').emit('input');
  assert.equal(member('magnesium', 'dose-details').open, true);
  await patient('abc');
  assert.equal(field('magnesium', 'withdrawal'), '—');
  assert.equal(field('magnesium', 'diluent'), '—');
  assert.equal(field('magnesium', 'final-volume'), '—');
  assert.doesNotMatch(member('magnesium', 'dose-values').textContent, /[0-9]/);
  assert.equal(byId('quick-error').hidden, false);
  await byId('quick-reset').emit('click');
  assert.equal(member('magnesium', 'dose-details').open, false);
  assert.equal(byId('quick-weight').value, '');
});

test('impression : les préparations et références sont ouvertes puis leur état est restauré', async () => {
  await patient();
  const first = member('magnesium', 'dose-details'); first.open = true; await first.emit('toggle');
  const closed = member('ketamine-analgesie', 'dose-details'); assert.equal(closed.open, false);
  await window.emit('beforeprint');
  assert.equal(closed.open, true); assert.equal(member('ketamine-analgesie', 'dose-review').open, true);
  await window.emit('afterprint');
  assert.equal(first.open, true); assert.equal(closed.open, false);
  assert.equal(member('ketamine-analgesie', 'dose-review').open, false);
});
