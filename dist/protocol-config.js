import {smurRecords,smurCategories} from './smur-data.js';
import {defaultAmpoules,stockConcentration,ampouleDescription,ampouleStatuses} from './ampoules.js';
import {convertUnit} from './catalog-audit.js';
import {calculateRecordForPatient} from './patient-calculator.js';

export const configurationStorageKey='pedidoses.protocol.v1';
export const schemaVersion=1;
export const doseUnits=['g','mg','mcg','ng','mmol','UI','mL','J'];
export const stockUnits=['g','mg','mcg','ng','mmol','UI'];
export const routes=['','IV','IVL','IVD','IVSE','PSE','IM','Intrarectale','Intergingivojugale','Nébulisation'];
export const modelFields={
 coefficient:'Dose de départ par kg',doseStep:'Pas de réglage',warningCoefficient:'Seuil d’avertissement dépassable',minimumCoefficient:'Posologie minimale',maximumCoefficient:'Limite non dépassable de posologie',maximumDose:'Plafond de quantité par dose',pendingCeiling:'Plafond historique en attente de validation',
 periodMinutes:'Période de la posologie (min)',durationHours:'Durée de la dose préparée (h)',finalVolumeMl:'Volume final de la préparation (mL)',preparedCoefficient:'Quantité préparée par kg',preparedMaximumDose:'Quantité maximale préparée',
 dailyCoefficient:'Dose journalière par kg',divisionsPerDay:'Nombre de prises par jour',roundDoseUpTo:'Arrondi supérieur de dose (multiple)',
 fixedDoseFromWeightKg:'Seuil de dose fixe (kg)',fixedDoseFromAgeMonths:'Seuil de dose fixe (mois)',fixedDose:'Dose fixe',minimumAgeMonths:'Âge minimal inclus (mois)',minimumAgeMonthsExclusive:'Âge minimal exclu (mois)',
 fixedHourlyFromAgeMonths:'Seuil de dose horaire fixe (mois)',fixedHourlyAmount:'Dose horaire fixe',fixedDurationHours:'Durée du schéma à dose horaire fixe (h)',preparationMinimumAgeMonths:'Âge minimal de la préparation renseignée (mois)',youngerFinalConcentration:'Concentration finale avant ce seuil d’âge (unité de dose/mL)',
 finalConcentration:'Concentration finale déclarée (unité de dose/mL)',dilutionFactor:'Facteur de dilution du prélèvement (volume final / volume prélevé)',
 glucoseMlPerKg:'Glucose associé (mL/kg)',maximumGlucoseMl:'Volume maximal de glucose associé (mL)',glucoseConcentrationMgMl:'Concentration du glucose associé (mg/mL)',
 volumePerDose:'Volume par unité prescrite (mL/unité)',massPerMl:'Masse par mL (unité de masse/mL)',
};
const allowedModel=new Set(['type','unit','mix','weightMix','weightMixes','tiers','cases','diluent','volumeKind','massUnit','noCeiling','limitToOneBag','adjustmentStatus','blockReason',...Object.keys(modelFields)]);
const allowedRecord=new Set(['id','name','category','model','protocol','ampoule','hideBelowAgeMonths','hideAboveAgeMonths']);
const types=['dose','infusion','fixed-duration-mixture','insulin-glucose','conditional-dose','instruction','unresolved'];
const cleanModel=model=>Object.fromEntries(Object.entries(structuredClone(model)).filter(([key])=>allowedModel.has(key)));
export function defaultConfiguration(){
 const ampoules=new Map(defaultAmpoules(smurRecords).map(a=>[a.id,a]));
 return {schemaVersion,records:smurRecords.map(r=>({id:r.id,name:r.name,category:r.category,model:cleanModel(r.model),protocol:structuredClone(r.protocol),ampoule:ampoules.get(r.id),...(r.hideBelowAgeMonths!==undefined?{hideBelowAgeMonths:r.hideBelowAgeMonths}:{}),...(r.hideAboveAgeMonths!==undefined?{hideAboveAgeMonths:r.hideAboveAgeMonths}:{})}))};
}
function fail(id,text){throw new Error(`${id} : ${text}`);}
function positive(n,id,label,zero=false){if(typeof n!=='number'||!Number.isFinite(n)||(zero?n<0:n<=0))fail(id,`${label} doit être ${zero?'positif ou nul':'strictement positif'}.`);}
function string(s,id,label){if(typeof s!=='string'||s.length>4000)fail(id,`${label} invalide.`);}
function keys(obj,allowed,id){if(!obj||typeof obj!=='object'||Array.isArray(obj))fail(id,'structure invalide.');for(const key of Object.keys(obj))if(!allowed.includes(key))fail(id,`champ inconnu : ${key}.`);}
function safeData(value,depth=0){
 if(depth>12)throw new Error('Configuration trop imbriquée.');
 if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw new Error('Clé de configuration interdite.');safeData(v,depth+1);}
 else if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Nombre non fini dans la configuration.');
}
function mix(value,id){if(value==null)return;keys(value,['takeMl','addMl'],id);positive(value.takeMl,id,'volume prélevé');positive(value.addMl,id,'diluant',true);positive(value.takeMl+value.addMl,id,'volume final');}
function compile(config){
 const originals=new Map(smurRecords.map(r=>[r.id,r]));
 return config.records.map(row=>{
  const record={...originals.get(row.id),...structuredClone(row)},m=record.model,a=record.ampoule,c=stockConcentration(a);
  m.stock=c===null||['mL','J'].includes(m.unit)?null:{amount:c,unit:a.unit,volumeMl:1};
  if(['ssh','glucose10'].includes(record.id)&&c!==null){m.massPerMl=convertUnit(c,a.unit,'mg');m.massUnit='mg';}
  record.adjustable=m.adjustmentStatus==='enabled'&&Number.isFinite(m.doseStep);
  a.description=ampouleDescription(a);
  return record;
 });
}
export function validateConfiguration(config){
 safeData(config);keys(config,['schemaVersion','records'], 'Configuration');
 if(config.schemaVersion!==schemaVersion)throw new Error('Version de configuration incompatible.');
 if(!Array.isArray(config.records)||config.records.length!==smurRecords.length)throw new Error(`La configuration doit comporter ${smurRecords.length} médicaments.`);
 const ids=new Set(smurRecords.map(r=>r.id)),seen=new Set();
 for(const r of config.records){
  keys(r,[...allowedRecord],r.id||'Médicament');if(!ids.has(r.id)||seen.has(r.id))fail(r.id,'identifiant inconnu ou en double.');seen.add(r.id);
  string(r.name,r.id,'nom');if(!r.name.trim())fail(r.id,'nom requis.');if(!smurCategories.some(c=>c.id===r.category))fail(r.id,'groupe invalide.');
  const m=r.model,p=r.protocol,a=r.ampoule;
  keys(m,[...allowedModel],r.name);if(!types.includes(m.type))fail(r.name,'type de calcul invalide.');
  if(m.type!=='instruction'&&!doseUnits.includes(m.unit))fail(r.name,'unité de dose invalide.');
  for(const key of Object.keys(modelFields))if(m[key]!==undefined){
   if(m[key]===null&&['maximumDose','doseStep'].includes(key))continue;
   positive(m[key],r.name,modelFields[key],key==='minimumCoefficient'||key.includes('AgeMonths'));
  }
  for(const key of ['noCeiling','limitToOneBag'])if(m[key]!==undefined&&typeof m[key]!=='boolean')fail(r.name,`${key} invalide.`);
  if(m.volumeKind!==undefined&&!['withdrawal','final'].includes(m.volumeKind))fail(r.name,'nature du volume invalide.');
  if(m.diluent!==undefined)string(m.diluent,r.name,'diluant');
  if(m.adjustmentStatus!==undefined&&!['enabled','fixed','suspended'].includes(m.adjustmentStatus))fail(r.name,'état du réglage invalide.');
  if(m.dilutionFactor!==undefined&&m.dilutionFactor<1)fail(r.name,'le facteur de dilution doit être au moins 1.');
  if((m.finalConcentration!==undefined||m.dilutionFactor!==undefined)&&(m.mix||m.weightMix||m.weightMixes))fail(r.name,'choisir une concentration finale, un facteur de dilution OU des volumes de dilution.');
  if(m.finalConcentration!==undefined&&m.dilutionFactor!==undefined)fail(r.name,'choisir une concentration finale OU un facteur de dilution.');
  if(m.dilutionFactor!==undefined&&m.volumeKind!=='withdrawal')fail(r.name,'le facteur de dilution nécessite une dose exprimée en prélèvement.');
  if(m.type==='infusion'&&Number.isFinite(m.maximumDose))fail(r.name,'utiliser une limite de posologie pour une perfusion continue.');
  if(m.type==='dose'||m.type==='infusion'||m.type==='insulin-glucose'||m.type==='fixed-duration-mixture')positive(m.coefficient,r.name,'dose de départ');
  if(m.type==='infusion'&&![1,60].includes(m.periodMinutes))fail(r.name,'la posologie doit être exprimée par minute ou par heure.');
  if(['fixed-duration-mixture','insulin-glucose'].includes(m.type))positive(m.durationHours,r.name,'durée');
  if(m.type==='fixed-duration-mixture'){positive(m.finalVolumeMl,r.name,'volume final');positive(m.preparedCoefficient??m.coefficient,r.name,'quantité préparée par kg');positive(m.maximumDose,r.name,'plafond');}
  if(m.type==='insulin-glucose'){for(const k of ['maximumDose','glucoseMlPerKg','maximumGlucoseMl','glucoseConcentrationMgMl'])positive(m[k],r.name,modelFields[k]??k);}
  for(const [trigger,target]of [['dailyCoefficient','divisionsPerDay'],['fixedDoseFromWeightKg','fixedDose'],['fixedDoseFromAgeMonths','fixedDose'],['fixedHourlyFromAgeMonths','fixedHourlyAmount']])if(m[trigger]!==undefined)positive(m[target],r.name,modelFields[target]);
  if(m.fixedHourlyFromAgeMonths!==undefined)positive(m.fixedDurationHours,r.name,'durée du schéma fixe');
  if(m.minimumCoefficient!==undefined&&m.coefficient<m.minimumCoefficient)fail(r.name,'départ inférieur à la posologie minimale.');
  if(m.maximumCoefficient!==undefined&&m.coefficient>m.maximumCoefficient)fail(r.name,'départ supérieur à la limite non dépassable.');
  if(m.warningCoefficient!==undefined&&m.warningCoefficient<m.coefficient)fail(r.name,'le seuil d’avertissement ne peut être inférieur à la dose de départ.');
  if(m.warningCoefficient!==undefined&&m.maximumCoefficient!==undefined&&m.warningCoefficient>m.maximumCoefficient)fail(r.name,'le seuil d’avertissement dépasse la limite non dépassable.');
  if(m.adjustmentStatus==='enabled'){
   positive(m.doseStep,r.name,'pas');
   if(m.tiers||m.cases||m.dailyCoefficient!==undefined||!['dose','infusion','fixed-duration-mixture'].includes(m.type))fail(r.name,'modifier les doses de chaque palier dans les détails ; le réglage par pas requiert une dose par kg unique.');
  }
  mix(m.mix,r.name);
  if(m.weightMix){keys(m.weightMix,['thresholdKg','below','atOrAbove'],r.name);positive(m.weightMix.thresholdKg,r.name,'seuil de dilution');mix(m.weightMix.below,r.name);mix(m.weightMix.atOrAbove,r.name);}
  if(m.weightMixes){
   if(!Array.isArray(m.weightMixes)||!m.weightMixes.length)fail(r.name,'paliers de dilution requis.');
   let previous=0;
   m.weightMixes.forEach((v,i)=>{keys(v,['minWeightKg','maxWeightKgExclusive','mix'],r.name);if((v.minWeightKg??0)!==previous)fail(r.name,'les paliers de dilution doivent se suivre sans trou ni chevauchement.');mix(v.mix,r.name);if(i<m.weightMixes.length-1){positive(v.maxWeightKgExclusive,r.name,'borne du palier');if(v.maxWeightKgExclusive<=previous)fail(r.name,'paliers de poids non croissants.');previous=v.maxWeightKgExclusive;}else if(v.maxWeightKgExclusive!==undefined)fail(r.name,'le dernier palier doit couvrir les poids supérieurs.');});
  }
  for(const [key,bound,dose]of [['tiers','maxAgeMonthsExclusive','coefficient'],['cases','maxWeightKg','dose']])if(m[key]){
   if(!Array.isArray(m[key])||!m[key].length)fail(r.name,'liste de paliers vide.');let previous=-1;
   m[key].forEach((v,i)=>{keys(v,[bound,dose],r.name);positive(v[dose],r.name,'dose du palier');if(i<m[key].length-1){positive(v[bound],r.name,'borne du palier',true);if(v[bound]<=previous)fail(r.name,'paliers non croissants.');previous=v[bound];}else if(v[bound]!==undefined)fail(r.name,'dernier palier incomplet.');});
  }
  if(m.type==='conditional-dose'&&!m.cases)fail(r.name,'paliers de doses requis.');
  for(const k of ['hideBelowAgeMonths','hideAboveAgeMonths'])if(r[k]!==undefined)positive(r[k],r.name,'filtre d’âge',true);
  keys(p,['posology','dilution','administration','route','durationMinutes','administrationNote','particulars','questions'],r.name);
  for(const k of ['posology','dilution','administration','administrationNote'])string(p[k],r.name,k);
  if(!routes.includes(p.route))fail(r.name,'voie non reconnue.');if(p.durationMinutes!==null)positive(p.durationMinutes,r.name,'durée en minutes');
  for(const k of ['particulars','questions'])if(!Array.isArray(p[k])||p[k].some(v=>typeof v!=='string'||v.length>4000))fail(r.name,`${k} invalide.`);
  keys(a,['id','name','presentation','volumeMl','amount','unit','declaredConcentration','expression','status','comment','source'],r.name);
  if(a.id!==r.id)fail(r.name,'identifiant d’ampoule incohérent.');
  for(const k of ['name','presentation','unit','expression','status','comment','source'])string(a[k],r.name,k);
  for(const k of ['amount','volumeMl','declaredConcentration'])if(a[k]!==null)positive(a[k],r.name,k);
  if(a.unit&&!stockUnits.includes(a.unit))fail(r.name,'unité d’ampoule invalide.');
  if(!ampouleStatuses.includes(a.status))fail(r.name,'statut d’ampoule invalide.');
  const c=stockConcentration(a);
  if(c!==null){positive(c,r.name,'concentration de l’ampoule');if(!a.unit)fail(r.name,'unité de l’ampoule requise.');if(!['mL','J'].includes(m.unit)&&m.type!=='instruction')convertUnit(c,a.unit,m.unit);}
  if(a.amount!==null&&a.volumeMl!==null&&a.declaredConcentration!==null&&Math.abs(c-a.declaredConcentration)>Math.max(1,c)*1e-9)fail(r.name,'concentration déclarée différente de quantité ÷ volume.');
  if((m.mix||m.weightMix||m.weightMixes||m.type==='fixed-duration-mixture')&&c===null)fail(r.name,'concentration de l’ampoule nécessaire à la dilution.');
  if(m.type==='infusion'&&c===null&&m.finalConcentration===undefined)fail(r.name,'concentration nécessaire au calcul de débit.');
 }
 const records=compile(config);
 for(const r of records)for(const weightKg of [0.5,10,200])for(const ageMonths of [0,24,120]){
  try{const result=calculateRecordForPatient(r,{weightKg,ageMonths,weightSource:'measured'});for(const k of ['dose','hourlyAmount','exactRateMlH','volumeMl','concentration'])if(result[k]!==null&&result[k]!==undefined&&!Number.isFinite(result[k]))fail(r.name,'le calcul produit un nombre non fini.');}
  catch(error){if(error.code!=='age-required')fail(r.name,error.message);}
 }
 return records;
}
export function parseConfiguration(text){if(typeof text!=='string'||text.length>1500000)throw new Error('Configuration absente ou supérieure à 1,5 Mo.');const value=JSON.parse(text);validateConfiguration(value);return value;}
export function serializeConfiguration(config){validateConfiguration(config);return JSON.stringify(config,null,2);}

// Unit changes preserve the administered quantity; changing a number changes the prescription.
export function convertDoseUnit(record,next){
 const m=record.model,ratio=convertUnit(1,m.unit,next);
 for(const key of ['coefficient','doseStep','warningCoefficient','minimumCoefficient','maximumCoefficient','maximumDose','pendingCeiling','preparedCoefficient','preparedMaximumDose','dailyCoefficient','roundDoseUpTo','fixedDose','fixedHourlyAmount','youngerFinalConcentration','finalConcentration'])if(m[key]!=null)m[key]*=ratio;
 for(const tier of m.tiers??[])tier.coefficient*=ratio;
 for(const tier of m.cases??[])tier.dose*=ratio;
 if(m.volumePerDose)m.volumePerDose/=ratio;
 m.unit=next;
}
export function convertDosePeriod(record,next){
 const m=record.model;
 if(m.type!=='infusion'||![1,60].includes(next))throw new Error('Période de posologie invalide.');
 const ratio=next/m.periodMinutes;
 for(const key of ['coefficient','doseStep','warningCoefficient','minimumCoefficient','maximumCoefficient'])if(m[key]!=null)m[key]*=ratio;
 m.periodMinutes=next;
}
export function convertStockUnit(record,next){
 const a=record.ampoule,ratio=a.unit?convertUnit(1,a.unit,next):1;
 for(const key of ['amount','declaredConcentration'])if(a[key]!=null)a[key]*=ratio;
 a.unit=next;
}
