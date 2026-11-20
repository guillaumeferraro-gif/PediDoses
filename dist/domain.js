import {defaultConfiguration,validateConfiguration,modelFields} from './engine/protocol-config.js';
import {smurRecords,smurCategories,smurSources} from './engine/smur-data.js';
import {stockConcentration,ampouleDescription} from './engine/ampoules.js';
import {calculateRecordForPatient,resolvePatientContext,isRecordVisibleForPatient} from './engine/patient-calculator.js';
import {buildMedicationSheet} from './engine/smur-sheets.js';
import {quickMedicationDetails} from './engine/quick-summary.js';
import {administrationMinutes,administrationText} from './engine/administration.js';
import {convertUnit} from './engine/catalog-audit.js';
import {validateStockDefinition} from './stock-validation.js';
import {migrateUsage,engineRecord,doseModel,calculateUsage,validateUsageShape} from './usage-options.js';
import {bandRecord,bandLabel,recordForContext} from './patient-rules.js';
import {referenceDefaults,validateReferences,commitReferences} from './clinical-references.js';

export {smurCategories,modelFields,stockConcentration};
export const STORAGE_KEY='pedidose-atelier.independent.v1';
export const SOURCE_SHA='b9e503ddad8e870c143c45f8562c4afdb926c861';
export const clone=value=>structuredClone(value);
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const fmt=(n,d=4)=>Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(n):'—';
export const normal=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const categoryName=id=>smurCategories.find(c=>c.id===id)?.label||id;
export const originals=new Map(smurRecords.map(r=>[r.id,r]));
const sharedFamilies=[
 ['ketamine-analgesie','ketamine-intubation'],
 ['adrenaline-iv','adrenaline-im','adrenaline-ivc'],
 ['morphine-dc','morphine-titration','morphine-ivc'],
 ['propofol','propofol-lisa'],
 ['clonazepam-bolus','clonazepam-ivc'],
 ['bicarbonate-acr','bicarbonate-hyperk'],
 ['tranexamique-bolus','tranexamique-ivc'],
 ['salbutamol-charge','salbutamol-ivc'],
 ['nicardipine','nicardipine-charge']
];
const stockSignature=a=>[a.amount,a.unit,a.volumeMl,a.declaredConcentration].join('|');
export function newState(){
 const config=defaultConfiguration();
 const s={format:'pedidose-atelier',version:4,sourceSha:SOURCE_SHA,records:[],stocks:{},links:{},reviews:{},revisions:{},history:[],clinicalReferences:referenceDefaults()};
 for(const r of config.records){
  const family=sharedFamilies.find(ids=>ids.includes(r.id));
  const first=family&&config.records.find(x=>x.id===family[0]);
  const stockId='stock-'+(first&&stockSignature(first.ampoule)===stockSignature(r.ampoule)?first.id:r.id);
  const {id,name,...stock}=r.ampoule;
  if(!s.stocks[stockId])s.stocks[stockId]=stock;
  s.links[r.id]=stockId;
  const {ampoule,...record}=r;s.records.push(migrateUsage(record));
  const source=originals.get(r.id);
  const refs=(source.sources||[]).map(k=>typeof k==='string'?smurSources[k]:k).filter(Boolean);
  s.reviews[r.id]={status:'todo',reviewer:'',reviewedAt:null,notes:'',sources:refs.map(x=>x.title+' — '+x.url).join('\n'),questions:[...r.protocol.questions],checks:{posology:false,preparation:false,administration:false}};
  s.revisions[r.id]=1;
 }
 return synchronizeTexts(s);
}
export function draftFor(s,id){
 return {record:clone(s.records.find(r=>r.id===id)),stock:clone(s.stocks[s.links[id]]??emptyStock()),stockId:s.links[id]??null,review:clone(s.reviews[id])};
}
export function linkedRecords(s,stockId){return s.records.filter(r=>s.links[r.id]===stockId);}
export function draftChanged(s,d){return !s.records.some(r=>r.id===d.record.id)||!equal(d,draftFor(s,d.record.id));}
export function createMedicationDraft(){
 const id='custom-'+crypto.randomUUID();
 return {record:{id,name:'',category:smurCategories[0].id,model:{type:'dose',unit:'',coefficient:null,maximumDose:null,mix:null,adjustmentStatus:'fixed'},protocol:{posology:'',dilution:'',administration:'',route:'',durationMinutes:null,administrationNote:'',particulars:[],questions:[]}},stock:emptyStock(),stockId:null,review:{status:'todo',reviewer:'',reviewedAt:null,notes:'',sources:'',questions:[],checks:{posology:false,preparation:false,administration:false}}};
}
export function configuration(s){
 return {schemaVersion:2,records:s.records.map(r=>({...engineRecord(r),ampoule:{...clone(s.stocks[s.links[r.id]]??emptyStock()),id:r.id,name:r.name}}))};
}
const referenceStocks=new Map(defaultConfiguration().records.map(r=>[r.id,r.ampoule]));
export const emptyStock=()=>({presentation:'Aucune ampoule affectée',amount:null,volumeMl:null,unit:'',declaredConcentration:null,expression:'',status:'à confirmer',comment:'',source:''});
export function validateAtelier(s){
 validateReferences(s.clinicalReferences);
 for(const a of Object.values(s.stocks))validateStockDefinition(a);
 for(const r of s.records)validateUsageShape(r);
 const config=configuration(s);
 const opts={allowCustom:true,unassignedIds:s.records.filter(r=>s.links[r.id]===null).map(r=>r.id),contextsById:Object.fromEntries(s.records.filter(r=>r.patientRules).map(r=>[r.id,contextsForBand(r,0)]))};
 const compiled=validateConfiguration(config,opts);
 for(const r of s.records){
  const branches=r.patientRules?r.patientRules.bands.map((_,i)=>bandRecord(r,i)):[r];
  for(const [band,branch]of branches.entries())for(const [i,step] of (branch.doses||[branch.model]).entries()){
   if(!band&&!i)continue;
   const alternative=clone(config),row=alternative.records.find(x=>x.id===r.id);
   row.model=branch.doses?doseModel(branch,step):clone(branch.model);
   validateConfiguration(alternative,{...opts,contextsById:{...opts.contextsById,...r.patientRules?{[r.id]:contextsForBand(r,band)}:{}}});
  }
 }
 return compiled;
}
export function withDraft(s,d){
 const next=clone(s),index=next.records.findIndex(r=>r.id===d.record.id);
 if(index===-1){next.records.push(clone(d.record));next.links[d.record.id]=null;next.revisions[d.record.id]=0;}
 else next.records[index]=clone(d.record);
 next.links[d.record.id]=d.stockId??null;
 next.reviews[d.record.id]=clone(d.review);
 return next;
}
export function compileRecord(s,id){
 const r=configuration(s).records.find(r=>r.id===id),original=originals.get(id),raw=s.records.find(x=>x.id===id);
 const c=stockConcentration(r.ampoule);
 r.model.stock=c===null||['mL','J'].includes(r.model.unit)?null:{amount:c,unit:r.ampoule.unit,volumeMl:1};
 if(['ssh','glucose10'].includes(id)&&c!==null){r.model.massPerMl=convertUnit(c,r.ampoule.unit,'mg');r.model.massUnit='mg';}
 r.ampoule.description=ampouleDescription(r.ampoule);
 return {...(original??{sourceCells:[],issues:[],sources:[]}),...r,...(raw.doses?{doses:clone(raw.doses)}:{}),...(raw.patientRules?{patientRules:clone(raw.patientRules)}:{}),unassigned:s.links[id]===null};
}
export function compatibleStocks(s,r){
 if(r.model.type==='instruction'||!r.model.unit||r.model.unit==='J')return [];
 return Object.entries(s.stocks).filter(([,a])=>{if(a.status==='sans objet')return false;try{if(a.unit&&!['mL','J'].includes(r.model.unit))convertUnit(1,a.unit,r.model.unit);return true;}catch{return false;}});
}
export function assignStock(s,d,id){
 if(id!==null&&!compatibleStocks(s,d.record).some(([key])=>key===id))throw Error('Choisir une ampoule compatible avec l’unité du médicament.');
 d.stockId=id;d.stock=clone(id===null?emptyStock():s.stocks[id]);return d;
}
export function prepMode(r){
 const m=r.model;
 if(m.type==='instruction'||m.unit==='J'||m.limitToOneBag)return 'na';
 if(m.type==='insulin-glucose')return 'associated';
 if(m.type==='fixed-duration-mixture')return 'fixed-mixture';
 if(m.weightMix||m.weightMixes)return 'weight';
 if(m.preparationMode==='dose-only')return 'unknown';
 if(m.preparationMode)return m.preparationMode;
 if(m.finalConcentration!==undefined)return 'concentration';
 if(m.dilutionFactor!==undefined||m.volumePerDose!==undefined)return 'factor';
 if(m.mix)return 'volumes';
 if(m.volumeKind==='withdrawal')return 'unknown';
 if(r.ampoule?.amount!=null&&r.ampoule?.volumeMl==null&&r.ampoule?.declaredConcentration==null)return 'unknown';
 return 'none';
}
export const prepNames={none:'Sans dilution',volumes:'Prélever + ajouter un diluant','fixed-volume':'Compléter à un volume final',concentration:'Obtenir une concentration cible',weight:'Dilution selon le poids','concentration-range':'Concentration avec arrondi du diluant',unknown:'Préparation non renseignée',factor:'Dilution proportionnelle','fixed-mixture':'Préparation pour une durée définie',associated:'Insuline et glucose associés',na:'Sans préparation'};
export function changePrep(d,mode){
 const m=d.record.model;
 for(const key of ['mix','weightMix','weightMixes','preparationMode','finalConcentration','finalVolumeMl','minimumFinalConcentration','targetFinalConcentration','diluentRoundingMl','fineDiluentRoundingMl','dilutionFactor','volumePerDose','volumeKind'])delete m[key];
 m.mix=null;
 if(mode==='volumes')m.mix={takeMl:1,addMl:9};
 if(mode==='fixed-volume'){m.preparationMode='fixed-volume';m.finalVolumeMl=50;}
 if(mode==='concentration')m.finalConcentration=1;
 if(mode==='unknown'){if(m.type==='dose')m.preparationMode='dose-only';else {m.finalConcentration=undefined;}}
 if(mode==='weight')m.weightMix={thresholdKg:20,below:{takeMl:1,addMl:9},atOrAbove:null};
 if(mode==='concentration-range')Object.assign(m,{preparationMode:'concentration-range',minimumFinalConcentration:10,targetFinalConcentration:15,diluentRoundingMl:1,fineDiluentRoundingMl:0.1});
 if(mode!=='none'&&mode!=='unknown'&&!m.diluent)m.diluent='NaCl 0,9 %';
}
export function posologyText(r){
 if(r.patientRules?.dose)return r.patientRules.bands.map((_,i)=>bandLabel(r,i)+' : '+posologyText(bandRecord(r,i))).join(' ; ');
 if(r.doses)return r.doses.map((step,i)=>'Dose '+(i+1)+' : '+posologyText({...r,doses:undefined,model:doseModel(r,step)})+(step.note?' · '+step.note:'')).join(' ; ');
 const m=r.model,u=m.unit,period=m.type==='infusion'?(m.periodMinutes===60?'/h':'/min'):'';
 if(m.type==='instruction'||m.type==='unresolved')return r.protocol.posology||'Consigne à renseigner';
 let t;
 if(m.tiers)t=m.tiers.map((p,i)=>fmt(p.coefficient)+' '+u+'/kg'+period+' · '+(i===0?'avant '+fmt(p.maxAgeMonthsExclusive)+' mois':p.maxAgeMonthsExclusive!==undefined?'de '+fmt(m.tiers[i-1].maxAgeMonthsExclusive)+' à moins de '+fmt(p.maxAgeMonthsExclusive)+' mois':'dès '+fmt(m.tiers[i-1].maxAgeMonthsExclusive)+' mois')).join(' ; ');
 else if(m.cases)t=m.cases.map((p,i)=>fmt(p.dose)+' '+u+' · '+(i===0?'jusqu’à '+fmt(p.maxWeightKg)+' kg':p.maxWeightKg!==undefined?'plus de '+fmt(m.cases[i-1].maxWeightKg)+' à '+fmt(p.maxWeightKg)+' kg':'au-delà de '+fmt(m.cases[i-1].maxWeightKg)+' kg')).join(' ; ');
 else if(m.dailyCoefficient!==undefined)t=fmt(m.dailyCoefficient)+' '+u+'/kg/j en '+fmt(m.divisionsPerDay)+' prises'+(m.roundDoseUpTo?' · dose arrondie au multiple supérieur de '+fmt(m.roundDoseUpTo)+' '+u:'');
 else t=fmt(m.coefficient)+' '+u+'/kg'+period;
 if(Number.isFinite(m.maximumDose))t+=' · max. '+fmt(m.maximumDose)+' '+u;
 if(m.secondCoefficient!==undefined)t='1re dose : '+t+' ; 2e dose : '+fmt(m.secondCoefficient)+' '+u+'/kg'+(Number.isFinite(m.secondMaximumDose)?' · max. '+fmt(m.secondMaximumDose)+' '+u:'');
 if(m.fixedDoseFromWeightKg!==undefined)t+=' ; dès '+fmt(m.fixedDoseFromWeightKg)+' kg : '+fmt(m.fixedDose)+' '+u;
 if(m.fixedDoseFromAgeMonths!==undefined)t+=' ; dès '+fmt(m.fixedDoseFromAgeMonths)+' mois : '+fmt(m.fixedDose)+' '+u;
 if(m.fixedHourlyFromAgeMonths!==undefined)t+=' ; dès '+fmt(m.fixedHourlyFromAgeMonths)+' mois : '+fmt(m.fixedHourlyAmount)+' '+u+'/h sur '+fmt(m.fixedDurationHours)+' h';
 if(m.warningCoefficient!==undefined)t+=' · avertissement au-delà de '+fmt(m.warningCoefficient)+' '+u+'/kg'+period;
 if(m.minimumCoefficient!==undefined)t+=' · minimum '+fmt(m.minimumCoefficient)+' '+u+'/kg'+period;
 if(m.maximumCoefficient!==undefined)t+=' · limite '+fmt(m.maximumCoefficient)+' '+u+'/kg'+period;
 if(m.minimumAgeMonths!==undefined)t+=' · dès '+fmt(m.minimumAgeMonths)+' mois';
 if(m.minimumAgeMonthsExclusive!==undefined)t+=' · après '+fmt(m.minimumAgeMonthsExclusive)+' mois';
 if(m.type==='fixed-duration-mixture')t+=' sur '+fmt(m.durationHours)+' h';
 if(m.type==='insulin-glucose')t+=' + glucose '+fmt(m.glucoseMlPerKg)+' mL/kg (max. '+fmt(m.maximumGlucoseMl)+' mL) sur '+fmt(m.durationHours*60)+' min';
 if(m.limitToOneBag)t+=' · limité à une poche si son volume est renseigné';
 return t;
}
function mixText(mix,diluent){return mix?fmt(mix.takeMl)+' mL de produit + '+fmt(mix.addMl)+' mL de '+(diluent||'diluant à préciser'):'Sans dilution';}
export function preparationText(r){
 if(r.patientRules?.preparation)return r.patientRules.bands.map((_,i)=>bandLabel(r,i)+' : '+preparationText(bandRecord(r,i))).join(' ; ');
 const m=r.model,mode=prepMode(r),d=m.diluent||'diluant à préciser';
 if(mode==='weight'){
  if(m.weightMix)return 'Avant '+fmt(m.weightMix.thresholdKg)+' kg : '+mixText(m.weightMix.below,d)+' ; dès '+fmt(m.weightMix.thresholdKg)+' kg : '+mixText(m.weightMix.atOrAbove,d);
  return m.weightMixes.map((p,i)=>(i?'Dès '+fmt(p.minWeightKg)+' kg':'Avant '+fmt(p.maxWeightKgExclusive)+' kg')+' : '+mixText(p.mix,d)).join(' ; ');
 }
 if(mode==='fixed-volume'||mode==='fixed-mixture')return 'Compléter à '+fmt(m.finalVolumeMl)+' mL au total avec '+d;
 if(mode==='concentration')return 'Obtenir '+fmt(m.finalConcentration)+' '+m.unit+'/mL avec '+d;
 if(mode==='concentration-range')return 'Viser '+fmt(m.targetFinalConcentration)+' '+m.unit+'/mL (minimum '+fmt(m.minimumFinalConcentration)+') ; '+d+' arrondi au '+fmt(m.diluentRoundingMl)+' mL supérieur, ou '+fmt(m.fineDiluentRoundingMl)+' mL pour les petits volumes';
 if(mode==='factor')return m.dilutionFactor?'Volume prélevé × '+fmt(m.dilutionFactor)+' ; '+d:fmt(m.volumePerDose)+' mL par '+m.unit;
 if(mode==='volumes')return mixText(m.mix,d);
 if(mode==='associated')return 'Insuline et glucose associés ; paramètres propres à chaque produit';
 if(mode==='na')return 'Sans objet';
 if(mode==='unknown')return 'Préparation non renseignée';
 return 'Sans dilution';
}
export function synchronizeTexts(s,ids=null){
 for(const r of s.records.filter(r=>!ids||ids.includes(r.id))){
  const a={...(s.stocks[s.links[r.id]]??emptyStock()),id:r.id,name:r.name},full={...r,ampoule:a};
  if(!['instruction','unresolved'].includes(r.model.type))r.protocol.posology=posologyText(full);
  r.protocol.dilution=preparationText(full);r.protocol.administration=administrationText(r);
 }
 return s;
}
export function preview(s,d,input={weight:'10',age:'24',ageUnit:'months',bag:''},adjustment=0){
 const n=withDraft(s,d);let r=compileRecord(n,d.record.id);
 validateAtelier(n);
 const ctx=resolvePatientContext(input);
 if(r.unassigned)return {r,ctx,result:{status:'blocked',message:'Aucune ampoule affectée. Ouvrez « Ampoules » pour relier ce médicament à une présentation.'},hidden:false,details:[]};
 const ranged=r;r=recordForContext(r,ctx);
 if(adjustment&&r.model.adjustmentStatus==='enabled'&&Number.isFinite(r.model.doseStep)){
  const value=Number((r.model.coefficient+adjustment*r.model.doseStep).toPrecision(14));
  if(value<=0||value<(r.model.minimumCoefficient??0)||value>(r.model.maximumCoefficient??Infinity))throw Error('Le réglage dépasse les limites de posologie.');
  r={...r,model:{...r.model,coefficient:value}};
 }
 const result={...calculateUsage(r,ctx)};
 if(!isRecordVisibleForPatient(r,ctx))return {r,ctx,result,hidden:true,details:[]};
 const sheet=buildMedicationSheet(r),details=quickMedicationDetails(r,result,ctx,sheet);
 if(ranged.patientRules&&ctx){const q=ranged.patientRules,value=q.axis==='age'?ctx.ageMonths:ctx.weightKg;details.unshift({key:'patient-band',label:'Tranche appliquée',value:bandLabel(ranged,q.bands.findIndex(b=>b.until===undefined||value<b.until))});}
 if(result.sequence){
  // Every dose uses the same preparation rules; its dose and volume remain separate.
  const individual=result.sequence.map((v,i)=>quickMedicationDetails({...r,model:doseModel(r,r.doses[i])},{...v,secondDose:undefined},ctx,sheet));
  for(const key of ['withdrawal','diluent','final-volume','administration']){
   const values=individual.map(rows=>rows.find(x=>x.key===key).value);
   details.find(x=>x.key===key).value=values.every(v=>v===values[0])?values[0]:values.map((v,i)=>'Dose '+(i+1)+' : '+v).join(' ; ');
  }
 }
 details.find(x=>x.key==='posology').value=posologyText(r);
 if(r.model.limitToOneBag&&result.status==='calculated'){
  const bag=input.bag===''?null:Number(String(input.bag).replace(',','.'));
  if(bag!==null&&(!Number.isFinite(bag)||bag<=0))throw Error('Volume de poche : saisir un nombre positif.');
  result.bagVolumeMl=bag;
  result.volumeMl=bag===null?null:Math.min(result.volumeMl,bag);
  details.find(x=>x.key==='final-volume').value=bag===null?'Volume de poche à renseigner':fmt(bag)+' mL dans la poche';
 }
 return {r,ctx,result,details,hidden:false};
}
function contextsForBand(r,index){
 const q=r.patientRules,lo=index?q.bands[index-1].until:0,hi=q.bands[index].until??(q.axis==='age'?216:200),last=index===q.bands.length-1;
 const values=[Math.max(q.axis==='weight'?0.5:0,lo),Math.max(q.axis==='weight'?0.5:0,(lo+hi)/2),last?hi:hi-0.000001].filter(x=>x>=lo&&(last?x<=hi:x<hi));
 return q.axis==='weight'?values.flatMap(weightKg=>[0,24,120].map(ageMonths=>({weightKg,ageMonths}))):values.flatMap(ageMonths=>[0.5,10,200].map(weightKg=>({weightKg,ageMonths})));
}
export function checkCases(s,id){
 const r=compileRecord(s,id),m=r.model;
 const cases=[{weightKg:3,ageMonths:0},{weightKg:10,ageMonths:24},{weightKg:20,ageMonths:72},{weightKg:50,ageMonths:180}];
 for(const threshold of [m.weightMix?.thresholdKg,m.fixedDoseFromWeightKg,...(m.weightMixes||[]).map(x=>x.minWeightKg)].filter(x=>x>0)){
  for(const w of [threshold-0.01,threshold,threshold+0.01])if(w>=0.5&&w<=200)cases.push({weightKg:w,ageMonths:60});
 }
 for(const age of [m.minimumAgeMonths,m.minimumAgeMonthsExclusive,m.fixedDoseFromAgeMonths,m.preparationMinimumAgeMonths,...(m.tiers||[]).map(x=>x.maxAgeMonthsExclusive),...(r.doses||[]).flatMap(d=>(d.tiers||[]).map(t=>t.maxAgeMonthsExclusive))].filter(x=>Number.isFinite(x))){
  for(const a of [age-0.01,age,age+0.01])if(a>=0&&a<=216)cases.push({weightKg:10,ageMonths:a});
 }
 if(r.patientRules){for(const b of r.patientRules.bands.slice(0,-1))for(const value of [b.until-0.01,b.until,b.until+0.01]){if(r.patientRules.axis==='age'&&value>=0&&value<=216)cases.push({weightKg:10,ageMonths:value});if(r.patientRules.axis==='weight'&&value>=0.5&&value<=200)cases.push({weightKg:value,ageMonths:24});}}
 return cases.map(c=>{try{if(r.unassigned)return {...c,ok:true,status:'blocked',message:'Ampoule non affectée'};const v=calculateUsage(r,{...c,weightSource:'measured'});return {...c,ok:true,status:v.status,dose:v.dose,unit:v.unit,volume:v.volumeMl,rate:v.rateMlH,message:v.message,sequence:v.sequence};}catch(e){return {...c,ok:false,message:e.message};}});
}
const labels={name:'Nom',category:'Groupe',stockId:'Ampoule liée',assignedIds:'Usages affectés',doses:'Doses successives',tiers:'Tranches d’âge',checks:'Relecture',type:'Mode d’administration',amount:'Quantité par contenant',volumeMl:'Volume du contenant',unit:'Unité',presentation:'Ampoule',declaredConcentration:'Concentration déclarée',status:'État de relecture',reviewer:'Relecteur',sources:'Sources',questions:'Points à relire',notes:'Notes',route:'Voie',durationMinutes:'Durée',administrationNote:'Consigne d’administration',...modelFields};
export function differences(a,b,prefix=''){
 const changes=[];
 for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){
  const x=a?.[key],y=b?.[key],path=prefix?prefix+'.'+key:key;
  if(equal(x,y))continue;
  if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y))changes.push(...differences(x,y,path));
  else changes.push({path,label:labels[key]||key,before:x,after:y});
 }
 return changes;
}
const clinicalPart=d=>d&&({model:d.record.model,doses:d.record.doses,patientRules:d.record.patientRules,particulars:d.record.protocol.particulars,hideBelow:d.record.hideBelowAgeMonths,hideAbove:d.record.hideAboveAgeMonths,route:d.record.protocol.route,duration:d.record.protocol.durationMinutes,administrationNote:d.record.protocol.administrationNote,stock:d.stock,stockId:d.stockId});
export function prepareSave(s,d){
 const creating=!s.records.some(r=>r.id===d.record.id),before=creating?null:draftFor(s,d.record.id);
 if(d.stockId!==null&&!s.stocks[d.stockId])throw Error('Ampoule inconnue.');
 if(!equal(d.stock,d.stockId===null?emptyStock():s.stocks[d.stockId]))throw Error('Les caractéristiques des ampoules se modifient uniquement dans l’espace « Ampoules ».');
 if(d.stockId!==null&&d.stockId!==before?.stockId&&!compatibleStocks(s,d.record).some(([id])=>id===d.stockId))throw Error('L’ampoule n’est pas compatible avec l’unité du médicament.');
 const next=withDraft(s,d),changes=differences(before,d);
 if(!changes.length)throw Error('Aucune modification à enregistrer.');
 const stockChanged=false;
 const affected=[...new Set([d.record.id,...(stockChanged?linkedRecords(next,d.stockId).map(r=>r.id):[])])];
 const clinical=!equal(clinicalPart(before),clinicalPart(d));
 for(const id of affected){
  if(clinical||stockChanged){next.reviews[id].status='todo';next.reviews[id].reviewedAt=null;next.reviews[id].checks={posology:false,preparation:false,administration:false};}
  else if(next.reviews[id].status==='reviewed'){
   if(!next.reviews[id].reviewer.trim())throw Error('Indiquer le nom du relecteur.');
   if(!Object.values(next.reviews[id].checks).every(Boolean))throw Error('Cocher les trois points de relecture avant de marquer la fiche relue.');
   next.reviews[id].reviewedAt=new Date().toISOString();
  }
  next.revisions[id]=(next.revisions[id]||0)+1;
 }
 synchronizeTexts(next,affected);validateAtelier(next);
 const checks=affected.flatMap(id=>checkCases(next,id));
 if(checks.some(c=>!c.ok))throw Error('Un cas de contrôle échoue : '+checks.find(c=>!c.ok).message);
 return {next,affected,changes,checks,clinical,stockChanged,before,creating};
}
export function commitSave(s,d,prepared,kind='edit'){
 const p=prepared||prepareSave(s,d),next=p.next;
 const snapshot={records:s.records.filter(r=>p.affected.includes(r.id)).map(clone),links:Object.fromEntries(p.affected.map(id=>[id,s.links[id]])),stocks:clone(s.stocks),reviews:Object.fromEntries(p.affected.map(id=>[id,clone(s.reviews[id])]))};
 next.history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),kind:p.creating?'create':kind,recordId:d.record.id,name:d.record.name,affected:p.affected,stockIds:[],changes:p.changes,snapshot,checks:p.checks.length});
 next.history=next.history.slice(0,60);
 return next;
}
export function canRestore(s,event){
 if(event.kind==='references'){
  const index=s.history.findIndex(e=>e.id===event.id);
  return index>=0&&!s.history.slice(0,index).some(e=>e.kind==='references');
 }
 if(event.kind==='stock'||event.stockIds?.length){
  const stocks=new Set(event.stockIds||[]);
  return !s.history.slice(0,s.history.findIndex(e=>e.id===event.id)).some(e=>(e.stockIds||[]).some(id=>stocks.has(id))||e.affected.some(id=>event.affected.includes(id))||e.affected.some(id=>stocks.has(s.links[id])));
 }
 const stockIds=new Set(event.affected.map(id=>event.snapshot.links[id]));
 const protectedIds=new Set([...event.affected,...s.records.filter(r=>stockIds.has(s.links[r.id])).map(r=>r.id)]);
 return !s.history.slice(0,s.history.findIndex(e=>e.id===event.id)).some(e=>e.affected.some(id=>protectedIds.has(id)));
}
export function restoreEvent(s,event){
 if(!canRestore(s,event))throw Error('Une version plus récente concerne ces fiches. Restaurer d’abord la plus récente.');
 if(event.kind==='references')return commitReferences(s,event.snapshot.clinicalReferences,{restored:true});
 const next=clone(s);
 for(const id of event.affected.filter(id=>!event.snapshot.records.some(r=>r.id===id))){if(originals.has(id))throw Error('Une fiche d’origine ne peut pas être supprimée.');next.records=next.records.filter(r=>r.id!==id);delete next.links[id];delete next.reviews[id];delete next.revisions[id];}
 for(const r of event.snapshot.records){const index=next.records.findIndex(x=>x.id===r.id);if(index<0)next.records.push(clone(r));else next.records[index]=clone(r);next.links[r.id]=event.snapshot.links[r.id];next.reviews[r.id]=clone(event.snapshot.reviews[r.id]);next.reviews[r.id].status='todo';next.reviews[r.id].reviewedAt=null;next.reviews[r.id].checks={posology:false,preparation:false,administration:false};next.revisions[r.id]=(next.revisions[r.id]||0)+1;}
 const touched=new Set(event.stockIds||event.affected.map(id=>event.snapshot.links[id]).filter(Boolean));
 for(const key of touched){if(event.snapshot.stocks[key])next.stocks[key]=clone(event.snapshot.stocks[key]);else delete next.stocks[key];}
 synchronizeTexts(next,event.affected);validateAtelier(next);
 next.history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),kind:'restore',recordId:event.recordId,name:event.name,affected:event.affected,stockIds:[...touched],changes:[],snapshot:{records:s.records.filter(r=>event.affected.includes(r.id)).map(clone),links:clone(s.links),stocks:clone(s.stocks),reviews:clone(s.reviews)},checks:0});
 next.history=next.history.slice(0,60);return next;
}
export function validateState(s){
 if(s?.format!=='pedidose-atelier'||![1,2,3,4].includes(s.version)||s.sourceSha!==SOURCE_SHA)throw Error('Ce fichier n’est pas une sauvegarde compatible de l’atelier.');
 if(s.version<3){s=clone(s);for(const r of s.records||[])migrateUsage(r);for(const e of s.history||[])for(const r of e.snapshot?.records||[])migrateUsage(r);s.version=3;}
 if(s.version<4){s=clone(s);s.clinicalReferences=referenceDefaults();s.version=4;}
 if(!Array.isArray(s.records)||!s.stocks||!s.links||!s.reviews||!s.revisions||!Array.isArray(s.history))throw Error('Sauvegarde incomplète.');
 for(const r of s.records){if((s.links[r.id]!==null&&!s.stocks[s.links[r.id]])||!s.reviews[r.id])throw Error('Ampoule ou relecture manquante.');const v=s.reviews[r.id];if(!['todo','reviewing','reviewed'].includes(v.status)||typeof v.reviewer!=='string'||typeof v.sources!=='string'||typeof v.notes!=='string'||!v.checks||!Array.isArray(v.questions)||v.questions.some(q=>typeof q!=='string')||!['posology','preparation','administration'].every(k=>typeof v.checks[k]==='boolean')||!Number.isInteger(s.revisions[r.id]))throw Error('Relecture invalide.');}
 if(s.history.length>60)throw Error('Historique trop volumineux.');
 for(const e of s.history){
  const knownId=id=>originals.has(id)||typeof id==='string'&&/^custom-[a-zA-Z0-9-]{8,80}$/.test(id);
  if(typeof e.id!=='string'||typeof e.name!=='string'||!Number.isFinite(Date.parse(e.at))||!['edit','restore','stock','create','references'].includes(e.kind)||!(e.recordId===null||knownId(e.recordId))||!Array.isArray(e.affected)||e.affected.some(id=>!knownId(id))||!Array.isArray(e.changes)||!e.snapshot?.records||!e.snapshot.stocks||!e.snapshot.links||!e.snapshot.reviews)throw Error('Historique invalide.');
  if(e.kind==='references'){
   if(e.recordId!==null||e.affected.length||e.stockIds?.length||!Array.isArray(e.snapshot.records)||e.snapshot.records.length)throw Error('Historique des repères invalide.');
   validateReferences(e.snapshot.clinicalReferences);
  }
 }
 validateAtelier(s);return s;
}
export function loadState(storage){
 const value=storage.getItem(STORAGE_KEY);if(!value)return newState();
 return validateState(JSON.parse(value));
}
export function persistState(storage,s){const validated=validateState(s);storage.setItem(STORAGE_KEY,JSON.stringify(validated));}
