// Shared, contiguous patient ranges. The first range uses the main dose/preparation.
// Later ranges contain only the values that vary; boundaries have one source.
const copy=x=>structuredClone(x);
export const preparationKeys=['mix','weightMix','weightMixes','preparationMode','finalConcentration','finalVolumeMl','minimumFinalConcentration','targetFinalConcentration','diluentRoundingMl','fineDiluentRoundingMl','dilutionFactor','volumePerDose','volumeKind','diluent'];
export const preparationOf=m=>Object.fromEntries(preparationKeys.filter(k=>m[k]!==undefined).map(k=>[k,copy(m[k])]));
export function applyPreparation(m,p){for(const k of preparationKeys)delete m[k];Object.assign(m,copy(p));}
export const dosesOf=r=>(r.doses||[r.model]).map(d=>({coefficient:d.coefficient,maximumDose:d.maximumDose??null}));
export const ruleUnit=r=>r.patientRules?.axis==='age'?'mois':'kg';
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:4}).format(n):'…';
export function bandLabel(r,i){
 const rules=r.patientRules,b=rules.bands[i],u=ruleUnit(r);
 return i===0?'Moins de '+fmt(b.until)+' '+u:b.until!==undefined?'De '+fmt(rules.bands[i-1].until)+' à moins de '+fmt(b.until)+' '+u:'À partir de '+fmt(rules.bands[i-1].until)+' '+u;
}
export function ruleEligibility(r){
 const m=r.model,legacy=!!(m.tiers||r.doses?.some(d=>d.tiers)||m.weightMix||m.weightMixes);
 return {dose:!legacy&&['dose','infusion'].includes(m.type)&&!m.cases&&!m.dailyCoefficient&&m.fixedDoseFromAgeMonths===undefined&&m.fixedDoseFromWeightKg===undefined&&m.fixedHourlyFromAgeMonths===undefined&&!['J','mL'].includes(m.unit),preparation:!legacy&&['dose','infusion'].includes(m.type)&&!m.limitToOneBag&&m.preparationMinimumAgeMonths===undefined&&m.unit!=='J',legacy};
}
export function setPatientRule(r,part,on){
 if(!['dose','preparation'].includes(part))throw Error('Option de seuil inconnue.');
 if(on&&!ruleEligibility(r)[part])throw Error('Ce schéma conserve ses conditions particulières existantes.');
 if(on&&!r.patientRules)r.patientRules={axis:part==='dose'?'age':'weight',dose:false,preparation:false,bands:[{until:null},{}]};
 const q=r.patientRules;if(!q)return;q[part]=on;
 for(const b of q.bands.slice(1)){
  if(part==='dose'){if(on)b.doses=dosesOf(r).map(d=>({...d,coefficient:null}));else delete b.doses;}
  if(part==='preparation'){if(on)b.preparation=preparationOf(r.model);else delete b.preparation;}
 }
 if(on&&part==='dose'){r.model.adjustmentStatus='fixed';delete r.model.doseStep;}
 if(!q.dose&&!q.preparation)delete r.patientRules;
}
export function addBand(r){
 const q=r.patientRules;if(!q||q.bands.length>=10)throw Error('Vous pouvez définir jusqu’à 10 tranches.');
 q.bands.at(-1).until=null;
 q.bands.push({...q.dose?{doses:dosesOf(r).map(d=>({...d,coefficient:null}))}:{},...q.preparation?{preparation:preparationOf(r.model)}:{}});
}
export function removeBand(r,index){
 const q=r.patientRules;if(!q||index<1||index>=q.bands.length||q.bands.length<=2)throw Error('Conserver au moins deux tranches, ou décocher l’option.');
 q.bands.splice(index,1);delete q.bands.at(-1).until;
}
export function changeRuleAxis(r,axis){
 if(!['age','weight'].includes(axis))throw Error('Choisir l’âge ou le poids.');
 if(r.patientRules.axis!==axis){r.patientRules.axis=axis;for(const b of r.patientRules.bands.slice(0,-1))b.until=null;}
}
export function bandRecord(r,index){
 const result=copy(r),q=result.patientRules;delete result.patientRules;
 if(!q||index===0)return result;
 const b=q.bands[index];
 if(q.dose){
  if(result.doses)result.doses=result.doses.map((d,j)=>({...d,...copy(b.doses[j])}));
  else Object.assign(result.model,copy(b.doses[0]));
 }
 if(q.preparation)applyPreparation(result.model,b.preparation);
 return result;
}
export function recordForContext(r,context){
 if(!r.patientRules||!context)return r;
 const q=r.patientRules,value=q.axis==='age'?context.ageMonths:context.weightKg;
 if(value===null||value===undefined){const e=Error('Âge nécessaire pour choisir la tranche de dose ou de préparation.');e.code='age-required';throw e;}
 return bandRecord(r,q.bands.findIndex(b=>b.until===undefined||value<b.until));
}
export function validatePatientRules(r){
 const q=r.patientRules;if(!q)return;
 const fail=message=>{throw Error(r.name+' : '+message);};
 if(!q||Object.keys(q).some(k=>!['axis','dose','preparation','bands'].includes(k))||!['age','weight'].includes(q.axis)||typeof q.dose!=='boolean'||typeof q.preparation!=='boolean'||(!q.dose&&!q.preparation))fail('seuils invalides.');
 const e=ruleEligibility(r);if(q.dose&&!e.dose||q.preparation&&!e.preparation)fail('seuils incompatibles avec les conditions existantes.');
 if(!Array.isArray(q.bands)||q.bands.length<2||q.bands.length>10)fail('définir de 2 à 10 tranches.');
 let previous=0;
 q.bands.forEach((b,i)=>{
  if(!b||Object.keys(b).some(k=>!['until','doses','preparation'].includes(k)))fail('tranche invalide.');
  if(i<q.bands.length-1){if(!Number.isFinite(b.until)||b.until<=previous||b.until>(q.axis==='age'?216:200))fail('les seuils doivent être renseignés et strictement croissants ('+ruleUnit(r)+').');previous=b.until;}
  else if(b.until!==undefined)fail('la dernière tranche doit couvrir toutes les valeurs supérieures.');
  if(i===0){if(b.doses||b.preparation)fail('la première tranche utilise la posologie et la préparation principales.');return;}
  if(q.dose){
   if(!Array.isArray(b.doses)||b.doses.length!==(r.doses?.length||1))fail('chaque tranche doit renseigner toutes les doses.');
   for(const d of b.doses)if(!d||Object.keys(d).some(k=>!['coefficient','maximumDose'].includes(k))||!Number.isFinite(d.coefficient)||d.coefficient<=0||d.maximumDose!=null&&(!Number.isFinite(d.maximumDose)||d.maximumDose<=0))fail('renseigner une dose positive et un plafond valide dans chaque tranche.');
  }else if(b.doses)fail('doses par tranche désactivées.');
  if(q.preparation){if(!b.preparation||Object.keys(b.preparation).some(k=>!preparationKeys.includes(k)||['weightMix','weightMixes'].includes(k)))fail('préparation par tranche invalide.');}
  else if(b.preparation)fail('préparation par tranche désactivée.');
 });
}
export function migratePatientRules(r){
 if(r.patientRules)return r;
 const m=r.model,targets=r.doses||[m],age=targets.some(d=>d.tiers),weight=!!(m.weightMix||m.weightMixes);
 // Older trials can combine separate age and weight axes. Preserve them verbatim.
 if(age&&weight||!age&&!weight)return r;
 if(age){
  const bounds=[...new Set(targets.flatMap(d=>(d.tiers||[]).slice(0,-1).map(t=>t.maxAgeMonthsExclusive)))].sort((a,b)=>a-b);
  if(!bounds.length||bounds.some(x=>!Number.isFinite(x)||x<=0||x>216))return r;
  const bands=[...bounds,undefined].map((until,i)=>({...(until!==undefined?{until}:{}),...(i?{doses:targets.map(d=>({coefficient:d.tiers?.find(t=>t.maxAgeMonthsExclusive===undefined||bounds[i-1]<t.maxAgeMonthsExclusive)?.coefficient??d.coefficient,maximumDose:d.maximumDose??null}))}:{})}));
  for(const d of targets){if(d.tiers){d.coefficient=d.tiers[0].coefficient;delete d.tiers;}}
  r.patientRules={axis:'age',dose:true,preparation:false,bands};
 }else{
  const rows=m.weightMix?[{maxWeightKgExclusive:m.weightMix.thresholdKg,mix:m.weightMix.below},{mix:m.weightMix.atOrAbove}]:m.weightMixes;
  if(rows.slice(0,-1).some(p=>!Number.isFinite(p.maxWeightKgExclusive)||p.maxWeightKgExclusive<=0||p.maxWeightKgExclusive>200))return r;
  const base=preparationOf(m);delete base.weightMix;delete base.weightMixes;
  applyPreparation(m,{...base,mix:copy(rows[0].mix)});
  r.patientRules={axis:'weight',dose:false,preparation:true,bands:rows.map((p,i)=>({...(p.maxWeightKgExclusive!==undefined?{until:p.maxWeightKgExclusive}:{}),...(i?{preparation:{...copy(base),mix:copy(p.mix)}}:{})}))};
 }
 return r;
}
