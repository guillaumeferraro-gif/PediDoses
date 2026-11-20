import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,clone,validateState,configuration,commitSave,draftFor,loadState,persistState,restoreEvent,canRestore,STORAGE_KEY} from '../dist/domain.js';
import {REFERENCE_FIELDS,TUBE_SIZES,referenceDefaults,validateReferences,calculateReferences,referenceCards,commitReferences} from '../dist/clinical-references.js';
import {resolvePatientContext} from '../dist/engine/patient-calculator.js';
import {recordsFromState,calculateAllRecords,withCurrentDose} from '../dist/visual/data.js';
import {buildPrintRows,printPatientLabel} from '../dist/visual/print-data.js';
import {PRINT,layoutPrintDocument,textWidth,renderPrintDocument} from '../dist/visual/print-layout.js';

// These arbitrary fixtures exercise the software. They are not clinical defaults.
const fixture={tam:60,tamLower:40,tas:80,tasLower:50,cuffed:3.5,uncuffed:4};

test('les 12 mois sont indépendants et ne contiennent aucune norme inventée',()=>{
 const config=referenceDefaults();assert.equal(config.months.length,12);
 for(let month=0;month<12;month++){
  const result=calculateReferences(config,month+.99);assert.equal(result.source,'monthly');assert.equal(result.month,month);
  for(const field of REFERENCE_FIELDS)assert.equal(result[field.key],null);
  assert.ok(referenceCards(result).every(card=>card.value==='À renseigner'));
 }
 Object.assign(config.months[0],fixture);
 assert.equal(calculateReferences(config,0).tam,60);
 assert.equal(calculateReferences(config,.999999).tam,60);
 assert.equal(calculateReferences(config,1).tam,null);
});

test('les formules demandées commencent exactement à 12 mois et utilisent l’âge fractionnaire',()=>{
 const config=referenceDefaults();Object.assign(config.months[11],fixture);
 assert.equal(calculateReferences(config,11.999999).tam,60);
 for(const [months,expected]of [[12,[56.5,46.5,92,72,3.25,4.25]],[18,[57.25,47.25,93,73,3.375,4.375]],[24,[58,48,94,74,3.5,4.5]],[216,[82,72,126,106,7.5,8.5]]]){
  const result=calculateReferences(config,months);assert.equal(result.source,'formula');
  assert.deepEqual(REFERENCE_FIELDS.map(f=>result[f.key]),expected);
 }
 const months=resolvePatientContext({weight:'12',age:'18',ageUnit:'months'}),years=resolvePatientContext({weight:'12',age:'1,5',ageUnit:'years'});
 assert.deepEqual(calculateReferences(config,months.ageMonths),calculateReferences(config,years.ageMonths));
 assert.ok(referenceCards(calculateReferences(config,18))[2].value.startsWith('≈ '));
 assert.match(referenceCards(calculateReferences(config,18))[2].detail,/théorique/);
});

test('la variante + 3,5 est explicite et ne modifie ni les pressions ni la table mensuelle',()=>{
 const config=referenceDefaults(),before=calculateReferences(config,24);Object.assign(config.months[6],fixture);config.cuffedOffset=3.5;
 const after=calculateReferences(config,24);assert.equal(after.cuffed,4);
 for(const key of ['tam','tamLower','tas','tasLower','uncuffed'])assert.equal(after[key],before[key]);
 assert.equal(calculateReferences(config,6).cuffed,3.5);
});

test('poids seul, âge absent ou invalide et configuration indisponible ne produisent pas de repères',()=>{
 const config=referenceDefaults();
 assert.equal(calculateReferences(config,resolvePatientContext({weight:'12',age:'',ageUnit:'months'}).ageMonths).status,'missing-age');
 for(const age of [undefined,null])assert.equal(calculateReferences(config,age).status,'missing-age');
 for(const age of [-1,216.1,NaN,Infinity,'12'])assert.equal(calculateReferences(config,age).status,'invalid-age');
 assert.equal(calculateReferences(null,12).status,'unavailable');
 for(const result of [{status:'missing-age'},{status:'invalid-age'},{status:'invalid-patient'},{status:'unavailable'}])assert.ok(referenceCards(result).every(c=>c.unit===''));
});

test('validation des mois, limites de pression et diamètres par pas de 0,5',()=>{
 assert.deepEqual(TUBE_SIZES,[3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8]);
 for(const size of TUBE_SIZES){const config=referenceDefaults();config.months[0].cuffed=size;config.months[11].uncuffed=size;assert.doesNotThrow(()=>validateReferences(config));}
 for(const value of [undefined,-1,0,Infinity,NaN,'60']){const config=referenceDefaults();config.months[0].tam=value;assert.throws(()=>validateReferences(config),/positive/);}
 for(const value of [2.5,8.5,3.25]){const config=referenceDefaults();config.months[0].cuffed=value;assert.throws(()=>validateReferences(config),/pas de 0,5/);}
 const limits=referenceDefaults();limits.months[4].tas=60;limits.months[4].tasLower=70;assert.throws(()=>validateReferences(limits),/limite inférieure/);
 for(const mutate of [c=>c.months.pop(),c=>c.months.reverse(),c=>c.months[0].month=1,c=>c.cuffedOffset=4]){const config=referenceDefaults();mutate(config);assert.throws(()=>validateReferences(config));}
});

test('migration des sauvegardes antérieures sans modifier les médicaments et les ampoules',()=>{
 const old=newState();old.version=3;delete old.clinicalReferences;const before=JSON.stringify(old),meds=configuration(old);
 const migrated=validateState(old);assert.equal(migrated.version,4);assert.deepEqual(migrated.clinicalReferences,referenceDefaults());assert.deepEqual(configuration(migrated),meds);assert.equal(JSON.stringify(old),before);
 const incomplete=newState();delete incomplete.clinicalReferences;assert.throws(()=>validateState(incomplete),/Repères incomplets/);
});

test('sauvegarde, rechargement et export/import incluent les repères et leur historique',()=>{
 const base=newState(),draft=clone(base.clinicalReferences);Object.assign(draft.months[6],fixture);draft.cuffedOffset=3.5;
 const saved=commitReferences(base,draft);assert.deepEqual(base.clinicalReferences,referenceDefaults());assert.deepEqual(configuration(saved),configuration(base));
 assert.equal(saved.history[0].changes.length,7);assert.deepEqual(saved.history[0].affected,[]);
 const mem=new Map(),storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};
 persistState(storage,saved);assert.deepEqual(loadState(storage),saved);assert.deepEqual(validateState(JSON.parse(mem.get(STORAGE_KEY))),saved);
 assert.throws(()=>persistState({setItem(){throw Error('Quota plein');}},saved),/Quota/);
 assert.throws(()=>commitReferences(saved,clone(saved.clinicalReferences)),/Aucune modification/);
 const bad=clone(saved);bad.history[0].snapshot.clinicalReferences.months[6].cuffed=3.1;assert.throws(()=>validateState(bad),/pas de 0,5/);
});

test('restaurer les repères préserve un médicament modifié ensuite et protège les versions plus récentes',()=>{
 const initial=newState(),config=clone(initial.clinicalReferences);config.months[0].tam=60;
 let saved=commitReferences(initial,config);const event=saved.history[0];
 const drug=draftFor(saved,'propofol');drug.record.model.coefficient=3;saved=commitSave(saved,drug);
 assert.equal(canRestore(saved,event),true);
 const restored=restoreEvent(saved,event);assert.deepEqual(restored.clinicalReferences,initial.clinicalReferences);assert.deepEqual(configuration(restored),configuration(saved));assert.equal(restored.history[0].restored,true);
 assert.equal(canRestore(restored,event),false);assert.throws(()=>restoreEvent(restored,event),/récente/);
 const undone=restoreEvent(restored,restored.history[0]);assert.deepEqual(undone.clinicalReferences,saved.clinicalReferences);assert.doesNotThrow(()=>validateState(undone));
 const medicineRestored=restoreEvent(saved,saved.history[0]);assert.deepEqual(medicineRestored.clinicalReferences,config);
});

test('les quatre repères tiennent au recto et les 65 médicaments restent sur deux pages portrait',()=>{
 const state=newState();Object.assign(state.clinicalReferences.months[0],fixture);Object.assign(state.clinicalReferences.months[11],fixture);
 const records=recordsFromState(state);
 for(const ageMonths of [null,0,6,11.99,12,13,18,24,216])for(const weightKg of [.5,12,50,200]){
  const ctx={weightKg,ageMonths,weightSource:'measured'},results=calculateAllRecords(records.map(r=>withCurrentDose(r,ctx)),ctx);
  const rows=buildPrintRows(records,results,ctx),references=referenceCards(calculateReferences(state.clinicalReferences,ageMonths));
  const doc=layoutPrintDocument(rows,{patient:printPatientLabel(ctx),references,date:'13/11/2026 16:30'});
  assert.equal(doc.pages.length,2,`${ageMonths} mois, ${weightKg} kg`);assert.equal(doc.requiresExtraPages,false);
  const printed=doc.pages.flatMap(p=>p.entries.filter(e=>e.kind==='medication'));assert.equal(printed.length,65);assert.equal(new Set(printed.map(r=>r.id)).size,65);
  for(const [index,page]of doc.pages.entries()){
   assert.ok(page.contentBottom<=PRINT.height);
   assert.notEqual(page.entries.at(-1).kind,'group');
   for(const row of page.entries.filter(e=>e.kind==='medication'))assert.ok(row.cells.every(c=>c.lines.length===1&&c.size>=7.5),row.id);
   for(const op of page.ops.filter(o=>o.type==='text')){assert.ok(op.size>=7.49,op.text);assert.ok(op.x+textWidth(op.text,op.size,op.bold)<=PRINT.width+.05,op.text);}
   const texts=page.ops.filter(o=>o.type==='text').map(o=>o.text);
   assert.equal(page.ops[0].y,0);
   assert.doesNotMatch(texts.join('\n'),/PediDoses|RECTO|VERSO|13\/11\/2026|poids saisi|médicaments affichés/);
   if(!index)for(const card of references){assert.ok(texts.includes(card.printLabel));assert.ok(texts.includes(card.value));assert.ok(texts.includes(card.printDetail));}
   else assert.doesNotMatch(texts.join('\n'),/TAm|TAs|ballonnet/);
  }
 }
});

test('l’impression sans âge ou sans données mensuelles reste explicite et respecte la sélection',()=>{
 const state=newState(),records=recordsFromState(state),ctx={weightKg:12,ageMonths:6,weightSource:'measured'},results=calculateAllRecords(records,ctx);
 const rows=buildPrintRows(records,results,ctx,{visibleIds:['atropine']});
 for(const ageMonths of [null,6]){
  const references=referenceCards(calculateReferences(state.clinicalReferences,ageMonths));
  const doc=layoutPrintDocument(rows,{references});assert.equal(doc.pages.length,1);assert.equal(doc.count,1);
  assert.match(renderPrintDocument(doc),ageMonths===null?/Âge requis/:/À renseigner/);
 }
});
