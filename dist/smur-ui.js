import { smurRecords, smurCategories, smurSources } from './smur-data.js';
import { resolvePatientContext, calculateAllRecords } from './patient-calculator.js';

const byId = id => document.getElementById(id);
const format = (number, digits = 6) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(number);
const preparationVolume = number => format(number, 2);
const unitLabel = unit => unit === 'mcg' ? 'µg' : unit;
const display = number => number > 0 && number < 0.000001 ? '< 0,000001' : format(number);
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const make = (tag, text = '', className = '') => {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
};
const form = byId('quick-patient-form');
const weightInput = byId('quick-weight');
const ageInput = byId('quick-age');
const ageUnitInput = byId('quick-age-unit');
const searchInput = byId('quick-search');
const categoryInput = byId('quick-category');
let context = null;
let results = calculateAllRecords(smurRecords, null);
let cards = new Map();

function sourceLink(source) {
  const anchor = make('a', source.title);
  anchor.href = source.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}
function formulaFor(record) {
  return record.protocol.posology;
}
function addPreparation(details, record) {
  const grid = make('div', '', 'protocol-grid');
  const section = (title, value) => {
    const block = make('section', '', 'protocol-block');
    block.append(make('h4', title), make('p', value));
    return block;
  };
  grid.append(
    section('Posologie', record.protocol.posology),
    section('Dilution / préparation', record.protocol.dilution),
    section('Administration', record.protocol.administration),
  );
  details.append(grid);
  if (record.sourceCells[0]) details.append(make('p', `Présentation : ${record.sourceCells[0]}`, 'presentation-line'));
  if (record.protocol.particulars.length) {
    const block = make('section', '', 'protocol-particulars');
    block.append(make('h4', 'Particularités'));
    const list = make('ul');
    list.append(...record.protocol.particulars.map(text => make('li', text)));
    block.append(list); details.append(block);
  }
  if (record.protocol.questions.length) {
    const block = make('section', '', 'protocol-questions');
    block.append(make('h4', 'Questionnements restants'));
    const list = make('ul');
    list.append(...record.protocol.questions.map(text => make('li', text)));
    block.append(list); details.append(block);
  }
  for (const key of record.sources ?? []) details.append(sourceLink(smurSources[key]));
}

function makeCard(record) {
  const card = make('article', '', 'dose-card');
  card.dataset.recordId = record.id;
  const info = make('div', '', 'dose-info');
  const heading = make('h3', record.name);
  const coefficient = make('p', formulaFor(record) || 'Consigne du tableau', 'dose-coefficient');
  info.append(heading, coefficient);
  const values = make('div', '', 'dose-values');
  const notes = make('p', '', 'dose-notes');
  const details = make('details', '', 'dose-details');
  details.append(make('summary', 'Posologie, dilution, administration et questions'));
  const calculation = make('div', '', 'dose-calculation');
  details.append(calculation);
  addPreparation(details, record);
  card.append(info, values, notes, details);
  cards.set(record.id, { values, notes, calculation });
  return card;
}

function updateCard(record) {
  const elements = cards.get(record.id);
  if (!elements) return;
  const result = results.get(record.id);
  const { values, notes, calculation } = elements;
  values.replaceChildren();
  calculation.replaceChildren();
  notes.textContent = '';
  if (result.status !== 'calculated') {
    values.append(make('strong', '—'));
    notes.textContent = result.message;
    notes.className = `dose-notes ${result.status === 'blocked' ? 'dose-blocked' : ''}`;
    return;
  }
  notes.className = 'dose-notes';
  const primary = result.rateMlH ?? result.dose;
  const primaryUnit = result.rateMlH !== null ? 'mL/h' : unitLabel(result.unit);
  values.append(make('span', result.rateMlH !== null ? 'Débit calculé' : result.unit === 'J' ? 'Énergie calculée' : result.unit === 'mL' ? 'Volume calculé' : 'Quantité calculée', 'dose-value-label'));
  values.append(make('strong', `${display(primary)} ${primaryUnit}`));
  if (result.volumeMl !== null && result.unit !== 'mL') values.append(make('span', `Volume : ${display(result.volumeMl)} mL`, 'dose-volume'));
  const messages = [];
  if (result.volumeMl === null && record.model.type === 'dose' && !['J', 'mL'].includes(result.unit)) messages.push('Volume indisponible : concentration finale non documentée.');
  if (record.protocol.questions.length) messages.push(`${record.protocol.questions.length} point${record.protocol.questions.length > 1 ? 's' : ''} à confirmer dans la fiche.`);
  if (result.maximumApplied) messages.push('Plafond confirmé appliqué.');
  notes.textContent = messages.join(' ');
  calculation.append(make('p', `Poids retenu : ${format(result.weightKg)} kg (${result.weightSource === 'measured' ? 'saisi' : 'estimé'}).`));
  if (result.dose !== null) calculation.append(make('p', `Quantité calculée : ${display(result.dose)} ${unitLabel(result.unit)}${result.maximumApplied ? ' après plafond' : ''}.`));
  if (result.rateMlH !== null) calculation.append(make('p', `Débit final : ${format(result.rateMlH, 1)} mL/h (arrondi final à 0,1 mL/h).`));
  if (result.concentration !== null) calculation.append(make('p', `Concentration du modèle : ${format(result.concentration)} ${unitLabel(result.unit)}/mL.`));
  if (result.mass !== null) calculation.append(make('p', `Quantité correspondante : ${display(result.mass)} ${unitLabel(result.massUnit)}.`));
  if (result.volumeMl !== null) calculation.append(make('p', `Volume de produit à préparer : ${preparationVolume(result.volumeMl)} mL.`));
  if (result.mixtureVolumeMl !== null) calculation.append(make('p', `Volume final : ${preparationVolume(result.mixtureVolumeMl)} mL.`));
  calculation.append(make('p', 'Les calculs internes conservent leur précision ; aucun arrondi n’est réinjecté dans le calcul suivant.'));
}

function renderGroups() {
  const query = normalize(searchInput.value.trim());
  const filtered = smurRecords.filter(record =>
    (categoryInput.value === 'all' || categoryInput.value === record.category) &&
    normalize([record.name, smurCategories.find(category => category.id === record.category).label, ...record.sourceCells].join(' ')).includes(query));
  cards = new Map();
  const sections = [];
  for (const category of smurCategories) {
    const records = filtered.filter(record => record.category === category.id);
    if (!records.length) continue;
    const section = make('section', '', 'dose-group');
    const title = make('h2', category.label, 'dose-group-title');
    title.id = `quick-group-${category.id}`;
    title.append(make('span', String(records.length), 'count'));
    section.setAttribute('aria-labelledby', title.id);
    section.append(title, ...records.map(makeCard));
    sections.push(section);
  }
  byId('quick-groups').replaceChildren(...sections);
  byId('quick-counter').textContent = `${filtered.length} / ${smurRecords.length} lignes`;
  byId('quick-empty').hidden = filtered.length > 0;
  smurRecords.forEach(updateCard);
}

function updatePatient() {
  const errorBox = byId('quick-error');
  errorBox.hidden = true;
  errorBox.textContent = '';
  weightInput.removeAttribute('aria-invalid');
  ageInput.removeAttribute('aria-invalid');
  let failure = null;
  context = null;
  try { context = resolvePatientContext({ weight: weightInput.value, age: ageInput.value, ageUnit: ageUnitInput.value }); }
  catch (error) {
    failure = error;
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    (error.field === 'weight' ? weightInput : ageInput).setAttribute('aria-invalid', 'true');
  }
  results = calculateAllRecords(smurRecords, context);
  byId('quick-used-weight').textContent = context ? `${format(context.weightKg)} kg` : '— kg';
  byId('quick-weight-source').textContent = context ? context.weightSource === 'measured' ? 'Poids saisi · prioritaire' : 'Poids estimé · règle locale' : failure ? 'Saisie à corriger' : 'En attente de saisie';
  byId('quick-weight-summary').className = `quick-weight-summary ${context?.weightSource === 'estimated' ? 'estimated' : ''}`;
  byId('quick-formula').textContent = context?.formula ? `Estimation : ${context.formula}. Privilégier un poids connu ou une estimation par la taille.` : context ? 'Ce poids est utilisé pour toutes les lignes calculables.' : 'Âge seul → estimation ; poids saisi → priorité.';
  const calculated = [...results.values()].filter(result => result.status === 'calculated').length;
  byId('quick-calculation-status').textContent = failure ? 'Calculs effacés : corrigez la saisie.' : context ? `${calculated} lignes calculées pour ${format(context.weightKg)} kg. Les lignes à clarifier sont signalées.` : 'Les calculs apparaîtront dès la saisie.';
  smurRecords.forEach(updateCard);
}

for (const category of smurCategories) {
  const option = make('option', category.label);
  option.value = category.id;
  categoryInput.append(option);
}
for (const input of [weightInput, ageInput]) input.addEventListener('input', updatePatient);
ageUnitInput.addEventListener('change', updatePatient);
form.addEventListener('submit', event => event.preventDefault());
byId('quick-clear-weight').addEventListener('click', () => {
  weightInput.value = '';
  updatePatient();
  weightInput.focus();
});
function resetPatient() {
  form.reset();
  updatePatient();
}
byId('quick-reset').addEventListener('click', () => { resetPatient(); ageInput.focus(); });
searchInput.addEventListener('input', renderGroups);
categoryInput.addEventListener('change', renderGroups);
window.addEventListener('pageshow', event => { if (event.persisted) resetPatient(); });
renderGroups();
resetPatient();
