// Adapter for the original reading interface. Only saved administrative data is used.
import {loadState,compileRecord,posologyText,preparationText,clone} from '../domain.js';
import {calculateUsage,doseModel} from '../usage-options.js';
import {bandRecord,bandLabel,recordForContext} from '../patient-rules.js';
import {calculateRecordForPatient} from '../engine/patient-calculator.js';
import {buildMedicationSheet as legacySheet} from '../engine/smur-sheets.js';
import {quickMedicationDetails as legacyDetails} from '../engine/quick-summary.js';
import {withCurrentDose as legacyDose} from '../engine/dose-adjustments.js';

export function recordsFromState(state){
 return state.records.map(row=>{
  const r=compileRecord(state,row.id),review=clone(state.reviews[row.id]);
  r.protocol.questions=clone(review.questions);
  return {...r,review};
 });
}
export function getConfiguredRecords(){
 const status=document.getElementById('quick-ampoules-status');
 try{const rows=recordsFromState(loadState(localStorage));if(status){status.textContent='';status.hidden=true;}return rows;}
 catch(error){if(status){status.hidden=false;status.textContent='Réglages indisponibles : '+error.message+' Ouvrez Administration pour récupérer votre sauvegarde.';}return [];}
}
export function getConfiguredReferences(){
 try{return loadState(localStorage).clinicalReferences;}
 catch{return null;}
}
export function withCurrentDose(record,context){
 try{return legacyDose(recordForContext(record,context),context);}
 catch(error){if(error.code==='age-required')return record;throw error;}
}
export function calculateAllRecords(records,context){
 return new Map(records.map(r=>{
  try{
   if(r.unassigned)return [r.id,{...calculateRecordForPatient(r,null),status:'blocked',message:'Aucune ampoule affectée. Affectez-la depuis Administration.'}];
   return [r.id,calculateUsage(r,context)];
  }catch(error){return [r.id,{...calculateRecordForPatient(r,null),status:'blocked',message:error.message}];}
 }));
}
export function buildMedicationSheet(record){
 const base=legacySheet(record);
 if(!record.patientRules&&!record.doses)return base;
 const variants=record.patientRules?record.patientRules.bands.map((_,i)=>({r:bandRecord(record,i),label:bandLabel(record,i)})):[{r:record,label:''}];
 base.doseRows=variants.flatMap(({r,label})=>(r.doses||[null]).flatMap((dose,i)=>{
  const sheet=legacySheet(dose?{...r,model:doseModel(r,dose)}:r);
  return sheet.doseRows.map(row=>({...row,condition:[label,dose?'Dose '+(i+1):'',row.condition==='Pas de changement d’âge ou de poids documenté'?'':row.condition].filter(Boolean).join(' · ')||row.condition}));
 }));
 base.preparations=variants.map(({r,label})=>({condition:label||'Toutes les doses',text:preparationText(r)}));
 return base;
}
export function quickMedicationDetails(record,result,context,sheet){
 const r=withCurrentDose(record,context),rows=legacyDetails(r,result,context,sheet);
 if(result.sequence){
  const individual=result.sequence.map((v,i)=>legacyDetails({...r,model:doseModel(r,r.doses[i])},{...v,secondDose:undefined},context,sheet));
  for(const key of ['withdrawal','diluent','final-volume','administration']){
   const values=individual.map(items=>items.find(x=>x.key===key).value);
   rows.find(x=>x.key===key).value=values.every(x=>x===values[0])?values[0]:values.map((x,i)=>'Dose '+(i+1)+' : '+x).join(' ; ');
  }
 }
 if(r.doses||record.patientRules)rows.find(x=>x.key==='posology').value=posologyText(r);
 return rows;
}
