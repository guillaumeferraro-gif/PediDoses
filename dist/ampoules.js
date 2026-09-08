import { convertUnit } from './catalog-audit.js';

export const ampouleHeaders = ['Identifiant', 'Médicament', 'Présentation', 'Volume (mL)', 'Quantité', 'Unité', 'Concentration déclarée', 'Concentration calculée', 'Expression', 'Statut', 'Commentaire', 'Source'];
export const ampouleStorageKey = 'pedidoses.ampoules.v1';
export const ampouleStatuses = ['confirmé', 'à confirmer', 'sans objet'];
const fmt = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 12 }).format(n);
const unknownContainers = new Set(['calcium-chlorure', 'propofol', 'suxamethonium', 'levetiracetam', 'cafeine', 'flumazenil', 'sugammadex', 'naloxone', 'noradrenaline']);
const noContainer = new Set(['cardioversion', 'defibrillation', 'arret-potassium']);
const overrides = {
  amoxicilline: { presentation: 'Poudre pour solution injectable', amount: 500, unit: 'mg', status: 'confirmé' },
  cefotaxime: { presentation: 'Poudre pour solution injectable', amount: 500, unit: 'mg', status: 'confirmé' },
  ceftriaxone: { presentation: 'Poudre pour solution injectable', amount: 1, unit: 'g', status: 'confirmé' },
  'amoxicilline-clavulanique': { presentation: 'Poudre pour solution injectable', unit: 'mg', expression: 'amoxicilline', comment: 'Renseigner le dosage et le rapport amoxicilline/acide clavulanique.' },
  'midazolam-iv': { amount: 50, volumeMl: 10, status: 'confirmé' },
  'midazolam-ij': { amount: 50, volumeMl: 10, comment: 'Confirmer la forme adaptée à la voie intergingivojugale.' },
  'midazolam-ivc': { amount: 50, volumeMl: 10 },
  'morphine-dc': { amount: 10, volumeMl: 10, status: 'confirmé' },
  'morphine-titration': { amount: 10, volumeMl: 10 },
  'morphine-ivc': { amount: 10, volumeMl: 10 },
  'atracurium-ivc': { amount: 50, volumeMl: 5 },
  isofundine: { presentation: 'Flacon de solution pour perfusion', volumeMl: 1000, status: 'confirmé', expression: 'solution équilibrée prête à l’emploi' },
  magnesium: { volumeMl: 10, unit: 'g', expression: 'sulfate de magnésium', comment: 'À trancher : 0,15 g par mL (= 1,5 g/10 mL à 15 %) ou 0,15 g par ampoule de 10 mL. Quantité volontairement vide.', source: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/61106121/extrait' },
  'calcium-gluconate': { volumeMl: 10, amount: 91, unit: 'mg', expression: 'calcium élément (PROAMP 10 %)', comment: 'La dose et la dilution restent à trancher indépendamment de l’ampoule.', source: 'https://base-donnees-publique.medicaments.gouv.fr/medicament/68332774/extrait' },
  cafeine: { expression: 'citrate de caféine' },
  'calcium-chlorure': { expression: 'chlorure de calcium — expression de dose à confirmer' },
  'insuline-glucose': { presentation: 'Insuline rapide — spécialité à renseigner', unit: 'UI', expression: 'insuline', comment: 'Préciser la spécialité et sa compatibilité avec G5 %. Le second produit est une poche de 500 mL de G5 % ; mélange local : 15 UI dans 500 mL.' },
  'resikali-ir': { presentation: 'Poudre, cuillère-mesure', amount: 20, unit: 'g' },
  'kayexalate-ir': { presentation: 'Poudre, cuillère-mesure', amount: 15, unit: 'g' },
  ssh: { presentation: 'Préparation pharmacie à 7,5 %', declaredConcentration: 0.075, unit: 'g', expression: 'chlorure de sodium', comment: 'Préparation fournie par la pharmacie ; aucune dilution à réaliser.' },
  glucose10: { presentation: 'Solution de glucose à 10 %', declaredConcentration: 0.1, unit: 'g', expression: 'glucose' },
  cgr: { presentation: 'Poche de CGR phénotypé' }, pfc: { presentation: 'Poche de PFC' }, cpa: { presentation: 'Poche de CPA' },
};

export function defaultAmpoules(records) {
  return records.map(record => {
    const stock = record.model.stock;
    const unknown = unknownContainers.has(record.id);
    const item = {
      id: record.id, name: record.name + (record.category === 'ivc' ? ' (IVSE)' : ''),
      presentation: noContainer.has(record.id) ? 'Sans objet' : record.sourceCells[0].replace(/\s+\d.*$/, '') || record.name,
      volumeMl: unknown ? null : stock?.volumeMl ?? null,
      amount: unknown ? null : stock?.amount ?? null,
      unit: stock?.unit ?? '', declaredConcentration: unknown ? stock.amount / stock.volumeMl : null,
      expression: record.name, status: noContainer.has(record.id) ? 'sans objet' : 'à confirmer',
      comment: '', source: 'Tableau Prescription / Ampoules et décisions locales de la conversation',
      ...(overrides[record.id] || {}),
    };
    if (['adrenaline-iv', 'adrenaline-im', 'adrenaline-ivc', 'atropine', 'gentamicine', 'bicarbonate-acr', 'bicarbonate-hyperk'].includes(record.id)) item.status = 'confirmé';
    return item;
  });
}

export function stockConcentration(item) {
  return item.amount !== null && item.volumeMl !== null ? item.amount / item.volumeMl : item.declaredConcentration;
}

export function ampouleDescription(item) {
  const parts = [item.presentation];
  if (item.amount !== null) parts.push(`${fmt(item.amount)} ${item.unit}${item.volumeMl !== null ? ` dans ${fmt(item.volumeMl)} mL` : ' par contenant'}`);
  else if (item.volumeMl !== null) parts.push(`contenant de ${fmt(item.volumeMl)} mL`);
  const c = stockConcentration(item);
  if (c !== null) parts.push(`${fmt(c)} ${item.unit}/mL`);
  if (item.expression) parts.push(`expression : ${item.expression}`);
  if (item.status === 'à confirmer') parts.push('présentation à confirmer');
  return parts.join(' · ');
}

export function validateAmpoules(items, records) {
  if (!Array.isArray(items) || items.length !== records.length) throw new Error(`Le tableau doit contenir exactement ${records.length} lignes, une par fiche.`);
  const defaults = new Map(defaultAmpoules(records).map(item => [item.id, item]));
  const seen = new Set();
  for (const item of items) {
    const base = defaults.get(item.id);
    if (!base || seen.has(item.id)) throw new Error(`Identifiant absent du référentiel ou en double : ${item.id}.`);
    seen.add(item.id);
    for (const field of ['name', 'presentation', 'unit', 'expression', 'status', 'comment', 'source']) {
      if (typeof item[field] !== 'string' || item[field].length > 2000) throw new Error(`${item.id} : champ ${field} invalide.`);
    }
    for (const field of ['volumeMl', 'amount', 'declaredConcentration']) {
      if (item[field] !== null && (typeof item[field] !== 'number' || !Number.isFinite(item[field]) || item[field] <= 0)) throw new Error(`${item.id} : ${field} doit être vide ou strictement positif.`);
    }
    if (!ampouleStatuses.includes(item.status)) throw new Error(`${item.id} : statut invalide.`);
    if (item.unit && !['g', 'mg', 'mcg', 'ng', 'mmol', 'UI'].includes(item.unit)) throw new Error(`${item.id} : unité non reconnue.`);
    if ((item.amount !== null || item.declaredConcentration !== null) && !item.unit) throw new Error(`${item.id} : renseigner l’unité de quantité.`);
    if (base.unit && item.unit && base.unit !== item.unit) convertUnit(1, item.unit, base.unit);
    const calculated = stockConcentration(item);
    if (calculated !== null && (!Number.isFinite(calculated) || calculated <= 0)) throw new Error(`${item.id} : concentration non valide.`);
    if (['ssh', 'glucose10', 'calcium-gluconate'].includes(item.id)) {
      const reference = stockConcentration(base);
      const candidate = calculated === null ? null : convertUnit(calculated, item.unit, base.unit);
      if (candidate === null || Math.abs(candidate - reference) > Math.max(1, reference) * 1e-9) throw new Error(`${item.id} : la règle est liée à cette concentration (${reference} ${base.unit}/mL). Seul le conditionnement peut changer sans révision de la règle.`);
    }
    if (item.amount !== null && item.volumeMl !== null && item.declaredConcentration !== null && Math.abs(calculated - item.declaredConcentration) > Math.max(1, calculated) * 1e-9) throw new Error(`${item.id} : la concentration déclarée diffère de quantité ÷ volume. Effacer la concentration déclarée si quantité et volume sont renseignés.`);
    if (base.status === 'sans objet' && (item.amount !== null || item.volumeMl !== null || item.declaredConcentration !== null)) throw new Error(`${item.id} : cette ligne n’utilise pas d’ampoule.`);
    if (base.declaredConcentration !== null || records.find(r => r.id === item.id).model.stock) {
      if (calculated === null) throw new Error(`${item.id} : renseigner quantité + volume, ou la concentration déclarée.`);
    }
  }
  return items;
}

function adaptedMix(mix, oldStock, nextStock, id) {
  if (!mix) return null;
  const finalVolume = mix.takeMl + mix.addMl;
  const target = convertUnit(oldStock.amount, oldStock.unit, nextStock.unit) / oldStock.volumeMl * mix.takeMl;
  const takeMl = target / (nextStock.amount / nextStock.volumeMl);
  if (takeMl > finalVolume + 1e-10) throw new Error(`${id} : cette ampoule est trop diluée pour la préparation prévue (${finalVolume} mL finaux).`);
  return { takeMl, addMl: Math.max(0, finalVolume - takeMl) };
}

export function applyAmpoules(records, items) {
  validateAmpoules(items, records);
  const inventory = new Map(items.map(item => [item.id, item]));
  return records.map(record => {
    const item = inventory.get(record.id);
    const model = { ...record.model };
    const c = stockConcentration(item);
    if (model.stock && c !== null) {
      const nextStock = { amount: c, unit: item.unit, volumeMl: 1 };
      model.mix = adaptedMix(model.mix, model.stock, nextStock, record.id);
      if (model.weightMix) model.weightMix = { ...model.weightMix,
        below: adaptedMix(model.weightMix.below, model.stock, nextStock, record.id),
        atOrAbove: adaptedMix(model.weightMix.atOrAbove, model.stock, nextStock, record.id),
      };
      model.stock = nextStock;
    }
    if (model.type === 'fixed-duration-mixture' && model.stock) {
      const concentration = convertUnit(model.stock.amount, model.stock.unit, model.unit) / model.stock.volumeMl;
      if (model.maximumDose / concentration > model.finalVolumeMl + 1e-10) throw new Error(`${record.id} : cette ampoule est trop diluée pour préparer la quantité maximale dans ${model.finalVolumeMl} mL finaux.`);
    }
    const protocol = { ...record.protocol, particulars: [...record.protocol.particulars] };
    // The disputed magnesium stock cannot be selected just by importing an unconfirmed row.
    if (record.id === 'magnesium' && item.status === 'confirmé' && c !== null) {
      model.stock = { amount: c, unit: item.unit, volumeMl: 1 };
      model.volumeKind = 'withdrawal';
      protocol.dilution = 'Volume de produit à prélever ; dilution finale à préciser.';
      protocol.questions = ['Confirmer la dilution finale pour l’administration sur 20 min.'];
    }
    if (record.id.startsWith('morphine-')) protocol.particulars = protocol.particulars.filter(text => !text.startsWith('Concentration :'));
    if (record.id === 'noradrenaline') protocol.particulars = ['Préparation finale : 1 mg dans 50 mL. La dose nominale est un repère approximatif.'];
    return { ...record, model, protocol, ampoule: { ...item, description: ampouleDescription(item) } };
  });
}

export function ampouleValues(items) {
  return items.map(item => [item.id, item.name, item.presentation, item.volumeMl, item.amount, item.unit, item.declaredConcentration, stockConcentration(item), item.expression, item.status, item.comment, item.source]);
}

export function exportAmpoulesCsv(items) {
  const quote = value => {
    let text = value === null ? '' : String(value);
    if (typeof value === 'string' && /^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [ampouleHeaders, ...ampouleValues(items)].map(row => row.map(quote).join(',')).join('\r\n');
}

function csvRows(text) {
  if (typeof text !== 'string' || text.length > 1000000) throw new Error('CSV absent ou trop volumineux (maximum 1 Mo).');
  text = text.replace(/^\uFEFF/, '');
  const separator = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (ch === separator || ch === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = '';
      if (ch === '\n') { if (row.some(value => value.trim())) rows.push(row); row = []; }
    } else cell += ch;
  }
  if (quoted) throw new Error('CSV mal formé : guillemets non fermés.');
  row.push(cell.replace(/\r$/, ''));
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function importAmpoulesCsv(text, records) {
  const [headers, ...rows] = csvRows(text);
  if (!headers || ampouleHeaders.some(h => !headers.includes(h)) || new Set(headers).size !== headers.length) throw new Error('Colonnes du tableau Ampoules absentes ou en double. Exporter l’onglet Ampoules, avec ses en-têtes.');
  const numeric = (value, id) => {
    const clean = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    if (clean === '') return null;
    if (!/^\d+(\.\d+)?$/.test(clean)) throw new Error(`${id} : nombre invalide « ${value} ».`);
    return Number(clean);
  };
  const items = rows.map(row => {
    if (row.length !== headers.length) throw new Error('Une ligne du CSV ne contient pas le bon nombre de colonnes.');
    const v = key => row[headers.indexOf(key)];
    const id = v('Identifiant').trim();
    return { id, name: v('Médicament'), presentation: v('Présentation'), volumeMl: numeric(v('Volume (mL)'), id), amount: numeric(v('Quantité'), id), unit: v('Unité').trim(), declaredConcentration: numeric(v('Concentration déclarée'), id), expression: v('Expression'), status: v('Statut').trim(), comment: v('Commentaire'), source: v('Source') };
  });
  validateAmpoules(items, records);
  applyAmpoules(records, items); // Validate preparations before any persistent or UI mutation.
  return items;
}
