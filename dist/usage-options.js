import {convertDoseUnit,convertDosePeriod,doseUnits} from './engine/protocol-config.js';
import {convertUnit} from './engine/catalog-audit.js';
import {calculateRecordForPatient} from './engine/patient-calculator.js';
import {migratePatientRules,recordForContext,validatePatientRules,preparationOf,applyPreparation} from './patient-rules.js';

const copy=x=>structuredClone(x);
const stepKeys=['coefficient','maximumDose','tiers'];
export function migrateUsage(r){
 const m=r.model;
 if(m.secondCoefficient!==undefined&&!r.doses){
  r.doses=[{coefficient:m.coefficient,maximumDose:m.maximumDose??null},{coefficient:m.secondCoefficient,maximumDose:m.secondMaximumDose??null}];
  for(const k of [...stepKeys,'secondCoefficient','secondMaximumDose'])delete m[k];
 }
 return migratePatientRules(r);
}
export function doseModel(r,step){
 const base=copy(r.model);
 for(const key of stepKeys)delete base[key];
 const model={...base,...copy(step)};
 if(model.tiers)model.coefficient=model.tiers[0]?.coefficient;
 delete model.note;
 return model;
}
export function engineRecord(r){
 const {doses,patientRules,...base}=copy(r);
 if(doses)base.model=doseModel(r,doses[0]);
 else if(base.model.tiers)base.model.coefficient=base.model.tiers[0]?.coefficient;
 return base;
}
export function hasAgeDoses(r){return !!(r.patientRules?.dose||r.model.tiers||r.doses?.some(d=>d.tiers)||r.model.fixedDoseFromAgeMonths!==undefined||r.model.fixedHourlyFromAgeMonths!==undefined);}
export function usageEligibility(r){
 const m=r.model;
 const simple=['dose','infusion'].includes(m.type)&&!['J','mL'].includes(m.unit)&&!m.cases&&!m.dailyCoefficient&&!m.limitToOneBag;
 const fixedAge=m.fixedDoseFromAgeMonths!==undefined||m.fixedHourlyFromAgeMonths!==undefined;
 return {
  multiple:simple&&m.type==='dose'&&!fixedAge&&m.fixedDoseFromWeightKg===undefined,
  age:simple&&!fixedAge,
  continuous:simple&&!r.doses&&!fixedAge,
  fixedAge
 };
}
export function setMultipleDoses(r,on){
 if(on){
  if(!usageEligibility(r).multiple)throw Error('Les doses successives concernent un usage ponctuel, sans dose fixe conditionnelle.');
  if(r.doses)return;
  const first=Object.fromEntries(stepKeys.filter(k=>r.model[k]!==undefined).map(k=>[k,copy(r.model[k])]));
  r.doses=[first,{...copy(first),coefficient:null,...(first.tiers?{tiers:first.tiers.map(t=>({...t,coefficient:null}))}:{})}];
  for(const k of [...stepKeys,'secondCoefficient','secondMaximumDose','doseStep','warningCoefficient','minimumCoefficient','maximumCoefficient'])delete r.model[k];
  r.model.adjustmentStatus='fixed';
  for(const b of r.patientRules?.bands.slice(1)||[])if(b.doses)b.doses.push({...copy(b.doses[0]),coefficient:null});
 }else if(r.doses){
  Object.assign(r.model,copy(r.doses[0]));delete r.model.note;delete r.doses;
  for(const b of r.patientRules?.bands.slice(1)||[])if(b.doses)b.doses=b.doses.slice(0,1);
 }
}
export function addDose(r){
 if(!r.doses||r.doses.length>=10)throw Error('La série doit contenir entre 2 et 10 doses.');
 const prev=r.doses.at(-1);
 r.doses.push({coefficient:null,maximumDose:null,...(prev.tiers?{tiers:prev.tiers.map(t=>({...t,coefficient:null}))}:{})});
 for(const b of r.patientRules?.bands.slice(1)||[])if(b.doses)b.doses.push({coefficient:null,maximumDose:null});
}
export function removeDose(r,index){
 if(!r.doses||r.doses.length<=2)throw Error('Décochez « Doses successives » pour revenir à une dose.');
 r.doses.splice(index,1);
 for(const b of r.patientRules?.bands.slice(1)||[])if(b.doses)b.doses.splice(index,1);
}
export function setAgeDoses(r,on){
 if(!usageEligibility(r).age)throw Error('Ce schéma possède déjà des conditions d’âge particulières.');
 const targets=r.doses||[r.model];
 for(const t of targets){
  if(on&&!t.tiers)t.tiers=[{maxAgeMonthsExclusive:null,coefficient:t.coefficient??null},{coefficient:null}];
  if(!on&&t.tiers){t.coefficient=t.tiers[0].coefficient;delete t.tiers;}
 }
 if(on){r.model.adjustmentStatus='fixed';delete r.model.doseStep;}
}
export function setContinuous(r,on){
 if(!usageEligibility(r).continuous)throw Error('Le continu s’applique à un usage sans doses successives. Les schémas particuliers restent conservés.');
 const m=r.model;
 m.type=on?'infusion':'dose';
 for(const key of ['coefficient','maximumDose','noCeiling','doseStep','warningCoefficient','minimumCoefficient','maximumCoefficient','preparedCoefficient','preparedMaximumDose','durationHours'])delete m[key];
 m.coefficient=null;
 for(const b of r.patientRules?.bands.slice(1)||[]){
  for(const d of b.doses||[]){d.coefficient=null;d.maximumDose=null;}
  if(on&&b.preparation?.preparationMode){b.preparation={finalConcentration:null,diluent:b.preparation.diluent||''};}
 }
 if(m.tiers)for(const tier of m.tiers)tier.coefficient=null;
 m.adjustmentStatus='fixed';
 if(on){
  m.periodMinutes=60;r.protocol.route='IVSE';
  // A dose-dependent final volume cannot define a continuous concentration.
  if(m.preparationMode){
   for(const k of ['preparationMode','finalVolumeMl','minimumFinalConcentration','targetFinalConcentration','diluentRoundingMl','fineDiluentRoundingMl'])delete m[k];
   m.finalConcentration=null;
  }
 }else{delete m.periodMinutes;r.protocol.route='';}
 r.protocol.durationMinutes=null;
}
export function convertUsageUnit(r,next){
 const previous=r.model.unit;
 if(!previous){if(!doseUnits.includes(next))throw Error('Choisir une unité de dose.');r.model.unit=next;return;}
 const ratio=convertUnit(1,previous,next);
 convertDoseUnit(r,next);
 for(const step of r.doses||[]){
  for(const key of ['coefficient','maximumDose'])if(Number.isFinite(step[key]))step[key]*=ratio;
  for(const tier of step.tiers||[])if(Number.isFinite(tier.coefficient))tier.coefficient*=ratio;
 }
 for(const b of r.patientRules?.bands.slice(1)||[]){
  for(const d of b.doses||[])for(const k of ['coefficient','maximumDose'])if(Number.isFinite(d[k]))d[k]*=ratio;
  if(b.preparation){const row={model:{...copy(b.preparation),unit:previous}};convertDoseUnit(row,next);delete row.model.unit;b.preparation=preparationOf(row.model);}
 }
}
export function convertUsagePeriod(r,next){
 const ratio=next/r.model.periodMinutes;
 convertDosePeriod(r,next);
 for(const tier of r.model.tiers||[])if(Number.isFinite(tier.coefficient))tier.coefficient*=ratio;
 for(const b of r.patientRules?.bands.slice(1)||[])for(const d of b.doses||[])if(Number.isFinite(d.coefficient))d.coefficient*=ratio;
}
export function calculateUsage(r,context){
 r=recordForContext(r,context);
 if(!r.doses)return calculateRecordForPatient(r,context);
 const sequence=r.doses.map(step=>calculateRecordForPatient({...r,model:doseModel(r,step)},context));
 return {...sequence[0],sequence,secondDose:sequence[1]};
}
export function validateUsageShape(r){
 validatePatientRules(r);
 if(!r.doses)return;
 const m=r.model;
 if(!Array.isArray(r.doses)||r.doses.length<2||r.doses.length>10||m.type!=='dose')throw Error(r.name+' : une série comporte 2 à 10 doses ponctuelles.');
 if(m.cases||m.dailyCoefficient||m.fixedDoseFromAgeMonths!==undefined||m.fixedDoseFromWeightKg!==undefined||m.secondCoefficient!==undefined)throw Error(r.name+' : règles de doses incompatibles.');
 for(const [index,step] of r.doses.entries()){
  if(!step||Object.keys(step).some(k=>!['coefficient','maximumDose','tiers','note'].includes(k)))throw Error(r.name+' : paramètres de dose non reconnus.');
  if(step.note!==undefined&&(typeof step.note!=='string'||step.note.length>1000))throw Error(r.name+' : consigne de dose invalide.');
  const quantities=step.tiers?step.tiers.map(t=>t.coefficient):[step.coefficient];
  if(!quantities.length||quantities.some(n=>!Number.isFinite(n)||n<=0))throw Error(r.name+' — dose '+(index+1)+' : renseignez une dose par kg positive pour chaque tranche applicable.');
  if(step.tiers?.slice(0,-1).some(t=>!Number.isFinite(t.maxAgeMonthsExclusive)||t.maxAgeMonthsExclusive<=0))throw Error(r.name+' — dose '+(index+1)+' : renseignez les limites des tranches d’âge.');
 }
}
