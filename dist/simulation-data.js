import { calculateRecordForPatient, isRecordVisibleForPatient } from './patient-calculator.js';
import { parseDecimal } from './calculator.js';
import { preparationForWeight, preparationVariants } from './smur-preparation.js';
import { buildMedicationSheet, volumeText, concentrationText } from './smur-sheets.js';
import { convertUnit } from './catalog-audit.js';

const massUnits = new Set(['g', 'mg', 'mcg', 'ng']);
const number = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);
const amount = (n, unit, suffix = '') => `${n > 0 && n < 0.000001 ? '< 0,000001' : number(n)} ${unit}${suffix}`;
const mass = (n, unit, suffix = '') => massUnits.has(unit) ? amount(convertUnit(n, unit, 'mg'), 'mg', suffix) : amount(n, unit, suffix);
const ml = n => `${volumeText(n)} mL`;
const rate = n => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} mL/h`;

// This simulation uses the existing provisional doses and Sheet ceilings.
// Review cards retain their independent pending/blocked state.
export function prepareSimulationRecords(records) {
  return records.map(record => {
    const model = { ...record.model };
    const sheet = buildMedicationSheet(record);
    let provisional = Number.isFinite(sheet.pendingCeiling);
    if (provisional && !Number.isFinite(model.maximumDose)) model.maximumDose = sheet.pendingCeiling;
    if (record.id === 'triphosadenine') {
      model.type = 'dose'; // Existing source: 1 mg/kg, stock 20 mg/2 mL.
      delete model.blockReason;
      provisional = true;
    }
    if (record.id === 'calcium-gluconate') {
      Object.assign(model, { type: 'dose', coefficient: 0.4, unit: 'mL', maximumDose: 20,
        massPerMl: 9.1, massUnit: 'mg', volumeKind: 'withdrawal' });
      delete model.blockReason;
      provisional = true;
    }
    return { ...record, model, simulationProvisional: provisional };
  });
}

function shortAmpoule(record) {
  if (record.model.limitToOneBag) return 'Poche de volume variable';
  const a = record.ampoule;
  if (!a) return record.sourceCells[0] || 'À préciser';
  if (a.status === 'sans objet') return '—';
  const powder = /poudre/i.test(a.presentation);
  let text;
  if (a.amount !== null) text = `${number(a.amount)} ${a.unit}${a.volumeMl !== null ? ` / ${number(a.volumeMl)} mL` : powder ? ' · poudre' : ' / contenant'}`;
  else if (a.declaredConcentration !== null) text = amount(a.declaredConcentration, `${a.unit}/mL`);
  else if (a.volumeMl !== null) text = `${number(a.volumeMl)} mL${record.id === 'magnesium' ? ' · teneur à préciser' : ''}`;
  else text = a.presentation || 'À préciser';
  if (record.id === 'calcium-gluconate') text = 'PROAMP 10 % · 10 mL';
  if (record.id === 'insuline-glucose') text = 'Insuline à préciser · G5 % 500 mL';
  if (record.id === 'cafeine') text += ' · citrate';
  return text;
}

function shortPosology(record, result, context) {
  const m = record.model;
  if (m.type === 'instruction') return record.protocol.posology;
  if (m.type === 'fixed-rate') return 'Débit = poids ÷ 3';
  if (record.id === 'calcium-gluconate') return '0,4 mL/kg · max. 20 mL†';
  const marker = record.simulationProvisional ? '†' : '';
  let text;
  if (!context || result.status !== 'calculated') {
    if (m.tiers) text = m.tiers.map((tier, i) => `${amount(tier.coefficient, m.unit)}/kg${m.type === 'infusion' ? '/h' : ''} ${i === 0 ? '<' : '≥'} ${m.tiers[0].maxAgeMonthsExclusive} mois`).join(' ; ');
    else if (m.type === 'conditional-dose') text = record.protocol.posology;
    else if (m.minimumAgeMonths !== undefined) text = `${amount(m.coefficient, m.unit)}/kg · âge ≥ ${m.minimumAgeMonths} mois`;
    else if (m.minimumAgeMonthsExclusive !== undefined) text = `${amount(m.coefficient, m.unit)}/kg · âge > ${m.minimumAgeMonthsExclusive} mois`;
    else if (m.fixedDoseFromAgeMonths) text = record.protocol.posology;
    else text = `${amount(m.coefficient, m.unit)}/kg${m.type === 'infusion' ? (m.periodMinutes === 60 ? '/h' : '/min') : m.durationHours ? `/${m.durationHours} h` : ''}`;
  } else if (m.type === 'conditional-dose') text = amount(result.dose, m.unit);
  else if ((m.fixedDoseFromWeightKg !== undefined && context.weightKg >= m.fixedDoseFromWeightKg) || (m.fixedDoseFromAgeMonths !== undefined && context.ageMonths >= m.fixedDoseFromAgeMonths)) text = `${amount(m.fixedDose, m.unit)} · dose fixe`;
  else text = `${amount(result.coefficient, m.unit)}/kg${m.type === 'infusion' ? (m.periodMinutes === 60 ? '/h' : '/min') : m.durationHours ? `/${m.durationHours} h` : ''}`;
  if (record.id === 'amoxicilline-clavulanique') text = '(80 ÷ 3) mg/kg d’amoxicilline';
  if (record.id === 'morphine-titration') text += ' · toutes les 5 min';
  if (Number.isFinite(m.maximumDose)) text += ` · max. ${amount(m.maximumDose, m.unit)}`;
  if (m.limitToOneBag) text += ' · au maximum 1 poche';
  return text + marker;
}

function shortPreparation(record, result, context) {
  const m = record.model;
  if (m.type === 'instruction' || m.unit === 'J' || m.limitToOneBag) return { text: '', detail: '' };
  if (record.id === 'calcium-gluconate') return { text: 'Dilution finale à préciser', detail: 'Volume prélevé de produit à 10 %†' };
  if (record.category === 'antibiotiques') return { text: 'Selon dilution IDE', detail: result.withdrawalMl !== null ? `${ml(result.withdrawalMl)} de produit à prélever` : '' };
  if (record.id === 'magnesium') return { text: 'Dilution finale à préciser', detail: result.withdrawalMl !== null ? `${ml(result.withdrawalMl)} de produit à prélever` : 'Teneur de l’ampoule à préciser' };
  if (m.volumeKind === 'withdrawal') return { text: 'Dilution finale à préciser', detail: result.withdrawalMl !== null ? `${ml(result.withdrawalMl)} de produit à prélever` : '' };
  if (m.type === 'fixed-duration-mixture') {
    if (result.status !== 'calculated') return { text: `Compléter à ${ml(m.finalVolumeMl)}`, detail: 'Quantité selon le poids et le plafond' };
    return { text: `${ml(result.withdrawalMl)} + ${ml(result.addMl)} ${m.diluent}`, detail: `→ ${ml(m.finalVolumeMl)} · ${concentrationText(result.concentration, m.unit)}` };
  }
  if (!m.stock) return { text: record.protocol.dilution, detail: '' };
  if (m.weightMix && !context) return { text: `Dilution selon le poids · seuil ${m.weightMix.thresholdKg} kg`, detail: '' };
  const prep = result.preparation || (context ? preparationForWeight(m, context.weightKg) : preparationVariants(m)[0]);
  return prep.mix
    ? { text: `${ml(prep.takeMl)} + ${ml(prep.addMl)} ${prep.diluent}`, detail: `→ ${ml(prep.finalVolumeMl)} · ${concentrationText(prep.concentration, m.unit)}` }
    : { text: record.simulationProvisional && record.id === 'triphosadenine' ? 'Pur†' : 'Pur', detail: concentrationText(prep.concentration, m.unit) };
}

function administration(record) {
  if (record.id === 'triphosadenine') return 'IV · modalités à confirmer†';
  if (record.id === 'calcium-gluconate') return 'Modalités à confirmer†';
  return record.protocol.administration.replace(/ ; débit arrondi.*$/, '');
}

export function transfusionVolume(prescribedVolumeMl, bagVolume) {
  if (!Number.isFinite(prescribedVolumeMl) || prescribedVolumeMl <= 0) throw new Error('Volume prescrit non valide.');
  if (bagVolume === undefined || bagVolume === null || String(bagVolume).trim() === '') return { prescribedVolumeMl, bagVolumeMl: null, administeredVolumeMl: null, oneBagApplied: false };
  const bagVolumeMl = parseDecimal(bagVolume, 'Volume de la poche');
  if (bagVolumeMl <= 0) throw new Error('Volume de la poche : saisir un volume strictement positif.');
  return { prescribedVolumeMl, bagVolumeMl, administeredVolumeMl: Math.min(prescribedVolumeMl, bagVolumeMl), oneBagApplied: prescribedVolumeMl > bagVolumeMl };
}

export function buildSimulationRow(record, context, { bagVolumeMl } = {}) {
  let result;
  try { result = calculateRecordForPatient(record, context); }
  catch (error) { result = { status: 'blocked', message: error.message, dose: null, withdrawalMl: null }; }
  const m = record.model;
  const row = { id: record.id, category: record.category, name: record.name, administration: administration(record),
    provisional: record.simulationProvisional, visible: isRecordVisibleForPatient(record, context), hasBag: !!m.limitToOneBag, doseLabel: m.unit === 'J' ? 'Énergie' : 'Dose', volumeLabel: 'Volume', posology: shortPosology(record, result, context), ampoule: shortAmpoule(record),
    dose: '—', doseDetail: '', doseIsVolume: m.unit === 'mL' && m.massPerMl === undefined && record.id !== 'ssh', volume: '—', volumeDetail: '', rate: '—', rateDetail: '',
    dilution: '', dilutionDetail: '', status: result.status, message: '', result };
  const prep = shortPreparation(record, result, context);
  row.dilution = prep.text; row.dilutionDetail = prep.detail;
  if (result.status === 'blocked') { row.message = result.message; return row; }
  if (result.status !== 'calculated') return row;

  if (m.type === 'fixed-rate') {
    row.dose = mass(result.stockConcentration * result.preparation.takeMl, m.unit);
    row.doseDetail = 'par seringue';
  } else if (m.type === 'infusion') row.dose = mass(result.hourlyAmount, m.unit, '/h');
  else if (m.type === 'fixed-duration-mixture') { row.dose = mass(result.dose, m.unit); row.doseDetail = `sur ${m.durationHours} h`; }
  else if (result.mass !== null && result.mass !== undefined) {
    row.dose = mass(result.mass, result.massUnit);
    if (record.id === 'calcium-gluconate') row.doseDetail = 'calcium élément†';
    if (record.id === 'insuline-glucose') { row.dose = amount(result.mass, 'UI'); row.doseDetail = `${mass(result.volumeMl * 50, 'mg')} de glucose`; }
  } else if (record.id === 'ssh') { row.dose = mass(result.volumeMl * 75, 'mg'); row.doseDetail = 'NaCl'; }
  else row.dose = mass(result.dose, result.unit);
  if (result.maximumApplied) row.doseDetail += `${row.doseDetail ? ' · ' : ''}plafond${record.simulationProvisional ? '†' : ''}`;

  if (Number.isFinite(result.rateMlH)) {
    row.rate = rate(result.rateMlH);
    row.rateDetail = m.durationHours ? `pendant ${m.durationHours} h` : 'IVSE';
    if (result.mixtureVolumeMl !== null) { row.volume = ml(result.mixtureVolumeMl); row.volumeDetail = 'seringue'; }
  } else if (Number.isFinite(result.volumeMl)) {
    row.volume = ml(result.volumeMl);
    const minutes = /^IV(?:L)?(?: sur|\/)\s*(\d+)\s*min$/.exec(record.protocol.administration)?.[1];
    if (minutes) { row.rate = rate(result.volumeMl * 60 / Number(minutes)); row.rateDetail = `sur ${minutes} min`; }
  } else if (Number.isFinite(result.withdrawalMl)) {
    row.volumeDetail = `${ml(result.withdrawalMl)} à prélever · volume administré à préciser`;
  } else if (m.unit !== 'J') row.volumeDetail = 'Volume à préciser';
  if (m.limitToOneBag) {
    row.doseLabel = 'Prescrit'; row.volumeLabel = 'À transfuser';
    row.volume = '—'; row.volumeDetail = ''; row.doseDetail = 'au maximum 1 poche';
    try {
      row.transfusion = transfusionVolume(result.dose, bagVolumeMl);
      if (row.transfusion.administeredVolumeMl !== null) {
        row.volume = ml(row.transfusion.administeredVolumeMl);
        row.volumeDetail = row.transfusion.oneBagApplied ? '1 poche entière' : 'dans la limite d’une poche';
      }
    } catch (error) { row.message = error.message; row.bagInputError = true; }
  }
  return row;
}

export const buildSimulationRows = (records, context) => prepareSimulationRecords(records).map(record => buildSimulationRow(record, context));

export function simulationListContent(row) {
  const meaningful = text => !!text?.trim() && !['—', 'Sans objet'].includes(text.trim());
  const metrics = [];
  const sameVolume = row.doseIsVolume && meaningful(row.volume) && row.result.dose === (row.transfusion?.administeredVolumeMl ?? row.result.volumeMl) && row.volumeDetail !== 'seringue';
  if (meaningful(row.dose) && !sameVolume) metrics.push({ type: 'dose', label: row.doseLabel, value: row.dose, detail: row.doseDetail });
  if (meaningful(row.volume)) metrics.push({ type: 'volume', label: row.volumeLabel, value: row.volume, detail: row.volumeDetail || (sameVolume ? row.doseDetail : '') });
  if (meaningful(row.rate)) metrics.push({ type: 'rate', label: 'Débit', value: row.rate, detail: row.rateDetail });
  return {
    ampoule: meaningful(row.ampoule) ? row.ampoule : '',
    dilution: meaningful(row.dilution) ? row.dilution : '',
    dilutionDetail: Number.isFinite(row.result.withdrawalMl) && !meaningful(row.volume) ? row.volumeDetail : row.dilutionDetail,
    message: row.message,
    metrics,
  };
}
