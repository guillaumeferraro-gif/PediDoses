import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,draftFor,preview,prepareSave,commitSave,createMedicationDraft,restoreEvent,canRestore,validateState,persistState,loadState,clone,posologyText,preparationText,validateAtelier,checkCases,STORAGE_KEY} from '../dist/domain.js';
import {setPatientRule,addBand,removeBand,changeRuleAxis,bandLabel,migratePatientRules} from '../dist/patient-rules.js';
import {setMultipleDoses,addDose,removeDose,setContinuous,convertUsageUnit,convertUsagePeriod} from '../dist/usage-options.js';
import {createStockDraft,commitStockSave,stockDraftFor} from '../dist/stocks.js';
const patient=(weight,age=24)=>({weight:String(weight),age:String(age),ageUnit:'months',bag:''});
function rulesDraft(){const s=newState(),d=draftFor(s,'propofol');setPatientRule(d.record,'dose',true);d.record.patientRules.bands[0].until=12;d.record.patientRules.bands[1].doses[0].coefficient=1;return {s,d};}

test('3 tranches de poids : bornes exclues, dernière tranche incluse et plafonds distincts',()=>{
 const {s,d}=rulesDraft(),r=d.record;changeRuleAxis(r,'weight');r.patientRules.bands[0].until=10;addBand(r);r.patientRules.bands[1].until=20;r.patientRules.bands[1].doses[0]={coefficient:1,maximumDose:15};r.patientRules.bands[2].doses[0]={coefficient:0.5,maximumDose:12};
 for(const [w,expected]of [[9.99,19.98],[10,10],[19.99,15],[20,10],[24,12],[50,12]])assert.ok(Math.abs(preview(s,d,patient(w)).result.dose-expected)<1e-9);
 assert.match(posologyText(r),/De 10 à moins de 20 kg/);assert.equal(bandLabel(r,2),'À partir de 20 kg');assert.ok(checkCases(commitSave(s,d),r.id).length>4);
});
test('préparation et dose changent ensemble au même seuil d’âge',()=>{
 const {s,d}=rulesDraft(),r=d.record;setPatientRule(r,'preparation',true);r.patientRules.bands[1].preparation={mix:{takeMl:1,addMl:9},diluent:'Diluant de test'};
 const below=preview(s,d,patient(10,11.99)),at=preview(s,d,patient(10,12));
 assert.equal(below.result.dose,20);assert.equal(below.result.volumeMl,2);assert.equal(at.result.dose,10);assert.equal(at.result.volumeMl,10);
 assert.match(preparationText(r),/À partir de 12 mois/);assert.throws(()=>preview(s,d,{weight:'10',age:''}),/Âge nécessaire/);
});
test('préparation seule : ajout de plusieurs seuils sans changer la posologie',()=>{
 const s=newState(),d=draftFor(s,'propofol'),r=d.record;setPatientRule(r,'preparation',true);r.patientRules.bands[0].until=10;addBand(r);r.patientRules.bands[1].until=20;r.patientRules.bands[1].preparation={finalConcentration:5};r.patientRules.bands[2].preparation={finalConcentration:2};
 for(const [w,volume]of [[9,1.8],[10,4],[20,20]]){const v=preview(s,d,patient(w)).result;assert.equal(v.dose,2*w);assert.equal(v.volumeMl,volume);}
 removeBand(r,1);assert.equal(r.patientRules.bands.length,2);assert.equal(r.patientRules.bands[1].until,undefined);assert.equal(preview(s,d,patient(10)).result.volumeMl,10);
});
test('seuils incomplets, répétés ou inversés refusés atomiquement',()=>{
 const {s,d}=rulesDraft(),initial=JSON.stringify(s);addBand(d.record);assert.throws(()=>prepareSave(s,d),/seuils/);
 d.record.patientRules.bands[1].until=12;assert.throws(()=>prepareSave(s,d),/croissants/);
 d.record.patientRules.bands[1].until=24;assert.throws(()=>prepareSave(s,d),/dose positive/);
 assert.equal(JSON.stringify(s),initial);
});
test('une préparation invalide dans la dernière tranche bloque l’enregistrement',()=>{
 const {s,d}=rulesDraft();setPatientRule(d.record,'preparation',true);d.record.patientRules.bands[1].preparation={mix:{takeMl:1,addMl:-1}};
 assert.throws(()=>prepareSave(s,d),/diluant/);
});
test('la validation de préparation utilise les poids de la tranche applicable',()=>{
 const s=newState(),d=draftFor(s,'propofol');setPatientRule(d.record,'preparation',true);d.record.patientRules.bands[0].until=10;
 Object.assign(d.record.model,{mix:null,preparationMode:'fixed-volume',finalVolumeMl:2});d.record.patientRules.bands[1].preparation={mix:null};
 assert.doesNotThrow(()=>prepareSave(s,d));assert.equal(preview(s,d,patient(9.99)).result.volumeMl,2);assert.equal(preview(s,d,patient(20)).result.volumeMl,4);
});
test('doses successives combinées aux tranches : chaque dose est indépendante',()=>{
 const {s,d}=rulesDraft(),r=d.record;setMultipleDoses(r,true);r.doses[1].coefficient=3;r.patientRules.bands[1].doses[1].coefficient=4;addDose(r);r.doses[2].coefficient=5;r.patientRules.bands[1].doses[2].coefficient=6;
 assert.deepEqual(preview(s,d,patient(10,11)).result.sequence.map(v=>v.dose),[20,30,50]);assert.deepEqual(preview(s,d,patient(10,12)).result.sequence.map(v=>v.dose),[10,40,60]);
 removeDose(r,1);assert.deepEqual(preview(s,d,patient(10,12)).result.sequence.map(v=>v.dose),[10,60]);
 setMultipleDoses(r,false);assert.equal(preview(s,d,patient(10,12)).result.dose,10);
});
test('conversion d’unité sur toutes les tranches et concentrations préserve les volumes',()=>{
 const {s,d}=rulesDraft(),r=d.record;setPatientRule(r,'preparation',true);r.patientRules.bands[1].preparation={finalConcentration:2};
 const before=preview(s,d,patient(10,12)).result;convertUsageUnit(r,'mcg');const after=preview(s,d,patient(10,12)).result;
 assert.equal(after.dose,before.dose*1000);assert.equal(after.volumeMl,before.volumeMl);assert.equal(r.patientRules.bands[1].preparation.finalConcentration,2000);
});
test('continu : nouvelles doses requises dans chaque tranche et conversion de période',()=>{
 const {s,d}=rulesDraft(),r=d.record;setContinuous(r,true);assert.equal(r.model.coefficient,null);assert.equal(r.patientRules.bands[1].doses[0].coefficient,null);assert.throws(()=>prepareSave(s,d));
 r.model.coefficient=0.2;r.patientRules.bands[1].doses[0].coefficient=0.4;const before=preview(s,d,patient(10,12)).result.rateMlH;convertUsagePeriod(r,1);assert.equal(preview(s,d,patient(10,12)).result.rateMlH,before);
});
test('désactiver les variations de dose garde les seuils de préparation',()=>{
 const {s,d}=rulesDraft(),r=d.record;setPatientRule(r,'preparation',true);setPatientRule(r,'dose',false);assert.ok(r.patientRules.preparation);assert.equal(r.patientRules.bands[1].doses,undefined);assert.equal(preview(s,d,patient(10,12)).result.dose,20);
 setPatientRule(r,'preparation',false);assert.equal(r.patientRules,undefined);
});
test('changer âge vers poids exige la saisie de nouveaux seuils',()=>{
 const {s,d}=rulesDraft();changeRuleAxis(d.record,'weight');assert.equal(d.record.patientRules.bands[0].until,null);assert.throws(()=>prepareSave(s,d),/seuils/);
});
test('création, affectation, calcul, modification, export et réimport sans code',()=>{
 let s=newState();const d=createMedicationDraft();assert.throws(()=>prepareSave(s,d));d.record.name='Médicament d’essai';d.record.model.unit='mg';d.record.model.coefficient=2;d.record.model.maximumDose=15;
 s=commitSave(s,d);const id=d.record.id;assert.equal(s.records.length,66);assert.equal(s.revisions[id],1);assert.equal(s.history[0].kind,'create');assert.equal(preview(s,draftFor(s,id)).result.status,'blocked');
 const a=createStockDraft();Object.assign(a.stock,{presentation:'Ampoule d’essai',amount:10,unit:'mg',volumeMl:2});a.assignedIds=[id];s=commitStockSave(s,a);
 assert.equal(preview(s,draftFor(s,id)).result.dose,15);assert.equal(preview(s,draftFor(s,id)).result.volumeMl,3);
 const edit=draftFor(s,id);edit.record.name='Usage renommé';s=commitSave(s,edit);
 const mem=new Map(),storage={setItem:(k,v)=>mem.set(k,v),getItem:k=>mem.get(k)};persistState(storage,s);const loaded=loadState(storage);assert.equal(loaded.records.at(-1).name,'Usage renommé');assert.equal(preview(loaded,draftFor(loaded,id)).result.volumeMl,3);
 assert.equal(mem.has(STORAGE_KEY),true);
});
test('annuler puis rétablir la création conserve le référentiel d’origine',()=>{
 const d=createMedicationDraft();d.record.name='Test création';d.record.model.unit='mg';d.record.model.coefficient=1;let s=commitSave(newState(),d);const created=s.history[0];s=restoreEvent(s,created);assert.equal(s.records.length,65);assert.equal(s.links[d.record.id],undefined);assert.doesNotThrow(()=>validateState(s));
 s=restoreEvent(s,s.history[0]);assert.equal(s.records.length,66);assert.equal(s.records.at(-1).id,d.record.id);assert.doesNotThrow(()=>validateState(s));
 const a=createStockDraft();Object.assign(a.stock,{presentation:'Test',amount:10,unit:'mg',volumeMl:2});a.assignedIds=[d.record.id];s=commitStockSave(s,a);assert.equal(canRestore(s,s.history.find(e=>e.id===created.id)),false);
});
test('les essais v2 reprennent les seuils existants sans changer les doses ni volumes',()=>{
 const s=newState();s.version=2;const r=s.records.find(r=>r.id==='ketamine-analgesie');delete r.patientRules;r.model.weightMix={thresholdKg:15,below:{takeMl:1,addMl:9},atOrAbove:null};
 const n=validateState(s);assert.equal(n.version,4);const migrated=n.records.find(x=>x.id===r.id);assert.equal(migrated.patientRules.axis,'weight');
 assert.equal(preview(n,draftFor(n,r.id),patient(10)).result.volumeMl,1);assert.equal(preview(n,draftFor(n,r.id),patient(15)).result.volumeMl,0.15);
});
test('les anciens essais combinant âge et poids indépendants restent calculables',()=>{
 const s=newState();s.version=2;const r=s.records.find(r=>r.id==='propofol');r.model.tiers=[{maxAgeMonthsExclusive:12,coefficient:2},{coefficient:1}];r.model.weightMix={thresholdKg:10,below:{takeMl:1,addMl:9},atOrAbove:null};
 const n=validateState(s),d=draftFor(n,r.id);assert.equal(d.record.patientRules,undefined);assert.equal(preview(n,d,patient(5,12)).result.volumeMl,5);assert.equal(preview(n,d,patient(10,12)).result.volumeMl,1);
});
test('les conditions et les seuils modifiés réinitialisent la relecture',()=>{
 let s=newState(),d=draftFor(s,'propofol');d.review.status='reviewed';d.review.reviewer='Test';d.review.checks={posology:true,preparation:true,administration:true};s=commitSave(s,d);
 d=draftFor(s,'propofol');d.record.protocol.particulars=['Condition ajoutée'];s=commitSave(s,d);assert.equal(s.reviews.propofol.status,'todo');
});
test('essai des pas + / − : calcul temporaire, bornes respectées, dose enregistrée intacte',()=>{
 const s=newState(),d=draftFor(s,'nicardipine-charge');d.record.model.adjustmentStatus='enabled';d.record.model.doseStep=2;
 assert.equal(preview(s,d,patient(10),1).result.dose,120);assert.equal(preview(s,d,patient(10),5).result.dose,200);assert.throws(()=>preview(s,d,patient(10),6),/limites/);assert.throws(()=>preview(s,d,patient(10),-1),/limites/);
 assert.equal(d.record.model.coefficient,10);assert.equal(preview(s,d,patient(10)).result.dose,100);
});
test('une création accepte le choix initial mg, UI ou mmol sans conversion entre dimensions',()=>{
 for(const unit of ['mg','UI','mmol']){const d=createMedicationDraft();assert.equal(d.record.model.unit,'');convertUsageUnit(d.record,unit);d.record.name='Test unité '+unit;d.record.model.coefficient=1;assert.doesNotThrow(()=>prepareSave(newState(),d));assert.equal(d.record.model.unit,unit);}
});
