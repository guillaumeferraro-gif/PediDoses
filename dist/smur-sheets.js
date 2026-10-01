import { preparationVariants, modelForSecondDose } from './smur-preparation.js';
import { administrationText } from './administration.js';

export const numberText = (value, digits = 6) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);
export const unitText = unit => unit;
export const volumeText = value => value > 0 && value < 0.005 ? '< 0,01' : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const ageText = months => months >= 24 && months % 12 === 0 ? `${months / 12} ans` : `${months} mois`;
const amountText = (value, unit) => unit === 'mcg' && value >= 1000 ? `${numberText(value / 1000)} mg` : `${numberText(value)} ${unitText(unit)}`;
export function concentrationText(value, unit) {
  if (value === null) return 'Non définie';
  if (unit === 'ng' && value >= 1000) return concentrationText(value / 1000, 'mcg');
  if (unit === 'mcg' && value >= 1000) return concentrationText(value / 1000, 'mg');
  return `${amountText(value, unit)}/mL`;
}
function quotientText(numerator, denominator) {
  const value = numerator / denominator;
  return Math.abs(value - Number(value.toFixed(6))) < 1e-12 ? numberText(value) : `(${numberText(numerator)} ÷ ${numberText(denominator)})`;
}

const presentations = {
  'calcium-chlorure':'Chlorure de calcium 1 g/10 mL — 100 mg/mL de chlorure de calcium.',
  propofol:'Propofol 200 mg/20 mL — 10 mg/mL.', 'propofol-lisa':'Propofol 200 mg/20 mL — 10 mg/mL.',
  suxamethonium:'Célocurine 100 mg/2 mL — 50 mg/mL.',
  levetiracetam:'Lévétiracétam 500 mg/5 mL — 100 mg/mL.',
  flumazenil:'Flumazénil 1 mg/10 mL — 100 mcg/mL.',
  sugammadex:'Sugammadex 200 mg/2 mL — 100 mg/mL.',
  naloxone:'Naloxone 0,4 mg/1 mL.',
  sufentanil:'Sufentanil 50 mcg/10 mL — 5 mcg/mL.',
  'nicardipine-charge':'Nicardipine 10 mg/10 mL.',
  'adrenaline-iv': 'Adrénaline 1 mg / 1 mL — 1 mg/mL.',
  'adrenaline-im': 'Adrénaline 1 mg / 1 mL — 1 mg/mL.',
  'adrenaline-ivc': 'Adrénaline 1 mg / 1 mL — 1 mg/mL.',
  'bicarbonate-acr': 'Bicarbonate de sodium 4,2 % — ampoule de 10 mL, 5 mmol, soit 0,5 mmol/mL.',
  'bicarbonate-hyperk': 'Bicarbonate de sodium 4,2 % — ampoule de 10 mL, 5 mmol, soit 0,5 mmol/mL.',
  gentamicine: 'Gentamicine — ampoule de 2 mL, 40 mg, soit 20 mg/mL.',
  amoxicilline: 'Amoxicilline — poudre pour solution injectable, 500 mg par flacon.',
  'amoxicilline-clavulanique': 'Amoxicilline/acide clavulanique — 500 mg/50 mg par flacon ; dose exprimée en amoxicilline.',
  cefotaxime: 'Céfotaxime — poudre pour solution injectable, 500 mg par flacon.',
  ceftriaxone: 'Ceftriaxone — poudre pour solution injectable, 1 g par flacon.',
  isofundine: 'Isofundine — flacon de 1 L (1 000 mL).',
  magnesium: 'Sulfate de magnésium 15 % — 1,5 g/10 mL, soit 150 mg/mL.',
  'midazolam-iv': 'Midazolam 5 mg/mL. L’onglet Ampoules mentionne 50 mg / 10 mL.',
  'midazolam-ij': 'Midazolam 5 mg/1 mL — forme intergingivojugale adaptée.',
  'midazolam-ivc': 'Midazolam 5 mg/mL — deux volumes de contenant, même concentration.',
  'morphine-dc': 'Morphine 1 mg/mL. L’onglet Ampoules mentionne 10 mg / 10 mL.',
  'morphine-titration': 'Morphine 1 mg/mL. L’onglet Ampoules mentionne 10 mg / 10 mL.',
  'morphine-ivc': 'Morphine 1 mg/mL. L’onglet Ampoules mentionne 10 mg / 10 mL.',
  'clonazepam-bolus': 'Clonazépam 1 mg/1 mL — ampoule seule, sans solvant fourni.',
  'clonazepam-ivc': 'Clonazépam 1 mg/1 mL — ampoule seule, sans solvant fourni.',
  alprostadil: 'Prostine 0,5 mg / 1 mL.', isoprenaline: 'Isuprel 0,2 mg / 1 mL.',
  'atracurium-ivc': 'Atracurium 50 mg / 5 mL — 10 mg/mL.',
  'calcium-gluconate': 'Gluconate de calcium 10 % — ampoule de 10 mL. Calcul exprimé en mL de solution, avant dilution.',
  'insuline-glucose': 'Insuline rapide : concentration à renseigner. G10 % : 10 g de glucose pour 100 mL.',
  'resikali-ir': 'Résikali en poudre — 20 g par cuillère-mesure dans le tableau.',
  'kayexalate-ir': 'Kayexalate en poudre — 15 g par cuillère-mesure dans le tableau.',
  cgr: 'CGR phénotypé — poche de produit sanguin ; pas d’ampoule.',
  pfc: 'PFC — poche de produit sanguin ; pas d’ampoule.',
  cpa: 'CPA — poche de produit sanguin ; pas d’ampoule.',
  cardioversion: 'Sans objet : geste électrique.', defibrillation: 'Sans objet : geste électrique.',
  'arret-potassium': 'Sans objet : consigne.',
};
const containerUnknown = new Set();

function dosageBranches(model) {
  if (model.fixedHourlyFromAgeMonths !== undefined) return [
    {condition:`Âge < ${ageText(model.fixedHourlyFromAgeMonths)}`, coefficient:model.coefficient},
    {condition:`Âge ≥ ${ageText(model.fixedHourlyFromAgeMonths)}`, hourly:model.fixedHourlyAmount, duration:model.fixedDurationHours},
  ];
  if (model.type === 'conditional-dose') {
    return model.cases.map((item, index) => ({
      condition: item.maxWeightKg === undefined ? `Poids > ${model.cases[index - 1].maxWeightKg} kg` : `Poids ≤ ${item.maxWeightKg} kg`,
      fixed: item.dose,
    }));
  }
  if (model.fixedDoseFromWeightKg !== undefined) return [
    { condition: `Poids < ${model.fixedDoseFromWeightKg} kg`, coefficient: model.coefficient },
    { condition: `Poids ≥ ${model.fixedDoseFromWeightKg} kg`, fixed: model.fixedDose },
  ];
  if (model.fixedDoseFromAgeMonths !== undefined) return [
    { condition: `Âge < ${ageText(model.fixedDoseFromAgeMonths)}`, coefficient: model.coefficient },
    { condition: `Âge ≥ ${ageText(model.fixedDoseFromAgeMonths)}`, fixed: model.fixedDose },
  ];
  if (model.minimumAgeMonths !== undefined) return [
    { condition: `Âge < ${ageText(model.minimumAgeMonths)}`, unavailable: true },
    { condition: `Âge ≥ ${ageText(model.minimumAgeMonths)}`, coefficient: model.coefficient },
  ];
  if (model.minimumAgeMonthsExclusive !== undefined) return [
    { condition: `Âge ≤ ${ageText(model.minimumAgeMonthsExclusive)}`, unavailable: true },
    { condition: `Âge > ${ageText(model.minimumAgeMonthsExclusive)}`, coefficient: model.coefficient },
  ];
  if (model.tiers) return model.tiers.map((tier, index) => ({
    condition: tier.maxAgeMonthsExclusive === undefined ? `Âge ≥ ${ageText(model.tiers[index - 1].maxAgeMonthsExclusive)}` : `Âge < ${ageText(tier.maxAgeMonthsExclusive)}`,
    coefficient: tier.coefficient,
  }));
  return [{ condition: 'Pas de changement d’âge ou de poids documenté', coefficient: model.coefficient }];
}

function standardDoses(record, preparations) {
  const m = record.model;
  const infusion = m.type === 'infusion';
  const antibiotic = record.category === 'antibiotiques';
  const period = infusion ? (m.periodMinutes === 60 ? '/h' : '/min') : m.unit === 'J' ? '/choc' : '/dose';
  return dosageBranches(m).flatMap(branch => preparations.filter(prep =>
    !(m.weightMix && m.fixedDoseFromWeightKg === m.weightMix.thresholdKg) ||
    (branch.fixed !== undefined ? prep.minWeightKg !== undefined : prep.maxWeightKgExclusive !== undefined)
  ).map(prep => {
    const condition = [branch.condition, ...((m.weightMix && m.fixedDoseFromWeightKg !== m.weightMix.thresholdKg) || m.weightMixes ? [prep.condition] : [])].join(' · ');
    if (branch.unavailable) return { condition, dose: 'Pas de posologie fournie pour ce palier', concentration: '—', volume: 'Calcul indisponible' };
    const fixed = branch.fixed !== undefined;
    let dose = `${amountText(fixed ? branch.fixed : branch.coefficient, m.unit)}${fixed ? '' : '/kg'}${period}`;
    if (m.dailyCoefficient) dose = `${numberText(m.dailyCoefficient)} ${m.unit}/kg/jour ÷ ${numberText(m.divisionsPerDay)}, puis arrondi au multiple supérieur de ${numberText(m.roundDoseUpTo??1)} ${m.unit} (amoxicilline)`;
    else if (antibiotic) dose += ' — une seule dose';
    if (branch.hourly !== undefined) dose = `${amountText(branch.hourly, m.unit)}/h pendant ${branch.duration} h = ${amountText(branch.hourly * branch.duration, m.unit)}`;
    if (m.minimumCoefficient && m.maximumCoefficient) dose = `${numberText(m.minimumCoefficient)} à ${numberText(m.maximumCoefficient)} ${m.unit}/kg${infusion ? m.periodMinutes === 60 ? '/h' : '/min' : '/dose'}`;
    if (record.id === 'morphine-dc') dose += ' — dose de charge';
    if (record.id === 'morphine-titration') dose += ' toutes les 5 min après la dose de charge';
    if (record.id === 'cafeine') dose += ' de citrate de caféine — dose de charge';
    let volume = 'Non déterminable : dilution finale à préciser';
    let finalConcentration = concentrationText(prep.concentration, m.unit);
    if (antibiotic && m.volumeKind !== 'withdrawal') { volume = '—'; finalConcentration = '—'; }
    if (m.unit === 'J') { volume = 'Sans objet'; finalConcentration = 'Sans objet'; }
    else if (m.unit === 'mL') { volume = m.volumeKind === 'withdrawal' ? `À prélever : ${dose}. Volume après dilution à préciser.` : dose; finalConcentration = m.volumeKind === 'withdrawal' ? 'Produit à 10 % avant dilution' : 'Produit prêt à l’emploi'; }
    else if (m.volumePerDose) {
      volume = `${numberText(branch.coefficient * m.volumePerDose)} mL/kg/dose`;
      finalConcentration = concentrationText(1/m.volumePerDose,m.unit);
    } else if (prep.concentration !== null && (!antibiotic || m.volumeKind === 'withdrawal')) {
      const numerator = branch.hourly ?? ((fixed ? branch.fixed : branch.coefficient) * (infusion ? 60 / m.periodMinutes : 1));
      volume = `${quotientText(numerator, prep.concentration)} mL${fixed || branch.hourly !== undefined ? '' : '/kg'}${infusion ? '/h' : '/dose'}`;
      if (m.volumeKind === 'withdrawal') {
        volume = `À prélever : ${volume}. Volume final à préciser.`;
        finalConcentration = `Forme source : ${finalConcentration} ; dilution finale non définie`;
      }
    }
    if (m.minimumCoefficient && m.maximumCoefficient && prep.concentration !== null) {
      const factor = infusion ? 60 / m.periodMinutes : 1;
      volume = `${quotientText(m.minimumCoefficient * factor, prep.concentration)} à ${quotientText(m.maximumCoefficient * factor, prep.concentration)} mL/kg${infusion ? '/h' : '/dose'}`;
    }
    if(m.volumeKind==='withdrawal'){
      const factor=m.dilutionFactor??(prep.mix?(prep.takeMl+prep.addMl)/prep.takeMl:null);
      const source= m.unit==='mL'?1:prep.stockConcentration;
      const final=m.finalConcentration??(factor&&source?source/factor:null);
      if(final){
        const perDose=fixed?branch.fixed:branch.coefficient;
        volume=`${quotientText(perDose,final)} mL${fixed?'':'/kg'}/dose après dilution`;
        finalConcentration=concentrationText(final,m.unit);
      }
    }
    if (m.preparationMinimumAgeMonths !== undefined && branch.hourly === undefined) {
      finalConcentration=m.youngerFinalConcentration ? concentrationText(m.youngerFinalConcentration,m.unit):'À préciser';
      volume=m.youngerFinalConcentration ? `${quotientText(branch.coefficient*60/m.periodMinutes,m.youngerFinalConcentration)} mL/kg/h`:'Débit en mL/h à préciser après choix de la concentration';
    }
    if(m.preparationMode==='dose-only'){volume='—';finalConcentration='—';}
    if(m.preparationMode==='fixed-volume'){volume=`${numberText(m.finalVolumeMl)} mL au total`;finalConcentration=`Dose calculée ÷ ${numberText(m.finalVolumeMl)} mL`;}
    if(m.preparationMode==='concentration-range'){volume='Volume calculé après arrondi du diluant';finalConcentration=`${numberText(m.minimumFinalConcentration)} à ${numberText(m.targetFinalConcentration)} ${m.unit}/mL`;}
    return { condition, dose, concentration: finalConcentration, volume };
  }));
}

function preparationRows(record, variants) {
  const m = record.model;
  if(m.preparationMode==='dose-only')return [];
  if(m.preparationMode==='fixed-volume')return [{condition:'Préparation',text:`Prélever la dose calculée à ${concentrationText(variants[0].stockConcentration,m.unit)}, puis compléter avec ${m.diluent} jusqu’à ${numberText(m.finalVolumeMl)} mL au total.`}];
  if(m.preparationMode==='concentration-range')return [{condition:'Préparation',text:`Prélever la dose à ${concentrationText(variants[0].stockConcentration,m.unit)}. Ajouter ${m.diluent} en arrondissant le diluant au multiple supérieur de ${numberText(m.diluentRoundingMl)} mL, ou ${numberText(m.fineDiluentRoundingMl)} mL si nécessaire, pour rester entre ${numberText(m.minimumFinalConcentration)} et ${numberText(m.targetFinalConcentration)} ${m.unit}/mL.`}];
  if (m.preparationMinimumAgeMonths !== undefined) return [
    {condition:`Âge < ${ageText(m.preparationMinimumAgeMonths)}`,text:`Diluant : ${m.diluent}. Concentration finale : ${m.youngerFinalConcentration ? concentrationText(m.youngerFinalConcentration,m.unit) : 'à préciser'}.`},
    {condition:`Âge ≥ ${ageText(m.preparationMinimumAgeMonths)}`,text:`Préparation existante conservée : ${volumeText(variants[0].takeMl)} mL du produit + ${volumeText(variants[0].addMl)} mL de ${m.diluent}, soit ${concentrationText(variants[0].concentration,m.unit)}.`},
  ];
  if (m.type === 'fixed-duration-mixture') {
    const stock = variants[0].stockConcentration;
    const maximumWithdrawal = m.maximumDose / stock;
    const threshold = numberText(m.maximumDose / m.coefficient);
    const perKg = quotientText(m.coefficient, stock);
    return [
      { condition: `${m.fixedDoseFromAgeMonths ? `Âge < ${ageText(m.fixedDoseFromAgeMonths)} · ` : ''}poids < ${threshold} kg`, text: `Prélever ${perKg} mL/kg à ${concentrationText(stock, m.unit)}, puis compléter avec ${m.diluent} à ${volumeText(m.finalVolumeMl)} mL au total. Diluant = ${numberText(m.finalVolumeMl)} − (${perKg} × poids en kg) mL. Concentration finale = quantité préparée ÷ ${numberText(m.finalVolumeMl)} mL.` },
      { condition: `${m.fixedDoseFromAgeMonths ? `Âge ≥ ${ageText(m.fixedDoseFromAgeMonths)} ou ` : ''}poids ≥ ${threshold} kg`, text: `Prélever ${volumeText(maximumWithdrawal)} mL de produit (${amountText(m.maximumDose, m.unit)}) + ${volumeText(m.finalVolumeMl - maximumWithdrawal)} mL de ${m.diluent} → volume final ${volumeText(m.finalVolumeMl)} mL, soit ${concentrationText(m.maximumDose / m.finalVolumeMl, m.unit)}.` },
    ];
  }
  if (m.dilutionFactor) return [{condition:'Préparation',text:`Volume final = prélèvement × ${numberText(m.dilutionFactor)} ; diluant : ${m.diluent||'à préciser'}.`}];
  if (m.finalConcentration) return [{condition:'Préparation',text:`Concentration finale : ${concentrationText(m.finalConcentration,m.unit)} ; diluant : ${m.diluent||'à préciser'}.`}];
  if (m.volumeKind === 'withdrawal' && m.stock) return [{ condition: 'Préparation', text: `Produit à prélever à ${concentrationText(variants[0].stockConcentration, m.unit)} ; dilution finale ${record.category === 'antibiotiques' ? 'laissée à l’IDE' : 'à préciser'}.` }];
  if(m.unit==='mL'&&m.mix)return [{condition:'Préparation',text:`${volumeText(m.mix.takeMl)} mL de produit + ${volumeText(m.mix.addMl)} mL de ${m.diluent||'diluant'}.`}];
  if (!m.stock) return [{ condition: 'Préparation', text: record.protocol.dilution }];
  return variants.map(prep => ({ condition: prep.condition, text: prep.mix ?
    `Prélever ${volumeText(prep.takeMl)} mL du produit + ${volumeText(prep.addMl)} mL de ${prep.diluent} → volume final ${volumeText(prep.finalVolumeMl)} mL, soit ${concentrationText(prep.concentration, m.unit)}.` :
    `Sans dilution : ${concentrationText(prep.concentration, m.unit)}.` }));
}

function ceilingText(record) {
  const m = record.model;
  if(m.secondCoefficient!==undefined)return `1re dose : ${Number.isFinite(m.maximumDose)?amountText(m.maximumDose,m.unit):'sans plafond'} ; 2e dose : ${Number.isFinite(m.secondMaximumDose)?amountText(m.secondMaximumDose,m.unit):'sans plafond'}.`;
  if (m.limitToOneBag) return 'Aucun maximum fixe en mL. Transfuser le volume prescrit, au maximum le contenu d’une poche de volume variable.';
  if (['instruction', 'unresolved', 'fixed-rate', 'insulin-glucose'].includes(m.type)) return '';
  if (m.warningCoefficient) return `Seuil d’avertissement : ${numberText(m.warningCoefficient)} ${m.unit}/kg${m.type==='infusion'?m.periodMinutes===60?'/h':'/min':m.durationHours?`/${m.durationHours} h`:'/dose'}. Dépassement possible après confirmation.`;
  if (m.maximumCoefficient) return `Posologie maximale : ${numberText(m.maximumCoefficient)} ${m.unit}/kg${m.type==='infusion' ? m.periodMinutes===60 ? '/h' : '/min' : '/dose'}.${m.noCeiling ? ' Aucun plafond de dose totale ajouté.' : ''}`;
  if (!Number.isFinite(m.maximumDose) && m.noCeiling) return 'Aucun plafond de dose ajouté ; respecter la plage de posologie lorsqu’elle est définie.';
  if (!Number.isFinite(m.maximumDose) && record.id === 'midazolam-iv') return 'Aucun plafond documenté à ce stade.';
  if (!Number.isFinite(m.maximumDose) && ['suxamethonium', 'gentamicine', 'cardioversion'].includes(record.id)) return 'Aucun plafond, conformément à la décision locale.';
  const pending = m.pendingCeiling;
  const ceiling = m.maximumDose ?? pending;
  if (!Number.isFinite(ceiling)) return 'Aucun plafond renseigné dans le tableau pour cette ligne ; cela ne vaut pas validation d’une dose illimitée.';
  const status = !Number.isFinite(m.maximumDose) && Number.isFinite(pending) ? 'Plafond du tableau à valider ; non appliqué au calcul' : 'Plafond retenu dans le modèle';
  const duration = m.durationHours ? ` sur ${m.durationHours} h` : '';
  const thresholds = (m.tiers || [{ coefficient: m.coefficient }]).map(tier => `${numberText(ceiling / tier.coefficient)} kg pour ${amountText(tier.coefficient, m.unit)}/kg`).join(' ; ');
  const thresholdText = m.fixedDoseFromWeightKg !== undefined ? ` Dose fixe à partir de ${m.fixedDoseFromWeightKg} kg.` : m.coefficient ? ` Seuil d’atteinte du plafond pondéral : ${thresholds}.` : '';
  return `${status} : ${amountText(ceiling, m.unit)}${duration}.${thresholdText}`;
}

export function buildMedicationSheet(record) {
  const m = record.model;
  const variants = preparationVariants(m);
  const questions = [...record.protocol.questions];
  const presentation = record.ampoule?.description || presentations[record.id] || record.sourceCells[0] || 'Ampoule/flacon, quantité et concentration à renseigner.';
  if (!presentations[record.id] && !record.sourceCells[0]) questions.push('Renseigner la présentation disponible et sa reconstitution éventuelle.');
  if (containerUnknown.has(record.id) && !record.ampoule?.volumeMl) questions.push('Préciser le volume du contenant disponible ; la concentration seule est renseignée.');
  if (['midazolam-iv','midazolam-ij'].includes(record.id) && record.ampoule?.status !== 'confirmé') questions.push('Confirmer la présentation de l’onglet Ampoules par rapport au stock effectivement embarqué.');
  let administration = administrationText(record);
  if (administration === 'IV' && record.category !== 'antibiotiques') {
    administration = 'IV — durée ou vitesse non précisée';
    questions.push('Préciser IV directe, IV lente ou perfusion, avec la durée/vitesse.');
  }
  let doseRows;
  let preparations = preparationRows(record, variants);
  if (m.type === 'instruction') doseRows = [{ condition: 'Consigne', dose: record.protocol.posology, concentration: 'Sans objet', volume: 'Sans objet' }];
  else if (m.type === 'fixed-rate') {
    doseRows = [{ condition: 'Tous les poids · règle SMUR', dose: ['adrenaline-ivc', 'noradrenaline'].includes(record.id) ? '1 mg dans un volume final de 50 mL' : '50 mg dans un volume final de 50 mL', concentration: concentrationText(variants[0].concentration, m.unit), volume: 'Débit = poids (kg) ÷ 3 mL/h, puis arrondi final à 0,1 mL/h' }];
  } else if (m.type==='fixed-duration-mixture') doseRows = [{condition:'Selon poids et plafond',dose:`${numberText(m.coefficient)} ${m.unit}/kg sur ${numberText(m.durationHours)} h, maximum ${numberText(m.maximumDose)} ${m.unit}`,concentration:`Quantité préparée ÷ ${numberText(m.finalVolumeMl)} mL`,volume:'Débit selon la dose et la concentration préparée'}];
  else if (record.id === 'calcium-gluconate') doseRows = standardDoses(record,variants).map(row=>({...row,dose:`${numberText(m.coefficient)} mL/kg de produit${Number.isFinite(m.maximumDose)?`, maximum ${numberText(m.maximumDose)} mL`:''}`,concentration:record.ampoule?.description||'Produit avant dilution'}));
  else if (m.type === 'insulin-glucose') doseRows = [
    {condition:'Insuline rapide',dose:`${numberText(m.coefficient)} UI/kg, maximum ${numberText(m.maximumDose)} UI`,concentration:concentrationText(variants[0].stockConcentration,'UI'),volume:'Prélèvement selon la concentration de l’insuline'},
    {condition:'Glucose associé',dose:`${numberText(m.glucoseMlPerKg)} mL/kg, maximum ${numberText(m.maximumGlucoseMl)} mL, sur ${numberText(m.durationHours*60)} min`,concentration:concentrationText(m.glucoseConcentrationMgMl??100,'mg'),volume:`Débit du glucose : ${numberText(m.glucoseMlPerKg/m.durationHours)} mL/kg/h, maximum ${numberText(m.maximumGlucoseMl/m.durationHours)} mL/h`},
  ];
  else doseRows = standardDoses(record, variants);
  const secondModel=modelForSecondDose(m);
  if(secondModel) doseRows=[...doseRows.map(row=>({...row,condition:`1re dose · ${row.condition}`})),...standardDoses({...record,model:secondModel},variants).map(row=>({...row,condition:`2e dose · ${row.condition}`}))];

  if (record.ampoule?.comment) questions.push(record.ampoule.comment);
  return { presentation, doseRows, preparations: record.protocol.dilution === '' && !m.mix && !m.finalConcentration && !m.dilutionFactor ? [] : preparations, administration, questions: [...new Set(questions)], ceiling: ceilingText(record), pendingCeiling: m.pendingCeiling ?? null, particulars: record.protocol.particulars };
}
