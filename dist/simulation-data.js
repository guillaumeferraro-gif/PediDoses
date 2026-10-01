import { withCurrentDose } from './dose-adjustments.js';
import { calculateRecordForPatient, isRecordVisibleForPatient } from './patient-calculator.js';
import { parseDecimal } from './calculator.js';
import { preparationForWeight, preparationVariants } from './smur-preparation.js';
import { buildMedicationSheet, volumeText, concentrationText } from './smur-sheets.js';
import { convertUnit } from './catalog-audit.js';
import { administrationMinutes, administrationText } from './administration.js';

const massUnits = new Set(['g', 'mg', 'mcg', 'ng']);
const number = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n);
const amount = (n, unit, suffix = '') => `${n > 0 && n < 0.000001 ? '< 0,000001' : number(n)} ${unit}${suffix}`;
const mass = (n, unit, suffix = '') => massUnits.has(unit) ? amount(convertUnit(n, unit, 'mg'), 'mg', suffix) : amount(n, unit, suffix);
const ml = n => `${volumeText(n)} mL`;
const rate = n => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} mL/h`;
const glucose=m=>`G${number((m.glucoseConcentrationMgMl??100)/10)} %`;

// This simulation uses the existing provisional doses and Sheet ceilings.
// Review cards retain their independent pending/blocked state.
export function prepareSimulationRecords(records) {
  return records.map(record => {
    const model = { ...record.model };
    const sheet = buildMedicationSheet(record);
    let provisional = Number.isFinite(sheet.pendingCeiling);
    if (provisional && !Number.isFinite(model.maximumDose)) model.maximumDose = sheet.pendingCeiling;
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
  if (record.id === 'insuline-glucose') text = `Insuline rapide · ${glucose(record.model)}`;
  if (record.id === 'cafeine') text += ' · citrate';
  return text;
}

function shortPosology(record, result, context) {
  const m = record.model;
  if (m.type === 'instruction') return record.protocol.posology;
  if (m.type === 'fixed-rate') return 'Débit = poids ÷ 3';
  if(m.secondCoefficient!==undefined)return `1re : ${number(m.coefficient)} ${m.unit}/kg${Number.isFinite(m.maximumDose)?` (max. ${number(m.maximumDose)} ${m.unit})`:''} ; 2e : ${number(m.secondCoefficient)} ${m.unit}/kg${Number.isFinite(m.secondMaximumDose)?` (max. ${number(m.secondMaximumDose)} ${m.unit})`:''}`;
  if (record.id === 'calcium-gluconate') return `${number(m.coefficient)} mL/kg${m.maximumDose?` · max. ${number(m.maximumDose)} mL`:''}`;
  if (m.type === 'insulin-glucose') return `${number(m.coefficient)} UI/kg (max. ${number(m.maximumDose)} UI) + ${glucose(m)} ${number(m.glucoseMlPerKg)} mL/kg (max. ${number(m.maximumGlucoseMl)} mL) sur ${number(m.durationHours*60)} min`;
  if (m.fixedHourlyFromAgeMonths !== undefined) {
    if (context?.ageMonths == null) return `${amount(m.coefficient,m.unit)}/kg${m.periodMinutes===60?'/h':'/min'} avant ${m.fixedHourlyFromAgeMonths/12} ans ; ${amount(m.fixedHourlyAmount,m.unit)}/h pendant ${m.fixedDurationHours} h dès ${m.fixedHourlyFromAgeMonths/12} ans`;
    if (context.ageMonths >= m.fixedHourlyFromAgeMonths) return `${amount(m.selectedHourlyAmount ?? m.fixedHourlyAmount,m.unit)}/h pendant ${m.fixedDurationHours} h`;
  }
  const marker = record.simulationProvisional ? '†' : '';
  let text;
  if (!context || result.status !== 'calculated') {
    if (m.tiers) text = m.tiers.map((tier, i) => `${amount(tier.coefficient, m.unit)}/kg${m.type === 'infusion' ? '/h' : ''} ${i === 0 ? '<' : '≥'} ${m.tiers[0].maxAgeMonthsExclusive} mois`).join(' ; ');
    else if (m.type === 'conditional-dose') text = m.cases.map((item,i)=>`${amount(item.dose,m.unit)} ${item.maxWeightKg!==undefined?`si poids ≤ ${item.maxWeightKg} kg`:`si poids > ${m.cases[i-1].maxWeightKg} kg`}`).join(' ; ');
    else if (m.minimumAgeMonths !== undefined) text = `${amount(m.coefficient, m.unit)}/kg · âge ≥ ${m.minimumAgeMonths} mois`;
    else if (m.minimumAgeMonthsExclusive !== undefined) text = `${amount(m.coefficient, m.unit)}/kg · âge > ${m.minimumAgeMonthsExclusive} mois`;
    else if (m.fixedDoseFromAgeMonths!==undefined) text = `${number(m.coefficient)} ${m.unit}/kg avant ${m.fixedDoseFromAgeMonths/12} ans ; ${number(m.fixedDose)} ${m.unit} dès ${m.fixedDoseFromAgeMonths/12} ans`;
    else text = `${amount(m.coefficient, m.unit)}/kg${m.type === 'infusion' ? (m.periodMinutes === 60 ? '/h' : '/min') : m.durationHours ? `/${m.durationHours} h` : ''}`;
  } else if (m.type === 'conditional-dose') text = amount(result.dose, m.unit);
  else if ((m.fixedDoseFromWeightKg !== undefined && context.weightKg >= m.fixedDoseFromWeightKg) || (m.fixedDoseFromAgeMonths !== undefined && context.ageMonths >= m.fixedDoseFromAgeMonths)) text = `${amount(m.fixedDose, m.unit)} · dose fixe`;
  else text = `${amount(result.coefficient, m.unit)}/kg${m.type === 'infusion' ? (m.periodMinutes === 60 ? '/h' : '/min') : m.durationHours ? `/${m.durationHours} h` : ''}`;
  if (m.dailyCoefficient) text = `${number(m.dailyCoefficient)} ${m.unit}/kg/j ÷ ${number(m.divisionsPerDay)} → multiple supérieur de ${number(m.roundDoseUpTo??1)} ${m.unit} (amoxicilline)`;
  if (record.id === 'morphine-titration') text += ' · toutes les 5 min';
  if (m.minimumCoefficient && m.maximumCoefficient) text += ` · plage ${number(m.minimumCoefficient)}–${number(m.maximumCoefficient)} ${m.unit}/kg${m.type==='infusion' ? m.periodMinutes===60 ? '/h':'/min' : ''}`;
  else if (m.maximumCoefficient) text += ` · max. ${number(m.maximumCoefficient)} ${m.unit}/kg${m.periodMinutes===60 ? '/h':'/min'}`;
  if (Number.isFinite(m.maximumDose)) text += ` · max. ${amount(m.maximumDose, m.unit)}`;
  if (m.warningCoefficient) text += ` · avertissement > ${number(m.warningCoefficient)} ${m.unit}/kg${m.periodMinutes===60?'/h':'/min'}`;
  if (m.limitToOneBag) text += ' · au maximum 1 poche';
  return text + marker;
}

function shortPreparation(record, result, context) {
  const m = record.model;
  if (m.type === 'instruction' || m.unit === 'J' || m.limitToOneBag) return { text: '', detail: '' };
  if(m.preparationMode==='dose-only')return {text:'',detail:''};
  if(['fixed-volume','concentration-range'].includes(m.preparationMode)){
    if(result.status==='calculated')return {text:`${ml(result.withdrawalMl)} de produit + ${ml(result.addMl)} ${m.diluent}`,detail:`→ ${ml(result.volumeMl)} · ${concentrationText(result.concentration,m.unit)}`};
    return {text:m.preparationMode==='fixed-volume'?`Compléter à ${ml(m.finalVolumeMl)} avec ${m.diluent}`:`${m.diluent} · concentration finale de ${number(m.minimumFinalConcentration)} à ${number(m.targetFinalConcentration)} ${m.unit}/mL`,detail:''};
  }
  if (m.dilutionFactor) return {text:`Prélèvement × ${number(m.dilutionFactor)} en volume final · ${m.diluent||'diluant à préciser'}`,detail:Number.isFinite(result.withdrawalMl)?`${ml(result.withdrawalMl)} de produit à prélever`:''};
  if (m.finalConcentration) return {text:`Concentration finale : ${concentrationText(m.finalConcentration,m.unit)}`,detail:m.diluent||'Diluant à préciser'};
  if (record.id === 'calcium-gluconate'&&!m.mix) return { text: 'Dilution finale à préciser', detail: 'Volume prélevé de produit' };
  if (m.preparationMinimumAgeMonths !== undefined && (context?.ageMonths == null || context.ageMonths < m.preparationMinimumAgeMonths)) return {text:`${m.diluent} — concentration finale ${m.youngerFinalConcentration?concentrationText(m.youngerFinalConcentration,m.unit):'à préciser'}`, detail:m.youngerFinalConcentration?'':'Débit en mL/h en attente de la préparation'};
  if (m.type === 'insulin-glucose') return {text:`Insuline rapide + ${glucose(m)}`,detail:result.insulinWithdrawalMl != null ? `${ml(result.insulinWithdrawalMl)} d’insuline à prélever` : 'Concentration d’insuline à préciser pour son prélèvement'};
  if (record.category === 'antibiotiques') return { text: 'Selon dilution IDE', detail: result.withdrawalMl !== null ? `${ml(result.withdrawalMl)} de produit à prélever` : '' };
  if (m.volumeKind === 'withdrawal'&&!m.mix&&!m.weightMix&&!m.weightMixes) return { text: 'Dilution finale à préciser', detail: result.withdrawalMl !== null ? `${ml(result.withdrawalMl)} de produit à prélever` : '' };
  if(m.unit==='mL'&&m.mix)return {text:`${ml(m.mix.takeMl)} de produit + ${ml(m.mix.addMl)} ${m.diluent||'de diluant'}`,detail:`Volume final = prélèvement × ${number((m.mix.takeMl+m.mix.addMl)/m.mix.takeMl)}`};
  if (m.type === 'fixed-duration-mixture') {
    if (result.status !== 'calculated') return { text: `Compléter à ${ml(m.finalVolumeMl)}`, detail: 'Quantité initiale selon le poids et le plafond' };
    return { text: `${ml(result.withdrawalMl)} + ${ml(result.addMl)} ${m.diluent}`, detail: `→ ${ml(m.finalVolumeMl)} · ${concentrationText(result.concentration, m.unit)}` };
  }
  if (!m.stock) return { text: record.protocol.dilution, detail: '' };
  if (m.weightMixes && !context) return {text:preparationVariants(m).map(p=>`${p.condition} : ${ml(p.takeMl)} + ${ml(p.addMl)} ${m.diluent}`).join(' ; '),detail:''};
  if (m.weightMix && !context) return { text: `Dilution selon le poids · seuil ${m.weightMix.thresholdKg} kg`, detail: '' };
  const prep = result.preparation || (context ? preparationForWeight(m, context.weightKg) : preparationVariants(m)[0]);
  return prep.mix
    ? { text: `${ml(prep.takeMl)} + ${ml(prep.addMl)} ${prep.diluent}`, detail: `→ ${ml(prep.finalVolumeMl)} · ${concentrationText(prep.concentration, m.unit)}` }
    : { text: record.simulationProvisional && record.id === 'triphosadenine' ? 'Pur†' : 'Pur', detail: concentrationText(prep.concentration, m.unit) };
}

function administration(record) {
  return administrationText(record);
}

export function transfusionVolume(prescribedVolumeMl, bagVolume) {
  if (!Number.isFinite(prescribedVolumeMl) || prescribedVolumeMl <= 0) throw new Error('Volume prescrit non valide.');
  if (bagVolume === undefined || bagVolume === null || String(bagVolume).trim() === '') return { prescribedVolumeMl, bagVolumeMl: null, administeredVolumeMl: null, oneBagApplied: false };
  const bagVolumeMl = parseDecimal(bagVolume, 'Volume de la poche');
  if (bagVolumeMl <= 0) throw new Error('Volume de la poche : saisir un volume strictement positif.');
  return { prescribedVolumeMl, bagVolumeMl, administeredVolumeMl: Math.min(prescribedVolumeMl, bagVolumeMl), oneBagApplied: prescribedVolumeMl > bagVolumeMl };
}

export function buildSimulationRow(record, context, { bagVolumeMl } = {}) {
  record = withCurrentDose(record,context);
  let result;
  try { result = calculateRecordForPatient(record, context); }
  catch (error) { result = { status: 'blocked', message: error.message, dose: null, withdrawalMl: null }; }
  const m = record.model;
  const row = { id: record.id, category: record.category, name: record.name, administration: administration(record),
    provisional: record.simulationProvisional, visible: isRecordVisibleForPatient(record, context), hasBag: !!m.limitToOneBag, doseLabel: m.unit === 'J' ? 'Énergie' : 'Dose', volumeLabel: 'Volume', posology: shortPosology(record, result, context), ampoule: shortAmpoule(record),
    dose: '—', doseDetail: '', doseIsVolume: m.unit === 'mL' && m.massPerMl === undefined && record.id !== 'ssh', volume: '—', volumeDetail: '', rate: '—', rateDetail: '', rateLabel:'Débit',
    dilution: '', dilutionDetail: '', status: result.status, message: '', result };
  const prep = shortPreparation(record, result, context);
  row.dilution = prep.text; row.dilutionDetail = prep.detail;
  if (result.status === 'blocked') { row.message = result.message; return row; }
  if (result.status !== 'calculated') return row;

  if (m.type === 'fixed-rate') {
    row.dose = mass(result.stockConcentration * result.preparation.takeMl, m.unit);
    row.doseDetail = 'par seringue';
  } else if (m.type === 'infusion') row.dose = record.id === 'sufentanil' ? amount(convertUnit(result.hourlyAmount,m.unit,'mcg'),'mcg','/h') : mass(result.hourlyAmount, m.unit, '/h');
  else if (m.type === 'fixed-duration-mixture') { row.dose = mass(result.dose, m.unit); row.doseDetail = `sur ${m.durationHours} h`; }
  else if (m.type === 'insulin-glucose') { row.dose=amount(result.dose,'UI'); row.doseDetail='insuline rapide'; row.volumeLabel=glucose(m); row.rateLabel=`Débit ${glucose(m)}`; }
  else if (result.mass !== null && result.mass !== undefined) {
    row.dose = mass(result.mass, result.massUnit);
  }
  else row.dose = mass(result.dose, result.unit);
  if (record.id === 'calcium-gluconate') {row.doseLabel='À prélever';row.doseDetail='produit avant dilution';}
  if (result.maximumApplied) row.doseDetail += `${row.doseDetail ? ' · ' : ''}plafond${record.simulationProvisional ? '†' : ''}`;

  if (Number.isFinite(result.rateMlH)) {
    row.rate = rate(result.rateMlH);
    const duration = result.prescribedDurationHours ?? m.durationHours;
    const minutes=administrationMinutes(record);
    row.rateDetail = minutes ? `sur ${number(minutes)} min` : duration ? `pendant ${duration} h` : 'PSE';
    if(Number.isFinite(result.volumeMl))row.volume=ml(result.volumeMl);
    if (m.type==='insulin-glucose') row.volumeDetail=result.glucoseMaximumApplied ? `plafond ${number(m.maximumGlucoseMl)} mL` : '';
    if (result.mixtureVolumeMl !== null && !['atracurium-ivc','noradrenaline'].includes(record.id)) { row.volume = ml(result.mixtureVolumeMl); row.volumeDetail = 'préparation'; }
  } else if (Number.isFinite(result.volumeMl)) {
    row.volume = ml(result.volumeMl);
    const minutes = administrationMinutes(record);
    if (minutes) { row.rate = rate(result.volumeMl * 60 / Number(minutes)); row.rateDetail = `sur ${minutes} min`; }
  } else if (Number.isFinite(result.withdrawalMl)) {
    row.volumeDetail = `${ml(result.withdrawalMl)} à prélever · volume administré à préciser`;
  } else if (m.unit !== 'J' && m.preparationMode!=='dose-only') row.volumeDetail = 'Volume à préciser';
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
  const sameVolume = row.doseIsVolume && meaningful(row.volume) && row.result.dose === (row.transfusion?.administeredVolumeMl ?? row.result.volumeMl) && row.volumeDetail !== 'préparation';
  if (meaningful(row.dose) && !sameVolume) metrics.push({ type: 'dose', label: row.doseLabel, value: row.dose, detail: row.doseDetail });
  if (meaningful(row.volume)) metrics.push({ type: 'volume', label: row.volumeLabel, value: row.volume, detail: row.volumeDetail || (sameVolume ? row.doseDetail : '') });
  if (meaningful(row.rate)) metrics.push({ type: 'rate', label: row.rateLabel, value: row.rate, detail: row.rateDetail });
  if(row.result.secondDose){
    metrics.length=0;
    for(const [label,result]of [['1re dose',row.result],['2e dose',row.result.secondDose]]){
      metrics.push({type:'dose',label,value:mass(result.dose,result.unit),detail:result.maximumApplied?'plafond':''});
      if(Number.isFinite(result.volumeMl))metrics.push({type:'volume',label:`Volume · ${label}`,value:ml(result.volumeMl),detail:''});
      if(Number.isFinite(result.rateMlH))metrics.push({type:'rate',label:`Débit · ${label}`,value:rate(result.rateMlH),detail:row.rateDetail});
    }
  }
  return {
    ampoule: meaningful(row.ampoule) ? row.ampoule : '',
    dilution: meaningful(row.dilution) ? row.dilution : '',
    dilutionDetail: Number.isFinite(row.result.withdrawalMl) && !meaningful(row.volume) ? row.volumeDetail : row.dilutionDetail,
    message: row.message,
    metrics,
  };
}
