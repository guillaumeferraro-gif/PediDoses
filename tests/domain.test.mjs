import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,draftFor,preview,compileRecord,configuration,prepareSave,commitSave,restoreEvent,canRestore,changePrep,posologyText,preparationText,linkedRecords,checkCases,persistState,loadState,STORAGE_KEY,validateState,clone} from '../dist/domain.js';
import {defaultConfiguration,validateConfiguration,convertDoseUnit,convertDosePeriod} from '../dist/engine/protocol-config.js';
import {calculateRecordForPatient} from '../dist/engine/patient-calculator.js';
import {calculateUsage,setMultipleDoses,addDose,setAgeDoses,setContinuous,convertUsageUnit,convertUsagePeriod} from '../dist/usage-options.js';
import {stockDraftFor,prepareStockSave,commitStockSave,createStockDraft} from '../dist/stocks.js';
const samples=[{weightKg:3,ageMonths:0},{weightKg:10,ageMonths:24},{weightKg:20,ageMonths:72},{weightKg:50,ageMonths:180}];
const values=['dose','volumeMl','withdrawalMl','addMl','rateMlH','exactRateMlH','hourlyAmount','concentration','stockConcentration','maximumApplied','status'];

test('65 fiches : les résultats de départ correspondent au moteur PediDose copié',()=>{
 const state=newState(),source=validateConfiguration(defaultConfiguration());assert.equal(state.records.length,65);
 for(const original of source)for(const c of samples){
  const context={...c,weightSource:'measured'},a=calculateRecordForPatient(original,context),b=calculateUsage(compileRecord(state,original.id),context);
  for(const key of values)assert.deepEqual(b[key],a[key],original.id+' '+key);
  if(a.secondDose)for(const key of values)assert.deepEqual(b.secondDose[key],a.secondDose[key],original.id+' seconde dose '+key);
 }
});
test('une modification simple se limite à la fiche sélectionnée et génère ses textes',()=>{
 const s=newState(),d=draftFor(s,'magnesium');d.record.model.coefficient=40;
 const p=prepareSave(s,d),n=commitSave(s,d,p);
 assert.deepEqual(p.affected,['magnesium']);assert.match(n.records.find(r=>r.id==='magnesium').protocol.posology,/40 mg\/kg/);
 for(const r of s.records)if(r.id!=='magnesium')assert.deepEqual(n.records.find(x=>x.id===r.id),r);
 assert.equal(n.reviews.magnesium.status,'todo');assert.equal(s.revisions.magnesium,1);assert.equal(n.revisions.magnesium,2);
 assert.equal(preview(n,draftFor(n,'magnesium')).result.dose,400);
});
test('une présentation partagée modifie les volumes des deux usages sans modifier leurs doses',()=>{
 const s=newState(),d=stockDraftFor(s,s.links['ketamine-analgesie']),ids=linkedRecords(s,d.id).map(r=>r.id);
 assert.deepEqual(ids,['ketamine-analgesie','ketamine-intubation']);
 const doses=ids.map(id=>preview(s,draftFor(s,id)).result.dose);
 d.stock.amount=d.stock.amount*2;const p=prepareStockSave(s,d),n=commitStockSave(s,d,p);assert.equal(p.affected.length,2);
 for(const [i,id]of ids.entries()){assert.equal(preview(n,draftFor(n,id)).result.dose,doses[i]);assert.equal(n.reviews[id].status,'todo');assert.equal(n.revisions[id],2);}
 assert.equal(preview(n,draftFor(n,ids[0])).result.volumeMl,preview(s,draftFor(s,ids[0])).result.volumeMl/2);
});
test('une nouvelle ampoule peut être affectée à un seul usage',()=>{
 const s=newState(),d=stockDraftFor(s,s.links['ketamine-analgesie']);d.id='stock-test-detached';d.assignedIds=['ketamine-analgesie'];d.stock.amount*=2;
 const p=prepareStockSave(s,d),n=commitStockSave(s,d,p);assert.deepEqual(p.affected,['ketamine-analgesie']);
 assert.equal(preview(n,draftFor(n,'ketamine-intubation')).result.volumeMl,preview(s,draftFor(s,'ketamine-intubation')).result.volumeMl);
});
test('la restauration d’une ampoule restaure les deux usages et conserve une trace',()=>{
 const s=newState(),d=stockDraftFor(s,s.links['ketamine-analgesie']);d.stock.amount*=2;
 const n=commitStockSave(s,d),restored=restoreEvent(n,n.history[0]);
 for(const id of ['ketamine-analgesie','ketamine-intubation'])assert.equal(preview(restored,draftFor(restored,id)).result.volumeMl,preview(s,draftFor(s,id)).result.volumeMl);
 assert.equal(restored.history[0].kind,'restore');assert.equal(restored.history.length,2);
});
test('la restauration refuse d’écraser une modification plus récente du même usage',()=>{
 let s=newState();let d=stockDraftFor(s,s.links['ketamine-analgesie']);d.stock.amount*=2;s=commitStockSave(s,d);const stockEvent=s.history[0];
 const usage=draftFor(s,'ketamine-analgesie');usage.record.model.coefficient=0.3;s=commitSave(s,usage);
 assert.equal(canRestore(s,stockEvent),false);assert.throws(()=>restoreEvent(s,stockEvent),/récente/);
});
test('les incohérences ne peuvent pas être enregistrées',()=>{
 const s=newState(),before=JSON.stringify(s),d=draftFor(s,'magnesium');d.record.model.finalVolumeMl=0.01;
 assert.throws(()=>prepareSave(s,d),/dépasse|volume/i);assert.equal(JSON.stringify(s),before);
 d.record.model.coefficient=NaN;assert.throws(()=>prepareSave(s,d));assert.equal(JSON.stringify(s),before);
});
test('relecture : identité et contrôles requis, puis invalidation lors d’une modification',()=>{
 let s=newState(),d=draftFor(s,'magnesium');d.review.status='reviewed';assert.throws(()=>prepareSave(s,d),/relecteur/);
 d.review.reviewer='Essai';assert.throws(()=>prepareSave(s,d),/trois/);d.review.checks={posology:true,preparation:true,administration:true};s=commitSave(s,d);
 assert.equal(s.reviews.magnesium.status,'reviewed');assert.ok(s.reviews.magnesium.reviewedAt);
 d=draftFor(s,'magnesium');d.record.model.coefficient=40;s=commitSave(s,d);assert.equal(s.reviews.magnesium.status,'todo');assert.equal(s.reviews.magnesium.checks.posology,false);
});
test('les unités et périodes préservent la dose physique et le débit',()=>{
 const s=newState(),d=draftFor(s,'adrenaline-ivc'),before=preview(s,d).result;
 convertDoseUnit(d.record,'mg');convertDosePeriod(d.record,60);const after=preview(s,d).result;
 assert.ok(Math.abs(after.rateMlH-before.rateMlH)<1e-10);assert.match(posologyText(d.record),/mg\/kg\/h/);
});
test('méthodes de préparation exclusives, non renseigné distinct de sans dilution',()=>{
 const s=newState(),d=draftFor(s,'propofol');
 changePrep(d,'fixed-volume');assert.equal(d.record.model.finalVolumeMl,50);assert.match(preparationText(d.record),/50 mL au total/);
 changePrep(d,'concentration');assert.equal(d.record.model.finalVolumeMl,undefined);assert.equal(d.record.model.preparationMode,undefined);
 changePrep(d,'unknown');assert.equal(preview(s,d).result.volumeMl,null);
 changePrep(d,'none');assert.equal(preview(s,d).result.volumeMl,2);
});
test('plus de deux paliers sont décrits avec leurs propres bornes',()=>{
 const s=newState(),d=draftFor(s,'ketamine-intubation');delete d.record.patientRules;d.record.model.tiers=[{maxAgeMonthsExclusive:12,coefficient:1},{maxAgeMonthsExclusive:36,coefficient:2},{coefficient:3}];
 const t=posologyText(d.record);assert.match(t,/12 à moins de 36 mois/);assert.match(t,/dès 36 mois/);
 assert.equal(preview(s,d,{weight:'10',age:'36',ageUnit:'months',bag:''}).result.dose,30);
 assert.ok(checkCases(commitSave(s,d),d.record.id).length>4);
});
test('les paliers triphosadénine, magnésium et âge restent présents',()=>{
 const s=newState(),trip=preview(s,draftFor(s,'triphosadenine'));assert.equal(trip.result.secondDose.dose,20);
 const mag=preview(s,draftFor(s,'magnesium'));assert.equal(mag.result.volumeMl,50);assert.ok(Math.abs(mag.result.withdrawalMl+mag.result.addMl-50)<1e-10);
 const p=preview(s,draftFor(s,'phenobarbital'),{weight:'3',age:'0.99',ageUnit:'months'});assert.equal(p.result.dose,60);
 const p2=preview(s,draftFor(s,'phenobarbital'),{weight:'3',age:'1',ageUnit:'months'});assert.equal(p2.result.dose,45);
});
test('volume des poches requis, puis plafonnement ; saisie patient invalide bloquée',()=>{
 const s=newState(),d=draftFor(s,'cgr');assert.equal(preview(s,d).result.volumeMl,null);
 assert.equal(preview(s,d,{weight:'10',age:'24',ageUnit:'months',bag:'60'}).result.volumeMl,60);
 assert.throws(()=>preview(s,d,{weight:'abc',age:'24',ageUnit:'months',bag:''}));
});
test('persistance indépendante, import validé et erreur de stockage explicite',()=>{
 const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},s=newState();persistState(storage,s);
 assert.deepEqual(loadState(storage),s);assert.deepEqual([...mem.keys()],[STORAGE_KEY]);
 assert.throws(()=>persistState({setItem:()=>{throw Error('quota');}},s),/quota/);
 const bad=clone(s);bad.records.pop();assert.throws(()=>validateState(bad));
 const bad2=clone(s);bad2.reviews.magnesium.checks={};assert.throws(()=>validateState(bad2));
 const bad3=clone(s);bad3.history=[{}];assert.throws(()=>validateState(bad3));
});

test('la fiche médicament ne peut pas modifier les caractéristiques d’une ampoule',()=>{
 const s=newState(),d=draftFor(s,'ketamine-analgesie');d.stock.amount*=2;
 assert.throws(()=>prepareSave(s,d),/espace « Ampoules »/);
 const d2=draftFor(s,'ketamine-analgesie');d2.stockId=s.links.propofol;
 assert.throws(()=>prepareSave(s,d2),/espace « Ampoules »/);
});
test('retirer une affectation suspend les calculs ; une nouvelle affectation les rétablit',()=>{
 let s=newState();const id='adrenaline-ivc',stockId=s.links[id];let a=stockDraftFor(s,stockId);a.assignedIds=a.assignedIds.filter(x=>x!==id);
 s=commitStockSave(s,a);assert.equal(s.links[id],null);assert.equal(preview(s,draftFor(s,id)).result.status,'blocked');
 a=stockDraftFor(s,stockId);a.assignedIds.push(id);s=commitStockSave(s,a);assert.equal(preview(s,draftFor(s,id)).result.status,'calculated');
});
test('une ampoule indépendante peut être créée sans usage et restaurée',()=>{
 const s=newState(),d=createStockDraft();Object.assign(d.stock,{presentation:'Ampoule essai',amount:10,volumeMl:2,unit:'mg'});
 const n=commitStockSave(s,d);assert.equal(Object.values(n.links).includes(d.id),false);assert.ok(n.stocks[d.id]);
 const restored=restoreEvent(n,n.history[0]);assert.equal(restored.stocks[d.id],undefined);assert.equal(restored.records.length,65);
});
test('une affectation avec des unités incompatibles est refusée sans mutation',()=>{
 const s=newState(),before=JSON.stringify(s),d=stockDraftFor(s,s.links['insuline-glucose']);d.assignedIds.push('ketamine-analgesie');d.stock.amount=100;d.stock.volumeMl=1;
 assert.throws(()=>prepareStockSave(s,d));assert.equal(JSON.stringify(s),before);
});
test('trois doses successives ont des valeurs et plafonds distincts',()=>{
 const s=newState(),d=draftFor(s,'triphosadenine');addDose(d.record);d.record.doses[2].coefficient=3;d.record.doses[2].maximumDose=25;
 const p=preview(s,d);assert.deepEqual(p.result.sequence.map(x=>x.dose),[10,20,25]);assert.deepEqual(p.result.sequence.map(x=>x.volumeMl),[1,2,2.5]);
 assert.match(posologyText(d.record),/Dose 3 : 3 mg\/kg · max. 25 mg/);
 assert.equal(commitSave(s,d).records.find(r=>r.id==='triphosadenine').doses.length,3);
});
test('chaque nouvelle dose doit être renseignée et toutes les doses sont validées',()=>{
 const s=newState(),d=draftFor(s,'propofol');setMultipleDoses(d.record,true);
 assert.throws(()=>prepareSave(s,d));
 d.record.doses[1].coefficient=1;addDose(d.record);d.record.doses[2].coefficient=-4;
 assert.throws(()=>prepareSave(s,d));d.record.doses[2].coefficient=0.5;assert.doesNotThrow(()=>prepareSave(s,d));
});
test('l’âge peut définir une posologie différente pour chaque dose successive',()=>{
 const s=newState(),d=draftFor(s,'triphosadenine');setAgeDoses(d.record,true);
 d.record.doses[0].tiers=[{maxAgeMonthsExclusive:12,coefficient:0.5},{coefficient:1}];
 d.record.doses[1].tiers=[{maxAgeMonthsExclusive:12,coefficient:1},{coefficient:2}];
 const before=preview(s,d,{weight:'3',age:'11.99',ageUnit:'months'});
 const at=preview(s,d,{weight:'3',age:'12',ageUnit:'months'});
 assert.deepEqual(before.result.sequence.map(x=>x.dose),[1.5,3]);assert.deepEqual(at.result.sequence.map(x=>x.dose),[3,6]);
 assert.match(posologyText(d.record),/Dose 2/);
});
test('conversion des unités : toutes les doses, plafonds et tranches sont convertis ensemble',()=>{
 const s=newState(),d=draftFor(s,'triphosadenine');addDose(d.record);d.record.doses[2].coefficient=3;d.record.doses[2].maximumDose=25;
 const before=preview(s,d).result.sequence;convertUsageUnit(d.record,'mcg');const after=preview(s,d).result.sequence;
 for(let i=0;i<3;i++){assert.equal(after[i].dose,before[i].dose*1000);assert.equal(after[i].volumeMl,before[i].volumeMl);}
});
test('passer en continu exige une nouvelle posologie au lieu de réinterpréter un bolus',()=>{
 const s=newState(),d=draftFor(s,'propofol');setContinuous(d.record,true);
 assert.equal(d.record.model.coefficient,null);assert.equal(d.record.model.type,'infusion');assert.equal(d.record.protocol.route,'IVSE');
 assert.throws(()=>prepareSave(s,d));d.record.model.coefficient=0.2;
 assert.equal(preview(s,d).result.rateMlH,0.2);assert.doesNotThrow(()=>prepareSave(s,d));
});
test('continu et âge se combinent ; conversion minute/heure conserve tous les paliers',()=>{
 const s=newState(),d=draftFor(s,'adrenaline-ivc');setAgeDoses(d.record,true);
 d.record.model.tiers=[{maxAgeMonthsExclusive:12,coefficient:0.1},{coefficient:0.2}];
 const before=preview(s,d).result.rateMlH;convertUsagePeriod(d.record,60);assert.equal(preview(s,d).result.rateMlH,before);
 assert.equal(d.record.model.tiers[1].coefficient,12);
});
test('continu et doses successives ne peuvent pas se mélanger',()=>{
 const s=newState(),d=draftFor(s,'triphosadenine');assert.throws(()=>setContinuous(d.record,true),/sans doses successives/);
 const c=draftFor(s,'adrenaline-ivc');assert.throws(()=>setMultipleDoses(c.record,true),/ponctuel/);
});
test('les sauvegardes v1 migrent sans effacer les essais ni les deux doses',()=>{
 const s=newState();s.version=1;
 const r=s.records.find(r=>r.id==='triphosadenine');r.model.coefficient=1;r.model.maximumDose=10;r.model.secondCoefficient=2;r.model.secondMaximumDose=20;delete r.doses;
 s.records.find(r=>r.id==='magnesium').model.coefficient=42;
 const migrated=validateState(s);assert.equal(migrated.version,4);assert.equal(migrated.records.find(r=>r.id==='magnesium').model.coefficient,42);
 assert.deepEqual(preview(migrated,draftFor(migrated,'triphosadenine')).result.sequence.map(x=>x.dose),[10,20]);
});
test('une ampoule non affectée corrompue est refusée à l’import',()=>{
 const s=newState();s.stocks['orphan']={...s.stocks[s.links.propofol],volumeMl:-1};
 assert.throws(()=>validateState(s),/positifs/);
});
