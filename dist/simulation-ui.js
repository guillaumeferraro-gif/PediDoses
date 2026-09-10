import { getConfiguredRecords } from './ampoules-ui.js';
import { smurCategories } from './smur-data.js';
import { resolvePatientContext } from './patient-calculator.js';
import { prepareSimulationRecords, buildSimulationRow, simulationListContent } from './simulation-data.js';
import { getPatientInput, setPatientInput, subscribePatientInput } from './patient-state.js';

const byId = id => document.getElementById(id);
const make = (tag, text = '', className = '') => { const el = document.createElement(tag); el.textContent = text; el.className = className; return el; };
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const format = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);
const inputs = { weight: byId('simulation-weight'), age: byId('simulation-age'), ageUnit: byId('simulation-age-unit') };
let records = prepareSimulationRecords(getConfiguredRecords());
let context = null;
const bagVolumes = new Map();

function renderMetrics(container, row) {
  const metrics = simulationListContent(row).metrics;
  container.replaceChildren(...metrics.map(metric => {
    const cell = make('div', '', `sim-${metric.type}`);
    cell.append(make('span', metric.label, 'sim-field-label'), make('strong', metric.value));
    if (metric.detail) cell.append(make('span', metric.detail, 'sim-secondary'));
    return cell;
  }));
  container.hidden = !metrics.length;
  return metrics.length;
}
function listRow(row) {
  const content = simulationListContent(row);
  const article = make('article', '', 'sim-list-row');
  article.dataset.recordId = row.id;
  const left = make('div', '', 'sim-list-main');
  const name = make('div', '', 'sim-drug');
  name.append(make('strong', row.name + (row.provisional ? '†' : '')));
  if (row.administration) name.append(make('span', row.administration, 'sim-route'));
  left.append(name, make('p', row.posology, 'sim-posology'));
  if (content.ampoule) left.append(make('p', content.ampoule, 'sim-list-ampoule'));
  if (content.dilution || content.dilutionDetail) {
    const prep = make('p', content.dilution, 'sim-list-dilution');
    if (content.dilutionDetail) prep.append(make('span', content.dilutionDetail, 'sim-secondary'));
    left.append(prep);
  }
  const message = make('p', content.message, 'sim-message'); message.hidden = !content.message;
  message.setAttribute('role', 'alert');
  const metrics = make('div', '', 'sim-list-values');
  article.classList.toggle('sim-without-values', !renderMetrics(metrics, row));
  if (row.hasBag) {
    const label = make('label', 'Poche (mL)', 'sim-bag-field');
    const input = make('input');
    input.id = `simulation-bag-${row.id}`; input.type = 'text'; input.inputMode = 'decimal'; input.maxLength = 12;
    input.placeholder = 'Volume de la poche'; input.autocomplete = 'off'; input.value = bagVolumes.get(row.id) || '';
    label.htmlFor = input.id;
    input.setAttribute('aria-label', `Volume de la poche de ${row.name}, en mL`);
    message.id = `${input.id}-error`; input.setAttribute('aria-describedby', message.id);
    const updateBag = () => {
      bagVolumes.set(row.id, input.value);
      const record = records.find(record => record.id === row.id);
      const updated = buildSimulationRow(record, context, { bagVolumeMl: input.value });
      article.classList.toggle('sim-without-values', !renderMetrics(metrics, updated));
      message.textContent = updated.message; message.hidden = !updated.message;
      if (updated.bagInputError) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    };
    input.addEventListener('input', updateBag);
    input.addEventListener('change', updateBag);
    if (row.bagInputError) input.setAttribute('aria-invalid', 'true');
    label.append(input); left.append(label);
  }
  left.append(message);
  article.append(left, metrics);
  return article;
}

function render() {
  const query = normalize(byId('simulation-search').value.trim());
  const category = byId('simulation-category').value;
  const rows = records.map(record => buildSimulationRow(record, context, { bagVolumeMl: bagVolumes.get(record.id) }));
  const visible = rows.filter(row => row.visible && (category === 'all' || row.category === category) && normalize(`${row.name} ${row.ampoule} ${row.administration}`).includes(query));
  const groups = [];
  for (const group of smurCategories) {
    const selected = visible.filter(row => row.category === group.id);
    if (!selected.length) continue;
    const section = make('section', '', 'sim-list-group');
    section.append(make('h3', group.label), ...selected.map(listRow)); groups.push(section);
  }
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
byId('simulation-reset').addEventListener('click', () => { bagVolumes.clear(); receivePatient({ weight: '', age: '', ageUnit: 'years' }); inputs.age.focus(); });
byId('simulation-search').addEventListener('input', render);
byId('simulation-category').addEventListener('change', render);
for (const group of smurCategories) { const option = make('option', group.label); option.value = group.id; byId('simulation-category').append(option); }

window.addEventListener('ampoules-updated', () => { records = prepareSimulationRecords(getConfiguredRecords()); render(); });
window.addEventListener('patient-reset', () => { bagVolumes.clear(); render(); });
window.addEventListener('pageshow', event => { if (event.persisted) { bagVolumes.clear(); receivePatient({ weight: '', age: '', ageUnit: 'years' }); } });
receivePatient(getPatientInput());
