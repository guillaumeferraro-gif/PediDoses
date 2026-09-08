import { getConfiguredRecords } from './ampoules-ui.js';
import { smurCategories } from './smur-data.js';
import { resolvePatientContext } from './patient-calculator.js';
import { prepareSimulationRecords, buildSimulationRow } from './simulation-data.js';
import { getPatientInput, setPatientInput, subscribePatientInput } from './patient-state.js';

const byId = id => document.getElementById(id);
const make = (tag, text = '', className = '') => { const el = document.createElement(tag); el.textContent = text; el.className = className; return el; };
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const format = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);
const inputs = { weight: byId('simulation-weight'), age: byId('simulation-age'), ageUnit: byId('simulation-age-unit') };
let records = prepareSimulationRecords(getConfiguredRecords());
let context = null;

function valueCell(value, detail, className = '') {
  const el = make('td', '', className);
  el.append(make('strong', value));
  if (detail) el.append(make('span', detail, 'sim-secondary'));
  return el;
}
function nameBlock(row, tag = 'th') {
  const el = make(tag, '', 'sim-drug');
  if (tag === 'th') el.scope = 'row';
  el.append(make('strong', row.name + (row.provisional ? '†' : '')));
  if (row.administration) el.append(make('span', row.administration, 'sim-route'));
  return el;
}
function tableRow(row) {
  const tr = make('tr', '', `sim-row${row.message ? ' sim-blocked' : ''}`);
  tr.dataset.recordId = row.id;
  tr.append(nameBlock(row), make('td', row.posology, 'sim-posology'), make('td', row.ampoule, 'sim-ampoule'),
    valueCell(row.dose, row.doseDetail, 'sim-dose'), valueCell(row.dilution, row.dilutionDetail, 'sim-dilution'),
    valueCell(row.volume, row.message || row.volumeDetail, 'sim-volume'), valueCell(row.rate, row.rateDetail, 'sim-rate'));
  return tr;
}
function listRow(row) {
  const article = make('article', '', `sim-list-row${row.message ? ' sim-blocked' : ''}`);
  article.dataset.recordId = row.id;
  const top = make('div', '', 'sim-list-top');
  top.append(nameBlock(row, 'div'), make('span', row.posology, 'sim-posology'));
  const ampoule = make('p', row.ampoule, 'sim-list-ampoule');
  ampoule.prepend(make('span', 'Ampoule · ', 'sim-field-label'));
  const metrics = make('div', '', 'sim-list-values');
  for (const [label, value, detail, type] of [['Dose', row.dose, row.doseDetail, 'dose'], ['Volume', row.volume, row.message || row.volumeDetail, 'volume'], ['Débit', row.rate, row.rateDetail, 'rate']]) {
    if (type === 'rate' && value === '—') continue;
    const cell = make('div', '', `sim-${type}`);
    cell.append(make('span', label, 'sim-field-label'), make('strong', value));
    if (detail) cell.append(make('span', detail, 'sim-secondary'));
    metrics.append(cell);
  }
  const dilution = make('p', row.dilution, 'sim-list-dilution');
  if (row.dilutionDetail) dilution.append(make('span', row.dilutionDetail, 'sim-secondary'));
  article.append(top, ampoule, metrics, dilution);
  return article;
}

function render() {
  const query = normalize(byId('simulation-search').value.trim());
  const category = byId('simulation-category').value;
  const rows = records.map(record => buildSimulationRow(record, context));
  const visible = rows.filter(row => (category === 'all' || row.category === category) && normalize(`${row.name} ${row.ampoule} ${row.administration}`).includes(query));
  const head = make('thead'); const hr = make('tr');
  for (const label of ['Médicament', 'Posologie', 'Ampoule', 'Dose', 'Dilution', 'Volume', 'Débit']) {
    const th = make('th', label); th.scope = 'col'; hr.append(th);
  }
  head.append(hr);
  const bodies = [], groups = [];
  for (const group of smurCategories) {
    const selected = visible.filter(row => row.category === group.id);
    if (!selected.length) continue;
    const body = make('tbody'); const gr = make('tr', '', 'sim-group-row');
    const gh = make('th', group.label); gh.colSpan = 7; gh.scope = 'rowgroup'; gr.append(gh);
    body.append(gr, ...selected.map(tableRow)); bodies.push(body);
    const section = make('section', '', 'sim-list-group');
    section.append(make('h3', group.label), ...selected.map(listRow)); groups.push(section);
  }
  byId('simulation-table').replaceChildren(head, ...bodies);
  byId('simulation-list').replaceChildren(...groups);
  byId('simulation-count').textContent = `${visible.length} / ${records.length} lignes`;
  byId('simulation-empty').hidden = visible.length > 0;
}

function updatePatient() {
  const error = byId('simulation-error');
  error.hidden = true; error.textContent = '';
  inputs.age.removeAttribute('aria-invalid'); inputs.weight.removeAttribute('aria-invalid');
  context = null;
  try { context = resolvePatientContext({ weight: inputs.weight.value, age: inputs.age.value, ageUnit: inputs.ageUnit.value }); }
  catch (failure) {
    error.textContent = failure.message; error.hidden = false;
    (failure.field === 'weight' ? inputs.weight : inputs.age).setAttribute('aria-invalid', 'true');
  }
  byId('simulation-used-weight').textContent = context ? `${format(context.weightKg)} kg` : '— kg';
  byId('simulation-weight-source').textContent = context ? context.weightSource === 'measured' ? 'poids saisi' : 'poids estimé' : 'Âge ou poids';
  setPatientInput({ weight: inputs.weight.value, age: inputs.age.value, ageUnit: inputs.ageUnit.value }, 'simulation');
  render();
}
function receivePatient(value) {
  for (const key of Object.keys(inputs)) inputs[key].value = value[key];
  updatePatient();
}
subscribePatientInput((value, source) => { if (source !== 'simulation') receivePatient(value); });
for (const input of Object.values(inputs)) {
  input.addEventListener('input', updatePatient);
  input.addEventListener('change', updatePatient);
}
byId('simulation-patient-form').addEventListener('submit', event => event.preventDefault());
byId('simulation-reset').addEventListener('click', () => { receivePatient({ weight: '', age: '', ageUnit: 'years' }); inputs.age.focus(); });
byId('simulation-search').addEventListener('input', render);
byId('simulation-category').addEventListener('change', render);
for (const group of smurCategories) { const option = make('option', group.label); option.value = group.id; byId('simulation-category').append(option); }

const narrow = window.matchMedia('(max-width: 760px)');
let manualView = false;
function chooseView(view) {
  byId('simulation-table-area').hidden = view !== 'table';
  byId('simulation-list').hidden = view !== 'list';
  byId('simulation-view-table').setAttribute('aria-pressed', String(view === 'table'));
  byId('simulation-view-list').setAttribute('aria-pressed', String(view === 'list'));
}
for (const view of ['table', 'list']) byId(`simulation-view-${view}`).addEventListener('click', () => { manualView = true; chooseView(view); });
narrow.addEventListener('change', () => { if (!manualView) chooseView(narrow.matches ? 'list' : 'table'); });
chooseView(narrow.matches ? 'list' : 'table');
window.addEventListener('ampoules-updated', () => { records = prepareSimulationRecords(getConfiguredRecords()); render(); });
window.addEventListener('pageshow', event => { if (event.persisted) receivePatient({ weight: '', age: '', ageUnit: 'years' }); });
receivePatient(getPatientInput());
