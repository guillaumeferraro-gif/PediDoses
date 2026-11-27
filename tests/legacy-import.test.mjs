import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,clone,configuration,draftFor,commitSave,createMedicationDraft,restoreEvent,validateState,compileRecord} from '../dist/domain.js';
import {defaultConfiguration,validateConfiguration} from '../dist/engine/protocol-config.js';
import {calculateRecordForPatient} from '../dist/engine/patient-calculator.js';
import {calculateUsage} from '../dist/usage-options.js';
import {prepareLegacyImport,migrationBackups} from '../dist/legacy-import.js';

function legacyFor(s){const config=defaultConfiguration();for(const row of config.records)row.ampoule={...clone(s.stocks[s.links[row.id]]),id:row.id,name:row.name};return config;}

test('conversion GitHub : mêmes calculs pour les 65 fiches et quatre contextes',()=>{
 const old=defaultConfiguration(),source=JSON.stringify(old),s=newState(),before=JSON.stringify(s),p=prepareLegacyImport(s,old);
 const keys=['dose','volumeMl','withdrawalMl','addMl','rateMlH','exactRateMlH','hourlyAmount','concentration','status'];
 for(const row of validateConfiguration(old))for(const [weightKg,ageMonths] of [[3,0],[10,24],[20,72],[50,180]]){
  const context={weightKg,ageMonths,weightSource:'measured'},a=calculateRecordForPatient(row,context),b=calculateUsage(compileRecord(p.next,row.id),context);
  for(const key of keys)assert.deepEqual(b[key],a[key],row.id+' '+key);
  if(a.secondDose)for(const key of keys)assert.deepEqual(b.secondDose[key],a.secondDose[key],row.id+' seconde dose '+key);
 }
 assert.equal(JSON.stringify(old),source);assert.equal(JSON.stringify(s),before);
 assert.equal(prepareLegacyImport(p.next,old).affected.length,0,'réimport identique sans doublon');
});
test('reprise avec relecture invalidée, fiche locale et repères conservés, puis restauration',()=>{
 let s=newState();const custom=createMedicationDraft();custom.record.name='Fiche fictive';custom.record.model.unit='mg';custom.record.model.coefficient=1;s=commitSave(s,custom);
 s.clinicalReferences.months[6].tam=60;
 Object.assign(s.reviews.propofol,{status:'reviewed',reviewer:'Relecteur fictif',reviewedAt:'2026-11-20T12:00:00.000Z',checks:{posology:true,preparation:true,administration:true}});
 const old=legacyFor(newState());old.records.find(r=>r.id==='propofol').model.coefficient=3;
 const p=prepareLegacyImport(s,old);assert.deepEqual(p.affected,['propofol']);assert.ok(p.changes.some(c=>c.path==='propofol.record.model.coefficient'));
 assert.equal(p.next.reviews.propofol.status,'todo');assert.equal(p.next.reviews.propofol.reviewedAt,null);assert.equal(p.next.reviews.propofol.checks.posology,false);
 assert.deepEqual(draftFor(p.next,custom.record.id),draftFor(s,custom.record.id));assert.deepEqual(p.next.clinicalReferences,s.clinicalReferences);
 const restored=restoreEvent(p.next,p.next.history[0]);validateState(restored);
 assert.deepEqual(configuration(restored),configuration(s));assert.deepEqual(restored.stocks,s.stocks);assert.equal(restored.reviews.propofol.status,'todo');
});
test('des présentations identiques restent partagées ; une différence est conservée',()=>{
 const s=newState(),old=legacyFor(s);for(const id of ['ketamine-analgesie','ketamine-intubation'])old.records.find(r=>r.id===id).ampoule.amount*=2;
 const same=prepareLegacyImport(s,old);assert.equal(same.next.links['ketamine-analgesie'],same.next.links['ketamine-intubation']);
 old.records.find(r=>r.id==='ketamine-intubation').ampoule.comment='Présentation distincte fictive';
 const distinct=prepareLegacyImport(s,old);assert.notEqual(distinct.next.links['ketamine-analgesie'],distinct.next.links['ketamine-intubation']);
 const restored=restoreEvent(distinct.next,distinct.next.history[0]);validateState(restored);assert.deepEqual(restored.stocks,s.stocks);assert.deepEqual(restored.links,s.links);
});
test('ancien tableau d’ampoules : ne remplace pas les posologies ni les questions locales',()=>{
 let s=newState(),d=draftFor(s,'propofol');d.record.model.coefficient=3;d.review.questions=['Question fictive locale'];s=commitSave(s,d);
 const old={version:1,items:legacyFor(newState()).records.map(r=>r.ampoule)};old.items.find(r=>r.id==='propofol').amount*=2;
 const p=prepareLegacyImport(s,old);assert.equal(p.ampoulesOnly,true);
 for(const r of s.records)assert.deepEqual(p.next.records.find(x=>x.id===r.id).model,r.model);
 assert.deepEqual(p.next.reviews.propofol.questions,s.reviews.propofol.questions);
 assert.equal(p.next.stocks[p.next.links.propofol].amount,400);
});
test('ancien format complet : expose les conversions historiques et conserve la source exacte',()=>{
 const old=defaultConfiguration();old.schemaVersion=1;
 const second=clone(old.records.find(r=>r.id==='triphosadenine'));second.id='triphosadenine-2';second.model.coefficient=0.3;second.model.maximumDose=20;
 const retired=clone(old.records.find(r=>r.id==='propofol'));retired.id='atracurium-bolus';old.records.push(second,retired);
 const source=JSON.stringify(old,null,2),before=JSON.stringify(newState()),p=prepareLegacyImport(newState(),old);
 assert.equal(p.upgraded,true);assert.ok(p.upgradeChanges.length);assert.ok(p.upgradeChanges.some(c=>c.label.startsWith(second.name)));
 assert.equal(p.next.records.length,65);assert.equal(JSON.stringify(old,null,2),source);
 const copies=migrationBackups(source,before);assert.equal(copies[0].value,source);assert.equal(copies[1].value,before);assert.notEqual(copies[0].key,copies[1].key);
});
test('fichiers incomplets ou incohérents : refus sans mutation',()=>{
 const s=newState(),before=JSON.stringify(s);
 for(const value of [{},{items:[]},{schemaVersion:2,records:[]},{...defaultConfiguration(),schemaVersion:99}])assert.throws(()=>prepareLegacyImport(s,value));
 const invalid=defaultConfiguration();invalid.records.find(r=>r.id==='propofol').model.coefficient=-1;assert.throws(()=>prepareLegacyImport(s,invalid));
 assert.equal(JSON.stringify(s),before);
});
