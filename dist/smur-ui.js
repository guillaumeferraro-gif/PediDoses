import { smurCategories, smurSources } from './smur-data.js';
import { getConfiguredRecords } from './ampoules-ui.js';
import { resolvePatientContext, calculateAllRecords, isRecordVisibleForPatient } from './patient-calculator.js';
import { buildMedicationSheet, volumeText, concentrationText } from './smur-sheets.js';
import { setPatientInput, subscribePatientInput } from './patient-state.js';
import { doseControls } from './dose-controls.js';
import { withCurrentDose, clearDoseSettings, subscribeDoseSettings } from './dose-adjustments.js';
import { quickMedicationDetails } from './quick-summary.js';

const byId = id => document.getElementById(id);
const format = (number, digits = 6) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(number);
const preparationVolume = volumeText;
const unitLabel = unit => unit;
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
let smurRecords = getConfiguredRecords();
let results = calculateAllRecords(smurRecords, null);
let cards = new Map();
let renderedPatientVisibility = '';
let sheets = new Map(smurRecords.map(record => [record.id, buildMedicationSheet(record)]));
const openDisclosures = new Set();
let printSnapshot = null;

function disclosure(key, label, className) {
  const details = make('details', '', className);
  details.open = openDisclosures.has(key);
  details.append(make('summary', label));
  details.addEventListener('toggle', () => {
    if (!printSnapshot) {
      if (details.open) openDisclosures.add(key);
      else openDisclosures.delete(key);
    }
  });
  return details;
}

function metric(container, label, value, highlighted = false) {
  const item = make('div', '', `dose-metric${highlighted ? ' dose-metric-volume' : ''}`);
  item.append(make('span', label, 'dose-value-label'), make('strong', value));
  container.append(item);
}

function renderCompactDetails(container, record, result) {
  container.replaceChildren(...quickMedicationDetails(withCurrentDose(record, context), result, context, sheets.get(record.id)).map(field => {
    const row = make('div', '', 'dose-detail-row');
    row.dataset.field = field.key;
    row.append(make('dt', field.label), make('dd', field.value));
    return row;
  }));
}

function sourceLink(source) {
  const anchor = make('a', source.title);
  anchor.href = source.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}
function addPreparation(details, record) {
  const sheet = sheets.get(record.id);
  const section = (title, value) => {
    const block = make('section', '', 'protocol-block');
    block.append(make('h4', title));
    if (value) block.append(make('p', value));
    return block;
  };
  details.append(section('Ampoule utilisée / présentation', sheet.presentation));
  const dosage = section('Posologie et seuils de changement');
  const table = make('table', '', 'dosage-table');
  table.append(make('caption', `Tous les paliers — ${record.name}`, 'sr-only'));
  const head = make('thead');
  const header = make('tr');
  const labels = ['Âge / poids', 'Posologie', 'Concentration finale', 'Volume final / débit'];
  labels.forEach(label => { const cell = make('th', label); cell.scope = 'col'; header.append(cell); });
  head.append(header);
  const body = make('tbody');
  sheet.doseRows.forEach(row => {
    const tr = make('tr');
    [row.condition, row.dose, row.concentration, row.volume].forEach((value, index) => {
      const cell = make(index === 0 ? 'th' : 'td', value);
      if (index === 0) cell.scope = 'row';
      cell.dataset.label = labels[index];
      tr.append(cell);
    });
    body.append(tr);
  });
  table.append(head, body); dosage.append(table);
  if (sheet.ceiling) dosage.append(make('p', sheet.ceiling, 'protocol-ceiling'));
  details.append(dosage);
  const preparation = section('Préparation et dilution');
  sheet.preparations.forEach(row => {
    const p = make('p', '', 'preparation-row');
    p.append(make('strong', `${row.condition} : `), document.createTextNode(row.text));
    preparation.append(p);
  });
  if (sheet.preparations.length) details.append(preparation);
  if(sheet.administration) details.append(section('Modalités d’administration', sheet.administration));
  if (sheet.particulars.length) {
    const block = section('Précisions');
    const list = make('ul');
    list.append(...sheet.particulars.map(text => make('li', text)));
    block.append(list); details.append(block);
  }
  const block = section('Points à relire');
  block.classList.add('protocol-questions');
  if (sheet.questions.length) {
    const list = make('ul');
    list.append(...sheet.questions.map(text => make('li', text)));
    block.append(list);
  } else block.append(make('p', 'Aucune question spécifique recensée. Relecture collective de cette fiche à finaliser.'));
  details.append(block);
  const sources = make('p', 'Base de relecture : tableau Prescription / Ampoules et décisions locales. ', 'sheet-sources');
  const keys = [...(record.sources ?? []), ...(record.id === 'insuline-glucose' ? ['erc'] : [])];
  for (const key of keys) sources.append(sourceLink(smurSources[key]));
  details.append(sources);
}

function makeCard(record) {
  const card = make('article', '', 'dose-card');
  card.dataset.recordId = record.id;
  const info = make('div', '', 'dose-info');
  const heading = make('h3', record.name);
  heading.id = `quick-medication-${record.id}`;
  card.setAttribute('aria-labelledby', heading.id);
  info.append(heading);
  const values = make('div', '', 'dose-values');
  const controls=make('div','','dose-controls');
  const notes = make('p', '', 'dose-notes');
  const details = disclosure(record.id, 'Préparation et administration', 'dose-details');
  const compact = make('dl', '', 'dose-detail-rows');
  const review = disclosure(`${record.id}:review`, 'Paliers, relecture et sources', 'dose-review');
  const reference = make('div', '', 'dose-reference');
  addPreparation(reference, record);
  const calculationDetails = disclosure(`${record.id}:calculation`, 'Détail du calcul pour le poids retenu', 'patient-calculation');
  const calculation = make('div', '', 'dose-calculation');
  calculationDetails.append(calculation);
  reference.append(calculationDetails);
  review.append(reference);
  details.append(compact, review);
  card.append(info, values, controls, notes, details);
  cards.set(record.id, { values, notes, calculation, controls, compact, details, review, calculationDetails });
  return card;
}

function updateCard(record) {
  const elements = cards.get(record.id);
  if (!elements) return;
  const result = results.get(record.id);
  const { values, notes, calculation, controls, compact } = elements;
  const control=doseControls(record,context,'quick');
  controls.replaceChildren(...(control ? [control] : [])); controls.hidden=!control;
  values.replaceChildren();
  calculation.replaceChildren();
  notes.textContent = '';
  notes.className = 'dose-notes';
  renderCompactDetails(compact, record, result);
  const sheet = sheets.get(record.id);
  const questionCount = sheet.questions.length;
  const reviewNote = questionCount ? `${questionCount} point${questionCount > 1 ? 's' : ''} à relire dans les détails.` : '';
  if (result.status !== 'calculated') {
    if (result.status !== 'instruction') {
      metric(values, record.model.unit === 'J' ? 'Énergie' : 'Dose calculée', '—');
      if (record.model.unit !== 'J') metric(values, 'Volume / débit', '—', true);
    }
    notes.textContent = [result.message, reviewNote].filter(Boolean).join(' ');
    notes.className = `dose-notes ${result.status === 'blocked' ? 'dose-blocked' : ''}`;
    return;
  }
  notes.className = 'dose-notes';
  if(result.secondDose){
    for(const [label,dose]of [['1re dose',result],['2e dose',result.secondDose]]){
      const group=make('div','','dose-sequence');
      group.append(make('span',label,'dose-value-label'),make('strong',`${display(dose.dose)} ${unitLabel(dose.unit)}`));
      if(dose.volumeMl!==null){
        const volume=make('span',`${preparationVolume(dose.volumeMl)} mL`,'dose-volume');
        volume.setAttribute('aria-label',`Volume de la ${label} : ${volume.textContent}`);
        group.append(volume);
      }
      if(dose.rateMlH!==null)group.append(make('span',`${format(dose.rateMlH,1)} mL/h`,'dose-volume'));
      if(dose.maximumApplied)group.append(make('small','Plafond appliqué'));
      values.append(group);
      calculation.append(make('p',`${label} : ${display(dose.dose)} ${unitLabel(dose.unit)}${dose.volumeMl!==null?` = ${preparationVolume(dose.volumeMl)} mL`:''}${dose.maximumApplied?' après plafond':''}.`));
    }
    if(result.concentration!==null)calculation.append(make('p',`Concentration commune : ${concentrationText(result.concentration,result.unit)}.`));
    notes.textContent = reviewNote;
    return;
  }
  const infusion = ['infusion', 'fixed-rate', 'fixed-duration-mixture'].includes(record.model.type);
  const volumeDose = result.unit === 'mL' && record.model.volumeKind !== 'withdrawal';
  if (volumeDose) {
    metric(values, record.model.limitToOneBag ? 'Volume prescrit · max. 1 poche' : 'Volume à administrer', `${preparationVolume(result.dose)} mL`, true);
  } else {
    const quantity = result.dose ?? result.hourlyAmount;
    const doseLabel = result.unit === 'J' ? 'Énergie' : result.rateKind === 'glucose' ? 'Insuline rapide' : result.dose === null ? 'Dose horaire' : record.model.volumeKind === 'withdrawal' && result.unit === 'mL' ? 'Produit à prélever' : 'Dose calculée';
    const unit = `${unitLabel(result.unit)}${result.dose === null && result.hourlyAmount !== null ? '/h' : ''}`;
    metric(values, doseLabel, quantity === null ? '—' : `${result.unit === 'mL' ? preparationVolume(quantity) : display(quantity)} ${unit}`);
    if (result.unit !== 'J') {
      const label = infusion ? 'Débit' : result.rateKind === 'glucose' ? `Volume de G${format((record.model.glucoseConcentrationMgMl ?? 100) / 10, 2)} %` : 'Volume à administrer';
      const value = infusion ? result.rateMlH === null ? '—' : `${format(result.rateMlH, 1)} mL/h` : result.volumeMl === null ? '—' : `${preparationVolume(result.volumeMl)} mL`;
      metric(values, label, value, true);
    }
  }
  if (!infusion && result.rateMlH !== null) {
    const label = result.rateKind === 'glucose' ? `Débit du G${format((record.model.glucoseConcentrationMgMl ?? 100) / 10, 2)} %` : 'Débit';
    values.append(make('span', `${label} : ${format(result.rateMlH, 1)} mL/h`, 'dose-extra'));
  }
  if (record.model.durationHours && result.dose !== null && result.rateKind !== 'glucose') values.append(make('span', `Dose sur ${format(record.model.durationHours)} h`, 'dose-extra'));
  if (result.withdrawalMl !== null) values.append(make('span', `Produit à prélever : ${preparationVolume(result.withdrawalMl)} mL`, 'dose-extra'));
  const messages = [];
  if (record.model.type==='infusion' && result.rateMlH===null) messages.push('Débit indisponible : concentration finale à préciser.');
  if (result.volumeMl === null && record.model.type === 'dose' && record.model.preparationMode!=='dose-only' && record.category !== 'antibiotiques' && !['J', 'mL'].includes(result.unit)) messages.push('Volume indisponible : concentration finale non documentée.');
  if (reviewNote) messages.push(reviewNote);
  if (sheet.pendingCeiling !== null && result.dose > sheet.pendingCeiling) messages.push('La dose calculée dépasse le plafond du tableau qui reste à valider. Voir les détails de la fiche.');
  if (result.maximumApplied) messages.push('Plafond du modèle appliqué : voir son statut dans la fiche.');
  notes.textContent = messages.join(' ');
  calculation.append(make('p', `Poids retenu : ${format(result.weightKg)} kg (${result.weightSource === 'measured' ? 'saisi' : 'estimé'}).`));
  if (result.dose !== null) calculation.append(make('p', `Quantité calculée${record.model.durationHours ? ` sur ${record.model.durationHours} h` : ''} : ${display(result.dose)} ${unitLabel(result.unit)}${result.maximumApplied ? ' après plafond' : ''}.`));
  if (result.hourlyAmount !== null) calculation.append(make('p', `Quantité par heure : ${display(result.hourlyAmount)} ${unitLabel(result.unit)}/h.`));
  if (result.rateMlH !== null) calculation.append(make('p', `${result.rateKind==='glucose' ? `Débit du G${format((record.model.glucoseConcentrationMgMl??100)/10,2)} %` : 'Débit final'} : ${format(result.rateMlH, 1)} mL/h (arrondi final à 0,1 mL/h).`));
  if (result.concentration !== null) calculation.append(make('p', `Concentration finale : ${concentrationText(result.concentration, result.unit)}.`));
  if (result.mass !== null) calculation.append(make('p', `Quantité correspondante : ${display(result.mass)} ${unitLabel(result.massUnit)}.`));
  if (result.volumeMl !== null) calculation.append(make('p', `${result.rateKind==='glucose' ? `Volume de G${format((record.model.glucoseConcentrationMgMl??100)/10,2)} %` : 'Volume de la solution finale à administrer'} : ${preparationVolume(result.volumeMl)} mL.`));
  if (result.withdrawalMl !== null) calculation.append(make('p', `Volume de produit à prélever : ${preparationVolume(result.withdrawalMl)} mL${result.stockConcentration!==null ? ` à ${concentrationText(result.stockConcentration, result.unit)}` : ' de produit avant dilution'}.`));
  if (result.addMl !== null) calculation.append(make('p', `Diluant à ajouter : ${preparationVolume(result.addMl)} mL (${record.model.diluent}).`));
  if (result.mixtureVolumeMl !== null) calculation.append(make('p', `Volume final : ${preparationVolume(result.mixtureVolumeMl)} mL.`));
  calculation.append(make('p', 'Les arrondis d’affichage ne modifient pas les calculs internes.'));
}

function renderGroups() {
  if (!printSnapshot) for (const [id, elements] of cards) {
    for (const [name, suffix] of [['details', ''], ['review', ':review'], ['calculationDetails', ':calculation']]) {
      const key = id + suffix;
      if (elements[name].open) openDisclosures.add(key);
      else openDisclosures.delete(key);
    }
  }
  const query = normalize(searchInput.value.trim());
  const visible = smurRecords.filter(record => isRecordVisibleForPatient(record, context));
  renderedPatientVisibility = visible.map(record => record.id).join(',');
  const filtered = visible.filter(record =>
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
    const grid = make('div', '', 'dose-card-grid');
    grid.append(...records.map(makeCard));
    section.append(title, grid);
    sections.push(section);
  }
  byId('quick-groups').replaceChildren(...sections);
  byId('quick-counter').textContent = `${filtered.length} / ${smurRecords.length} lignes`;
  byId('quick-empty').hidden = filtered.length > 0;
  smurRecords.forEach(updateCard);
}

function updatePatient() {
  setPatientInput({ weight: weightInput.value, age: ageInput.value, ageUnit: ageUnitInput.value }, 'quick');
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
  results = calculateAllRecords(smurRecords.map(record=>withCurrentDose(record,context)), context);
  byId('quick-used-weight').textContent = context ? `${format(context.weightKg)} kg` : '— kg';
  byId('quick-weight-source').textContent = context ? context.weightSource === 'measured' ? 'Poids saisi · prioritaire' : 'Poids estimé · règle locale' : failure ? 'Saisie à corriger' : 'En attente de saisie';
  byId('quick-weight-summary').className = `quick-weight-summary ${context?.weightSource === 'estimated' ? 'estimated' : ''}`;
  byId('quick-formula').textContent = context?.formula ? `Estimation : ${context.formula}. Privilégier un poids connu ou une estimation par la taille.` : context ? 'Ce poids est utilisé pour toutes les lignes calculables.' : 'Âge seul → estimation ; poids saisi → priorité.';
  const calculated = [...results.values()].filter(result => result.status === 'calculated').length;
  byId('quick-calculation-status').textContent = failure ? 'Calculs effacés : corrigez la saisie.' : context ? `${calculated} lignes calculées pour ${format(context.weightKg)} kg. Les lignes à clarifier sont signalées.` : 'Les calculs apparaîtront dès la saisie.';
  const visibility = smurRecords.filter(record => isRecordVisibleForPatient(record, context)).map(record => record.id).join(',');
  if (visibility !== renderedPatientVisibility) renderGroups();
  else smurRecords.forEach(updateCard);
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
  openDisclosures.clear();
  for (const elements of cards.values()) for (const name of ['details', 'review', 'calculationDetails']) elements[name].open = false;
  clearDoseSettings();
  form.reset();
  updatePatient();
  window.dispatchEvent(new Event('patient-reset'));
}
byId('quick-reset').addEventListener('click', () => { resetPatient(); ageInput.focus(); });
searchInput.addEventListener('input', renderGroups);
categoryInput.addEventListener('change', renderGroups);
byId('quick-print').addEventListener('click', () => window.print());
window.addEventListener('beforeprint', () => {
  if (printSnapshot) return;
  printSnapshot = new Map();
  for (const elements of cards.values()) for (const name of ['details', 'review']) {
    const details = elements[name];
    printSnapshot.set(details, details.open);
    details.open = true;
  }
});
window.addEventListener('afterprint', () => {
  if (!printSnapshot) return;
  for (const [details, open] of printSnapshot) details.open = open;
  printSnapshot = null;
});
window.addEventListener('pageshow', event => { if (event.persisted) resetPatient(); });
window.addEventListener('ampoules-updated', () => {
  smurRecords = getConfiguredRecords();
  sheets = new Map(smurRecords.map(record => [record.id, buildMedicationSheet(record)]));
  results = calculateAllRecords(smurRecords.map(record=>withCurrentDose(record,context)), context);
  renderGroups(); updatePatient();
});
subscribePatientInput((value, source) => {
  if (source === 'quick') return;
  weightInput.value = value.weight; ageInput.value = value.age; ageUnitInput.value = value.ageUnit;
  updatePatient();
});
renderGroups();
resetPatient();
subscribeDoseSettings(updatePatient);

