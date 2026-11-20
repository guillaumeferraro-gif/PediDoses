import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newState,draftFor,createMedicationDraft,commitSave,assignStock,compatibleStocks,linkedRecords,preview,restoreEvent,canRestore,clone,persistState,loadState} from '../dist/domain.js';
import {stockDraftFor,createStockDraft,commitStockSave} from '../dist/stocks.js';
import {recordsFromState,calculateAllRecords,buildMedicationSheet,quickMedicationDetails,withCurrentDose} from '../dist/visual/data.js';
import {defaultConfiguration,validateConfiguration} from '../dist/engine/protocol-config.js';
import {calculateRecordForPatient} from '../dist/engine/patient-calculator.js';
import {clearDoseSettings,changeDose} from '../dist/engine/dose-adjustments.js';
import {setPatientRule} from '../dist/patient-rules.js';
import {addDose} from '../dist/usage-options.js';
const context={weightKg:10,ageMonths:24,weightSource:'measured'};
const values=['dose','volumeMl','withdrawalMl','addMl','rateMlH','exactRateMlH','hourlyAmount','concentration','stockConcentration','maximumApplied','status'];
function extraStock(s){const a=createStockDraft();Object.assign(a.stock,{presentation:'Ampoule supplémentaire de test',amount:10,volumeMl:2,unit:'mg'});return {s:commitStockSave(s,a),a};}

test('affectation depuis le médicament : un seul lien partagé et aucun autre usage modifié',()=>{
 const init=extraStock(newState()),s=init.s,d=draftFor(s,'ketamine-analgesie'),old=d.stockId;assignStock(s,d,init.a.id);
 assert.equal(s.links[d.record.id],old);assert.equal(preview(s,d).result.dose,5);assert.equal(preview(s,d).result.volumeMl,10);
 const n=commitSave(s,d);assert.equal(n.links[d.record.id],init.a.id);assert.deepEqual(stockDraftFor(n,init.a.id).assignedIds,[d.record.id]);assert.equal(linkedRecords(n,old).some(r=>r.id===d.record.id),false);
 assert.equal(n.links['ketamine-intubation'],s.links['ketamine-intubation']);assert.deepEqual(n.stocks,s.stocks);
});
test('affectation inverse depuis Ampoules visible dans le médicament et les calculs',()=>{
 let {s,a}=extraStock(newState());a=stockDraftFor(s,a.id);a.assignedIds=['propofol'];s=commitStockSave(s,a);
 assert.equal(draftFor(s,'propofol').stockId,a.id);const rows=recordsFromState(s),r=rows.find(r=>r.id==='propofol');assert.equal(calculateAllRecords(rows,context).get(r.id).volumeMl,4);
});
test('une réaffectation incompatible ou une ampoule modifiée depuis le médicament est refusée',()=>{
 const s=newState(),d=draftFor(s,'propofol'),before=JSON.stringify(d),id=s.links['insuline-glucose'];
 assert.equal(compatibleStocks(s,d.record).some(([stock])=>stock===id),false);assert.throws(()=>assignStock(s,d,id),/compatible/);assert.equal(JSON.stringify(d),before);
 assignStock(s,d,s.links['ketamine-analgesie']);d.stock.amount*=2;assert.throws(()=>commitSave(s,d),/caractéristiques/);
});
test('création avec affectation immédiate : enregistrable et visible sans autre étape',()=>{
 const s=newState(),d=createMedicationDraft();d.record.name='Usage de test';d.record.model.unit='mg';d.record.model.coefficient=1;assignStock(s,d,s.links.propofol);
 const n=commitSave(s,d),record=recordsFromState(n).find(r=>r.id===d.record.id);assert.equal(calculateAllRecords([record],context).get(record.id).volumeMl,1);assert.doesNotThrow(()=>buildMedicationSheet(record));
 assert.ok(stockDraftFor(n,s.links.propofol).assignedIds.includes(d.record.id));
});
test('retirer une ampoule depuis le médicament bloque le calcul principal sans concentration de secours',()=>{
 const s=newState(),d=draftFor(s,'propofol');assignStock(s,d,null);const n=commitSave(s,d);const r=recordsFromState(n).find(r=>r.id===d.record.id),result=calculateAllRecords([r],context).get(r.id);
 assert.equal(result.status,'blocked');assert.equal(result.volumeMl,null);assert.equal(stockDraftFor(n,s.links.propofol).assignedIds.includes(d.record.id),false);
});
test('annuler une réaffectation ne réécrit pas les caractéristiques d’une ampoule',()=>{
 let {s,a}=extraStock(newState());const d=draftFor(s,'atropine'),old=d.stockId;assignStock(s,d,a.id);s=commitSave(s,d);const event=s.history[0];
 const previous=stockDraftFor(s,old);previous.stock.comment='Annotation indépendante après réaffectation';s=commitStockSave(s,previous);assert.equal(canRestore(s,event),true);
 s=restoreEvent(s,event);assert.equal(s.links.atropine,old);assert.equal(s.stocks[old].comment,previous.stock.comment);
});
test('visualisation : les 65 fiches conservent leurs résultats pour quatre patients',()=>{
 clearDoseSettings({notify:false});const records=recordsFromState(newState()),originals=validateConfiguration(defaultConfiguration());
 for(const c of [{weightKg:3,ageMonths:0},{weightKg:10,ageMonths:24},{weightKg:20,ageMonths:72},{weightKg:50,ageMonths:180}]){
  const ctx={...c,weightSource:'measured'},results=calculateAllRecords(records.map(r=>withCurrentDose(r,ctx)),ctx);
  for(const original of originals){const expected=calculateRecordForPatient(original,ctx),actual=results.get(original.id);for(const key of values)assert.deepEqual(actual[key],expected[key],original.id+' '+key);if(expected.secondDose)assert.equal(actual.secondDose.dose,expected.secondDose.dose);}
 }
});
test('visualisation : trois doses, seuil commun et tableaux de toutes les tranches',()=>{
 let s=newState();const d=draftFor(s,'triphosadenine');addDose(d.record);d.record.doses[2].coefficient=3;setPatientRule(d.record,'dose',true);d.record.patientRules.bands[0].until=12;d.record.patientRules.bands[1].doses.forEach((v,i)=>v.coefficient=(i+1)*2);s=commitSave(s,d);
 const r=recordsFromState(s).find(r=>r.id===d.record.id),effective=withCurrentDose(r,context),result=calculateAllRecords([effective],context).get(r.id),sheet=buildMedicationSheet(r);
 assert.deepEqual(result.sequence.map(x=>x.dose),[10,20,60]);assert.equal(sheet.doseRows.length,6);assert.ok(sheet.doseRows.some(x=>x.condition.includes('Dose 3')&&x.condition.includes('12 mois')));
 const details=quickMedicationDetails(effective,result,context,sheet);assert.match(details.find(x=>x.key==='posology').value,/Dose 3/);assert.match(details.find(x=>x.key==='administration').value,/IV/);
});
test('visualisation : âge absent bloque le palier et préparation correcte au seuil',()=>{
 let s=newState();const d=draftFor(s,'propofol');setPatientRule(d.record,'preparation',true);d.record.patientRules.axis='age';d.record.patientRules.bands[0].until=12;d.record.patientRules.bands[1].preparation={mix:{takeMl:1,addMl:9},diluent:'Diluant test'};s=commitSave(s,d);
 const r=recordsFromState(s).find(x=>x.id==='propofol'),ctx={...context,ageMonths:null};assert.equal(calculateAllRecords([withCurrentDose(r,ctx)],ctx).get(r.id).status,'blocked');
 const effective=withCurrentDose(r,{...context,ageMonths:12}),result=calculateAllRecords([effective],{...context,ageMonths:12}).get(r.id);assert.equal(result.volumeMl,20);assert.match(quickMedicationDetails(effective,result,context,buildMedicationSheet(r)).find(x=>x.key==='diluent').value,/Diluant test/);
});
test('réglage de dose en visualisation : débit recalculé sans modifier la fiche sauvegardée',()=>{
 clearDoseSettings({notify:false});const s=newState(),record=recordsFromState(s).find(r=>r.id==='adrenaline-ivc'),before=calculateAllRecords([record],context).get(record.id);
 changeDose(record,context,1);const after=calculateAllRecords([withCurrentDose(record,context)],context).get(record.id);assert.ok(after.hourlyAmount>before.hourlyAmount);assert.equal(s.records.find(r=>r.id===record.id).model.coefficient,0.1);clearDoseSettings({notify:false});
});
test('la visualisation ne lit que les versions enregistrées, y compris relecture et nouveaux noms',()=>{
 const s=newState(),d=draftFor(s,'propofol');d.record.name='Nom de test';d.review.questions=['Question visible'];d.review.sources='Source de test';
 assert.notEqual(recordsFromState(s).find(r=>r.id==='propofol').name,d.record.name);const saved=commitSave(s,d),mem=new Map(),storage={setItem:(k,v)=>mem.set(k,v),getItem:k=>mem.get(k)};persistState(storage,saved);
 const row=recordsFromState(loadState(storage)).find(r=>r.id==='propofol');assert.equal(row.name,'Nom de test');assert.ok(buildMedicationSheet(row).questions.includes('Question visible'));assert.equal(row.review.sources,'Source de test');
});
test('la page principale n’a plus les deux onglets et garde tous ses identifiants uniques',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(!html.includes('id="quick-tab"'));assert.ok(!html.includes('id="ampoules-tab"'));assert.match(html,/<section id="administration-screen"[^>]*hidden>/);assert.match(html,/id="open-administration"/);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
