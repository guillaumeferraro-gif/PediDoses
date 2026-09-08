import { smurRecords } from './smur-data.js';
import { defaultAmpoules, applyAmpoules, ampouleValues, ampouleHeaders, ampouleStorageKey, exportAmpoulesCsv, importAmpoulesCsv } from './ampoules.js';

const byId = id => document.getElementById(id);
const make = (tag, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
let active = defaultAmpoules(smurRecords);
let pending = null;
let loadMessage = 'Ampoules fournies avec cette version.';
try {
  const stored = localStorage.getItem(ampouleStorageKey);
  if (stored) {
    const parsed = JSON.parse(stored);
    applyAmpoules(smurRecords, parsed.items);
    active = parsed.items;
    loadMessage = 'Tableau personnalisé enregistré sur cet appareil.';
  }
} catch {
  loadMessage = 'Tableau enregistré indisponible ou incompatible : les ampoules de cette version sont utilisées.';
}
export const getConfiguredRecords = () => applyAmpoules(smurRecords, active);

function renderInventory() {
  const table = byId('ampoules-table');
  const head = make('thead'); const hr = make('tr');
  const visible = [1, 2, 3, 4, 5, 7, 8, 9, 10];
  visible.forEach(index => { const th = make('th', ampouleHeaders[index]); th.scope = 'col'; hr.append(th); });
  head.append(hr);
  const body = make('tbody');
  for (const row of ampouleValues(active)) {
    const tr = make('tr');
    visible.forEach((index, i) => {
      const value = row[index];
      const text = value === null || value === '' ? '—' : typeof value === 'number' ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 12 }).format(value) : value;
      const td = make(i === 0 ? 'th' : 'td', text);
      if (i === 0) td.scope = 'row';
      tr.append(td);
    });
    body.append(tr);
  }
  table.replaceChildren(head, body);
  byId('ampoules-status').textContent = loadMessage;
  byId('quick-ampoules-status').textContent = loadMessage;
}

byId('ampoules-export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([exportAmpoulesCsv(active)], { type: 'text/csv;charset=utf-8' }));
  const link = make('a'); link.href = url; link.download = 'PediDoses-Ampoules.csv';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

byId('ampoules-file').addEventListener('change', async event => {
  pending = null;
  byId('ampoules-preview').hidden = true;
  byId('ampoules-error').hidden = true;
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('Le CSV dépasse 1 Mo.');
    pending = importAmpoulesCsv(await file.text(), smurRecords);
    const previous = new Map(active.map(row => [row.id, row]));
    const changes = pending.filter(item => JSON.stringify(item) !== JSON.stringify(previous.get(item.id)));
    const list = byId('ampoules-changes'); list.replaceChildren();
    for (const item of changes) {
      const before = ampouleValues([previous.get(item.id)])[0];
      const after = ampouleValues([item])[0];
      const changedFields = ampouleHeaders.flatMap((label, i) => before[i] !== after[i] ? [`${label} : ${before[i] ?? 'vide'} → ${after[i] ?? 'vide'}`] : []);
      list.append(make('li', `${item.name} — ${changedFields.join(' ; ')}`));
    }
    if (!changes.length) list.append(make('li', 'Le tableau est identique aux ampoules déjà utilisées.'));
    byId('ampoules-preview').hidden = false;
    byId('ampoules-apply').focus();
  } catch (error) {
    byId('ampoules-error').textContent = `Import refusé : ${error.message} Les ampoules actives sont conservées.`;
    byId('ampoules-error').hidden = false;
  }
});

byId('ampoules-apply').addEventListener('click', () => {
  if (!pending) return;
  try {
    applyAmpoules(smurRecords, pending);
    localStorage.setItem(ampouleStorageKey, JSON.stringify({ items: pending }));
    active = pending; pending = null;
    loadMessage = 'Tableau personnalisé enregistré sur cet appareil.';
    byId('ampoules-preview').hidden = true;
    byId('ampoules-file').value = '';
    renderInventory();
    window.dispatchEvent(new Event('ampoules-updated'));
  } catch (error) {
    byId('ampoules-error').textContent = `Enregistrement impossible : ${error.message} Les ampoules actives sont conservées.`;
    byId('ampoules-error').hidden = false;
  }
});

byId('ampoules-cancel').addEventListener('click', () => {
  pending = null; byId('ampoules-preview').hidden = true; byId('ampoules-file').value = '';
});
byId('ampoules-reset').addEventListener('click', () => {
  try {
    localStorage.removeItem(ampouleStorageKey);
    active = defaultAmpoules(smurRecords); pending = null;
    loadMessage = 'Ampoules fournies avec cette version.';
    byId('ampoules-preview').hidden = true; byId('ampoules-file').value = '';
    byId('ampoules-error').hidden = true;
    renderInventory(); window.dispatchEvent(new Event('ampoules-updated'));
  } catch {
    byId('ampoules-error').textContent = 'Impossible de réinitialiser le tableau enregistré sur cet appareil.';
    byId('ampoules-error').hidden = false;
  }
});
renderInventory();
