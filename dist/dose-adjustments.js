import { smurRecords } from './smur-data.js';

export const doseSteps = Object.freeze(Object.fromEntries(smurRecords.filter(r=>r.category==='ivc').map(r=>[r.id,r.model.doseStep??null])));
const selections = new Map();
const listeners = new Set();
let revision=0;
const contextKey = context => JSON.stringify(context && [context.weightKg,context.ageMonths,context.weightSource]);

export function doseDefinition(record, context) {
  const m=record.model;
  if(m.adjustmentStatus==='fixed' || (!record.adjustable && !m.doseStep && m.adjustmentStatus!=='suspended'))return null;
  let initial=m.coefficient,mode='coefficient';
  let unit=`${m.unit}/kg${m.type==='infusion' ? m.periodMinutes===60 ? '/h':'/min' : m.durationHours ? `/${m.durationHours} h`:''}`;
  if(m.fixedHourlyFromAgeMonths!==undefined && context?.ageMonths==null)return {key:record.id,initial:null,unit,step:null,min:0,max:null,warning:null,mode};
  if(m.fixedHourlyFromAgeMonths!==undefined && context.ageMonths>=m.fixedHourlyFromAgeMonths){initial=m.fixedHourlyAmount;mode='hourly';unit=`${m.unit}/h`;}
  let max=m.maximumCoefficient??null;
  if(m.type==='fixed-duration-mixture' && context && Number.isFinite(m.maximumDose)){max=m.maximumDose/context.weightKg;initial=Math.min(initial,max);}
  return {key:record.id+(mode==='hourly'?':fixed':''),initial,unit,mode,min:m.minimumCoefficient??0,max,warning:m.warningCoefficient??null,step:m.adjustmentStatus==='suspended'?null:m.doseStep??null,suspended:m.adjustmentStatus==='suspended'};
}

export function nextDoseValue(definition,value,direction,step=definition.step) {
  if(!Number.isFinite(step)||step<=0)throw new Error('Pas de réglage à définir.');
  if(!Number.isFinite(value)||value<=0||![-1,1].includes(direction))throw new Error('Réglage de posologie invalide.');
  const next=Number((value+direction*step).toPrecision(14));
  if(!Number.isFinite(next))throw new Error('Posologie trop élevée.');
  if(next<=0||next<definition.min)return value;
  return definition.max!==null ? Math.min(next,definition.max):next;
}

export function recordWithDose(record,context,selection) {
  const definition=doseDefinition(record,context);
  if(!definition||definition.suspended||!selection||selection.mode!==definition.mode)return record;
  let value=selection.value;
  if(!Number.isFinite(value)||value<=0||value<definition.min)throw new Error('Posologie invalide.');
  if(definition.max!==null)value=Math.min(value,definition.max);
  if(definition.warning!==null && value>definition.warning && !selection.confirmedAboveWarning)throw new Error('Confirmer le dépassement du seuil avant de modifier la posologie.');
  const model={...record.model};
  if(definition.mode==='hourly')model.selectedHourlyAmount=value;else model.coefficient=value;
  return {...record,model,selectedDose:{...selection,value}};
}

export const subscribeDoseSettings=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
export function clearDoseSettings({notify=true}={}){selections.clear();revision++;if(notify)for(const listener of listeners)listener();}
export function currentDose(record,context){
  const definition=doseDefinition(record,context);if(!definition)return null;
  const selected=selections.get(record.id);
  const value=selected?.mode===definition.mode ? selected.value:definition.initial;
  return {...definition,value:value===null?null:definition.max===null?value:Math.min(value,definition.max)};
}
export function proposeDoseChange(record,context,direction){
  const dose=currentDose(record,context);if(!context||!dose||dose.suspended)throw new Error('Réglage indisponible.');
  const value=nextDoseValue(dose,dose.value,direction);
  return {recordId:record.id,contextKey:contextKey(context),modelKey:JSON.stringify(record.model),revision,direction,previous:dose.value,value,mode:dose.mode,unit:dose.unit,warning:dose.warning,requiresConfirmation:dose.warning!==null&&value>dose.warning&&value>dose.value};
}
export function commitDoseChange(record,context,proposal,{confirmed=false}={}){
  if(proposal.revision!==revision || proposal.recordId!==record.id || proposal.contextKey!==contextKey(context) || proposal.modelKey!==JSON.stringify(record.model))throw new Error('Le patient ou les réglages ont changé. Recommencer le réglage.');
  const fresh=proposeDoseChange(record,context,proposal.direction);
  if(fresh.previous!==proposal.previous||fresh.value!==proposal.value)throw new Error('La posologie a changé. Recommencer le réglage.');
  if(fresh.requiresConfirmation&&!confirmed)return false;
  const previous=selections.get(record.id);
  const selection={value:fresh.value,mode:fresh.mode,confirmedAboveWarning:confirmed || !!previous?.confirmedAboveWarning};
  recordWithDose(record,context,selection);
  selections.set(record.id,selection);revision++;
  for(const listener of listeners)listener();return true;
}
export function changeDose(record,context,direction,options){return commitDoseChange(record,context,proposeDoseChange(record,context,direction),options);}
export const withCurrentDose=(record,context)=>recordWithDose(record,context,selections.get(record.id));
