import { smurRecords, smurCategories, smurSources } from './smur-data.js';
import { reviewSources } from './catalog-data.js';
import { auditRecord } from './catalog-audit.js';
import { parseDecimal } from './calculator.js';
import { resolvePatientContext, calculateAllRecords } from './patient-calculator.js';

const byId = id => document.getElementById(id);
const format = number => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(number);
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
let previousAgeUnit = ageUnitInput.value;
let context = null;
let results = calculateAllRecords(smurRecords, null);
let cards = new Map();
const sourceAudits = new Map(smurRecords.filter(record => record.kind === 'imported').map(record => [record.id, auditRecord(record)]));

function sourceLink(source) {
  const anchor = make('a', source.title);
  anchor.href = source.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}
function formulaFor(record) {
  const m = record.model;
  if (!m.coefficient) return record.category === 'ivc' ? record.sourceCells[4] : record.sourceCells[1];
  const period = m.type !== 'infusion' ? '' : m.periodMinutes === 1 ? '/min' : m.periodMinutes === 60 ? '/h' : '/6 h';
  return `${format(m.coefficient)} ${unitLabel(m.unit)}/kg${period}`;
}
function addPreparation(details, record) {
  const m = record.model;
  if (record.sourceCells[0]) details.append(make('p', `Présentation : ${record.sourceCells[0]}`));
  if (m.mix) {
    details.append(make('p', `Mélange du tableau : ${format(m.mix.takeMl)} mL de produit + ${format(m.mix.addMl)} mL de diluant = ${format(m.mix.takeMl + m.mix.addMl)} mL. La préparation reste fixe quand le poids change.`));
  }
  const preparation = record.category === 'ivc'
    ? `Cellules de préparation : ${record.sourceCells[1] || 'non renseignée'} ; ${record.sourceCells[2] || 'non renseignée'}.`
    : `Préparation / durée source : ${record.sourceCells[2] || 'non renseignée'}.`;
  details.append(make('p', preparation));
  if (record.kind === 'imported') details.append(make('p', 'Les volumes d’origine correspondent à l’exemple présumé de 10 kg. Ils restent consultables dans « Tableau source ». La mention « non » ne vaut pas autorisation d’injection directe.'));
  for (const issue of record.issues) {
    const paragraph = make('p', issue.message);
    if (issue.source && reviewSources[issue.source]) {
      paragraph.append(document.createTextNode(' '), sourceLink(reviewSources[issue.source]));
    }
    details.append(paragraph);
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
  details.append(make('summary', 'Préparation, calcul et précautions'));
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
  const audit = sourceAudits.get(record.id);
  const messages = [];
  if (audit?.discrepancies.length) messages.push('Écart dans l’exemple source : résultat calculé à partir de la posologie/kg.');
  if (record.category === 'antibiotiques') messages.push('Par prise ou par jour : à préciser.');
  if (record.id === 'isofundine') messages.push('Bolus à réévaluer · contre-indiqué en cas d’hyperkaliémie.');
  if (result.volumeMl === null && record.model.type === 'dose' && !['J', 'mL'].includes(result.unit)) messages.push('Volume indisponible : concentration finale non documentée.');
  if (record.issues.length && messages.length === 0) messages.push('Précautions ou modalités à préciser : ouvrir le détail.');
  notes.textContent = messages.join(' ');
  calculation.append(make('p', `Poids retenu : ${format(result.weightKg)} kg (${result.weightSource === 'measured' ? 'saisi' : 'estimé'}).`));
  if (result.rateMlH !== null) {
    calculation.append(make('p', `${formulaFor(record)} × ${format(result.weightKg)} kg × 60 ÷ ${record.model.periodMinutes} min = ${display(result.hourlyAmount)} ${unitLabel(result.unit)}/h.`));
  } else calculation.append(make('p', `${formulaFor(record)} × ${format(result.weightKg)} kg = ${display(result.dose)} ${unitLabel(result.unit)}.`));
  if (result.concentration !== null) calculation.append(make('p', `Concentration du modèle : ${format(result.concentration)} ${unitLabel(result.unit)}/mL.`));
  if (result.mass !== null) calculation.append(make('p', `Quantité correspondante : ${display(result.mass)} ${unitLabel(result.massUnit)}.`));
  if (record.model.durationHours) {
    calculation.append(make('p', `Durée de la ligne source : ${format(record.model.durationHours)} h. Avec le mélange fixe, autonomie théorique : ${display(result.theoreticalDurationHours)} h ; vérifier le volume disponible.`));
  }
  calculation.append(make('p', 'Aucun plafond, intervalle ni arrondi d’administration appliqué. Affichage à 6 décimales au maximum.'));
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
  byId('quick-weight-source').textContent = context ? context.weightSource === 'measured' ? 'Poids saisi · prioritaire' : 'Poids estimé · APLS' : failure ? 'Saisie à corriger' : 'En attente de saisie';
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
ageUnitInput.addEventListener('change', () => {
  // Changing the display unit must not turn 2 years into 2 months.
  if (ageInput.value.trim() && previousAgeUnit !== ageUnitInput.value) {
    try {
      const value = parseDecimal(ageInput.value, 'Âge');
      ageInput.value = String(previousAgeUnit === 'years' ? value * 12 : value / 12).replace('.', ',');
    } catch { /* Keep invalid text visible; updatePatient reports it. */ }
  }
  previousAgeUnit = ageUnitInput.value;
  updatePatient();
});
form.addEventListener('submit', event => event.preventDefault());
byId('quick-clear-weight').addEventListener('click', () => {
  weightInput.value = '';
  updatePatient();
  weightInput.focus();
});
function resetPatient() {
  form.reset();
  previousAgeUnit = ageUnitInput.value;
  updatePatient();
}
byId('quick-reset').addEventListener('click', () => { resetPatient(); ageInput.focus(); });
searchInput.addEventListener('input', renderGroups);
categoryInput.addEventListener('change', renderGroups);
window.addEventListener('pageshow', event => { if (event.persisted) resetPatient(); });
renderGroups();
resetPatient();
