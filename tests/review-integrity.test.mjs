import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,clone,draftFor,createMedicationDraft,commitSave,restoreEvent,validateState,loadState,persistState,STORAGE_KEY} from '../dist/domain.js';

const reviewed=()=>({status:'reviewed',reviewer:'Relecture fictive',reviewedAt:'2026-11-20T12:00:00.000Z',checks:{posology:true,preparation:true,administration:true}});
test('une relecture importée exige identité, date et trois contrôles vrais',()=>{
 for(const change of [v=>v.reviewer='',v=>v.reviewer='  ',v=>v.reviewedAt=null,v=>delete v.reviewedAt,v=>v.reviewedAt='invalide',v=>v.reviewedAt=123,
  ...['posology','preparation','administration'].flatMap(k=>[v=>v.checks[k]=false,v=>v.checks[k]='true',v=>delete v.checks[k]])]){
  const s=newState();Object.assign(s.reviews.magnesium,reviewed());change(s.reviews.magnesium);
  assert.throws(()=>validateState(s),/magnésium.*relecture|magnésium.*relecteur|magnésium.*date|magnésium.*contrôles/i);
 }
});
test('les sauvegardes valides des schémas 1 à 4 et les états intermédiaires restent lisibles',()=>{
 for(const version of [1,2,3,4])for(const status of ['todo','reviewing','reviewed']){
  const s=newState();s.version=version;if(version<4)delete s.clinicalReferences;
  if(status==='reviewed')Object.assign(s.reviews.magnesium,reviewed());else s.reviews.magnesium.status=status;
  assert.equal(validateState(s).reviews.magnesium.status,status);
 }
});
test('chargement et écriture refusent une relecture incohérente sans toucher à la sauvegarde',()=>{
 const s=newState(),bad=clone(s);Object.assign(bad.reviews.magnesium,reviewed(),{reviewedAt:null});
 const mem=new Map([[STORAGE_KEY,JSON.stringify(s)]]),storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)},before=mem.get(STORAGE_KEY);
 assert.throws(()=>persistState(storage,bad));assert.equal(mem.get(STORAGE_KEY),before);
 mem.set(STORAGE_KEY,JSON.stringify(bad));assert.throws(()=>loadState(storage));assert.equal(mem.get(STORAGE_KEY),JSON.stringify(bad));
});
test('renommer ou changer le groupe remet la fiche à relire et garde la preuve antérieure',()=>{
 for(const key of ['name','category']){
  let s=newState(),d=draftFor(s,'magnesium');Object.assign(d.review,reviewed());s=commitSave(s,d);
  d=draftFor(s,'magnesium');d.record[key]=key==='name'?'Nom de test corrigé':'acr';const next=commitSave(s,d);
  assert.equal(next.reviews.magnesium.status,'todo');assert.equal(next.reviews.magnesium.reviewedAt,null);
  assert.deepEqual(next.reviews.magnesium.checks,{posology:false,preparation:false,administration:false});
  assert.equal(next.history[0].snapshot.reviews.magnesium.status,'reviewed');
 }
});
test('les relectures présentes dans les instantanés historiques sont aussi contrôlées',()=>{
 let s=newState(),d=draftFor(s,'magnesium');d.record.name+=' essai';s=commitSave(s,d);
 Object.assign(s.history[0].snapshot.reviews.magnesium,reviewed(),{reviewer:''});assert.throws(()=>validateState(s),/relecteur/);
});
test('une création sans version antérieure reste enregistrable et restaurable, y compris un ancien historique vide',()=>{
 const d=createMedicationDraft();d.record.name='Fiche fictive';d.record.model.unit='mg';d.record.model.coefficient=1;
 const s=commitSave(newState(),d);validateState(s);assert.deepEqual(s.history[0].snapshot.reviews,{});
 s.history[0].snapshot.reviews[d.record.id]=null;validateState(s);
 const restored=restoreEvent(s,s.history[0]);validateState(restored);assert.equal(restored.records.length,65);
 s.history[0].snapshot.reviews.propofol=null;assert.throws(()=>validateState(s),/Relecture invalide/);
});
