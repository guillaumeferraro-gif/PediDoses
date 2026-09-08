import { catalogRecords, catalogMeta, categories, reviewSources } from './catalog-data.js';
import { auditRecord, reviewState } from './catalog-audit.js';

const byId = id => document.getElementById(id);
const format = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);
const unitLabel = unit => unit === 'mcg' ? 'mcg' : unit;
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const make = (tag, text = '', className = '') => {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
};
const audits = new Map(catalogRecords.map(record => [record.id, auditRecord(record)]));
const stateOf = record => reviewState(record, audits.get(record.id));
const categoryName = id => categories.find(c => c.id === id).label;
const sourcePosology = record => record.category !== 'ivc' ? record.sourceCells[1] : record.id === 'nicardipine' ? record.sourceCells[3] : record.sourceCells[4];
let selectedId = catalogRecords[0].id;

document.querySelectorAll('.catalog-count').forEach(el => { el.textContent = catalogRecords.length; });
for (const c of categories) {
  const option = make('option', c.label);
  option.value = c.id;
  byId('category-filter').append(option);
}

function linkFor(key) {
  const source = reviewSources[key];
  if (!source) return null;
  const anchor = make('a', source.title + ' ↗');
  anchor.href = source.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}

function metric(label, value) {
  const row = make('div', '', 'audit-metric');
  row.append(make('span', label), make('strong', value));
  return row;
}

function showRecord(record) {
  selectedId = record.id;
  const audit = audits.get(record.id);
  const state = stateOf(record);
  byId('record-detail').hidden = false;
  byId('record-category').textContent = categoryName(record.category);
  byId('record-title').textContent = record.name;
  byId('record-state').className = `review-badge ${state.code}`;
  byId('record-state').textContent = state.label;
  const labels = record.category === 'ivc'
    ? ['Présentation', 'Cellule « Prendre »', 'Cellule « Compléter avec »', 'Cellule « débit »', 'Cellule « posologie »', 'Dernière cellule']
    : ['Présentation', 'Posologie indiquée', 'Préparation / durée indiquée', 'Volume ou énergie affiché', 'Autre indication du tableau', 'Dose totale affichée'];
  byId('record-source').replaceChildren(...record.sourceCells.map((text, i) => {
    const row = make('div');
    row.append(make('dt', labels[i]), make('dd', text || 'Non renseigné'));
    return row;
  }));
  const issues = [...record.issues];
  for (const d of audit.discrepancies) {
    if (record.id === 'atropine' && d.code === 'volume-discrepancy') continue;
    issues.push({ message: `Écart sous l’hypothèse de 10 kg : ${format(d.supplied)} ${d.unit} affiché, contre ${format(d.expected)} ${d.unit} par calcul.${d.relativePercent !== undefined ? ` Écart relatif : ${format(d.relativePercent)} %.` : ''}` });
  }
  byId('record-issues-section').hidden = issues.length === 0;
  byId('record-issues').replaceChildren(...issues.map(item => {
    const li = make('li');
    li.append(make('p', item.message));
    if (item.source) {
      const a = linkFor(item.source);
      if (a) li.append(a);
    }
    return li;
  }));
  byId('audit-details').open = false;
  const content = byId('record-audit');
  content.replaceChildren();
  if (!audit.calculable) {
    content.append(make('p', record.model.type === 'instruction' ? 'Consigne textuelle de la source, sans opération numérique.' : 'Contrôle numérique non effectué : les données nécessaires sont ambiguës ou absentes.', 'audit-unresolved'));
  } else {
    const m = record.model;
    if (audit.dose !== null) {
      content.append(metric('Quantité arithmétique', `${format(audit.dose)} ${unitLabel(audit.unit)}`));
      content.append(make('p', `${format(m.coefficient)} ${unitLabel(m.unit)}/kg × ${format(catalogMeta.referenceWeightKg)} kg.`, 'audit-formula'));
    }
    if (audit.concentration !== null) content.append(metric('Concentration pour le contrôle', `${format(audit.concentration)} ${unitLabel(audit.unit)}/mL`));
    if (audit.volumeMl !== null) content.append(metric('Volume arithmétique', `≈ ${format(audit.volumeMl)} mL`));
    if (audit.mass !== undefined) content.append(metric('Quantité correspondante', `${format(audit.mass)} ${unitLabel(audit.massUnit)}`));
    if (audit.rateMlH !== null) {
      content.append(metric('Quantité par heure', `${format(audit.hourlyAmount)} ${unitLabel(audit.unit)}/h`));
      content.append(metric('Débit arithmétique', `≈ ${format(audit.rateMlH)} mL/h`));
      content.append(make('p', `Calcul : ${format(m.coefficient)} × 10 kg × 60 ÷ ${format(m.periodMinutes)} minutes, puis division par la concentration.`, 'audit-formula'));
      const period = m.periodMinutes === 1 ? 'min' : m.periodMinutes === 60 ? 'h' : '6 h';
      content.append(metric('Posologie équivalente au débit source', `≈ ${format(audit.sourceEquivalentCoefficient)} ${unitLabel(audit.unit)}/kg/${period}`));
    }
    if (audit.discrepancies.length) content.append(make('p', 'Le calcul et le tableau ne coïncident pas. La valeur source n’a pas été remplacée.', 'audit-difference'));
    else content.append(make('p', 'Aucun écart numérique détecté sur les champs contrôlables, compte tenu de la précision affichée. Cela ne valide pas la ligne sur le plan clinique.', 'audit-limitation'));
    if (audit.volumeMl === null && m.type === 'dose' && !['J', 'mL'].includes(m.unit)) content.append(make('p', 'Volume non calculé : concentration ou volume final insuffisamment documenté.', 'audit-limitation'));
    content.append(make('p', 'Affichage à 6 décimales au maximum. Aucune règle d’arrondi d’administration ou de réglage de pompe n’est appliquée.', 'audit-limitation'));
  }
  for (const row of byId('catalog-rows').children) {
    const active = row.dataset.id === record.id;
    row.classList.toggle('selected', active);
    row.querySelector('button').setAttribute('aria-current', active ? 'true' : 'false');
  }
}

function renderCatalog() {
  const query = normalize(byId('medication-search').value.trim());
  const category = byId('category-filter').value;
  const filtered = catalogRecords.filter(record =>
    (category === 'all' || record.category === category) &&
    normalize([record.name, categoryName(record.category), ...record.sourceCells].join(' ')).includes(query));
  byId('catalog-counter').textContent = `${filtered.length} / ${catalogRecords.length} lignes`;
  byId('catalog-empty').hidden = filtered.length > 0;
  byId('catalog-rows').replaceChildren(...filtered.map(record => {
    const tr = make('tr');
    tr.dataset.id = record.id;
    const nameCell = make('td');
    const button = make('button', record.name, 'medication-link');
    button.type = 'button';
    button.addEventListener('click', () => showRecord(record));
    nameCell.append(button, make('span', categoryName(record.category), 'medication-category'));
    const doseCell = make('td', sourcePosology(record) || 'Non renseignée', 'posology-cell');
    const statusCell = make('td');
    const state = stateOf(record);
    statusCell.append(make('span', state.label, `review-badge ${state.code}`));
    tr.append(nameCell, doseCell, statusCell);
    return tr;
  }));
  if (filtered.length) showRecord(filtered.find(r => r.id === selectedId) ?? filtered[0]);
  else byId('record-detail').hidden = true;
}

function goToRecord(record) {
  byId('medication-search').value = '';
  byId('category-filter').value = record.category;
  selectedId = record.id;
  renderCatalog();
  byId('catalog-tab').click();
  byId('record-title').focus();
}

const differences = catalogRecords.filter(r => audits.get(r.id).discrepancies.length);
const points = catalogRecords.filter(r => r.issues.length && !audits.get(r.id).discrepancies.length);
byId('issue-count').textContent = differences.length + points.length;
byId('outstanding-count').textContent = points.length;
for (const record of differences) {
  const card = make('div', '', 'difference-card');
  const button = make('button', record.name, 'medication-link');
  button.type = 'button';
  button.addEventListener('click', () => goToRecord(record));
  card.append(button);
  for (const d of audits.get(record.id).discrepancies) {
    card.append(make('p', `Tableau : ${format(d.supplied)} ${d.unit} · Contrôle : ${format(d.expected)} ${d.unit}`));
  }
  byId('discrepancy-list').append(card);
}
for (const record of points) {
  const item = make('div', '', 'outstanding-item');
  const button = make('button', record.name, 'medication-link');
  button.type = 'button';
  button.addEventListener('click', () => goToRecord(record));
  item.append(button, make('p', record.issues.map(i => i.message).join(' ')));
  byId('outstanding-list').append(item);
}
for (const key of Object.keys(reviewSources)) byId('reference-links').append(linkFor(key));
byId('medication-search').addEventListener('input', renderCatalog);
byId('category-filter').addEventListener('change', renderCatalog);
renderCatalog();
